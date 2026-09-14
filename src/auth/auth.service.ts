import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { RefreshToken } from './refresh-token.model';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit/audit-log.service';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/user.model';

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

  async signup(params: { email: string; password: string; name: string }, ctx: RequestContext = {}) {
    // Public signup always creates an editor; only an existing admin can promote users.
    const user = await this.usersService.create({ ...params, role: Role.EDITOR });
    this.auditLogService.log({
      action: 'signup',
      actorUserId: user.id,
      actorEmail: user.email,
      ipAddress: ctx.ipAddress,
    });
    return this.buildTokenResponse(user);
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

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    stored.revokedAt = new Date();
    await stored.save();

    const user = await this.usersService.findById(stored.userId);
    if (!user) throw new UnauthorizedException('Invalid or expired refresh token');

    return this.buildTokenResponse(user);
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

  private async buildTokenResponse(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    const rawRefreshToken = crypto.randomBytes(40).toString('base64url');
    const refreshDays = this.config.get<number>('jwt.refreshExpiresInDays') ?? 30;
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);
    await this.refreshTokenModel.create({
      userId: user.id,
      tokenHash: this.hashToken(rawRefreshToken),
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
