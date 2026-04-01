/**
 * Tenant Middleware — Multi-tenant context resolution
 *
 * For authenticated routes: companyId comes from JWT (handled by guards).
 * For public routes: companyId comes from route params or headers.
 *
 * This middleware attaches company context to the request when available.
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    companyId?: string;
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction) {
    // Priority 1: X-Company-Id header (for API clients)
    const rawHeader = req.headers['x-company-id'];
    const headerCompanyId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    // Priority 2: Route param (for public routes like /public/:companyId/...)
    const paramCompanyId = req.params?.companyId as string | undefined;

    const companyId = headerCompanyId || paramCompanyId;

    if (companyId) {
      req.companyId = companyId;
      this.logger.debug(`Tenant context set: ${companyId}`);
    }

    next();
  }
}
