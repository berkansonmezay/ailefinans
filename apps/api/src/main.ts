import 'dotenv/config';
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8081",
        process.env.FRONTEND_URL,
      ].filter(Boolean) as string[];

      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.includes("localhost") ||
        origin.includes("192.168.")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix("api/v1");

  const port = process.env.PORT || 4000;
  await app.listen(port, "0.0.0.0");
  console.log(`🚀 API running on http://localhost:${port}/api/v1`);
}
bootstrap();
