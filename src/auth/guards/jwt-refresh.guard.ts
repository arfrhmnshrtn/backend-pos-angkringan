import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JWT_CONSTANTS } from '../../common/constants/index.js';

@Injectable()
export class JwtRefreshGuard extends AuthGuard(JWT_CONSTANTS.REFRESH_TOKEN_STRATEGY) {}
