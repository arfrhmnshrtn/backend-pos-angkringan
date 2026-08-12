import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../common/enums/role.enum.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Akses ditolak: user tidak ditemukan');
    }

    if (user.role === Role.OWNER) {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException('Akses ditolak: role tidak memiliki akses');
    }

    return true;
  }
}
