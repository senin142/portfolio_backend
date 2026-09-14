import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { MediaService } from './media.service';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.EDITOR)
@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Get('usage')
  usage() {
    return this.mediaService.getUsage();
  }

  @Post('articles/:articleId')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES },
      fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          cb(new BadRequestException(`Unsupported file type "${file.mimetype}" — only JPEG, PNG, WEBP, or GIF images are allowed`), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(
    @Param('articleId', ParseUUIDPipe) articleId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('resize') resize?: string,
  ) {
    return this.mediaService.upload(articleId, file, resize === 'true');
  }

  @Delete('articles/:articleId')
  remove(@Param('articleId', ParseUUIDPipe) articleId: string) {
    return this.mediaService.removeByArticleId(articleId);
  }

  // Authenticated preview for the dashboard — works for draft/unpublished articles too,
  // unlike PublicMediaController's route which only ever serves published ones.
  @Get('articles/:articleId')
  async get(@Param('articleId', ParseUUIDPipe) articleId: string, @Res() res: Response) {
    const media = await this.mediaService.getByArticleId(articleId);
    res.setHeader('Content-Type', media.mimeType);
    res.send(media.data);
  }
}
