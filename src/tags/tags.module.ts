import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Tag } from './tag.model';
import { ArticleTag } from './article-tag.model';
import { TagsService } from './tags.service';

@Module({
  imports: [SequelizeModule.forFeature([Tag, ArticleTag])],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
