export async function main(args) {
  const endpoint = process.env.DIGITAL_OCEAN_ENDPOINT;
  const accessKey = process.env.DIGITAL_OCEAN_ACCESS_KEY;

  // 1. Extract the actual text from the 'args' object. 
  // If you send '{"question": "..."}', use args.question.
  const userPrompt = args.question || args.prompt || args.input || "Hello";

  if (!endpoint || !accessKey) {
    return { body: { error: "Missing configuration variables." } };
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
    
    console.log("[DigitalOcean Agent] Invoking:", targetUrl)

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

    const responseData = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: { 
          success: false, 
          status: response.status,
          details: responseData 
        }
      };
    }

    return { body: { success: true, data: responseData, result: responseData.choices[0].message.content } };

  } catch (error) {
    return { body: { success: false, error: error.message } };
  }
}