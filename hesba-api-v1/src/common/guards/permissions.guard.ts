import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new UnauthorizedException('يجب تسجيل الدخول أولاً');
    }

    // SUPER_ADMIN and OWNER bypass permission checks
    if (user.role === 'SUPER_ADMIN' || user.role === 'OWNER') {
      return true;
    }

    // STAFF must have matching StaffPermission flags
    if (!user.permissions) {
      throw new ForbiddenException('Ù„ÙŠØ³ Ù„Ø¯ÙŠÙƒ Ø£ÙŠ ØµÙ„Ø§Ø­ÙŠØ§Øª');
    }

    const hasAllPermissions = requiredPermissions.every(
      (perm) => user.permissions?.[perm] === true,
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        'Ù„ÙŠØ³ Ù„Ø¯ÙŠÙƒ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„ÙƒØ§ÙÙŠØ© Ù„ØªÙ†ÙÙŠØ° Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡',
      );
    }

    return true;
  }
}
