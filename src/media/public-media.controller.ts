import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { MediaService } from './media.service';
import { ArticlesService } from '../articles/articles.service';

// Public half of the dual-controller-per-domain pattern for media: no auth, and only
// ever serves images belonging to a published article (findPublishedBySlug 404s otherwise).
@ApiTags('public')
@Controller('public/articles')
export class PublicMediaController {
  constructor(private mediaService: MediaService, private articlesService: ArticlesService) {}

  @Get(':slug/image')
  @Header('Cache-Control', 'public, max-age=3600')
  async image(@Param('slug') slug: string, @Res() res: Response) {
    const article = await this.articlesService.findPublishedBySlug(slug);
    const media = await this.mediaService.getByArticleId(article.id);
    res.setHeader('Content-Type', media.mimeType);
    res.send(media.data);
  }
}
