import os
import json
import boto3
import logging
import psycopg2
from langchain_aws import BedrockEmbeddings
from helpers.vectorstore import get_textbook_retriever
from helpers.chat import get_bedrock_llm, format_research_query, create_dynamodb_history_table, get_response, update_session_name

# Set up enhanced logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s'
)
logger = logging.getLogger(__name__)

# Add request ID to all log messages for better tracing
def setup_request_logging(context):
    """Setup request-specific logging"""
    global logger
    request_id = getattr(context, 'aws_request_id', 'unknown')
    logger = logging.LoggerAdapter(logger, {'request_id': request_id})
    return logger

# Environment variables
DB_SECRET_NAME = os.environ["SM_DB_CREDENTIALS"]
REGION = os.environ["REGION"]
RDS_PROXY_ENDPOINT = os.environ["RDS_PROXY_ENDPOINT"]
BEDROCK_LLM_PARAM = os.environ["BEDROCK_LLM_PARAM"]
EMBEDDING_MODEL_PARAM = os.environ["EMBEDDING_MODEL_PARAM"]
TABLE_NAME_PARAM = os.environ["TABLE_NAME_PARAM"]
GUARDRAIL_ID_PARAM = os.environ.get("GUARDRAIL_ID_PARAM", "")

# AWS Clients
secrets_manager_client = boto3.client("secretsmanager")
ssm_client = boto3.client("ssm", region_name=REGION)
bedrock_runtime = boto3.client("bedrock-runtime", region_name=REGION)

# Cached resources
connection = None
db_secret = None
BEDROCK_LLM_ID = None
EMBEDDING_MODEL_ID = None
TABLE_NAME = None
GUARDRAIL_ID = None
embeddings = None

def get_secret(secret_name, expect_json=True):
    global db_secret
    if db_secret is None:
        try:
            response = secrets_manager_client.get_secret_value(SecretId=secret_name)["SecretString"]
            db_secret = json.loads(response) if expect_json else response
        except Exception as e:
            logger.error(f"Error fetching secret: {e}")
            raise
    return db_secret

def get_parameter(param_name, cached_var):
    if cached_var is None:
        try:
            response = ssm_client.get_parameter(Name=param_name, WithDecryption=True)
            cached_var = response["Parameter"]["Value"]
        except Exception as e:
            logger.error(f"Error fetching parameter {param_name}: {e}")
            raise
    return cached_var

def initialize_constants():
    global BEDROCK_LLM_ID, EMBEDDING_MODEL_ID, TABLE_NAME, GUARDRAIL_ID, embeddings
    BEDROCK_LLM_ID = get_parameter(BEDROCK_LLM_PARAM, BEDROCK_LLM_ID)
    EMBEDDING_MODEL_ID = get_parameter(EMBEDDING_MODEL_PARAM, EMBEDDING_MODEL_ID)
    TABLE_NAME = get_parameter(TABLE_NAME_PARAM, TABLE_NAME)
    
    if GUARDRAIL_ID_PARAM:
        GUARDRAIL_ID = get_parameter(GUARDRAIL_ID_PARAM, GUARDRAIL_ID)
    
    if embeddings is None:
        embeddings = BedrockEmbeddings(
            model_id=EMBEDDING_MODEL_ID,
            client=bedrock_runtime,
            region_name=REGION,
        )
    
    create_dynamodb_history_table(TABLE_NAME)

def get_session_model_id(connection, session_id, fallback_model_id):
    """Get the model_id for a specific chat session"""
    try:
        with connection.cursor() as cur:
            cur.execute(
                'SELECT metadata->\'model_id\' as model_id FROM chat_sessions WHERE user_sessions_session_id = %s LIMIT 1',
                (session_id,)
            )
            row = cur.fetchone()
            if row and row[0]:
                return row[0]
    except Exception as e:
        logger.error(f"Error getting session model_id: {e}")
    
    # Return fallback parameter value if not found
    return fallback_model_id

def connect_to_db():
    global connection
    if connection is None or connection.closed:
        try:
            secret = get_secret(DB_SECRET_NAME)
            connection_params = {
                'dbname': secret["dbname"],
                'user': secret["username"],
                'password': secret["password"],
                'host': RDS_PROXY_ENDPOINT,
                'port': secret["port"]
            }
            connection_string = " ".join([f"{key}={value}" for key, value in connection_params.items()])
            connection = psycopg2.connect(connection_string)
            logger.info("Connected to the database!")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    return connection
    
