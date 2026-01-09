const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const lambda = new LambdaClient({});

exports.handler = async (event) => {
  console.log("WebSocket message received:", {
    connectionId: event.requestContext.connectionId,
    routeKey: event.requestContext.routeKey,
    body: event.body,
    timestamp: new Date().toISOString(),
  });

  try {
    const body = JSON.parse(event.body);
    const { action, textbook_id, query, chat_session_id } = body;

    if (action === "generate_text") {
      // Invoke the text generation Lambda function
      const textGenPayload = {
        pathParameters: {
          id: chat_session_id,
        },
        body: JSON.stringify({
          textbook_id: textbook_id,
          query: query,
        }),
        requestContext: {
          connectionId: event.requestContext.connectionId,
          domainName: event.requestContext.domainName,
          stage: event.requestContext.stage,
        },
      };

      console.log(
        "Invoking text generation function with payload:",
        textGenPayload
      );

      const result = await lambda.send(
        new InvokeCommand({
          FunctionName: process.env.TEXT_GEN_FUNCTION_NAME,
          InvocationType: "Event", // Asynchronous invocation
          Payload: JSON.stringify(textGenPayload),
        })
      );

      console.log("Text generation function invoked successfully:", result);

      return { statusCode: 200 };
    }

    if (action === "generate_practice_material") {
      // Extract practice material specific fields
      const { material_type, topic, difficulty, num_questions, num_options, num_cards, card_type } = body;

      const practicePayload = {
        pathParameters: {
          textbook_id: textbook_id,
        },
        body: JSON.stringify({
          material_type: material_type || "mcq",
          topic: topic,
          difficulty: difficulty || "intermediate",
          num_questions: num_questions || 5,
          num_options: num_options || 4,
          num_cards: num_cards || 10,
          card_type: card_type || "definition",
        }),
        httpMethod: "POST",
        resource: "/textbooks/{textbook_id}/practice_materials",
        // WebSocket context for sending progress updates
        requestContext: {
          connectionId: event.requestContext.connectionId,
          domainName: event.requestContext.domainName,
          stage: event.requestContext.stage,
        },
        isWebSocket: true, // Flag to indicate WebSocket invocation
      };

      console.log(
        "Invoking practice material function with payload:",
        practicePayload
      );

      const result = await lambda.send(
        new InvokeCommand({
          FunctionName: process.env.PRACTICE_MATERIAL_FUNCTION_NAME,
          InvocationType: "Event", // Asynchronous invocation
          Payload: JSON.stringify(practicePayload),
        })
      );

      console.log("Practice material function invoked successfully:", result);

      return { statusCode: 200 };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Unknown action" }),
    };
  } catch (error) {
    console.error("Error processing WebSocket message:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
