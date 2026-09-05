import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify } from 'jose';

const KEY = new TextEncoder().encode(process.env.JWT_SECRET ?? 'bench-secret-do-not-use-in-prod');

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const h: string | undefined = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) throw new UnauthorizedException({ error: 'unauthorized' });
    try {
      const { payload } = await jwtVerify(h.slice(7), KEY, { algorithms: ['HS256'] });
      const id = Number(payload.sub);
      if (!Number.isInteger(id)) throw new Error('bad sub');
      req.userId = id;
      return true;
    } catch {
      throw new UnauthorizedException({ error: 'unauthorized' });
    }
  }
}
