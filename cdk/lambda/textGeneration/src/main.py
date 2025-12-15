import os
import json
import boto3
import logging
import psycopg2
from langchain_aws import BedrockEmbeddings
from helpers.vectorstore import get_textbook_retriever
from helpers.chat import get_bedrock_llm, get_response_streaming, get_response, update_session_name
from helpers.faq_cache import check_faq_cache, cache_faq, stream_cached_response
from helpers.token_limit_helper import (
    get_user_session_from_chat_session,
    check_and_update_token_limit,
    get_session_token_status
)

# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
DB_SECRET_NAME = os.environ["SM_DB_CREDENTIALS"]
REGION = os.environ["REGION"]
RDS_PROXY_ENDPOINT = os.environ["RDS_PROXY_ENDPOINT"]
BEDROCK_LLM_PARAM = os.environ.get("BEDROCK_LLM_PARAM")
EMBEDDING_MODEL_PARAM = os.environ.get("EMBEDDING_MODEL_PARAM")
BEDROCK_REGION_PARAM = os.environ.get("BEDROCK_REGION_PARAM")
GUARDRAIL_ID_PARAM = os.environ.get("GUARDRAIL_ID_PARAM")
WEBSOCKET_API_ENDPOINT = os.environ.get("WEBSOCKET_API_ENDPOINT", "")
TABLE_NAME_PARAM = os.environ.get("TABLE_NAME_PARAM")
DAILY_TOKEN_LIMIT_PARAM = os.environ.get("DAILY_TOKEN_LIMIT_PARAM")
# AWS Clients
secrets_manager = boto3.client("secretsmanager", region_name=REGION)
ssm_client = boto3.client("ssm", region_name=REGION)
bedrock_runtime = boto3.client("bedrock-runtime", region_name='us-east-1')

connection = None
db_secret = None
BEDROCK_LLM_ID = None
EMBEDDING_MODEL_ID = None
BEDROCK_REGION = None
GUARDRAIL_ID = None
embeddings = None

def get_secret(secret_name, expect_json=True):
    global db_secret
    if db_secret is None:
        try:
            response = secrets_manager.get_secret_value(SecretId=secret_name)["SecretString"]
            db_secret = json.loads(response) if expect_json else response
        except Exception as e:
            logger.error(f"Error fetching secret: {e}")
            raise
    return db_secret

def get_parameter(param_name, cached_var):
    if cached_var is None and param_name:
        try:
            response = ssm_client.get_parameter(Name=param_name, WithDecryption=True)
            cached_var = response["Parameter"]["Value"]
        except Exception as e:
            logger.error(f"Error fetching parameter {param_name}: {e}")
            raise
    return cached_var

def initialize_constants():
    global BEDROCK_LLM_ID, EMBEDDING_MODEL_ID, BEDROCK_REGION, GUARDRAIL_ID, embeddings
    BEDROCK_LLM_ID = get_parameter(BEDROCK_LLM_PARAM, BEDROCK_LLM_ID)
    EMBEDDING_MODEL_ID = get_parameter(EMBEDDING_MODEL_PARAM, EMBEDDING_MODEL_ID)
    
    # Get Bedrock region parameter
    if BEDROCK_REGION_PARAM:
        BEDROCK_REGION = get_parameter(BEDROCK_REGION_PARAM, BEDROCK_REGION)
        logger.info(f"Using Bedrock region: {BEDROCK_REGION}")
    else:
        BEDROCK_REGION = REGION
        logger.info(f"BEDROCK_REGION_PARAM not configured, using deployment region: {BEDROCK_REGION}")
    
    # Handle guardrail ID parameter - it might not be configured
    if GUARDRAIL_ID_PARAM:
        GUARDRAIL_ID = get_parameter(GUARDRAIL_ID_PARAM, GUARDRAIL_ID)
    else:
        GUARDRAIL_ID = None
        logger.info("GUARDRAIL_ID_PARAM not configured, guardrails will be disabled")

    if embeddings is None:
        # Use the deployment region for embeddings (they should be in the same region as the deployment)
        embeddings = BedrockEmbeddings(
            model_id=EMBEDDING_MODEL_ID,
            client=bedrock_runtime,
            region_name='us-east-1',
            model_kwargs = {"input_type": "search_document"}
        )

