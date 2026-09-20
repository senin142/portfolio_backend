import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AuditLog } from './audit-log.model';

export type AuditAction =
  | 'login_success'
  | 'login_failed'
  | 'signup'
  | 'logout'
  | 'user_role_changed'
  | 'user_deleted'
  | 'article_deleted'
  | 'refresh_token_reuse_detected';

@Injectable()
export class AuditLogService {
  constructor(@InjectModel(AuditLog) private auditLogModel: typeof AuditLog) {}

  log(params: {
    action: AuditAction;
    actorUserId?: string | null;
    actorEmail?: string | null;
    targetType?: string | null;
    targetId?: string | null;
    metadata?: Record<string, unknown> | null;
    ipAddress?: string | null;
  }) {
    // Fire-and-forget: audit logging must never block or fail the request it's
    // recording. A missed log entry is far cheaper than a broken login.
    return this.auditLogModel
      .create({
        action: params.action,
        actorUserId: params.actorUserId ?? null,
        actorEmail: params.actorEmail ?? null,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        metadata: params.metadata ?? null,
        ipAddress: params.ipAddress ?? null,
      } as AuditLog)
      .catch(() => undefined);
  }

  findRecent(limit = 100) {
    return this.auditLogModel.findAll({ order: [['createdAt', 'DESC']], limit });
  }
}
