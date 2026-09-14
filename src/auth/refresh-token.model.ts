import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from '../users/user.model';

@Table({ tableName: 'refresh_tokens', timestamps: true, updatedAt: false })
export class RefreshToken extends Model<RefreshToken> {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4 })
  id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  userId: string;

  @BelongsTo(() => User)
  user: User;

  // Never store the raw token — only a SHA-256 hash of it, same principle as password
  // hashing. If this table ever leaked, the hashes alone can't be used to log in.
  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  tokenHash: string;

  @Column({ type: DataType.DATE, allowNull: false })
  expiresAt: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  revokedAt: Date | null;
}
