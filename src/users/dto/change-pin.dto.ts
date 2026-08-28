import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class ChangePinDto {
  @ApiProperty({ example: '1234', description: 'PIN lama (4 digit angka)' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 4, { message: 'PIN lama harus tepat 4 digit' })
  @Matches(/^[0-9]+$/, { message: 'PIN lama hanya boleh berisi angka' })
  oldPin: string;

  @ApiProperty({ example: '5678', description: 'PIN baru (4 digit angka)' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 4, { message: 'PIN baru harus tepat 4 digit' })
  @Matches(/^[0-9]+$/, { message: 'PIN baru hanya boleh berisi angka' })
  newPin: string;
}
