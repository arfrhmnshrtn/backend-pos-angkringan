import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_CONSTANTS } from '../../common/constants/index.js';
import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';

interface RefreshTokenPayload extends JwtPayload {
  readonly tokenId: number;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, JWT_CONSTANTS.REFRESH_TOKEN_STRATEGY) {
  constructor(configService: ConfigService) {
    const secret = configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: RefreshTokenPayload): RefreshTokenPayload {
    return {
      id: payload.id,
      fullname: payload.fullname,
      role: payload.role,
      permissions: payload.permissions,
      tokenId: payload.tokenId,
    };
  }
}
