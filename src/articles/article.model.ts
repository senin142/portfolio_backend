import { BelongsTo, BelongsToMany, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../users/user.model';
import { Tag } from '../tags/tag.model';
import { ArticleTag } from '../tags/article-tag.model';

@Table({ tableName: 'articles', timestamps: true })
export class Article extends Model<Article> {
  @ApiProperty()
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4 })
  id: string;

  @ApiProperty()
  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  slug: string;

  @ApiProperty()
  @Column({ type: DataType.STRING, allowNull: false })
  title: string;

  @ApiProperty()
  @Column({ type: DataType.TEXT, allowNull: false })
  body: string;

  @ApiProperty()
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  published: boolean;

  @ApiProperty()
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  authorId: string;

  @BelongsTo(() => User)
  author: User;

  @BelongsToMany(() => Tag, () => ArticleTag)
  tags: Tag[];
}
