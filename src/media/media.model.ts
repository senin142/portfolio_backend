import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Article } from '../articles/article.model';

@Table({ tableName: 'media', timestamps: true })
export class Media extends Model<Media> {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4 })
  id: string;

  @ForeignKey(() => Article)
  @Column({ type: DataType.UUID, allowNull: false })
  articleId: string;

  @BelongsTo(() => Article)
  article: Article;

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
