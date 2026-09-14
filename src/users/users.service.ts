import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcrypt';
import { User } from './user.model';
import { Role } from '../common/enums/role.enum';
import { AuditLogService } from '../audit/audit-log.service';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private userModel: typeof User,
    private auditLogService: AuditLogService,
  ) {}

  findAll() {
    return this.userModel.findAll({ order: [['createdAt', 'DESC']] });
  }

  findById(id: string) {
    return this.userModel.findByPk(id);
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ where: { email } });
  }

  async create(params: { email: string; password: string; name: string; role?: Role }) {
    const existing = await this.findByEmail(params.email);
    if (existing) throw new ConflictException('A user with this email already exists');

    const passwordHash = await bcrypt.hash(params.password, SALT_ROUNDS);
    return this.userModel.create({
      email: params.email,
      passwordHash,
      name: params.name,
      role: params.role ?? Role.EDITOR,
    } as User);
  }

  async updateRole(id: string, role: Role, actorUserId?: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    const previousRole = user.role;
    user.role = role;
    await user.save();
    this.auditLogService.log({
      action: 'user_role_changed',
      actorUserId,
      targetType: 'user',
      targetId: user.id,
      metadata: { from: previousRole, to: role },
    });
    return user;
  }

  async remove(id: string, actorUserId?: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await user.destroy();
    this.auditLogService.log({
      action: 'user_deleted',
      actorUserId,
      targetType: 'user',
      targetId: id,
      metadata: { email: user.email },
    });
  }

  async validateCredentials(email: string, password: string) {
    const user = await this.findByEmail(email);
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    return isMatch ? user : null;
  }
}
