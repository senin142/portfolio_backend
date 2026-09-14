import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Media } from './media.model';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { PublicMediaController } from './public-media.controller';
import { ArticlesModule } from '../articles/articles.module';

@Module({
  imports: [SequelizeModule.forFeature([Media]), ArticlesModule],
  providers: [MediaService],
  controllers: [MediaController, PublicMediaController],
})
export class MediaModule {}
