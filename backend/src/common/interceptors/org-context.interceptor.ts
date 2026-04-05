import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * When a Super Admin selects a company on the frontend, the client sends
 * an X-Organization-Id header. This interceptor swaps req.user.organizationId
 * to that value so every downstream service query is scoped to that company —
 * exactly as if the SA were a regular user inside it.
 */
@Injectable()
export class OrgContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const orgId = request.headers['x-organization-id'];

    if (user?.isSuperAdmin && orgId && typeof orgId === 'string') {
      user.organizationId = orgId;
    }

    return next.handle();
  }
}