def get_db_credentials():
    """Get database credentials from Secrets Manager"""
    try:
        response = secrets_manager.get_secret_value(SecretId=DB_SECRET_NAME)["SecretString"]
        return json.loads(response)
    except Exception as e:
        logger.error(f"Error fetching DB credentials: {e}")
        raise

def connect_to_db():
    global connection
    if connection is None or connection.closed:
        try:
            secret = get_secret(DB_SECRET_NAME)
            connection = psycopg2.connect(
                dbname=secret["dbname"],
                user=secret["username"],
                password=secret["password"],
                host=RDS_PROXY_ENDPOINT,
                port=int(secret["port"])
            )
            logger.info("Connected to the database!")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    return connection

def estimate_token_count(text: str) -> int:
    """
    Estimate the number of tokens in a text string.
    Uses a simple word-based approximation: ~1.3 tokens per word for English text.
    
    Args:
        text: The text to estimate tokens for
    
    Returns:
        Estimated token count
    """
    if not text:
        return 0
    # Simple approximation: split by whitespace and multiply by 1.3
    word_count = len(text.split())
    return int(word_count * 1.3)




# This function is now a wrapper for the helper function in chat.py
def process_query_streaming(query, textbook_id, retriever, chat_session_id, websocket_endpoint, connection_id, connection=None):
    """
    Process a query using streaming response via WebSocket
    """
    logger.info(f"Processing streaming query with LLM model ID: '{BEDROCK_LLM_ID}'")
    
    try:
        # Initialize LLM
        logger.info(f"Initializing Bedrock LLM with model ID: {BEDROCK_LLM_ID}")
        llm = get_bedrock_llm(BEDROCK_LLM_ID, bedrock_region=BEDROCK_REGION)
        
        # Use the streaming helper function from chat.py
        logger.info(f"Calling get_response_streaming with textbook_id: {textbook_id}")
        return get_response_streaming(
            query=query,
            textbook_id=textbook_id,
            llm=llm,
            retriever=retriever,
            chat_session_id=chat_session_id,
            connection=connection,
            guardrail_id=GUARDRAIL_ID,
            websocket_endpoint=websocket_endpoint,
            connection_id=connection_id,
            table_name=TABLE_NAME_PARAM,
            bedrock_llm_id=BEDROCK_LLM_ID
        )
    except Exception as e:
        logger.error(f"Error in process_query_streaming: {str(e)}", exc_info=True)
        # Send error message via WebSocket
        try:
            apigatewaymanagementapi = boto3.client('apigatewaymanagementapi', endpoint_url=websocket_endpoint)
            apigatewaymanagementapi.post_to_connection(
                ConnectionId=connection_id,
                Data=json.dumps({
                    "type": "error",
                    "message": "I'm sorry, I encountered an error while processing your question."
                })
            )
        except Exception as ws_error:
            logger.error(f"Failed to send the error via WebSocket: {ws_error}")
        
        return {
            "response": f"I'm sorry, I encountered an error while processing your question.",
            "sources_used": []
        }

