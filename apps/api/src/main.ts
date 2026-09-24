import { CategoriesController } from "./categories.controller";
import { BannersController } from "./banners.controller";
import { VisitorsController } from "./visitors.controller";
import { GuideController } from "./guide.controller";
import "reflect-metadata";
import { config } from "dotenv";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { Module, ValidationPipe } from "@nestjs/common";
import { Database } from "./database/database.service";
import { AssetsController } from "./assets.controller";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { AdminGuard } from "./auth/auth.guard";
import { AdminController } from "./admin/admin.controller";
config({ path: resolve(__dirname, "../../../.env"), quiet: true });
@Module({
  controllers: [
    AssetsController,
    AuthController,
    AdminController,
    GuideController,
    VisitorsController,
    BannersController,
    CategoriesController,
  ],
  providers: [Database, AuthService, AdminGuard],
})
class AppModule {}
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.use(
    (
      req: { url: string },
      res: { setHeader: (key: string, value: string) => void },
      next: () => void,
    ) => {
      if (req.url.startsWith("/api/admin") || req.url.startsWith("/api/auth"))
        res.setHeader("Cache-Control", "no-store");
      next();
    },
  );
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT || 3001), "127.0.0.1");
}
bootstrap();
