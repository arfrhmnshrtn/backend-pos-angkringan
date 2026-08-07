import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPinDto {
  @ApiProperty({
    description: 'PIN baru (4 digit)',
    example: '5678',
    minLength: 4,
    maxLength: 4,
  })
  @IsNotEmpty({ message: 'PIN baru wajib diisi' })
  @IsString({ message: 'PIN harus berupa string' })
  @Length(4, 4, { message: 'PIN harus 4 digit' })
  @Matches(/^\d{4}$/, { message: 'PIN harus berupa 4 digit angka' })
  readonly newPin!: string;
}
