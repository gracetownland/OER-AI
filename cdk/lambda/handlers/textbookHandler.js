/**
 * AWS Lambda Handler for Textbook Management
 * 
 * This Lambda function handles HTTP requests for textbook operations including:
 * - CRUD operations on textbooks (Create, Read, Update, Delete)
 * - FAQ cache management for textbooks
 * 
 */

const { initializeConnection } = require("./initializeConnection.js");
// Environment variables are set in AWS Lambda configuration
// These contain database connection details stored in AWS Secrets Manager
let { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT } = process.env;

// Database connection variable - stored outside handler for performance optimization
// Lambda containers are reused across invocations, so we cache the connection
let sqlConnection;

/**
 * Initialize database connection using AWS RDS Proxy
 * RDS Proxy manages database connections and provides connection pooling
 */
const initConnection = async () => {
  if (!sqlConnection) {
    // Retrieve database credentials from AWS Secrets Manager and establish connection
    await initializeConnection(SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT);
    sqlConnection = global.sqlConnection;
  }
};

// Initialize connection during Lambda cold start (when container first starts)
// This improves performance for subsequent invocations (warm starts)
(async () => {
  await initConnection();
})();

/**
 * Main Lambda handler function
 * @param {Object} event - AWS Lambda event object containing HTTP request data
 * @returns {Object} HTTP response object with statusCode, headers, and body
 */
