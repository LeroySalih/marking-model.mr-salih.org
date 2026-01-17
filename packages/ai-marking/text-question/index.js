import { readFile } from 'node:fs/promises';
import * as path from 'path';


async function loadPrompt (commandWord) {
  return await readFile(path.join('.','prompts', `${commandWord}.md`), 'utf-8')
                .catch((err) => {
                  console.error("[error]" + err.message);
                  return null;
                }); 
}

export async function main(args) {

  const endpoint = process.env.DIGITAL_OCEAN_ENDPOINT;
  const accessKey = process.env.DIGITAL_OCEAN_ACCESS_KEY;

  const NOT_SET = "NOT_SET";

  // 1. Extract the actual text from the 'args' object. 
  // If you send '{"question": "..."}', use args.question.
  const question = args.question || NOT_SET;
  const model_answer = args.model_answer || NOT_SET;
  const pupil_answer = args.pupil_answer || NOT_SET;

  
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


    // 3. Classify the question type. 
    const commandWord =  question.split(" ")[0].toLowerCase();

    const prompt = await loadPrompt(commandWord);

    return {body: prompt || "NOT_READ"};

    //const userPrompt = JSON.stringify({question, model_answer, pupil_answer});
}