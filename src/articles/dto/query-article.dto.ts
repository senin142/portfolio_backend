import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class QueryArticleDto {
  @ApiPropertyOptional({ description: 'Full-text search across the article title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by published state ("true" or "false")' })
  @IsOptional()
  @IsBooleanString()
  published?: string;
}
