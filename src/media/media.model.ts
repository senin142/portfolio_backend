import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Article } from '../articles/article.model';
import { User } from '../users/user.model';

@Table({ tableName: 'media', timestamps: true })
export class Media extends Model<Media> {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4 })
  id: string;

  @ForeignKey(() => Article)
  @Column({ type: DataType.UUID, allowNull: false })
  articleId: string;

  @BelongsTo(() => Article)
  article: Article;

  // Nullable: rows created before this column existed have no known uploader.
  // Used to enforce a per-user share of the shared storage cap — see
  // MediaService.MAX_PER_USER_BYTES.
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  uploadedByUserId: string | null;

  @Column({ type: DataType.STRING, allowNull: false })
  filename: string;

  @Column({ type: DataType.STRING, allowNull: false })
  mimeType: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  sizeBytes: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  resized: boolean;

  @Column({ type: DataType.BLOB('long'), allowNull: false })
  data: Buffer;
}
