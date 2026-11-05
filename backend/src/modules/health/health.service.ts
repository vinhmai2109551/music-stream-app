import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"

/** A database that does not answer within this long counts as down. */
export const DB_TIMEOUT_MS = 2000

export interface HealthStatus {
  status: "ok"
  database: "up"
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name)

  constructor(private readonly prisma: PrismaService) {}

  /** Answers when the API can reach its database; 503 otherwise (a load balancer then waits). */
  async check(): Promise<HealthStatus> {
    try {
      await this.withTimeout(this.prisma.$queryRaw`SELECT 1`)
      return { status: "ok", database: "up" }
    } catch (error) {
      // The reason goes to the log, not to whoever asked: this endpoint is public.
      this.logger.error(`Database check failed: ${(error as Error).message}`)
      throw new ServiceUnavailableException({ status: "error", database: "down" })
    }
  }

  private withTimeout<T>(work: PromiseLike<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`no answer in ${DB_TIMEOUT_MS} ms`)), DB_TIMEOUT_MS)
    })
    return Promise.race([Promise.resolve(work), timeout]).finally(() => clearTimeout(timer))
  }
}
