import type { Response } from "express"
import { HEARTBEAT_MS } from "./ai.config.js"
import { toSse } from "./chat-events.js"
import type { ChatRun } from "./chat.service.js"

/**
 * Sends the events of an answer as a Server-Sent Events stream and ends the response. Everything
 * that can be refused must have been refused before this is called, while an ordinary error
 * response is still possible. When the connection closes first, the model is told to stop.
 */
export async function streamRun(response: Response, run: ChatRun): Promise<void> {
  const gone = new AbortController()
  response.on("close", () => {
    if (!response.writableFinished) gone.abort()
  })
  let heartbeat: NodeJS.Timeout | undefined
  try {
    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Tells nginx-style proxies not to hold the events back.
      "X-Accel-Buffering": "no",
    })
    response.flushHeaders()
    // A quiet line now and then, so that nothing closes the connection while the model thinks.
    heartbeat = setInterval(() => response.write(": ping\n\n"), HEARTBEAT_MS)
    for await (const event of run.events(gone.signal)) {
      if (gone.signal.aborted) break
      response.write(toSse(event))
    }
  } finally {
    clearInterval(heartbeat)
    // If the events were never read (something failed before), the message is given up here.
    await run.cancel()
    response.end()
  }
}
