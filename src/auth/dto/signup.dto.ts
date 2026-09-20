import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { NotCommonPassword } from '../../common/validators/not-common-password.validator';

export class SignupDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10)
  @NotCommonPassword()
  password: string;

  @ApiProperty()
  @IsString()
  name: string;
}
