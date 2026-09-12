import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET || "super-secret-jwt-key-change-in-production",
    });
  }

  async validate(payload: { sub: string; tenantId: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Geçersiz oturum.");
    }

    // Verify tenant membership
    if (payload.tenantId) {
      const membership = await this.prisma.tenantMember.findUnique({
        where: {
          tenantId_userId: {
            tenantId: payload.tenantId,
            userId: user.id,
          },
        },
      });

      if (!membership || !membership.isActive) {
        throw new UnauthorizedException(
          "Bu aileye erişim yetkiniz bulunmamaktadır.",
        );
      }
    }

    return {
      userId: payload.sub,
      email: user.email,
      activeTenantId: payload.tenantId,
      role: payload.role,
    };
  }
}
