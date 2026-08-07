import { IsNotEmpty, IsString, IsEnum, Length, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
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
    description: 'Role user (hanya KASIR yang bisa dibuat)',
    enum: [Role.KASIR],
    example: Role.KASIR,
  })
  @IsNotEmpty({ message: 'Role wajib diisi' })
  @IsEnum([Role.KASIR], { message: 'Hanya bisa membuat akun KASIR' })
  readonly role!: Role;
}
