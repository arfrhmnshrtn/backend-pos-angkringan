import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token yang diperoleh saat login',
    example: 'eyJhbGciOiJIUzI1NiIs...',
  })
  @IsNotEmpty({ message: 'Refresh token wajib diisi' })
  @IsString({ message: 'Refresh token harus berupa string' })
  readonly refreshToken!: string;
}
