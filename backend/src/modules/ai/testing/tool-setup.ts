import { fakeToolPorts } from "./fake-tool-ports.js"
import { ToolRegistry } from "../tools/registry.js"
import type { ToolContext, WriteTool } from "../tools/tool.js"

export const ME: ToolContext = { userId: "u1" }

export function setup(options: Parameters<typeof fakeToolPorts>[0] = {}) {
  const fake = fakeToolPorts(options)
  const registry = ToolRegistry.create(fake.ports)
  const read = async (name: string, args: Record<string, unknown> = {}) => {
    const run = await registry.runImmediate(name, ME, args as never)
    return run
  }
  const write = (name: string) => registry.get(name) as WriteTool
  return { ...fake, registry, read, write }
}
