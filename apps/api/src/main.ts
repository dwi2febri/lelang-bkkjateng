import { RecycleBinController } from "./admin/recycle-bin.controller";
import { CreditProductsController } from "./credit-products.controller";
import { AssetImportController } from "./asset-import.controller";
import { CategoriesController } from "./categories.controller";
import { PresenceController, PresenceService } from "./presence";
import { AssetUploadsController, PublicAssetUploadsController } from "./asset-uploads.controller";
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
import { UsersController } from "./admin/users.controller";
import { PublicAccountController } from "./public-account/public-account.controller";
import { PublicAccountService } from "./public-account/public-account.service";
import { InterestChatController } from "./interest-chat.controller";
config({ path: resolve(__dirname, "../../../.env"), quiet: true });
@Module({
  controllers: [
    RecycleBinController,
    AssetImportController,
    CreditProductsController,
    PresenceController,
    AssetsController,
    AuthController,
    AdminController,
    UsersController,
    PublicAccountController,
    InterestChatController,
    GuideController,
    VisitorsController,
    BannersController,
    CategoriesController,
    AssetUploadsController,
    PublicAssetUploadsController,
  ],
  providers: [Database, AuthService, AdminGuard, PublicAccountService, PresenceService],
})
class AppModule {}
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set("trust proxy", "loopback");
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
      if (req.url.startsWith("/api/admin") || req.url.startsWith("/api/auth") || req.url.startsWith("/api/public-account"))
        res.setHeader("Cache-Control", "no-store");
      next();
    },
  );
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT || 3001), "127.0.0.1");
}
bootstrap();
