import re
import boto3
from langchain_aws import ChatBedrock, BedrockLLM
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain, create_history_aware_retriever
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import DynamoDBChatMessageHistory
from langchain_core.pydantic_v1 import BaseModel, Field  
import logging
import json

class ResearchResponse(BaseModel):
    response: str = Field(description="AI response to the research query with insights from documents.")
    sources_used: list = Field(description="List of document sources used in the response.")


def apply_guardrails(text: str, guardrail_id: str, source: str = "INPUT") -> dict:
    """Apply Bedrock guardrails to input or output text."""
    try:
        bedrock_runtime = boto3.client("bedrock-runtime")
        
        response = bedrock_runtime.apply_guardrail(
            guardrailIdentifier=guardrail_id,
            guardrailVersion="DRAFT", #Use appropriate version once published (e.g., "1", "2", etc.)
            source=source,
            content=[
                {
                    "text": {
                        "text": text
                    }
                }
            ]
        )
        
        # Check if content was blocked
        action = response.get('action', 'NONE')
        blocked = action == 'GUARDRAIL_INTERVENED'
        
        return {
            'blocked': blocked,
            'action': action,
            'assessments': response.get('assessments', [])
        }
        
    except Exception as e:
        logging.error(f"Error applying guardrails: {e}")
        return {'blocked': False, 'error': str(e)}


