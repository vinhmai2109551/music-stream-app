import "reflect-metadata"
import { Logger, ValidationPipe } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { NestFactory } from "@nestjs/core"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { AppModule } from "./app.module.js"
import { PrismaExceptionFilter } from "./infrastructure/prisma/prisma-exception.filter.js"
import { PrismaService } from "./infrastructure/prisma/prisma.service.js"
import { runSeed } from "./seed/seed.js"

const DEFAULT_PORT = 3000

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  app.setGlobalPrefix("api")
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  )
  app.useGlobalFilters(new PrismaExceptionFilter())
  app.enableShutdownHooks()

  // Mobile apps send no Origin header, so CORS only concerns browsers (admin web, Expo web).
  const origins = (config.get<string>("CORS_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
  app.enableCors({ origin: origins.length > 0 ? origins : true, credentials: true })

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Music Stream API")
      .setDescription("REST API for the Music Stream mobile app and admin web")
      .setVersion("1.0")
      .addBearerAuth()
      .build(),
  )
  SwaggerModule.setup("api/docs", app, document)

  if (config.get<string>("SEED_ON_START") === "true") {
    await runSeed(app.get(PrismaService), {
      adminEmail: config.get<string>("SEED_ADMIN_EMAIL"),
      adminPassword: config.get<string>("SEED_ADMIN_PASSWORD"),
      mediaBaseUrl: config.get<string>("R2_PUBLIC_URL"),
    })
  }

  const port = Number(config.get<string>("PORT") ?? DEFAULT_PORT)
  await app.listen(port, "0.0.0.0")
  new Logger("Bootstrap").log(`API ready on http://localhost:${port}/api (docs: /api/docs)`)
}

void bootstrap()
