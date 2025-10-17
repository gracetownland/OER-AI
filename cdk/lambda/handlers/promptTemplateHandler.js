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
      case "GET /prompt_templates":
        const limit = Math.min(parseInt(event.queryStringParameters?.limit) || 20, 100);
        const offset = parseInt(event.queryStringParameters?.offset) || 0;
        
        const result = await sqlConnection`
          SELECT 
            id, name, description, type, current_version_id, created_by, visibility, metadata, created_at, updated_at,
            COUNT(*) OVER() as total_count
          FROM prompt_templates
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        
        const total = result.length > 0 ? parseInt(result[0].total_count) : 0;
        const templates = result.map(({total_count, ...template}) => template);
        
        data = {
          templates,
          pagination: {
            limit,
            offset,
            total,
            hasMore: offset + limit < total
          }
        };
        response.body = JSON.stringify(data);
        break;
        
      case "POST /prompt_templates":
        const createData = parseBody(event.body);
        const { name, description, type, current_version_id, created_by, visibility, metadata } = createData;
        
        if (!name || !type) {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Name and type are required" });
          break;
        }
        
        const newTemplate = await sqlConnection`
          INSERT INTO prompt_templates (name, description, type, current_version_id, created_by, visibility, metadata)
          VALUES (${name}, ${description || null}, ${type}, ${current_version_id || null}, ${created_by || null}, ${visibility || 'private'}, ${metadata || {}})
          RETURNING id, name, description, type, current_version_id, created_by, visibility, metadata, created_at, updated_at
        `;
        
        response.statusCode = 201;
        data = newTemplate[0];
        response.body = JSON.stringify(data);
        break;
        
      case "GET /prompt_templates/{id}":
        const templateId = event.pathParameters?.id;
        if (!templateId) {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Template ID is required" });
          break;
        }
        
        const template = await sqlConnection`
          SELECT id, name, description, type, current_version_id, created_by, visibility, metadata, created_at, updated_at
          FROM prompt_templates
          WHERE id = ${templateId}
        `;
        
        if (template.length === 0) {
          response.statusCode = 404;
          response.body = JSON.stringify({ error: "Template not found" });
          break;
        }
        
        data = template[0];
        response.body = JSON.stringify(data);
        break;
        
      case "PUT /prompt_templates/{id}":
        const updateId = event.pathParameters?.id;
        if (!updateId) {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Template ID is required" });
          break;
        }
        
        const updateData = parseBody(event.body);
        const { name: updateName, description: updateDescription, type: updateType, current_version_id: updateVersionId, visibility: updateVisibility, metadata: updateMetadata } = updateData;
        
        const updated = await sqlConnection`
          UPDATE prompt_templates 
          SET name = ${updateName}, description = ${updateDescription}, type = ${updateType}, 
              current_version_id = ${updateVersionId}, visibility = ${updateVisibility}, 
              metadata = ${updateMetadata || {}}, updated_at = NOW()
          WHERE id = ${updateId}
          RETURNING id, name, description, type, current_version_id, created_by, visibility, metadata, created_at, updated_at
        `;
        
        if (updated.length === 0) {
          response.statusCode = 404;
          response.body = JSON.stringify({ error: "Template not found" });
          break;
        }
        
        data = updated[0];
        response.body = JSON.stringify(data);
        break;
        
      case "DELETE /prompt_templates/{id}":
        const deleteId = event.pathParameters?.id;
        if (!deleteId) {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Template ID is required" });
          break;
        }
        
        const deleted = await sqlConnection`
          DELETE FROM prompt_templates WHERE id = ${deleteId} RETURNING id
        `;
        
        if (deleted.length === 0) {
          response.statusCode = 404;
          response.body = JSON.stringify({ error: "Template not found" });
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