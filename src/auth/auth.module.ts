import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './controllers/auth.controller.js';
import { AuthService } from './services/auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
