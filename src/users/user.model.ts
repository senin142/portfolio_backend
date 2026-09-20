import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { Article } from '../articles/article.model';

@Table({ tableName: 'users', timestamps: true })
export class User extends Model<User> {
  @ApiProperty()
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4 })
  id: string;

  @ApiProperty()
  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  email: string;

  @Column({ type: DataType.STRING, allowNull: false })
  passwordHash: string;

  @ApiProperty()
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({ enum: Role })
  @Column({ type: DataType.ENUM(...Object.values(Role)), allowNull: false, defaultValue: Role.EDITOR })
  role: Role;

  // 'pending' accounts (public self-signups) can't log in until an admin
  // approves them — see AuthService.login / UsersService.approve.
  @ApiProperty({ enum: UserStatus })
  @Column({ type: DataType.ENUM(...Object.values(UserStatus)), allowNull: false, defaultValue: UserStatus.ACTIVE })
  status: UserStatus;

  // Null until the first successful login. A 'pending' account can never log
  // in (AuthService.login rejects it), so this stays null for the whole
  // window UserCleanupService cares about — see that file for the policy.
  @Column({ type: DataType.DATE, allowNull: true })
  lastLoginAt: Date | null;

  // Populated by Sequelize via `timestamps: true` above — declared here
  // (no @Column) purely so TypeScript knows the property exists; no model
  // in this codebase had needed to read it directly until UserCleanupService.
  @ApiProperty()
  readonly createdAt: Date;

  @HasMany(() => Article, { foreignKey: 'authorId' })
  articles: Article[];

  toJSON() {
    const values = { ...this.get() } as Partial<User>;
    delete values.passwordHash;
    return values;
  }
}
