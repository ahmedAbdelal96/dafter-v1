import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extract companyId from the authenticated user's JWT payload.
 *
 * @example
 * @Get()
 * async getCustomers(@CurrentTenant() companyId: string) { ... }
 */
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.companyId;
  },
);
