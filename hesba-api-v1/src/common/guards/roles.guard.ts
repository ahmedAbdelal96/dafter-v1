import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new UnauthorizedException('يجب تسجيل الدخول أولاً');
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException('Ù„ÙŠØ³ Ù„Ø¯ÙŠÙƒ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ© Ù„Ù„ÙˆØµÙˆÙ„ Ø¥Ù„Ù‰ Ù‡Ø°Ø§ Ø§Ù„Ù…ÙˆØ±Ø¯');
    }

    return true;
  }
}
