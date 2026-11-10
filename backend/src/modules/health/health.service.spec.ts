import { afterEach, describe, expect, it, jest } from "@jest/globals"
import { Logger, ServiceUnavailableException } from "@nestjs/common"
import type { PrismaService } from "../../infrastructure/prisma/prisma.service.js"
import { DB_TIMEOUT_MS, HealthService } from "./health.service.js"

function makeService(query: () => PromiseLike<unknown>) {
  const prisma = { $queryRaw: jest.fn(query) } as unknown as PrismaService
  return { service: new HealthService(prisma), query: prisma.$queryRaw as unknown as jest.Mock }
}

describe("HealthService", () => {
  jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined)

  afterEach(() => {
    jest.useRealTimers()
  })

  it("is ok when the database answers", async () => {
    const { service, query } = makeService(() => Promise.resolve([{ "?column?": 1 }]))

    await expect(service.check()).resolves.toEqual({ status: "ok", database: "up" })
    expect(query).toHaveBeenCalledTimes(1)
  })

  it("answers 503 with a fixed body when the query fails, without leaking the reason", async () => {
    const { service } = makeService(() =>
      Promise.reject(new Error("connect ECONNREFUSED 10.0.0.5:5432 password=secret")),
    )

    const error = (await service
      .check()
      .catch((caught: unknown) => caught)) as ServiceUnavailableException

    expect(error).toBeInstanceOf(ServiceUnavailableException)
    expect(error.getStatus()).toBe(503)
    expect(error.getResponse()).toEqual({ status: "error", database: "down" })
    expect(JSON.stringify(error.getResponse())).not.toContain("secret")
  })

  it("answers 503 when the database does not answer in time", async () => {
    jest.useFakeTimers()
    const { service } = makeService(() => new Promise(() => undefined))

    const result = service.check().catch((caught: unknown) => caught)
    jest.advanceTimersByTime(DB_TIMEOUT_MS - 1)
    jest.advanceTimersByTime(1)

    await expect(result).resolves.toBeInstanceOf(ServiceUnavailableException)
  })

  it("does not leave a timer running after a fast answer", async () => {
    jest.useFakeTimers()
    const { service } = makeService(() => Promise.resolve([]))

    await service.check()

    expect(jest.getTimerCount()).toBe(0)
  })
})
