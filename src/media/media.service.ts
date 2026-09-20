import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import sharp from 'sharp';
import { fromBuffer as detectFileType } from 'file-type';
import { Media } from './media.model';
import { ArticlesService } from '../articles/articles.service';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { assertOwnerOrAdmin } from '../common/authorization';
import { Role } from '../common/enums/role.enum';

export const STORAGE_CAP_BYTES = 150 * 1024 * 1024; // 150 MB — keeps well under Supabase's free-tier 500MB DB cap
// Bounds how much of the shared cap a single non-admin account can consume.
// Without this, any account that can create an article (trivial via open
// signup — see red-team report finding #2) could upload enough images across
// its own articles to trigger the oldest-first global eviction below and wipe
// out every OTHER author's images too (finding #10). Admins are exempt — the
// cap exists to bound one untrusted account's blast radius, not to limit
// legitimate admin use.
const MAX_PER_USER_BYTES = Math.floor(STORAGE_CAP_BYTES / 5); // 30MB
const RESIZE_MAX_WIDTH = 1600;
const RESIZE_JPEG_QUALITY = 80;
// ~50 megapixels — generous for a CMS hero image, small enough to stop a
// decompression bomb (a tiny file declaring an enormous canvas) from getting
// fully decoded into memory. Applies before resize AND on the non-resize path.
const MAX_INPUT_PIXELS = 50_000_000;
// Single source of truth for allowed image types — checked twice: a fast,
// cheap pre-check in the controller's fileFilter (client-declared
// Content-Type, rejects obviously-wrong uploads before buffering), and the
// real gate here against the file's actual sniffed content.
export const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

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

    // The controller's fileFilter only checked the client-declared
    // Content-Type, which is attacker-controlled — sniff the actual file
    // signature here and use IT as the source of truth for what gets stored
    // and served back, not whatever the upload claimed to be.
    const detected = await detectFileType(file.buffer);
    if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
      throw new BadRequestException(
        `File content does not match an allowed image type (detected: ${detected?.mime ?? 'unknown'})`,
      );
    }

    // limitInputPixels rejects a decompression bomb (tiny file, huge declared
    // canvas) before libvips fully decodes it — .metadata() forces that check
    // even when resize isn't requested, since the resize branch below is the
    // only place sharp would otherwise run.
    const image = sharp(file.buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' });
    await image.metadata();

    let buffer: Buffer = file.buffer;
    let mimeType = detected.mime;
    let resized = false;

    if (resize) {
      buffer = await image
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

    // One image per article — replace whatever was there before. Do this
    // before the per-user cap check so replacing your OWN article's image
    // doesn't double-count its old bytes against your share.
    await this.mediaModel.destroy({ where: { articleId } });

    if (user.role !== Role.ADMIN) {
      const userTotal = await this.getUserTotalBytes(user.id);
      if (userTotal + buffer.length > MAX_PER_USER_BYTES) {
        throw new BadRequestException(
          `This upload would put your own images at ${((userTotal + buffer.length) / 1024 / 1024).toFixed(1)}MB, over your ${(MAX_PER_USER_BYTES / 1024 / 1024).toFixed(0)}MB share of the shared ${STORAGE_CAP_BYTES / 1024 / 1024}MB cap`,
        );
      }
    }

    const media = await this.mediaModel.create({
      articleId,
      filename: file.originalname,
      mimeType,
      sizeBytes: buffer.length,
      resized,
      uploadedByUserId: user.id,
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

  private async getUserTotalBytes(userId: string): Promise<number> {
    const rows = await this.mediaModel.findAll({ where: { uploadedByUserId: userId }, attributes: ['sizeBytes'] });
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