def create_dynamodb_history_table(table_name: str) -> bool:
    """Create a DynamoDB table to store chat session history for research agendas."""
    dynamodb_resource = boto3.resource("dynamodb")
    dynamodb_client = boto3.client("dynamodb")
    
    existing_tables = []
    exclusive_start_table_name = None
    
    while True:
        if exclusive_start_table_name:
            response = dynamodb_client.list_tables(ExclusiveStartTableName=exclusive_start_table_name)
        else:
            response = dynamodb_client.list_tables()
        
        existing_tables.extend(response.get('TableNames', []))
        
        if 'LastEvaluatedTableName' in response:
            exclusive_start_table_name = response['LastEvaluatedTableName']
        else:
            break
    
    if table_name not in existing_tables:
        table = dynamodb_resource.create_table(
            TableName=table_name,
            KeySchema=[{"AttributeName": "SessionId", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "SessionId", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
        table.meta.client.get_waiter("table_exists").wait(TableName=table_name)

def get_bedrock_llm(
    bedrock_llm_id: str,
    temperature: float = 0
) -> ChatBedrock:
    """
    Retrieve a Bedrock LLM instance based on the provided model ID.

    Args:
    bedrock_llm_id (str): The unique identifier for the Bedrock LLM model.
    temperature (float, optional): The temperature parameter for the LLM, controlling 
    the randomness of the generated responses. Defaults to 0.

    Returns:
    ChatBedrock: An instance of the Bedrock LLM corresponding to the provided model ID.
    """
    # Configure model parameters based on the model type
    model_kwargs = {
        "temperature": temperature,
    }
    
    # Add max_tokens based on model type - using correct limits per AWS documentation
    if "llama3-70b" in bedrock_llm_id.lower():
        model_kwargs["max_gen_len"] = 2048  # Llama 3 70B max output tokens
    elif "llama3-8b" in bedrock_llm_id.lower():
        model_kwargs["max_gen_len"] = 2048  # Llama 3 8B max output tokens
    elif "llama" in bedrock_llm_id.lower():
        model_kwargs["max_gen_len"] = 2048  # Other Llama models
    elif "mistral-large" in bedrock_llm_id.lower():
        model_kwargs["max_tokens"] = 8192  # Mistral Large 2 supports up to 8k output
    elif "mistral" in bedrock_llm_id.lower():
        model_kwargs["max_tokens"] = 4096  # Other Mistral models
    elif "titan-text-express" in bedrock_llm_id.lower():
        model_kwargs["maxTokenCount"] = 4096  # Titan Express max output tokens
    elif "titan" in bedrock_llm_id.lower():
        model_kwargs["maxTokenCount"] = 4096  # Other Titan models
    else:
        # Default for other models
        model_kwargs["max_tokens"] = 4096
    
    logging.info(f"Initializing Bedrock LLM {bedrock_llm_id} with parameters: {model_kwargs}")
    
    return ChatBedrock(
        model_id=bedrock_llm_id,
        model_kwargs=model_kwargs,
    )

def get_custom_prompt(agenda_id: str, connection, user_id: str = None) -> str:
    """Get the custom general_rag prompt for the agenda from the database."""
    if connection is None:
        return None
    
    try:
        cur = connection.cursor()
        
        # First try to get user-specific prompt for the agenda
        if user_id:
            cur.execute("""
                SELECT prompt_text FROM research_agenda_prompts 
                WHERE research_agenda_id = %s AND prompt_type = 'general_rag' AND user_id = %s
                ORDER BY created_at DESC LIMIT 1
            """, (agenda_id, user_id))
            
            result = cur.fetchone()
            if result:
                cur.close()
                return result[0]
        
        # Second, try to get agenda-level default prompt
        cur.execute("""
            SELECT prompt_text FROM research_agenda_prompts 
            WHERE research_agenda_id = %s AND prompt_type = 'general_rag' AND is_default = true
            ORDER BY created_at DESC LIMIT 1
        """, (agenda_id,))
        
        result = cur.fetchone()
        if result:
            cur.close()
            return result[0]
        
        # Finally, fallback to global default prompt
        cur.execute("""
            SELECT prompt_text FROM research_agenda_prompts 
            WHERE research_agenda_id IS NULL AND prompt_type = 'general_rag'
            ORDER BY created_at DESC LIMIT 1
        """)
        
        result = cur.fetchone()
        cur.close()
        return result[0] if result else None
    except Exception as e:
        if cur:
            cur.close()
        return None

def format_research_query(raw_query: str) -> str:
    """Format the user's research query."""
    return raw_query  # Simple formatting for research queries


def get_response(
    query: str,
    agenda_id: str,
    llm: ChatBedrock,
    history_aware_retriever,
    table_name: str,
    session_id: str,
    connection,
    guardrail_id: str = None,
    user_id: str = None,
    stream_callback=None
) -> dict:
    """Generate response with custom prompt from database and conversational history."""
    logger = logging.getLogger()
    
    logger.info(f"get_response called with query: {query[:50]}...")
    
    # Apply guardrails if configured
    if guardrail_id and guardrail_id.strip():
        try:
            guardrail_response = apply_guardrails(query, guardrail_id)
            if guardrail_response.get('blocked', False):
                if stream_callback:
                    stream_callback("I cannot process this request as it contains inappropriate content for academic research.")
            
                return {
                    "response": "I cannot process this request as it contains inappropriate content for academic research.",
                    "agenda_id": agenda_id
                }
        except Exception as e:
            logger.warning(f"Guardrail check failed: {e}")
    
    try:
        # Get custom prompt from database
        custom_prompt = get_custom_prompt(agenda_id, connection, user_id)
        print(f"Using custom prompt: {custom_prompt}")
        
        # Set up conversational history
        chat_history = DynamoDBChatMessageHistory(
            table_name=table_name,
            session_id=session_id
        )
        
        # Log current conversation history for debugging
        try:
            messages = chat_history.messages
            logger.info(f"Current conversation has {len(messages)} messages in history")
            for i, msg in enumerate(messages[-4:]):  # Log last 4 messages for context
                logger.info(f"History[{i}]: {msg.type} - {msg.content[:50]}...")
        except Exception as history_error:
            logger.warning(f"Could not retrieve conversation history for logging: {history_error}")
        
        # Create the conversational RAG chain with history
        if custom_prompt:
            system_message = custom_prompt
        else:
            system_message = """You are a research assistant. Use the provided documents as follows:
                            - BACKGROUND CONTEXT DOCUMENTS: For theoretical framework and definitions
                            - RESEARCH DATA/OBSERVATIONS: For analysis and evidence
                            Answer the question by combining insights from both document types.
                            
                            Consider the conversation history when providing your response to maintain context and continuity."""
        
        # Create the prompt template for contextualizing questions based on chat history
        contextualize_q_system_prompt = """Given a chat history and the latest user question \
which might reference context in the chat history, formulate a standalone question \
which can be understood without the chat history. Do NOT answer the question, \
just reformulate it if needed and otherwise return it as is."""
        
        contextualize_q_prompt = ChatPromptTemplate.from_messages([
            ("system", contextualize_q_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ])
        
        # Create history-aware retriever
        history_aware_retriever_chain = create_history_aware_retriever(
            llm, history_aware_retriever, contextualize_q_prompt
        )
        
        # Create the question answering chain
        qa_system_prompt = f"""{system_message}

Use the following retrieved context to answer the question. If you don't know the answer, just say that you don't know.

{{context}}"""
        
        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", qa_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ])
        
        # Create document chain
        question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
        
        # Create the full RAG chain
        rag_chain = create_retrieval_chain(history_aware_retriever_chain, question_answer_chain)
        
        # Create conversational RAG chain with message history
        conversational_rag_chain = RunnableWithMessageHistory(
            rag_chain,
            lambda session_id: DynamoDBChatMessageHistory(
                table_name=table_name,
                session_id=session_id
            ),
            input_messages_key="input",
            history_messages_key="chat_history",
            output_messages_key="answer",
        )
        
        # Generate response using the conversational chain
        logger.info("Calling conversational RAG chain...")
        
        if stream_callback:
            # Stream response in chunks
            response_text = ""
            for chunk in conversational_rag_chain.stream(
                {"input": query},
                config={"configurable": {"session_id": session_id}}
            ):
                if "answer" in chunk:
                    chunk_text = chunk["answer"]
                    response_text += chunk_text
                    stream_callback(chunk_text)
        else:
            result = conversational_rag_chain.invoke(
                {"input": query},
                config={"configurable": {"session_id": session_id}}
            )
            response_text = result["answer"]
        logger.info(f"RAG response: {response_text[:100]}...")
        
        # Apply guardrails to output if configured
        if guardrail_id and guardrail_id.strip():
            try:
                output_guardrail = apply_guardrails(response_text, guardrail_id, source="OUTPUT")
                if output_guardrail.get('blocked', False):
                    response_text = "I cannot provide this response as it may contain inappropriate content for academic research."
            except Exception as e:
                logger.warning(f"Output guardrail check failed: {e}")
        
        return {
            "response": response_text,
            "agenda_id": agenda_id
        }
        
    except Exception as e:
        logger.error(f"Error in get_response: {e}")
        # Fallback to non-conversational approach if history fails
        try:
            logger.info("Falling back to non-conversational approach...")
            docs = history_aware_retriever.get_relevant_documents(query)
            logger.info(f"Retrieved {len(docs)} documents")
            
            if not docs:
                if stream_callback:
                    stream_callback("I don't have access to any relevant documents for this research agenda.")
                    
                return {
                    "response": "I don't have access to any relevant documents for this research agenda.",
                    "agenda_id": agenda_id
                }
            
            # Build context from documents
            context_parts = []
            context_docs = []
            observation_docs = []

            for doc in docs[:5]:
                doc_type = doc.metadata.get('document_type', 'unknown')
                if doc_type == 'context_documents':
                    context_docs.append(doc)
                elif doc_type == 'observation_documents':
                    observation_docs.append(doc)

            if context_docs:
                context_parts.append("BACKGROUND CONTEXT DOCUMENTS:")
                for i, doc in enumerate(context_docs):
                    context_parts.append(f"[Context-{i+1}] {doc.page_content}")

            if observation_docs:
                context_parts.append("\nRESEARCH DATA/OBSERVATIONS:")
                for i, doc in enumerate(observation_docs):
                    context_parts.append(f"[Data-{i+1}] {doc.page_content}")

            context = "\n\n".join(context_parts)
            
            # Get custom prompt
            custom_prompt = get_custom_prompt(agenda_id, connection, user_id)
            if custom_prompt:
                system_prompt = custom_prompt
            else:
                system_prompt = """You are a research assistant. Use the provided documents to answer questions."""

            prompt = f"""{system_prompt}

                    {context}

                    Question: {query}

                    Answer:"""
            
            response = llm.invoke(prompt)
            if stream_callback:
                stream_callback(response.content)
                
            return {
                "response": response.content,
                "agenda_id": agenda_id
            }
            
        except Exception as fallback_error:
            logger.error(f"Fallback error: {fallback_error}")
            return {
                "response": f"Error: {str(e)}",
                "agenda_id": agenda_id
            }


def generate_response(conversational_rag_chain: object, query: str, session_id: str) -> str:
    """
    Invokes the RAG chain to generate a response to a given query.
    This function is deprecated - conversational history is now handled directly in get_response().

    Args:
    conversational_rag_chain: The Conversational RAG chain object that processes the query and retrieves relevant responses.
    query (str): The input query for which the response is being generated.
    session_id (str): The unique identifier for the current conversation session.

    Returns:
    str: The answer generated by the Conversational RAG chain, based on the input query and session context.
    """
    return conversational_rag_chain.invoke(
        {
            "input": query
        },
        config={
            "configurable": {"session_id": session_id}
        },  # constructs a key "session_id" in `store`.
    )["answer"]

def format_research_output(response: str, agenda_id: str) -> dict:
    """Format the research response output."""
    return {
        "research_output": response,
        "agenda_id": agenda_id
    }

def split_into_sentences(paragraph: str) -> list[str]:
    """
    Splits a given paragraph into individual sentences using a regular expression to detect sentence boundaries.

    Args:
    paragraph (str): The input text paragraph to be split into sentences.

    Returns:
    list: A list of strings, where each string is a sentence from the input paragraph.

    This function uses a regular expression pattern to identify sentence boundaries, such as periods, question marks, 
    or exclamation marks, and avoids splitting on abbreviations (e.g., "Dr." or "U.S.") by handling edge cases. The 
    resulting list contains sentences extracted from the input paragraph.
    """
    # Regular expression pattern
    sentence_endings = r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)\s'
    sentences = re.split(sentence_endings, paragraph)
    return sentences



def update_session_name(table_name: str, session_id: str, bedrock_llm_id: str, db_connection=None) -> str:
    """Generate session name from first exchange and update database."""
    
    dynamodb_client = boto3.client("dynamodb")
    
    try:
        # First check if session name has already been updated
        if db_connection:
            try:
                with db_connection.cursor() as cur:
                    cur.execute(
                        'SELECT session_name FROM chat_sessions WHERE id_chat_session = %s',
                        (session_id,)
                    )
                    row = cur.fetchone()
                    if row and row[0] and row[0] != "New Chat Session":
                        # Session name already customized, don't update
                        return row[0]
            except Exception as db_error:
                print(f"Error checking existing session name: {db_error}")
                # Continue with name generation if check fails
        
        response = dynamodb_client.get_item(
            TableName=table_name,
            Key={'SessionId': {'S': session_id}}
        )
        
        history = response.get('Item', {}).get('History', {}).get('L', [])
        
        if len(history) < 2:
            return None
            
        # Just use first human and AI messages
        human_msg = None
        ai_msg = None
        
        for item in history:
            msg_type = item.get('M', {}).get('type', {}).get('S')
            content = item.get('M', {}).get('data', {}).get('M', {}).get('content', {}).get('S', '')
            
            if msg_type == 'human' and not human_msg:
                human_msg = content
            elif msg_type == 'ai' and not ai_msg:
                ai_msg = content
                
            if human_msg and ai_msg:
                break
        
        if not human_msg or not ai_msg:
            return None
            
        # Generate simple name
        
        llm = BedrockLLM(model_id=bedrock_llm_id)
        title_system_prompt = """
            You are given the first message from an AI and the first message from a student in a conversation. 
            Based on these two messages, come up with a name that describes the conversation. 
            The name should be less than 30 characters. ONLY OUTPUT THE NAME YOU GENERATED. NO OTHER TEXT.
        """
        prompt = f"""
        <|begin_of_text|>
        <|start_header_id|>system<|end_header_id|>
        {title_system_prompt}
        <|eot_id|>
        <|start_header_id|>AI Message<|end_header_id|>
        {ai_msg}
        <|eot_id|>
        <|start_header_id|>Student Message<|end_header_id|>
        {human_msg}
        <|eot_id|>
        <|start_header_id|>assistant<|end_header_id|>
    """
        
        session_name = llm.invoke(prompt)
        
        # Update the database with the generated session name
        if db_connection and session_name:
            try:
                with db_connection.cursor() as cur:
                    cur.execute(
                        'UPDATE chat_sessions SET session_name = %s, updated_at = CURRENT_TIMESTAMP WHERE id_chat_session = %s',
                        (session_name, session_id)
                    )
                db_connection.commit()
                print(f"Successfully updated session name in database: {session_name}")
            except Exception as db_error:
                db_connection.rollback()
                print(f"Error updating session name in database: {db_error}")
                # Continue and return the generated name even if DB update fails
        
        return session_name
        
    except Exception as e:
        print(f"Error updating session name: {e}")
        return None

