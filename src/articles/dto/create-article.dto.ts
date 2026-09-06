import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateArticleDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase, alphanumeric, and hyphen-separated',
  })
  slug: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  body: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @ApiProperty({ required: false, type: [String], description: 'Tag names' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
