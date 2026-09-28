import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

const REQUEST_ID_HEADER = 'x-request-id';

// Reuses a caller-supplied id (e.g. from an upstream proxy or another
// service) so a request can be traced across systems, but never trusts it
// blindly for anything beyond logging - it's just a correlation label.
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const requestId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();

    req.id = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  }
}
