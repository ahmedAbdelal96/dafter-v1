// ============================================
// JWT Strategy — Passport JWT Validation
// ============================================
// Validates the access token on every authenticated request.
// Extracts the payload and attaches the user object to req.user.
//
// This is invoked by JwtAuthGuard (via @UseGuards(JwtAuthGuard)).
// The user object shape here must match what @CurrentUser() returns.
// ============================================

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  JwtPayload,
  AuthenticatedUser,
  StaffPermissionsMap,
} from '../../../common/types';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'jwt.accessSecret',
        'default-access-secret-change-me',
      ),
    });
  }

  /**
   * Called by Passport after token signature is verified.
   * The returned object is attached to request.user.
   *
   * For STAFF users: we load their permissions JSON from DB so the
   * PermissionsGuard can check them without an extra DB round-trip.
   *
   * Performance note: runs on every authenticated request.
   * STAFF permission query is a single indexed lookup (userId is UNIQUE).
   * For high-traffic systems, consider caching in Redis with a short TTL.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        companyId: true,
        isDeleted: true,
        // Load permissions only for STAFF — single indexed join
        permissions: {
          select: { permissions: true },
        },
      },
    });

    if (!user || user.isDeleted) {
      throw new UnauthorizedException('Invalid token');
    }

    if (user.status === 'DISABLED') {
      throw new UnauthorizedException('Account disabled');
    }

    // For STAFF: extract the permissions JSON from DB.
    // For OWNER / SUPER_ADMIN: undefined — PermissionsGuard bypasses them automatically.
    let permissions: StaffPermissionsMap | undefined;
    if (user.role === UserRole.STAFF && user.permissions) {
      permissions = (user.permissions.permissions ?? {}) as StaffPermissionsMap;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.fullName || '',
      role: user.role,
      companyId: user.companyId,
      permissions,
    };
  }
}
