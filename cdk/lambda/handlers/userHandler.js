/**
 * AWS Lambda Handler for User Session Management
 * 
 * This Lambda function handles HTTP requests for user operations including:
 * - Anonymous user session creation for public access
 * - Session management for tracking user interactions
 * 
 */

const { initializeConnection } = require("./initializeConnection.js");
// Environment variables are set in AWS Lambda configuration
// These contain database connection details and AWS Cognito User Pool ID
let { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT, USER_POOL } = process.env;

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
initConnection();

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

  // Ensure database connection is ready (fallback for edge cases)
  await initConnection();

  let data; // Variable to store response data
  try {
    // Route requests based on HTTP method and URL path
    // event.httpMethod: GET, POST, PUT, DELETE
    // event.resource: URL pattern like /user/exampleEndpoint or /user_sessions
    const pathData = event.httpMethod + " " + event.resource;
    
    // Handle different API endpoints using switch statement
    switch (pathData) {
      // GET /user/exampleEndpoint - Test endpoint for development and debugging
      case "GET /user/exampleEndpoint":
        // Simple test response to verify Lambda function is working
        data = "Example endpoint invoked";
        response.body = JSON.stringify(data);
        break;
        
      // POST /user_sessions - Create anonymous user session for public access
      case "POST /user_sessions":
        // Generate unique session identifier using crypto.randomUUID()
        // This creates a UUID v4 (random) for tracking anonymous users
        const sessionId = crypto.randomUUID();
        
        // Insert new session record into database
        // RETURNING clause gives us the created record without a separate SELECT
        const result = await sqlConnection`
          INSERT INTO user_sessions (session_id, created_at, last_active_at)
          VALUES (${sessionId}, NOW(), NOW())
          RETURNING id, session_id, created_at
        `;
        
        // Structure response with both session identifiers
        // sessionId: UUID for client-side tracking
        // userSessionId: Database primary key for server-side operations
        data = {
          sessionId: result[0].session_id,
          userSessionId: result[0].id
        };
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
