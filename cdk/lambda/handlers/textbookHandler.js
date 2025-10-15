const { initializeConnection } = require("./initializeConnection.js");
let { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT } = process.env;

// Initialize connection outside handler for Lambda performance
let sqlConnection;

const initConnection = async () => {
  if (!sqlConnection) {
    await initializeConnection(SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT);
    sqlConnection = global.sqlConnection;
  }
};

// Initialize on cold start
initConnection();

exports.handler = async (event) => {
  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Headers":
        "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
    },
    body: "",
  };

  // Ensure connection is ready
  await initConnection();

  let data;
  try {
    const pathData = event.httpMethod + " " + event.resource;
    switch (pathData) {
      case "GET /textbooks":
        const limit = parseInt(event.queryStringParameters?.limit) || 20;
        const offset = parseInt(event.queryStringParameters?.offset) || 0;
        
        const textbooks = await sqlConnection`
          SELECT id, title, authors, publisher, year, summary, language, level, created_at
          FROM textbooks
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        
        const totalCount = await sqlConnection`
          SELECT COUNT(*) as count FROM textbooks
        `;
        
        data = {
          textbooks,
          pagination: {
            limit,
            offset,
            total: parseInt(totalCount[0].count),
            hasMore: offset + limit < parseInt(totalCount[0].count)
          }
        };
        response.body = JSON.stringify(data);
        break;
      case "GET /textbooks/{id}":
        const textbookId = event.pathParameters?.id;
        if (!textbookId) {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Textbook ID is required" });
          break;
        }
        
        const textbook = await sqlConnection`
          SELECT id, title, authors, license, source_url, publisher, year, summary, language, level, created_at, updated_at, metadata
          FROM textbooks
          WHERE id = ${textbookId}
        `;
        
        if (textbook.length === 0) {
          response.statusCode = 404;
          response.body = JSON.stringify({ error: "Textbook not found" });
          break;
        }
        
        data = textbook[0];
        response.body = JSON.stringify(data);
        break;
      default:
        throw new Error(`Unsupported route: "${pathData}"`);
    }
  } catch (error) {
    response.statusCode = 500;
    console.log(error);
    response.body = JSON.stringify(error.message);
  }
  console.log(response);
  return response;
};