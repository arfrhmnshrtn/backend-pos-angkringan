import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePinDto {
  @ApiProperty({
    description: 'PIN lama (4 digit)',
    example: '1234',
  })
  @IsNotEmpty({ message: 'PIN lama wajib diisi' })
  @IsString({ message: 'PIN lama harus berupa string' })
  @Length(4, 4, { message: 'PIN lama harus 4 digit' })
  @Matches(/^\d{4}$/, { message: 'PIN lama harus berupa 4 digit angka' })
  readonly oldPin!: string;

  @ApiProperty({
    description: 'PIN baru (4 digit)',
    example: '5678',
  })
  @IsNotEmpty({ message: 'PIN baru wajib diisi' })
  @IsString({ message: 'PIN baru harus berupa string' })
  @Length(4, 4, { message: 'PIN baru harus 4 digit' })
  @Matches(/^\d{4}$/, { message: 'PIN baru harus berupa 4 digit angka' })
  readonly newPin!: string;
}
