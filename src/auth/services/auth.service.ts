import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Role } from '../../common/enums/role.enum.js';
import { BCRYPT_SALT_ROUNDS } from '../../common/constants/index.js';
import type { LoginDto } from '../dto/login.dto.js';
import type { ChangePinDto } from '../dto/change-pin.dto.js';
import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';
import type { LoginResponse } from '../interfaces/login-response.interface.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly refreshTokenExpiryDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshTokenSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.accessTokenExpiry = this.configService.get<string>('JWT_ACCESS_EXPIRY', '15m');
    this.refreshTokenExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRY', '30d');
    this.refreshTokenExpiryDays = this.configService.get<number>('JWT_REFRESH_EXPIRY_DAYS', 30);
  }

  async login(loginDto: LoginDto): Promise<{ message: string; data: LoginResponse }> {
    const { role, pin, userId } = loginDto;

    // Validate: KASIR must provide userId
    if (role === Role.KASIR && !userId) {
      throw new BadRequestException('ID kasir wajib diisi untuk login sebagai KASIR');
    }

    // Find user based on role
    const user = await this.findUserForLogin(role, userId);

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin, user.pin);
    if (!isPinValid) {
      throw new UnauthorizedException('PIN salah');
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Akun tidak aktif. Hubungi owner.');
    }

    // Get permissions
    const permissions = await this.getUserPermissions(role, user.id);

    // Generate tokens
    const payload: JwtPayload = {
      id: user.id,
      fullname: user.fullname,
      role: role,
      permissions,
    };

    const { accessToken, refreshToken } = await this.generateTokens(payload);

    // Store refresh token hash
    await this.storeRefreshToken(user.id, refreshToken);

    const accessExpirySeconds = this.parseExpiryToSeconds(this.accessTokenExpiry);

    this.logger.log(`User ${user.fullname} (${role}) berhasil login`);

    return {
      message: 'Login berhasil',
      data: {
        accessToken,
        refreshToken,
        expiresIn: accessExpirySeconds,
        role,
        permissions,
        user: {
          id: user.id,
          fullname: user.fullname,
          role,
          status: user.status,
        },
      },
    };
  }

  async refresh(
    userId: number,
    oldRefreshToken: string,
  ): Promise<{ message: string; data: LoginResponse }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deleted_at: null },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Akun tidak aktif');
    }

    // Find valid refresh token
    const storedTokens = await this.prisma.refresh_token.findMany({
      where: {
        user_id: userId,
        expired_at: { gt: new Date() },
      },
    });

    // Verify received refresh token against stored hashes
    let matchedTokenId: number | null = null;
    for (const storedToken of storedTokens) {
      const isMatch = await bcrypt.compare(oldRefreshToken, storedToken.token_hash);
      if (isMatch) {
        matchedTokenId = storedToken.id;
        break;
      }
    }

    if (!matchedTokenId) {
      // Token rotation violation - revoke all tokens
      await this.prisma.refresh_token.deleteMany({
        where: { user_id: userId },
      });
      this.logger.warn(`Refresh token rotation violation detected for user ${userId}`);
      throw new UnauthorizedException('Refresh token tidak valid. Semua token telah direvoke.');
    }

    // Delete old refresh token (rotation)
    await this.prisma.refresh_token.delete({
      where: { id: matchedTokenId },
    });

    // Get permissions
    const role = user.role as Role;
    const permissions = await this.getUserPermissions(role, user.id);

    // Generate new tokens
    const payload: JwtPayload = {
      id: user.id,
      fullname: user.fullname,
      role,
      permissions,
    };

    const { accessToken, refreshToken } = await this.generateTokens(payload);

    // Store new refresh token
    await this.storeRefreshToken(user.id, refreshToken);

    const accessExpirySeconds = this.parseExpiryToSeconds(this.accessTokenExpiry);

    this.logger.log(`Token refreshed for user ${user.fullname}`);

    return {
      message: 'Token berhasil diperbarui',
      data: {
        accessToken,
        refreshToken,
        expiresIn: accessExpirySeconds,
        role,
        permissions,
        user: {
          id: user.id,
          fullname: user.fullname,
          role,
          status: user.status,
        },
      },
    };
  }

  async logout(userId: number, refreshToken: string): Promise<{ message: string; data: null }> {
    // Find and delete matching refresh token
    const storedTokens = await this.prisma.refresh_token.findMany({
      where: {
        user_id: userId,
      },
    });

    for (const storedToken of storedTokens) {
      const isMatch = await bcrypt.compare(refreshToken, storedToken.token_hash);
      if (isMatch) {
        await this.prisma.refresh_token.delete({
          where: { id: storedToken.id },
        });
        break;
      }
    }

    this.logger.log(`User ${userId} berhasil logout`);

    return {
      message: 'Logout berhasil',
      data: null,
    };
  }

  async changePin(
    userId: number,
    changePinDto: ChangePinDto,
  ): Promise<{ message: string; data: null }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deleted_at: null },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    // Verify old PIN
    const isOldPinValid = await bcrypt.compare(changePinDto.oldPin, user.pin);
    if (!isOldPinValid) {
      throw new BadRequestException('PIN lama salah');
    }

    // Prevent same PIN
    if (changePinDto.oldPin === changePinDto.newPin) {
      throw new BadRequestException('PIN baru tidak boleh sama dengan PIN lama');
    }

    // Hash new PIN
    const hashedPin = await bcrypt.hash(changePinDto.newPin, BCRYPT_SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { pin: hashedPin },
    });

    this.logger.log(`PIN berhasil diubah untuk user ${userId}`);

    return {
      message: 'PIN berhasil diubah',
      data: null,
    };
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  private async findUserForLogin(
    role: Role,
    userId?: number,
  ): Promise<{ id: number; fullname: string; pin: string; role: string; status: string }> {
    if (role === Role.OWNER) {
      const owner = await this.prisma.user.findFirst({
        where: { role: 'OWNER', deleted_at: null },
        select: { id: true, fullname: true, pin: true, role: true, status: true },
      });

      if (!owner) {
        throw new UnauthorizedException('Akun owner tidak ditemukan');
      }

      return owner;
    }

    // KASIR login
    if (!userId) {
      throw new BadRequestException('ID kasir wajib diisi');
    }

    const kasir = await this.prisma.user.findFirst({
      where: { id: userId, role: 'KASIR', deleted_at: null },
      select: { id: true, fullname: true, pin: true, role: true, status: true },
    });

    if (!kasir) {
      throw new UnauthorizedException('Akun kasir tidak ditemukan');
    }

    return kasir;
  }

  private async getUserPermissions(role: Role, userId: number): Promise<string[]> {
    if (role === Role.OWNER) {
      const allPermissions = await this.prisma.permission.findMany({ select: { name: true } });
      return allPermissions.map((p) => p.name);
    }
    
    // KASIR
    const userPermissions = await (this.prisma as any).user_permission.findMany({
      where: { user_id: userId },
      include: { permission: { select: { name: true } } },
    });

    return userPermissions.map((up: any) => up.permission.name);
  }

  private async generateTokens(payload: JwtPayload): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const tokenPayload: Record<string, unknown> = {
      id: payload.id,
      fullname: payload.fullname,
      role: payload.role,
      permissions: payload.permissions,
    };

    const accessExpirySeconds = this.parseExpiryToSeconds(this.accessTokenExpiry);
    const refreshExpirySeconds = this.parseExpiryToSeconds(this.refreshTokenExpiry);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(tokenPayload, {
        secret: this.accessTokenSecret,
        expiresIn: accessExpirySeconds,
      }),
      this.jwtService.signAsync(
        { ...tokenPayload },
        {
          secret: this.refreshTokenSecret,
          expiresIn: refreshExpirySeconds,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: number, rawToken: string): Promise<void> {
    const tokenHash = await bcrypt.hash(rawToken, BCRYPT_SALT_ROUNDS);
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + this.refreshTokenExpiryDays);

    await this.prisma.refresh_token.create({
      data: {
        user_id: userId,
        token_hash: tokenHash,
        expired_at: expiredAt,
      },
    });

    // Cleanup expired tokens for this user
    await this.prisma.refresh_token.deleteMany({
      where: {
        user_id: userId,
        expired_at: { lt: new Date() },
      },
    });
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (multipliers[unit] ?? 60);
  }
}
