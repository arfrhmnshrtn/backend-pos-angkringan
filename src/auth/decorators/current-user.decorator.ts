import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | JwtPayload[keyof JwtPayload] => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    if (data) {
      return user[data];
    }

    return user;
  },
);
