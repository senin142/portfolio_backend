import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { RefreshToken } from './refresh-token.model';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit/audit-log.service';
import { Role } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { User } from '../users/user.model';
import { daysRemainingUntilAutoDeletion, deletionReferenceDate } from '../users/pending-account-policy';

interface RequestContext {
  ipAddress?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(RefreshToken) private refreshTokenModel: typeof RefreshToken,
    private usersService: UsersService,
    private jwtService: JwtService,
    private auditLogService: AuditLogService,
    private config: ConfigService,
  ) {}

  /** Public signup always creates an editor, and — since anyone with an email
   * can call this — always lands 'pending' rather than auto-granting a
   * working account. No tokens are issued; an admin must approve
   * (UsersService.approve) before the account can log in. See
   * RED_TEAM_REPORT.md finding #2. */
  async signup(params: { email: string; password: string; name: string }, ctx: RequestContext = {}) {
    const user = await this.usersService.create({ ...params, role: Role.EDITOR, status: UserStatus.PENDING });
    this.auditLogService.log({
      action: 'signup',
      actorUserId: user.id,
      actorEmail: user.email,
      ipAddress: ctx.ipAddress,
    });
    return {
      pending: true as const,
      message: 'Account created. An admin needs to approve it before you can log in.',
    };
  }

  async login(email: string, password: string, ctx: RequestContext = {}) {
    const user = await this.usersService.validateCredentials(email, password);
    if (!user) {
      this.auditLogService.log({
        action: 'login_failed',
        actorEmail: email,
        ipAddress: ctx.ipAddress,
      });
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status !== UserStatus.ACTIVE) {
      this.auditLogService.log({
        action: 'login_failed',
        actorUserId: user.id,
        actorEmail: user.email,
        ipAddress: ctx.ipAddress,
        metadata: { reason: 'pending_approval' },
      });
      // A pending account can never successfully log in, so this rejection
      // is the only "login" event it ever has — surface the auto-deletion
      // countdown here rather than a separate notification mechanism (see
      // UserCleanupService for the policy this describes).
      const daysLeft = daysRemainingUntilAutoDeletion(deletionReferenceDate(user));
      throw new UnauthorizedException(
        `Your account is pending admin approval. If it isn't approved first, it will be automatically deleted in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
      );
    }
    user.lastLoginAt = new Date();
    await user.save();
    this.auditLogService.log({
      action: 'login_success',
      actorUserId: user.id,
      actorEmail: user.email,
      ipAddress: ctx.ipAddress,
    });
    return this.buildTokenResponse(user);
  }

  /** Rotates the refresh token: the old one is revoked, a new pair is issued. Rotation
   * means a stolen-and-reused refresh token gets detected (the legitimate owner's next
   * refresh attempt fails because their token was already consumed by the thief), not
   * just accepted forever like the raw JWT it replaces. */
  async refresh(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.refreshTokenModel.findOne({ where: { tokenHash } });

    if (!stored) throw new UnauthorizedException('Invalid or expired refresh token');

    if (stored.revokedAt) {
      // This exact token was already rotated once — someone presenting it again
      // is either the legitimate owner replaying an old request, or an attacker
      // who stole it before the legitimate owner's next refresh. We can't tell
      // which, so treat it as theft: kill every session descended from this
      // token's login (its whole family), not just this one token.
      await this.refreshTokenModel.update(
        { revokedAt: new Date() },
        { where: { familyId: stored.familyId, revokedAt: null } },
      );
      this.auditLogService.log({
        action: 'refresh_token_reuse_detected',
        actorUserId: stored.userId,
        targetType: 'refresh_token_family',
        targetId: stored.familyId,
      });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    stored.revokedAt = new Date();
    await stored.save();

    const user = await this.usersService.findById(stored.userId);
    if (!user) throw new UnauthorizedException('Invalid or expired refresh token');

    return this.buildTokenResponse(user, stored.familyId);
  }

  async logout(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.refreshTokenModel.findOne({ where: { tokenHash } });
    if (stored && !stored.revokedAt) {
      stored.revokedAt = new Date();
      await stored.save();
      this.auditLogService.log({ action: 'logout', actorUserId: stored.userId });
    }
  }

  /** familyId: omit to start a new family (fresh login/signup); pass the
   * previous token's familyId to continue it (rotation via refresh()). */
  private async buildTokenResponse(user: User, familyId: string = crypto.randomUUID()) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    const rawRefreshToken = crypto.randomBytes(40).toString('base64url');
    const refreshDays = this.config.get<number>('jwt.refreshExpiresInDays') ?? 30;
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);
    await this.refreshTokenModel.create({
      userId: user.id,
      tokenHash: this.hashToken(rawRefreshToken),
      familyId,
      expiresAt,
    } as RefreshToken);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }
}
