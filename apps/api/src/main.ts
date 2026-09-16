import 'dotenv/config';
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix("api/v1");

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}/api/v1`);
}
bootstrap();
