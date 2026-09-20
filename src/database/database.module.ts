import * as fs from 'fs';
import * as path from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from '../users/user.model';
import { Article } from '../articles/article.model';
import { Tag } from '../tags/tag.model';
import { ArticleTag } from '../tags/article-tag.model';
import { Media } from '../media/media.model';
import { RefreshToken } from '../auth/refresh-token.model';
import { AuditLog } from '../audit/audit-log.model';

// Supabase signs pooler certs with its own private root CA (not a public one),
// so Node's default trust store rejects it even though the connection is
// legitimate — pin the CA explicitly rather than falling back to
// rejectUnauthorized: false, which would accept ANY cert. See certs/README.md.
const supabaseCaPath = path.join(process.cwd(), 'certs', 'supabase-ca.pem');
const supabaseCa = fs.existsSync(supabaseCaPath) ? fs.readFileSync(supabaseCaPath, 'utf8') : undefined;

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
        dialectOptions: config.get<boolean>('database.ssl')
          ? { ssl: { require: true, rejectUnauthorized: true, ca: supabaseCa } }
          : {},
        models: [User, Article, Tag, ArticleTag, Media, RefreshToken, AuditLog],
        // Migrations own the schema; the app never auto-syncs it.
        synchronize: false,
        autoLoadModels: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
