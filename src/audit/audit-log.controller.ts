import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';

@ApiTags('audit-log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('audit-log')
export class AuditLogController {
  constructor(private auditLogService: AuditLogService) {}

  @Get()
  findRecent(@Query('limit') limit?: string, @CurrentUser() user?: AuthenticatedUser) {
    const parsed = limit ? Math.min(parseInt(limit, 10) || 100, 500) : 100;
    // Fire-and-forget, same as every other audit call — never blocks the read.
    this.auditLogService.log({ action: 'audit_log_viewed', actorUserId: user?.id });
    return this.auditLogService.findRecent(parsed);
  }
}
