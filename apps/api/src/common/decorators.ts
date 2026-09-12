import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common";

// Extract current authenticated user from request
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (data) {
      return request.user?.[data];
    }
    return request.user;
  },
);

// Extract active tenant ID from request
export const ActiveTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.activeTenantId;
  },
);

// Roles decorator
export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// Public route decorator (skip auth)
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
