import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'audit_logs', timestamps: true, updatedAt: false })
export class AuditLog extends Model<AuditLog> {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4 })
  id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  action: string;

  // Nullable: a failed login has no user id, only the email they tried.
  @Column({ type: DataType.UUID, allowNull: true })
  actorUserId: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  actorEmail: string | null;

  // What the action was done to, when it's not the actor themself — e.g. "user"/<id>
  // for a role change, "article"/<id> for a delete.
  @Column({ type: DataType.STRING, allowNull: true })
  targetType: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  targetId: string | null;

  @Column({ type: DataType.JSONB, allowNull: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: DataType.STRING, allowNull: true })
  ipAddress: string | null;
}
