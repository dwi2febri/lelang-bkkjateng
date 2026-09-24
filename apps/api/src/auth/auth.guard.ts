import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthRequest, AuthService } from "./auth.service";
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    req.admin = await this.auth.user(req);
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method))
      this.auth.checkMutation(req);
    return true;
  }
}
