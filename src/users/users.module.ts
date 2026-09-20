import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from './user.model';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserCleanupService } from './user-cleanup.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [SequelizeModule.forFeature([User]), AuditModule],
  providers: [UsersService, UserCleanupService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
