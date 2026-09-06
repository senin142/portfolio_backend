import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from '../users/user.model';
import { Article } from '../articles/article.model';
import { Tag } from '../tags/tag.model';
import { ArticleTag } from '../tags/article-tag.model';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        dialect: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        models: [User, Article, Tag, ArticleTag],
        // Migrations own the schema; the app never auto-syncs it.
        synchronize: false,
        autoLoadModels: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
