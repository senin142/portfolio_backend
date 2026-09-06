import { BelongsToMany, Column, DataType, Model, Table } from 'sequelize-typescript';
import { ApiProperty } from '@nestjs/swagger';
import { Article } from '../articles/article.model';
import { ArticleTag } from './article-tag.model';

@Table({ tableName: 'tags', timestamps: false })
export class Tag extends Model<Tag> {
  @ApiProperty()
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4 })
  id: string;

  @ApiProperty()
  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  name: string;

  @BelongsToMany(() => Article, () => ArticleTag)
  articles: Article[];
}
