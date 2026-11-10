import { textOf, type LlmClient } from "../../shared/llm/llm-client.js"
import type { EnrichModel } from "./enrich.js"
import { extractJsonObject } from "./json-text.js"

/**
 * Any language model as `EnrichModel`: a request with a JSON schema in, the JSON text out. The
 * schema goes into the prompt (the structured-output field of the API is not used), and what comes
 * back is cleaned down to the JSON object.
 */
export function enrichModelOf(client: LlmClient): EnrichModel {
  return {
    async complete({ system, user, schema, maxTokens }) {
      const response = await client.generate({
        system,
        maxOutputTokens: maxTokens,
        messages: [
          {
            role: "user",
            parts: [
              {
                type: "text",
                text:
                  `${user}\n\nReply with ONLY one JSON object (no markdown, no comments) ` +
                  `that matches this JSON schema:\n${JSON.stringify(schema)}`,
              },
            ],
          },
        ],
      })
      if (response.finish === "length") throw new Error("The answer was cut off")
      return extractJsonObject(textOf(response.message))
    },
  }
}
