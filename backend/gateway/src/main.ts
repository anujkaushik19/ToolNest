import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const originEnv = process.env.CORS_ORIGIN?.trim();
  app.enableCors({
    origin: originEnv ? originEnv.split(",").map((s) => s.trim()) : "*",
    methods: ["GET", "POST", "OPTIONS"],
  });

  const port = Number(process.env.PORT) || 8080;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Toolnest gateway listening on :${port}`);
}

bootstrap();
