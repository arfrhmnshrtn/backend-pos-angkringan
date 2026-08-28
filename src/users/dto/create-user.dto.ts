import { IsNotEmpty, IsString, IsEnum, Length, Matches, MaxLength, IsArray, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum.js';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nama lengkap kasir',
    example: 'John Doe',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Nama lengkap wajib diisi' })
  @IsString({ message: 'Nama lengkap harus berupa string' })
  @MaxLength(100, { message: 'Nama lengkap maksimal 100 karakter' })
  readonly fullname!: string;

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

  @ApiProperty({
    description: 'Role user',
    enum: [Role.KASIR, Role.OWNER],
    example: Role.KASIR,
  })
  @IsNotEmpty({ message: 'Role wajib diisi' })
  @IsEnum([Role.KASIR, Role.OWNER], { message: 'Role harus KASIR atau OWNER' })
  readonly role!: Role;

  @ApiPropertyOptional({
    description: 'Daftar ID permission (khusus kasir)',
    type: [Number],
  })
  @IsOptional()
  @IsArray({ message: 'Permissions harus berupa array' })
  @IsNumber({}, { each: true, message: 'ID permission harus berupa angka' })
  readonly permissionIds?: number[];
}
