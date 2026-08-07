import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_CONSTANTS } from '../../common/constants/index.js';
import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_CONSTANTS.ACCESS_TOKEN_STRATEGY) {
  constructor(configService: ConfigService) {
    const secret = configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return {
      id: payload.id,
      fullname: payload.fullname,
      role: payload.role,
      permissions: payload.permissions,
    };
  }
}
