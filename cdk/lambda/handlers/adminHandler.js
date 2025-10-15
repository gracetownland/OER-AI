/**
 * AWS Lambda Handler for Admin Operations
 * 
 * This Lambda function handles HTTP requests for administrative operations including:
 * - Admin user management (create, read, update, delete)
 * - System administration tasks
 * - Content management operations
 * 
 * This handler requires admin-level authentication via AWS Cognito.
 * Only authenticated admin users can access these endpoints.
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

  // Ensure database connection is ready (fallback for edge cases)
  await initConnection();

  let data; // Variable to store response data
  try {
    // Route requests based on HTTP method and URL path
    // event.httpMethod: GET, POST, PUT, DELETE
    // event.resource: URL pattern like /admin/users or /admin/exampleEndpoint
    const pathData = event.httpMethod + " " + event.resource;
    
    // Handle different API endpoints using switch statement
    switch (pathData) {
      // GET /admin/exampleEndpoint - Test endpoint for development and debugging
      case "GET /admin/exampleEndpoint":
        // Simple test response to verify Lambda function is working
        data = "Example endpoint invoked";
        response.body = JSON.stringify(data);
        break;
        
      // POST /admin/users - Create new admin user in the system
      case "POST /admin/users":
        // Parse JSON request body containing new user data
        let userData;
        try {
          userData = JSON.parse(event.body || '{}');
        } catch {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Invalid JSON body" });
          break;
        }
        
        // Extract user fields from request body
        const { display_name, email, institution_id } = userData;
        
        // Validate required fields
        if (!display_name || !email) {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "display_name and email are required" });
          break;
        }
        
        // Insert new admin user into database
        // Using postgres library template literal syntax for better performance
        const result = await sqlConnection`
          INSERT INTO users (display_name, email, institution_id, role)
          VALUES (${display_name}, ${email}, ${institution_id || null}, 'admin')
          RETURNING id, display_name, email, role, institution_id, created_at
        `;
        
        response.statusCode = 201; // Created
        data = result[0];
        response.body = JSON.stringify(data);
        break;
        
      // Handle unsupported routes
      default:
        throw new Error(`Unsupported route: "${pathData}"`);
    }
  } catch (error) {
    // Enhanced error handling for different types of database errors
    console.log(error); // Log error for AWS CloudWatch monitoring
    
    // Handle specific PostgreSQL error codes
    if (error.code === '23505') {
      // Unique constraint violation (duplicate email)
      response.statusCode = 409; // Conflict
      response.body = JSON.stringify({ error: 'Email already exists' });
    } else if (error.code === '23502') {
      // Not null constraint violation
      response.statusCode = 400; // Bad Request
      response.body = JSON.stringify({ error: 'Required field is missing' });
    } else {
      // Generic server error for other exceptions
      response.statusCode = 500;
      response.body = JSON.stringify({ error: 'Internal server error' });
    }
  }
  
  // Log response for debugging (visible in AWS CloudWatch Logs)
  console.log(response);
  
  // Return HTTP response to API Gateway, which forwards it to the client
  return response;
};
