import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common"
import type { Response } from "express"
import { Prisma } from "../../generated/prisma/client.js"

const KNOWN_ERRORS: Record<string, { status: HttpStatus; message: string }> = {
  P2002: { status: HttpStatus.CONFLICT, message: "A record with these values already exists" },
  P2003: { status: HttpStatus.NOT_FOUND, message: "A referenced record does not exist" },
  P2025: { status: HttpStatus.NOT_FOUND, message: "Record not found" },
}

/** Turns common database errors into proper HTTP responses instead of 500s. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const mapped = KNOWN_ERRORS[exception.code]
    const status = mapped?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
    response.status(status).json({
      statusCode: status,
      message: mapped?.message ?? "Database error",
      error: HttpStatus[status],
    })
  }
}
