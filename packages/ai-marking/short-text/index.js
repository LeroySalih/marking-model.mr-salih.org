
async function notifyWebhook(webhook_url, {group_assignment_id, activity_id, pupil_id, score, feedback}) {

  let data = null;
  let error = null;

  try {

        const headers = {
          "Content-Type": "application/json",
          "mark-service-key": process.env.MARK_SERVICE_KEY
        };

        console.log("Headers", headers);

        await fetch(webhook_url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            group_assignment_id,
            activity_id,
            results: [
              {
                pupil_id,
                score,
                feedback
              }
            ]
          })
        });
        data = { success: true };
      } catch (webhookError) {
        console.error("Failed to notify webhook:", webhookError);
        error = webhookError.message;
        data = null
      } finally{
        return { data, error };
      }

}



export async function main(args) {
  const endpoint = process.env.DIGITAL_OCEAN_ENDPOINT;
  const accessKey = process.env.DIGITAL_OCEAN_ACCESS_KEY;

  const NOT_SET = "NOT_SET";

  // 1. Extract the actual text from the 'args' object. 
  // If you send '{"question": "..."}', use args.question.
  
  const {
        pupil_id,
        question,
        activity_id,
        webhook_url,
        model_answer,
        pupil_answer,
        submission_id,
        group_assignment_id
    } = args;


  
  if (!endpoint || !accessKey) {
    return { body: { error: "Missing configuration variables." } };
  }

  if (question === NOT_SET || model_answer === NOT_SET || pupil_answer === NOT_SET) {
    return { body: { error: "Missing required input fields." } };
  }

  // 2. Format the endpoint. 
  // DigitalOcean Agents typically use: base_url + /api/v1
  let targetUrl = endpoint.trim()
    // Remove potential trailing slash
  targetUrl = targetUrl.replace(/\/$/, "")
  if (!targetUrl.endsWith("/api/v1/chat/completions")) {
       // If it ends with /api/v1/chat (previous attempt), replace it
       if (targetUrl.endsWith("/api/v1/chat")) {
           targetUrl = targetUrl.replace(/\/api\/v1\/chat$/, "/api/v1/chat/completions")
       } else {
           // Otherwise append the full path
           targetUrl = targetUrl + "/api/v1/chat/completions"
       }
    }
    
    console.log("[DigitalOcean Agent] Invoking:", targetUrl, "with", {question, model_answer, pupil_answer});

    // 4. Create the user prompt payload.
    const userPrompt = JSON.stringify({question, model_answer, pupil_answer});

    // 5. pass prompt to DigitalOcean Agent
  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessKey}`
      },
      // 3. DigitalOcean Agents often expect a top-level "prompt" field 
      // or a standard OpenAI "messages" array.
      body: JSON.stringify({
        messages: [{ role: "user", content: String(userPrompt) }]
      })
    });

    // gather response
    const responseData = await response.json();



    if (!response.ok) {
      // return data for debugging
      return {
        statusCode: response.status,
        body: { 
          success: false, 
          status: response.status,
          details: responseData 
        }
      };
    }

    const {score, feedback} = JSON.parse(responseData.choices[0].message.content);

    console.log("[DigitalOcean Agent] Received score:", score, "feedback:", feedback);
    
    // notify the webhook.
    if (webhook_url && webhook_url !== NOT_SET) {
      const {data, error} = await notifyWebhook(webhook_url, {group_assignment_id, activity_id, pupil_id, score, feedback});
      
      console.log("[DigitalOcean Agent] Webhook notified. Data:", data, "Error:", error);
    
    } 

    // return successful response, not returned to app, return is for debugging only
    return { body: { 
        success: true, 
        data: responseData, 
        result: responseData.choices[0].message.content
       } 
    };

  } catch (error) {
    console.error("Error invoking DigitalOcean Agent:", error);
    return { body: { success: false, error: error.message } };
  }
}