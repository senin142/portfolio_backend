import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { TagsService } from '../tags/tags.service';

// The public-facing half of the dual-controller-per-domain pattern: no auth, only
// ever returns published content, and shares the exact same service/data layer as
// the admin-facing ArticlesController — no business logic is duplicated between them.
@ApiTags('public')
@Controller('public')
export class PublicArticlesController {
  constructor(private articlesService: ArticlesService, private tagsService: TagsService) {}

  @Get('articles')
  findPublished(@Query('tag') tag?: string) {
    return this.articlesService.findPublished(tag);
  }

  @Get('articles/:slug')
  async findOne(@Param('slug') slug: string) {
    const article = await this.articlesService.findPublishedBySlug(slug);
    const related = await this.articlesService.findRelated(article.id);
    return { ...article.toJSON(), related };
  }

  @Get('tags')
  findAllTags() {
    return this.tagsService.findAll();
  }
}