def process_query(query, textbook_id, retriever, chat_session_id, connection=None):
    """
    Process a query using the chat helper function
    
    Args:
        query: The user's question
        textbook_id: ID of the textbook
        retriever: Vector store retriever for the textbook
        connection: Optional database connection for fetching custom prompts
        
    Returns:
        Response dictionary with answer and sources used
    """
    # Log the model ID being used
    logger.info(f"Processing query with LLM model ID: '{BEDROCK_LLM_ID}'")
    logger.info(f"Environment variables: REGION={REGION}, RDS_PROXY_ENDPOINT={RDS_PROXY_ENDPOINT}")
    
    try:
        # Initialize LLM
        logger.info(f"Initializing Bedrock LLM with model ID: {BEDROCK_LLM_ID}")
        llm = get_bedrock_llm(BEDROCK_LLM_ID, bedrock_region=BEDROCK_REGION)
        
        # Test the LLM with a simple message to verify it works
        try:
            logger.info(f"Testing LLM with a simple message...")
            test_message = llm.invoke("This is a test. Respond with 'OK' if you receive this message.")
            logger.info(f"LLM test successful. Response content type: {type(test_message)}")
        except Exception as test_error:
            logger.error(f"LLM test failed: {str(test_error)}")
            logger.error(f"This may indicate the model ID {BEDROCK_LLM_ID} is not available in region {REGION}")
            raise
        
        # Log the embeddings model ID for context
        logger.info(f"Using embedding model ID: {EMBEDDING_MODEL_ID}")
        
        # Use the helper function from chat.py to generate the response
        logger.info(f"Calling get_response with textbook_id: {textbook_id}")
        return get_response(
            query=query,
            textbook_id=textbook_id,
            llm=llm,
            retriever=retriever,
            chat_session_id=chat_session_id,
            connection=connection,
            guardrail_id=GUARDRAIL_ID
        )
    except Exception as e:
        logger.error(f"Error in process_query: {str(e)}", exc_info=True)
        logger.error(f"Model ID: {BEDROCK_LLM_ID}, Region: {REGION}")
        # Return a graceful error message
        return {
            "response": f"I'm sorry, I encountered an error while processing your question. The error has been logged for our team to investigate.",
            "sources_used": []
        }

