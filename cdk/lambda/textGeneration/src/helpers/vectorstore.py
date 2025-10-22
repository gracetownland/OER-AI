import logging
import psycopg2
from typing import Dict, Optional
from langchain_postgres import PGVector
from langchain_aws import BedrockEmbeddings

# Set up logging
logger = logging.getLogger(__name__)

def get_textbook_retriever(llm, textbook_id: str, vectorstore_config_dict: Dict[str, str], embeddings: BedrockEmbeddings, selected_documents=None) -> Optional[object]:
    """
    Get a retriever for a specific textbook based on its ID.
    
    Args:
        llm: The language model (not used in this simplified version)
        textbook_id: The ID of the textbook (used as collection name)
        vectorstore_config_dict: Dictionary with database connection parameters
        embeddings: The embeddings instance to use for the vectorstore
        selected_documents: Not used in this simplified version
        
    Returns:
        A retriever for the textbook or None if no embeddings found
    """
    try:
        # Connect to database to check if collection exists
        conn = psycopg2.connect(
            dbname=vectorstore_config_dict['dbname'],
            user=vectorstore_config_dict['user'],
            password=vectorstore_config_dict['password'],
            host=vectorstore_config_dict['host'],
            port=int(vectorstore_config_dict['port'])
        )
        
        # Check if collection exists with embeddings
        with conn.cursor() as cur:
            # Check if collection exists
            cur.execute("SELECT COUNT(*) FROM langchain_pg_collection WHERE name = %s", (textbook_id,))
            collection_exists = cur.fetchone()[0] > 0
            
            if not collection_exists:
                logger.warning(f"Collection for textbook {textbook_id} does not exist")
                conn.close()
                return None
            
            # Check if it has embeddings
            cur.execute("""
                SELECT COUNT(*) FROM langchain_pg_embedding 
                WHERE collection_id = (SELECT uuid FROM langchain_pg_collection WHERE name = %s)
            """, (textbook_id,))
            embedding_count = cur.fetchone()[0]
            logger.info(f"Collection {textbook_id} has {embedding_count} embeddings")
            
            if embedding_count == 0:
                logger.warning(f"No embeddings found for textbook {textbook_id}")
                conn.close()
                return None
        
        conn.close()
        
        # Create vectorstore connection string
        connection_string = (
            f"postgresql+psycopg://{vectorstore_config_dict['user']}:"
            f"{vectorstore_config_dict['password']}@{vectorstore_config_dict['host']}:"
            f"{vectorstore_config_dict['port']}/{vectorstore_config_dict['dbname']}"
        )
        
        # Initialize vector store with the textbook_id as collection name
        vectorstore = PGVector(
            embeddings=embeddings,
            collection_name=textbook_id,
            connection_string=connection_string,
            use_jsonb=True
        )
        
        # Create retriever with default search parameters
        retriever = vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 5}
        )
        
        logger.info(f"Created retriever for textbook: {textbook_id}")
        return retriever
        
    except Exception as e:
        logger.error(f"Error in get_textbook_retriever: {e}", exc_info=True)
        return None
