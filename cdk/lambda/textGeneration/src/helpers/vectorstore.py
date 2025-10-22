from typing import Dict
from helpers.helper import get_vectorstore

def get_vectorstore_retriever(llm, vectorstore_config_dict: Dict[str, str], embeddings):
    """Simple vectorstore retriever without complex history awareness."""
    
    vectorstore, _ = get_vectorstore(
        collection_name=vectorstore_config_dict['collection_name'],
        embeddings=embeddings,
        dbname=vectorstore_config_dict['dbname'],
        user=vectorstore_config_dict['user'],
        password=vectorstore_config_dict['password'],
        host=vectorstore_config_dict['host'],
        port=int(vectorstore_config_dict['port'])
    )
    
    return vectorstore.as_retriever()

def get_textbook_retriever(llm, textbook_id: str, vectorstore_config_dict: Dict[str, str], embeddings, selected_documents=None):
    """Get retriever for a specific textbook based on its ID."""
    import psycopg2
    
    try:
        # Create a connection to check if the collection exists
        conn = psycopg2.connect(
            dbname=vectorstore_config_dict['dbname'],
            user=vectorstore_config_dict['user'],
            password=vectorstore_config_dict['password'],
            host=vectorstore_config_dict['host'],
            port=int(vectorstore_config_dict['port'])
        )
        cur = conn.cursor()
        
        # Check if collection exists for this textbook
        cur.execute("SELECT COUNT(*) FROM langchain_pg_collection WHERE name = %s", (textbook_id,))
        collection_exists = cur.fetchone()[0] > 0
        
        if not collection_exists:
            print(f"Collection for textbook {textbook_id} does not exist")
            cur.close()
            conn.close()
            return None
        
        # Check if it has embeddings
        cur.execute("""
            SELECT COUNT(*) FROM langchain_pg_embedding 
            WHERE collection_id = (SELECT uuid FROM langchain_pg_collection WHERE name = %s)
        """, (textbook_id,))
        embedding_count = cur.fetchone()[0]
        print(f"Collection {textbook_id} has {embedding_count} embeddings")
        
        cur.close()
        conn.close()
        
        if embedding_count == 0:
            print(f"No embeddings found for textbook {textbook_id}")
            return None
        
        # Create and return the retriever
        config = vectorstore_config_dict.copy()
        config['collection_name'] = textbook_id
        retriever = get_vectorstore_retriever(llm, config, embeddings)
        print(f"Created retriever for textbook: {textbook_id}")
        return retriever
        
    except Exception as e:
        print(f"Error in get_textbook_retriever: {e}")
        import traceback
        traceback.print_exc()
        return None
