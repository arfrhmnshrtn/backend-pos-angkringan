import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum.js';

export class LoginDto {
  @ApiProperty({
    description: 'Role pengguna',
    enum: Role,
    example: Role.OWNER,
  })
  @IsNotEmpty({ message: 'Role wajib diisi' })
  @IsEnum(Role, { message: 'Role harus OWNER atau KASIR' })
  readonly role!: Role;

  @ApiProperty({
    description: 'PIN 4 digit',
    example: '1234',
    minLength: 4,
    maxLength: 4,
  })
  @IsNotEmpty({ message: 'PIN wajib diisi' })
  @IsString({ message: 'PIN harus berupa string' })
  @Length(4, 4, { message: 'PIN harus 4 digit' })
  @Matches(/^\d{4}$/, { message: 'PIN harus berupa 4 digit angka' })
  readonly pin!: string;

  @ApiPropertyOptional({
    description: 'ID kasir (wajib jika role = KASIR)',
    example: 2,
  })
  @IsOptional()
  @IsInt({ message: 'ID kasir harus berupa angka' })
  readonly userId?: number;
}