exports.handler = async (event) => {
  // Standard HTTP response structure for API Gateway
  const response = {
    statusCode: 200, // Default success status
    headers: {
      // CORS headers to allow cross-origin requests from web browsers
      "Access-Control-Allow-Headers":
        "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Origin": "*", // Allow requests from any domain
      "Access-Control-Allow-Methods": "*", // Allow all HTTP methods
    },
    body: "", // Response data (will be JSON string)
  };

  let data; // Variable to store response data
  try {
    // Route requests based on HTTP method and URL path
    // event.httpMethod: GET, POST, PUT, DELETE
    // event.resource: URL pattern like /textbooks or /textbooks/{id}
    const pathData = event.httpMethod + " " + event.resource;
    
    // Handle different API endpoints using switch statement
    switch (pathData) {
      // GET /textbooks - Retrieve paginated list of all textbooks
      case "GET /textbooks":
        // Extract pagination parameters from URL query string (?limit=20&offset=0)
        // Default to 20 items per page, maximum 100 to prevent large responses
        const limit = Math.min(parseInt(event.queryStringParameters?.limit) || 20, 100);
        const offset = parseInt(event.queryStringParameters?.offset) || 0;
        
        // Single optimized SQL query using window function to get both data and total count
        // This is more efficient than running separate SELECT and COUNT queries
        const result = await sqlConnection`
          SELECT 
            id, title, authors, publisher, year, summary, language, level, created_at,
            COUNT(*) OVER() as total_count
          FROM textbooks
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        
        // Extract total count and remove it from individual records
        const total = result.length > 0 ? parseInt(result[0].total_count) : 0;
        const textbooks = result.map(({total_count, ...book}) => book);
        
        // Structure response with pagination metadata
        data = {
          textbooks,
          pagination: {
            limit,
            offset,
            total,
            hasMore: offset + limit < total // Indicates if more pages exist
          }
        };
        response.body = JSON.stringify(data);
        break;
      // GET /textbooks/{id} - Retrieve a specific textbook by its UUID
      case "GET /textbooks/{id}":
        // Extract textbook ID from URL path parameters (e.g., /textbooks/123e4567-e89b-12d3-a456-426614174000)
        const textbookId = event.pathParameters?.id;
        if (!textbookId) {
          response.statusCode = 400; // Bad Request
          response.body = JSON.stringify({ error: "Textbook ID is required" });
          break;
        }
        
        // Query database for specific textbook with all fields
        const textbook = await sqlConnection`
          SELECT id, title, authors, license, source_url, publisher, year, summary, language, level, created_at, updated_at, metadata
          FROM textbooks
          WHERE id = ${textbookId}
        `;
        
        // Check if textbook exists
        if (textbook.length === 0) {
          response.statusCode = 404; // Not Found
          response.body = JSON.stringify({ error: "Textbook not found" });
          break;
        }
        
        data = textbook[0]; // Return first (and only) result
        response.body = JSON.stringify(data);
        break;
      // PUT /textbooks/{id} - Update an existing textbook
      case "PUT /textbooks/{id}":
        const updateId = event.pathParameters?.id;
        if (!updateId) {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Textbook ID is required" });
          break;
        }
        
        // Parse JSON request body containing updated textbook data
        let updateData;
        try {
          updateData = JSON.parse(event.body || '{}');
        } catch {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Invalid JSON body" });
          break;
        }
        
        // Extract fields from request body
        const { title, authors, license, source_url, publisher, year, summary, language, level, metadata } = updateData;
        
        // Update textbook in database and return updated record
        // RETURNING clause gives us the updated data without a separate SELECT
        const updated = await sqlConnection`
          UPDATE textbooks 
          SET title = ${title}, authors = ${authors}, license = ${license}, source_url = ${source_url}, 
              publisher = ${publisher}, year = ${year}, summary = ${summary}, language = ${language}, 
              level = ${level}, metadata = ${metadata || {}}, updated_at = NOW()
          WHERE id = ${updateId}
          RETURNING id, title, authors, license, source_url, publisher, year, summary, language, level, created_at, updated_at, metadata
        `;
        
        // Check if textbook was found and updated
        if (updated.length === 0) {
          response.statusCode = 404;
          response.body = JSON.stringify({ error: "Textbook not found" });
          break;
        }
        
        data = updated[0];
        response.body = JSON.stringify(data);
        break;
        
      // DELETE /textbooks/{id} - Remove a textbook from the database
      case "DELETE /textbooks/{id}":
        const deleteId = event.pathParameters?.id;
        if (!deleteId) {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Textbook ID is required" });
          break;
        }
        
        // Delete textbook and return the deleted ID to confirm operation
        const deleted = await sqlConnection`
          DELETE FROM textbooks WHERE id = ${deleteId} RETURNING id
        `;
        
        // Check if textbook existed and was deleted
        if (deleted.length === 0) {
          response.statusCode = 404;
          response.body = JSON.stringify({ error: "Textbook not found" });
          break;
        }
        
        response.statusCode = 204; // No Content - successful deletion
        response.body = ""; // Empty body for 204 responses
        break;
      // GET /textbooks/{id}/faq - Retrieve FAQ cache entries for a specific textbook
      case "GET /textbooks/{id}/faq":
        const faqTextbookId = event.pathParameters?.id;
        if (!faqTextbookId) {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Textbook ID is required" });
          break;
        }
        
        // Get FAQ entries ordered by popularity (usage_count) and recency
        // This helps surface the most useful and recent Q&A pairs first
        const faqs = await sqlConnection`
          SELECT id, question_text, answer_text, usage_count, last_used_at, cached_at
          FROM faq_cache
          WHERE textbook_id = ${faqTextbookId}
          ORDER BY usage_count DESC, cached_at DESC
        `;
        
        data = faqs;
        response.body = JSON.stringify(data);
        break;
        
      // POST /textbooks/{id}/faq - Add new FAQ entry to textbook's cache
      case "POST /textbooks/{id}/faq":
        const postFaqTextbookId = event.pathParameters?.id;
        if (!postFaqTextbookId) {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Textbook ID is required" });
          break;
        }
        
        // Parse FAQ data from request body
        let faqData;
        try {
          faqData = JSON.parse(event.body || '{}');
        } catch {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Invalid JSON body" });
          break;
        }
        
        // Validate required fields
        const { question_text, answer_text } = faqData;
        if (!question_text || !answer_text) {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "question_text and answer_text are required" });
          break;
        }
        
        // Normalize question for search optimization (lowercase, trimmed)
        // This helps with fuzzy matching and search functionality
        const normalized_question = question_text.toLowerCase().trim();
        
        // Insert new FAQ entry and return the created record
        const newFaq = await sqlConnection`
          INSERT INTO faq_cache (textbook_id, question_text, answer_text, normalized_question)
          VALUES (${postFaqTextbookId}, ${question_text}, ${answer_text}, ${normalized_question})
          RETURNING id, question_text, answer_text, usage_count, last_used_at, cached_at
        `;
        
        response.statusCode = 201; // Created
        data = newFaq[0];
        response.body = JSON.stringify(data);
        break;
        
      // Handle unsupported routes
      default:
        throw new Error(`Unsupported route: "${pathData}"`);
    }
  } catch (error) {
    // Global error handler for any unhandled exceptions
    // Returns 500 Internal Server Error with error message
    response.statusCode = 500;
    console.log(error); // Log error for AWS CloudWatch monitoring
    response.body = JSON.stringify(error.message);
  }
  
  // Log response for debugging (visible in AWS CloudWatch Logs)
  console.log(response);
  
  // Return HTTP response to API Gateway, which forwards it to the client
  return response;
};