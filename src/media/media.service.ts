import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import sharp from 'sharp';
import { Media } from './media.model';
import { ArticlesService } from '../articles/articles.service';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { assertOwnerOrAdmin } from '../common/authorization';

export const STORAGE_CAP_BYTES = 150 * 1024 * 1024; // 150 MB — keeps well under Supabase's free-tier 500MB DB cap
const RESIZE_MAX_WIDTH = 1600;
const RESIZE_JPEG_QUALITY = 80;

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectModel(Media) private mediaModel: typeof Media,
    private articlesService: ArticlesService,
  ) {}

  async upload(articleId: string, file: Express.Multer.File, resize: boolean, user: AuthenticatedUser) {
    if (!file) throw new BadRequestException('No image file was provided');
    const article = await this.articlesService.findById(articleId); // 404s if the article doesn't exist
    assertOwnerOrAdmin(user, article.authorId);

    let buffer: Buffer = file.buffer;
    let mimeType = file.mimetype;
    let resized = false;

    if (resize) {
      buffer = await sharp(file.buffer)
        .resize({ width: RESIZE_MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: RESIZE_JPEG_QUALITY })
        .toBuffer();
      mimeType = 'image/jpeg';
      resized = true;
    }

    if (buffer.length > STORAGE_CAP_BYTES) {
      throw new BadRequestException(
        `Image is ${(buffer.length / 1024 / 1024).toFixed(1)}MB, which alone exceeds the ${STORAGE_CAP_BYTES / 1024 / 1024}MB storage cap`,
      );
    }

    // One image per article — replace whatever was there before.
    await this.mediaModel.destroy({ where: { articleId } });

    const media = await this.mediaModel.create({
      articleId,
      filename: file.originalname,
      mimeType,
      sizeBytes: buffer.length,
      resized,
      data: buffer,
    } as Media);

    await this.enforceQuota();

    return { id: media.id, sizeBytes: media.sizeBytes, resized: media.resized, mimeType: media.mimeType };
  }

  async removeByArticleId(articleId: string, user: AuthenticatedUser) {
    const article = await this.articlesService.findById(articleId); // 404s if the article doesn't exist
    assertOwnerOrAdmin(user, article.authorId);
    await this.mediaModel.destroy({ where: { articleId } });
  }

  async getByArticleId(articleId: string) {
    const media = await this.mediaModel.findOne({ where: { articleId } });
    if (!media) throw new NotFoundException('This article has no image');
    return media;
  }

  async getUsage() {
    const usedBytes = await this.getTotalBytes();
    return {
      usedBytes,
      capBytes: STORAGE_CAP_BYTES,
      percentUsed: Math.round((usedBytes / STORAGE_CAP_BYTES) * 1000) / 10,
    };
  }

  private async getTotalBytes(): Promise<number> {
    const rows = await this.mediaModel.findAll({ attributes: ['sizeBytes'] });
    return rows.reduce((sum, row) => sum + row.sizeBytes, 0);
  }

  /** Evicts the oldest images first until total storage is back under the cap. */
  private async enforceQuota() {
    let total = await this.getTotalBytes();
    while (total > STORAGE_CAP_BYTES) {
      const oldest = await this.mediaModel.findOne({ order: [['createdAt', 'ASC']] });
      if (!oldest) break;
      this.logger.warn(
        `Storage cap exceeded (${total} bytes) — evicting oldest media ${oldest.id} (${oldest.sizeBytes} bytes) from article ${oldest.articleId}`,
      );
      total -= oldest.sizeBytes;
      await oldest.destroy();
    }
  }
}
