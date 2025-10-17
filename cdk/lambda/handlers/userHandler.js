const { initConnection, createResponse, parseBody, handleError, getSqlConnection } = require("./utils/handlerUtils.js");

(async () => {
  await initConnection();
})();

exports.handler = async (event) => {
  const response = createResponse();
  let data;
  
  try {
    const sqlConnection = getSqlConnection();
    const pathData = event.httpMethod + " " + event.resource;
    
    switch (pathData) {
      case "GET /user/exampleEndpoint":
        data = "Example endpoint invoked";
        response.body = JSON.stringify(data);
        break;
        
      case "POST /user_sessions":
        const sessionId = crypto.randomUUID();
        
        const result = await sqlConnection`
          INSERT INTO user_sessions (session_id, created_at, last_active_at)
          VALUES (${sessionId}, NOW(), NOW())
          RETURNING id, session_id, created_at
        `;
        
        data = {
          sessionId: result[0].session_id,
          userSessionId: result[0].id
        };
        response.body = JSON.stringify(data);
        break;
        
      case "GET /user_sessions/{session_id}/interactions":
        const sessionId1 = event.pathParameters?.session_id;
        if (!sessionId1) {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Session ID is required" });
          break;
        }
        
        const limit = Math.min(parseInt(event.queryStringParameters?.limit) || 20, 100);
        const offset = parseInt(event.queryStringParameters?.offset) || 0;
        
        const interactionsResult = await sqlConnection`
          SELECT 
            id, session_id, sender_role, query_text, response_text, message_meta, source_chunks, created_at, order_index,
            COUNT(*) OVER() as total_count
          FROM user_interactions
          WHERE session_id = ${sessionId1}
          ORDER BY order_index ASC, created_at ASC
          LIMIT ${limit} OFFSET ${offset}
        `;
        
        const total = interactionsResult.length > 0 ? parseInt(interactionsResult[0].total_count) : 0;
        const interactions = interactionsResult.map(({total_count, ...interaction}) => interaction);
        
        data = {
          interactions,
          pagination: {
            limit,
            offset,
            total,
            hasMore: offset + limit < total
          }
        };
        response.body = JSON.stringify(data);
        break;
        
      case "POST /user_sessions/{session_id}/interactions":
        const sessionId2 = event.pathParameters?.session_id;
        if (!sessionId2) {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Session ID is required" });
          break;
        }
        
        const createData = parseBody(event.body);
        const { sender_role, query_text, response_text, message_meta, source_chunks, order_index } = createData;
        
        if (!sender_role) {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "sender_role is required" });
          break;
        }
        
        const newInteraction = await sqlConnection`
          INSERT INTO user_interactions (session_id, sender_role, query_text, response_text, message_meta, source_chunks, order_index)
          VALUES (${sessionId2}, ${sender_role}, ${query_text || null}, ${response_text || null}, ${message_meta || {}}, ${source_chunks || []}, ${order_index || null})
          RETURNING id, session_id, sender_role, query_text, response_text, message_meta, source_chunks, created_at, order_index
        `;
        
        response.statusCode = 201;
        data = newInteraction[0];
        response.body = JSON.stringify(data);
        break;
        
      case "GET /interactions/{id}":
        const interactionId = event.pathParameters?.id;
        if (!interactionId) {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Interaction ID is required" });
          break;
        }
        
        const interaction = await sqlConnection`
          SELECT id, session_id, sender_role, query_text, response_text, message_meta, source_chunks, created_at, order_index
          FROM user_interactions
          WHERE id = ${interactionId}
        `;
        
        if (interaction.length === 0) {
          response.statusCode = 404;
          response.body = JSON.stringify({ error: "Interaction not found" });
          break;
        }
        
        data = interaction[0];
        response.body = JSON.stringify(data);
        break;
        
      case "PUT /interactions/{id}":
        const updateInteractionId = event.pathParameters?.id;
        if (!updateInteractionId) {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Interaction ID is required" });
          break;
        }
        
        const updateData = parseBody(event.body);
        const { sender_role: updateSenderRole, query_text: updateQueryText, response_text: updateResponseText, message_meta: updateMessageMeta, source_chunks: updateSourceChunks, order_index: updateOrderIndex } = updateData;
        
        const updated = await sqlConnection`
          UPDATE user_interactions 
          SET sender_role = ${updateSenderRole}, query_text = ${updateQueryText}, response_text = ${updateResponseText}, 
              message_meta = ${updateMessageMeta || {}}, source_chunks = ${updateSourceChunks || []}, order_index = ${updateOrderIndex}
          WHERE id = ${updateInteractionId}
          RETURNING id, session_id, sender_role, query_text, response_text, message_meta, source_chunks, created_at, order_index
        `;
        
        if (updated.length === 0) {
          response.statusCode = 404;
          response.body = JSON.stringify({ error: "Interaction not found" });
          break;
        }
        
        data = updated[0];
        response.body = JSON.stringify(data);
        break;
        
      case "DELETE /interactions/{id}":
        const deleteInteractionId = event.pathParameters?.id;
        if (!deleteInteractionId) {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Interaction ID is required" });
          break;
        }
        
        const deleted = await sqlConnection`
          DELETE FROM user_interactions WHERE id = ${deleteInteractionId} RETURNING id
        `;
        
        if (deleted.length === 0) {
          response.statusCode = 404;
          response.body = JSON.stringify({ error: "Interaction not found" });
          break;
        }
        
        response.statusCode = 204;
        response.body = "";
        break;
        
      default:
        throw new Error(`Unsupported route: "${pathData}"`);
    }
  } catch (error) {
    handleError(error, response);
  }
  
  console.log(response);
  return response;
};