def handler(event, context):
    """
    Lambda handler function for textbook question answering API endpoint
    
    Takes an API Gateway event with a textbook_id and question,
    retrieves relevant passages from the vectorstore, and generates
    an answer using the helper functions in chat.py
    
    Supports both regular API calls and WebSocket streaming
    """
    logger.info("Starting textbook question answering Lambda")
    logger.info(f"AWS Region: {REGION}")
    logger.info(f"Lambda function ARN: {context.invoked_function_arn}")
    logger.info(f"Lambda function name: {context.function_name}")
    logger.info(f"Model parameter paths - LLM: {BEDROCK_LLM_PARAM}, Embeddings: {EMBEDDING_MODEL_PARAM}, Bedrock Region: {BEDROCK_REGION_PARAM}")
    
    # Check if this is a WebSocket invocation
    is_websocket = event.get("requestContext", {}).get("connectionId") is not None
    logger.info(f"Request type: {'WebSocket' if is_websocket else 'API Gateway'}")
    
    # Extract parameters from the request
    query_params = event.get("queryStringParameters", {})
    path_params = event.get("pathParameters", {})
    logger.info(f"Request path parameters: {path_params}")
    
    chat_session_id = path_params.get("id", "")
    
    # Parse request body
    body = {} if event.get("body") is None else json.loads(event.get("body"))
    question = body.get("query", "")
    textbook_id = body.get("textbook_id", "")

    try:
        initialize_constants()
        logger.info(f"✅ Initialized constants - LLM: {BEDROCK_LLM_ID}, Embeddings: {EMBEDDING_MODEL_ID}, Bedrock Region: {BEDROCK_REGION}")
    except Exception as e:
        logger.error(f"❌ Failed to initialize constants: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Configuration error: {str(e)}')
        }
    
    # Validate required parameters
    if not textbook_id:
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Missing textbook_id parameter"})
        }
    
    if not question:
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "No question provided in the query field"})
        }
    
    try:
        # Get database credentials for vectorstore
        db_creds = get_db_credentials()
        vectorstore_config = {
            "dbname": db_creds["dbname"],
            "user": db_creds["username"],
            "password": db_creds["password"],
            "host": RDS_PROXY_ENDPOINT,
            "port": db_creds["port"]
        }
        
        # Get retriever for the textbook
        try:
            retriever = get_textbook_retriever(
                llm=None,  # Not needed for basic retriever initialization
                textbook_id=textbook_id,
                vectorstore_config_dict=vectorstore_config,
                embeddings=embeddings
            )
            
            if retriever is None:
                logger.warning(f"No retriever available for textbook {textbook_id}")
                return {
                    "statusCode": 404,
                    "headers": {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Headers": "*",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "*"
                    },
                    "body": json.dumps({"error": f"No embeddings found for textbook {textbook_id}"})
                }
        except Exception as retriever_error:
            logger.error(f"Error initializing retriever: {str(retriever_error)}", exc_info=True)
            return {
                "statusCode": 500,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*"
                },
                "body": json.dumps({"error": f"Failed to initialize retriever: {str(retriever_error)}"})
            }
        
        # Connect to database for custom prompts and logging
        connection = connect_to_db()
        
        # Pre-check: Verify user hasn't exceeded daily token limit before processing
        if chat_session_id and DAILY_TOKEN_LIMIT_PARAM:
            try:
                # Get user_session_id from chat_session_id
                user_session_id = get_user_session_from_chat_session(connection, chat_session_id)
                
                if user_session_id:
                    # Check current token status
                    token_status = get_session_token_status(
                        connection=connection,
                        user_session_id=user_session_id,
                        global_limit_param_name=DAILY_TOKEN_LIMIT_PARAM,
                        ssm_client=ssm_client
                    )
                    
                    # Check if user has already exceeded their limit
                    daily_limit = token_status.get('daily_limit')
                    tokens_used = token_status.get('tokens_used', 0)
                    remaining_tokens = token_status.get('remaining_tokens', 0)
                    
                    # If limit is set (not infinity) and user has no remaining tokens
                    if daily_limit != float('inf') and remaining_tokens <= 0:
                        hours_until_reset = token_status.get('hours_until_reset', 0)
                        reset_time = token_status.get('reset_time', '')
                        
                        error_message = f"You have reached your daily token limit of {daily_limit:,} tokens. Your limit will reset in {hours_until_reset:.1f} hours."
                        
                        logger.warning(f"Token limit exceeded for user_session {user_session_id}: {tokens_used}/{daily_limit}")
                        
                        # For WebSocket, send error message
                        if is_websocket:
                            try:
                                connection_id = event['requestContext']['connectionId']
                                domain_name = event['requestContext']['domainName']
                                stage = event['requestContext']['stage']
                                websocket_endpoint = f"https://{domain_name}/{stage}"
                                apigatewaymanagementapi = boto3.client('apigatewaymanagementapi', endpoint_url=websocket_endpoint)
                                
                                apigatewaymanagementapi.post_to_connection(
                                    ConnectionId=connection_id,
                                    Data=json.dumps({
                                        "type": "error",
                                        "message": error_message,
                                        "error_code": "TOKEN_LIMIT_EXCEEDED"
                                    })
                                )
                            except Exception as ws_error:
                                logger.error(f"Failed to send token limit error via WebSocket: {ws_error}")
                        
                        # Return 429 Too Many Requests
                        return {
                            "statusCode": 429,
                            "headers": {
                                "Content-Type": "application/json",
                                "Access-Control-Allow-Headers": "*",
                                "Access-Control-Allow-Origin": "*",
                                "Access-Control-Allow-Methods": "*"
                            },
                            "body": json.dumps({
                                "error": "Daily token limit exceeded",
                                "message": error_message,
                                "usage_info": {
                                    "tokens_used": tokens_used,
                                    "daily_limit": daily_limit,
                                    "remaining_tokens": 0,
                                    "hours_until_reset": hours_until_reset,
                                    "reset_time": reset_time
                                }
                            })
                        }
                    
                    # Log current status
                    if daily_limit != float('inf'):
                        logger.info(f"Token pre-check passed. Current usage: {tokens_used}/{daily_limit}, Remaining: {remaining_tokens}")
                    else:
                        logger.info(f"Token tracking enabled but no limit set (unlimited)")
                        
            except Exception as token_error:
                logger.error(f"Error in token pre-check: {token_error}", exc_info=True)
                # Continue processing even if pre-check fails (fail open)
        
        # Check FAQ cache first for WebSocket requests (only non-chat-session queries)
        cached_response = None
        from_cache = False
        if is_websocket:
            logger.info("Checking FAQ cache for similar questions...")
            cached_response = check_faq_cache(
                question=question,
                textbook_id=textbook_id,
                embeddings=embeddings,
                connection=connection
            )
            
            if cached_response:
                logger.info(f"Found cached response (similarity: {cached_response.get('similarity', 0):.4f})")
                # Stream the cached response via WebSocket
                connection_id = event['requestContext']['connectionId']
                domain_name = event['requestContext']['domainName']
                stage = event['requestContext']['stage']
                websocket_endpoint = f"https://{domain_name}/{stage}"
                
                response_data = stream_cached_response(
                    cached_faq=cached_response,
                    websocket_endpoint=websocket_endpoint,
                    connection_id=connection_id
                )
                from_cache = True
        
        # Generate response using helper function if not found in cache
        if not from_cache:
            try:
                if is_websocket:
                    # For WebSocket, use streaming response
                    connection_id = event['requestContext']['connectionId']
                    domain_name = event['requestContext']['domainName']
                    stage = event['requestContext']['stage']
                    websocket_endpoint = f"https://{domain_name}/{stage}"
                    response_data = process_query_streaming(
                        query=question,
                        textbook_id=textbook_id,
                        retriever=retriever,
                        connection=connection,
                        chat_session_id=chat_session_id,
                        websocket_endpoint=websocket_endpoint,
                        connection_id=connection_id
                    )
                    
                    # Cache the response for future use (only for non-chat-session WebSocket queries)
                    # Validate that the response is appropriate for caching
                    should_cache = (
                        response_data.get("response") and
                        # Don't cache if guardrails blocked the content
                        not response_data.get("guardrail_blocked", False) and
                        # Don't cache error messages or very short responses (likely errors)
                        len(response_data.get("response", "")) > 50 and
                        # Ensure we have actual content from sources
                        len(response_data.get("sources_used", [])) > 0
                    )
                    
                    if should_cache:
                        logger.info("Caching FAQ response for future use...")
                        cache_metadata = {
                            "sources_count": len(response_data.get("sources_used", []))
                        }
                        cache_faq(
                            question=question,
                            answer=response_data["response"],
                            textbook_id=textbook_id,
                            embeddings=embeddings,
                            connection=connection,
                            sources=response_data.get("sources_used", []),
                            metadata=cache_metadata
                        )
                    else:
                        logger.info("Skipping FAQ cache: Response does not meet quality criteria for caching")
                else:
                    # Non-WebSocket API calls are deprecated
                    logger.warning("Non-WebSocket API call detected - this is deprecated")
                    response_data = process_query(
                        query=question,
                        textbook_id=textbook_id,
                        retriever=retriever,
                        connection=connection,
                        chat_session_id=chat_session_id
                    )
            except Exception as query_error:
                logger.error(f"Error processing query: {str(query_error)}", exc_info=True)
                response_data = {
                    "response": "I apologize, but I'm experiencing technical difficulties at the moment. Our team has been notified of the issue.",
                    "sources_used": []
                }
        
        # Track token usage after processing (only if chat_session_id is provided and not from cache)
        if chat_session_id and DAILY_TOKEN_LIMIT_PARAM and not from_cache:
            try:
                # Get user_session_id from chat_session_id
                user_session_id = get_user_session_from_chat_session(connection, chat_session_id)
                
                if user_session_id:
                    # Get actual token usage from response_data if available
                    token_usage = response_data.get('token_usage')
                    
                    if token_usage:
                        # Use actual token count from Bedrock
                        tokens_used = token_usage.get('total_tokens', 0)
                        logger.info(f"Using actual token usage from Bedrock: {tokens_used} tokens (input: {token_usage.get('input_tokens', 0)}, output: {token_usage.get('output_tokens', 0)})")
                    else:
                        # Fallback to estimation if actual usage not available
                        input_tokens = estimate_token_count(question)
                        output_tokens = estimate_token_count(response_data.get('response', ''))
                        tokens_used = input_tokens + output_tokens
                        logger.info(f"Using estimated token usage: {tokens_used} tokens (input: {input_tokens}, output: {output_tokens})")
                    
                    # Update token count in database
                    can_proceed, usage_info = check_and_update_token_limit(
                        connection=connection,
                        user_session_id=user_session_id,
                        tokens_to_add=tokens_used,
                        global_limit_param_name=DAILY_TOKEN_LIMIT_PARAM,
                        ssm_client=ssm_client
                    )
                    
                    if can_proceed:
                        logger.info(f"Token usage tracked successfully. Total: {usage_info.get('tokens_used')}/{usage_info.get('daily_limit')}, Remaining: {usage_info.get('remaining_tokens')}")
                    else:
                        # This shouldn't happen in post-processing, but log it
                        logger.warning(f"Token limit would be exceeded after processing: {usage_info.get('message')}")
                        # Note: We don't reject the response since it's already been generated
                        # This is just for tracking purposes
                else:
                    logger.warning(f"Could not find user_session for chat_session {chat_session_id}, skipping token tracking")
            except Exception as token_error:
                logger.error(f"Error tracking token usage: {token_error}", exc_info=True)
                # Continue even if token tracking fails (fail open)
        
        try:
            # Log the interaction for analytics purposes
            with connection.cursor() as cur:
                # Check if chat_session_id is provided for the log
                if chat_session_id:
                    cur.execute(
                        """
                        INSERT INTO user_interactions
                        (chat_session_id, sender_role, query_text, response_text, source_chunks)
                        VALUES (%s, %s, %s, %s, %s)
                        """,
                        (chat_session_id, "User", question, response_data["response"], json.dumps(response_data["sources_used"]))
                    )
            
            connection.commit()
            logger.info(f"Logged question for textbook {textbook_id}")
            
            # Update session name if this is a chat session (only for non-WebSocket requests)
            session_name = None
            if chat_session_id and TABLE_NAME_PARAM and not is_websocket:
                try:
                    session_name = update_session_name(
                        table_name=TABLE_NAME_PARAM,
                        session_id=chat_session_id,
                        bedrock_llm_id=BEDROCK_LLM_ID,
                        db_connection=connection
                    )
                    if session_name:
                        logger.info(f"Updated session name to: {session_name}")
                    else:
                        logger.info("Session name not updated (may already exist or insufficient history)")
                except Exception as name_error:
                    logger.error(f"Error updating session name: {name_error}")
                    # Don't fail the request if session name update fails
            
        except Exception as db_error:
            connection.rollback()
            logger.error(f"Error logging question: {db_error}")
        finally:
            # Always close the connection when done
            if connection:
                connection.close()
        
        # Return successful response
        response_body = {
            "textbook_id": textbook_id,
            "response": response_data["response"],
            "sources": response_data["sources_used"],
            "session_name": session_name if not is_websocket else response_data.get("session_name")
        }
        
        # Include cache metadata if response was from cache
        if from_cache or response_data.get("from_cache"):
            response_body["from_cache"] = True
            if "cache_similarity" in response_data:
                response_body["cache_similarity"] = response_data["cache_similarity"]
        
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*", 
                "Access-Control-Allow-Methods": "*"
            },
            "body": json.dumps(response_body)
        }
        
    except Exception as e:
        logger.error(f"Error processing request: {e}", exc_info=True)
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*"
            },
            "body": json.dumps({"error": f"Internal server error: {str(e)}"})
        }
    except Exception as e:
        logger.error(f"Error processing request: {e}", exc_info=True)
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*"
            },
            "body": json.dumps({"error": f"Internal server error: {str(e)}"})
        }
