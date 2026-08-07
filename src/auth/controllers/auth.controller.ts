import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from '../services/auth.service.js';
import { LoginDto } from '../dto/login.dto.js';
import { RefreshTokenDto } from '../dto/refresh-token.dto.js';
import { ChangePinDto } from '../dto/change-pin.dto.js';
import { Public } from '../decorators/public.decorator.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard.js';
import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login',
    description: 'Login menggunakan role dan PIN 4 digit. KASIR harus menyertakan userId.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login berhasil' })
  @ApiResponse({ status: 400, description: 'Validasi gagal' })
  @ApiResponse({ status: 401, description: 'PIN salah atau akun tidak ditemukan' })
  @ApiResponse({ status: 403, description: 'Akun tidak aktif' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh Token',
    description: 'Memperbarui access token menggunakan refresh token. Mengimplementasikan token rotation.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Token berhasil diperbarui' })
  @ApiResponse({ status: 401, description: 'Refresh token tidak valid atau expired' })
  async refresh(
    @CurrentUser() user: JwtPayload,
    @Body() refreshTokenDto: RefreshTokenDto,
  ) {
    return this.authService.refresh(user.id, refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout',
    description: 'Logout dan menghapus refresh token dari database.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Logout berhasil' })
  @ApiResponse({ status: 401, description: 'Token tidak valid' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Body() refreshTokenDto: RefreshTokenDto,
  ) {
    return this.authService.logout(user.id, refreshTokenDto.refreshToken);
  }

  @Post('change-pin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Ubah PIN',
    description: 'Mengubah PIN sendiri. Memerlukan PIN lama dan PIN baru.',
  })
  @ApiBody({ type: ChangePinDto })
  @ApiResponse({ status: 200, description: 'PIN berhasil diubah' })
  @ApiResponse({ status: 400, description: 'PIN lama salah atau PIN baru sama' })
  @ApiResponse({ status: 401, description: 'Token tidak valid' })
  async changePin(
    @CurrentUser() user: JwtPayload,
    @Body() changePinDto: ChangePinDto,
  ) {
    return this.authService.changePin(user.id, changePinDto);
  }
}
