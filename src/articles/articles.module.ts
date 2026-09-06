import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Article } from './article.model';
import { ArticleTag } from '../tags/article-tag.model';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { PublicArticlesController } from './public-articles.controller';
import { TagsModule } from '../tags/tags.module';

@Module({
  imports: [SequelizeModule.forFeature([Article, ArticleTag]), TagsModule],
  providers: [ArticlesService],
  controllers: [ArticlesController, PublicArticlesController],
})
export class ArticlesModule {}
