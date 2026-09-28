import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Behaves like JwtAuthGuard when a valid access token is present, but never
 * rejects the request when it's missing or invalid - it just leaves
 * `request.user` unset. Used on public routes (e.g. product/campaign
 * listings) whose response subtly differs for an authenticated owner/admin.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = unknown>(
    _err: unknown,
    user: TUser,
    _info: unknown,
    _context: ExecutionContext,
  ): TUser {
    return (user || undefined) as TUser;
  }
}
