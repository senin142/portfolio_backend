import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Article } from '../articles/article.model';
import { Tag } from './tag.model';

@Table({ tableName: 'article_tags', timestamps: false })
export class ArticleTag extends Model<ArticleTag> {
  @ForeignKey(() => Article)
  @Column({ type: DataType.UUID, allowNull: false })
  articleId: string;

  @ForeignKey(() => Tag)
  @Column({ type: DataType.UUID, allowNull: false })
  tagId: string;

  @BelongsTo(() => Article)
  article: Article;

  @BelongsTo(() => Tag)
  tag: Tag;
}
