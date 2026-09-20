import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { User } from './user.model';
import { Role } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { AuditLogService } from '../audit/audit-log.service';
import { deletionCutoffDate } from './pending-account-policy';

/**
 * Auto-deletes public signups that were never approved within
 * PENDING_ACCOUNT_TTL_DAYS (pending-account-policy.ts) — cleans up abandoned
 * demo/test accounts on a portfolio project that takes open signups.
 *
 * Scope is deliberately narrow, by design (not an oversight):
 * - Only `status === PENDING` accounts. An `ACTIVE` account is never touched,
 *   no matter how inactive — this can't silently delete a real editor and
 *   cascade-wipe their published articles/media.
 * - `role !== ADMIN` as a second, redundant safety check. Every PENDING
 *   account is created as EDITOR (AuthService.signup hardcodes this) and
 *   there's no path to make one an ADMIN while still PENDING, so this
 *   condition is currently unreachable — kept anyway as defense in depth,
 *   cheaper than the alternative of it silently becoming reachable later.
 * - A PENDING account can never have logged in (AuthService.login rejects
 *   it), so it can never have created an article (JwtAuthGuard requires a
 *   token, which login never issued) or uploaded media. Deleting one only
 *   ever removes an empty user row — the cascade defined on
 *   articles.authorId (ON DELETE CASCADE) never actually fires here.
 */
@Injectable()
export class UserCleanupService {
  private readonly logger = new Logger(UserCleanupService.name);

  constructor(
    @InjectModel(User) private userModel: typeof User,
    private auditLogService: AuditLogService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async deleteStalePendingAccounts(): Promise<number> {
    // Pending accounts never log in, so lastLoginAt is always null for the
    // rows this query matches — createdAt alone is equivalent to
    // pending-account-policy.ts's general lastLoginAt-or-createdAt rule here.
    const cutoff = deletionCutoffDate();
    const stale = await this.userModel.findAll({
      where: {
        status: UserStatus.PENDING,
        role: { [Op.ne]: Role.ADMIN },
        createdAt: { [Op.lt]: cutoff },
      },
    });

    for (const user of stale) {
      this.logger.warn(
        `Auto-deleting stale pending account ${user.id} (${user.email}), created ${user.createdAt.toISOString()}`,
      );
      this.auditLogService.log({
        action: 'user_auto_deleted',
        targetType: 'user',
        targetId: user.id,
        metadata: { email: user.email, reason: 'pending_account_ttl_exceeded' },
      });
      await user.destroy();
    }

    return stale.length;
  }
}