def handler(event, context):
    # Setup request-specific logging
    request_logger = setup_request_logging(context)
    
    request_logger.info("🚀 Textbook RAG Lambda function started!")
    request_logger.info(f"📨 Event received: {json.dumps(event, default=str)}")
    
    # Extract session_id and textbook_id
    query_params = event.get("queryStringParameters", {})
    path_params = event.get("pathParameters", {})
    
    textbook_id = path_params.get("textbook_id", "")
    session_id = query_params.get("session_id", "")
    
    try:
        initialize_constants()
    except Exception as e:
        request_logger.error(f"❌ Failed to initialize constants: {e}")
        return {
            'statusCode': 500,
            'headers': {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps(f'Configuration error: {str(e)}')
        }
    
    if not textbook_id:
        return {
            'statusCode': 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Missing required parameter: textbook_id')
        }

    if not session_id:
        return {
            'statusCode': 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Missing required parameter: session_id')
        }
    
    # Connect to database to get session model
    try:
        connection = connect_to_db()
        model_id = get_session_model_id(connection, session_id, BEDROCK_LLM_ID)
        print(f"Using model {model_id} for session {session_id}")
    except Exception as e:
        print(f"Error getting session data, using defaults: {e}")
        model_id = BEDROCK_LLM_ID  # Default fallback
    
    body = {} if event.get("body") is None else json.loads(event.get("body"))
    question = body.get("message_content", "")
    
    try:
        llm = get_bedrock_llm(model_id)
        logger.info(f"Successfully initialized LLM with model: {model_id}")
    except Exception as e:
        logger.error(f"Error getting LLM from Bedrock: {e}")
        try:
            # Fallback to default model
            llm = get_bedrock_llm(BEDROCK_LLM_ID)
            logger.info(f"Fallback to default model: {BEDROCK_LLM_ID}")
        except Exception as fallback_error:
            logger.error(f"Error getting fallback LLM from Bedrock: {fallback_error}")
            error_message = "The AI service is temporarily unavailable. Please try again in a few moments. If this problem persists, contact your administrator."
            return {
                'statusCode': 500,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                },
                'body': json.dumps({
                    "session_name": "Textbook Chat",
                    "response": error_message,
                    "textbook_id": textbook_id
                })
            }
    
    if not question:
        response_message = "Please enter a question or message to get started. I'm here to help you with this textbook!"
        return {
            'statusCode': 400,
            'headers': {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps({
                "session_name": "Textbook Chat",
                "response": response_message,
                "textbook_id": textbook_id
            })
        }
    
    # Check if question is too short to be meaningful
    if len(question.strip()) < 3:
        response_message = "Please provide a more detailed question so I can give you a helpful response about this textbook."
        return {
            'statusCode': 400,
            'headers': {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps({
                "session_name": "Textbook Chat",
                "response": response_message,
                "textbook_id": textbook_id
            })
        }
    
    research_query = format_research_query(question)
    
    try:
        db_secret = get_secret(DB_SECRET_NAME)
        vectorstore_config_dict = {
            'dbname': db_secret["dbname"],
            'user': db_secret["username"],
            'password': db_secret["password"],
            'host': RDS_PROXY_ENDPOINT,
            'port': db_secret["port"]
        }
        
    except Exception as e:
        logger.error(f"Error retrieving vectorstore config: {e}")
        error_message = 'Error retrieving vectorstore config'
        return {
            'statusCode': 500,
            'headers': {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps(error_message)
        }
    
    try:
        # Use the simplified textbook retriever
        retriever = get_textbook_retriever(
            llm=llm,
            textbook_id=textbook_id,
            vectorstore_config_dict=vectorstore_config_dict,
            embeddings=embeddings
        )
        
        # Check if retriever was created successfully
        if retriever is None:
            print(f"No retriever created for textbook {textbook_id}")
            response_message = "This textbook doesn't have any searchable content yet. This might happen if the textbook is still being processed, or if it contains no text content. Please try again in a few moments."
            return {
                'statusCode': 200,
                'headers': {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                },
                'body': json.dumps({
                    "session_name": "Textbook Chat",
                    "response": response_message,
                    "textbook_id": textbook_id
                })
            }
    
        # Test retrieval
        probe = retriever.get_relevant_documents("test query")
        print(f"RAG probe docs: {len(probe)} documents retrieved from textbook {textbook_id}")
        
        # Check if no relevant documents found
        if len(probe) == 0:
            response_message = f"I found the textbook but couldn't retrieve any content from it. This might mean the textbook is still being processed, or it doesn't contain searchable text. Please try again in a few moments."
            return {
                'statusCode': 200,
                'headers': {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                },
                'body': json.dumps({
                    "session_name": "Textbook Chat",
                    "response": response_message,
                    "textbook_id": textbook_id
                })
            }

    except Exception as e:
        logger.error(f"Error creating retriever: {e}")
        print(f"Detailed retriever error: {e}")
        
        # Provide specific error messages based on the error type
        if "permission" in str(e).lower() or "access" in str(e).lower():
            error_message = "There was a database access issue. Please try again in a moment or contact support if the problem persists."
        elif "connection" in str(e).lower() or "timeout" in str(e).lower():
            error_message = "There was a connection issue with the document search system. Please try again in a moment."
        else:
            error_message = "There was an unexpected issue setting up the textbook search. Please try again or contact support if the problem persists."
        
        return {
            'statusCode': 500,
            'headers': {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps({
                "session_name": "Textbook Chat",
                "response": error_message,
                "textbook_id": textbook_id
            })
        }

    # Create streaming callback for real-time response if needed
    stream_callback = None
    
    try:
        logger.info(f"🚀 Starting response generation for session {session_id}, textbook {textbook_id}")
        logger.info(f"📝 Query: {question[:100]}{'...' if len(question) > 100 else ''}")
        logger.info(f"🤖 Using model: {model_id}")
        
        # Database connection already established above
        
        # Get user ID for metadata
        user_cognito_id = (
            event.get("requestContext", {})
                .get("authorizer", {})
                .get("userId")
        )
        
        user_id = None
        if user_cognito_id:
            with connection.cursor() as cur:
                cur.execute(
                    'SELECT id FROM users WHERE email = %s LIMIT 1',
                    (user_cognito_id,)
                )
                row = cur.fetchone()
                if row:
                    user_id = row[0]
        
        # Generate response
        logger.info(f"🔄 Generating response...")
        response = get_response(
            query=research_query,
            agenda_id=textbook_id,  # Using textbook_id in place of agenda_id
            llm=llm,
            history_aware_retriever=retriever,
            table_name=TABLE_NAME,
            session_id=session_id,
            connection=connection,
            guardrail_id=GUARDRAIL_ID,
            user_id=user_id,
            stream_callback=stream_callback
        )
        
        logger.info(f"✅ Response generation completed for session {session_id}")
        logger.debug(f"Generated response length: {len(response.get('response', ''))} chars")
        
        try:
            with connection.cursor() as cur:
                # Insert the interaction (query + response)
                cur.execute(
                    """
                    INSERT INTO user_interactions
                    (session_id, sender_role, query_text, response_text)
                    VALUES (%s, 'User', %s, %s)
                    """,
                    (
                        session_id,
                        question,              # original user message
                        response.get("response", "")  # LLM answer text
                    )
                )

                # Keep sessions ordered by last activity
                cur.execute(
                    "UPDATE chat_sessions SET updated_at = now() WHERE user_sessions_session_id = %s",
                    (session_id,)
                )

            connection.commit()
            logger.info("Saved user_interactions row and updated chat_sessions.updated_at")
        except Exception as e:
            connection.rollback()
            logger.error(f"Failed to save interaction: {e}")

    except Exception as e:
        logger.error(f"❌ Response generation error for session {session_id}: {e}")
        logger.error(f"🔍 Error details: {str(e)}")
        
        # Provide specific error messages based on the error type
        if "guardrail" in str(e).lower():
            error_message = "Your message was blocked by content safety guardrails. Please rephrase your question to avoid potentially harmful content and try again."
        elif "token" in str(e).lower() or "length" in str(e).lower():
            error_message = "Your message is too long or the response would exceed length limits. Please try a shorter, more specific question."
        elif "rate" in str(e).lower() or "throttl" in str(e).lower():
            error_message = "The AI service is currently busy. Please wait a moment and try again."
        elif "model" in str(e).lower() or "bedrock" in str(e).lower():
            error_message = "There was an issue with the AI model. Please try again or contact support if the problem persists."
        else:
            error_message = "I encountered an unexpected error while processing your request. Please try again, and if the problem continues, contact support."
        
        logger.error(f"🚨 Returning error response: {error_message}")
        
        return {
            'statusCode': 500,
            'headers': {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps({
                "session_name": "Textbook Chat",
                "response": error_message,
                "textbook_id": textbook_id
            })
        }
    
    try:
        potential_session_name = update_session_name(TABLE_NAME, session_id, BEDROCK_LLM_ID, connection)
        session_name = potential_session_name if potential_session_name else "Textbook Chat"
    except Exception as e:
        logger.error(f"Error updating session name: {e}")
        session_name = "Textbook Chat"
    
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
        },
        "body": json.dumps({
            "session_name": session_name,
            "response": response.get("response", "Failed to generate response"),
            "textbook_id": textbook_id
        })
    }
