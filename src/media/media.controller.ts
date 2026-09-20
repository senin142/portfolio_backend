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
import { ALLOWED_MIME_TYPES, MediaService } from './media.service';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';

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
    // Cheap first-pass only — checks the client-declared Content-Type so an
    // obviously-wrong upload gets rejected before its body is even buffered.
    // This is NOT the real security gate: MediaService.upload sniffs the
    // actual file signature (file-type) and treats THAT as the source of
    // truth, since Content-Type here is attacker-controlled.
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
    @CurrentUser() user: AuthenticatedUser,
    @Query('resize') resize?: string,
  ) {
    return this.mediaService.upload(articleId, file, resize === 'true', user);
  }

  @Delete('articles/:articleId')
  remove(@Param('articleId', ParseUUIDPipe) articleId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.mediaService.removeByArticleId(articleId, user);
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
