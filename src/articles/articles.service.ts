import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Op } from 'sequelize';
import { Article } from './article.model';
import { User } from '../users/user.model';
import { Tag } from '../tags/tag.model';
import { ArticleTag } from '../tags/article-tag.model';
import { TagsService } from '../tags/tags.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';

const includeAll = [
  { model: User, attributes: ['id', 'name', 'email'] },
  { model: Tag, through: { attributes: [] } },
];

@Injectable()
export class ArticlesService {
  constructor(
    @InjectModel(Article) private articleModel: typeof Article,
    @InjectModel(ArticleTag) private articleTagModel: typeof ArticleTag,
    private tagsService: TagsService,
    private events: EventEmitter2,
  ) {}

  async findAll(query: QueryArticleDto) {
    const where: Record<string, unknown> = {};

    if (query.search) {
      where.title = { [Op.iLike]: `%${query.search}%` };
    }
    if (query.published !== undefined) {
      where.published = query.published === 'true';
    }

    return this.articleModel.findAll({ where, include: includeAll, order: [['createdAt', 'DESC']] });
  }

  async findById(id: string) {
    const article = await this.articleModel.findByPk(id, { include: includeAll });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  async create(dto: CreateArticleDto, authorId: string) {
    await this.assertSlugAvailable(dto.slug);
    const { tags, ...rest } = dto;
    const article = await this.articleModel.create({ ...rest, authorId } as Article);
    if (tags) await this.syncTags(article, tags);
    const created = await this.findById(article.id);
    if (created.published) this.emitPublished(created);
    return created;
  }

  async update(id: string, dto: UpdateArticleDto) {
    const article = await this.findById(id);
    const wasPublished = article.published;
    if (dto.slug && dto.slug !== article.slug) {
      await this.assertSlugAvailable(dto.slug);
    }
    const { tags, ...rest } = dto;
    await article.update(rest);
    if (tags) await this.syncTags(article, tags);
    const updated = await this.findById(id);
    if (!wasPublished && updated.published) this.emitPublished(updated);
    return updated;
  }

  async setPublished(id: string, published: boolean) {
    const article = await this.findById(id);
    const wasPublished = article.published;
    article.published = published;
    await article.save();

    if (published && !wasPublished) this.emitPublished(article);
    return article;
  }

  private emitPublished(article: Article) {
    this.events.emit('article.published', {
      id: article.id,
      slug: article.slug,
      title: article.title,
      tags: article.tags.map((t) => t.name),
    });
  }

  async remove(id: string) {
    const article = await this.findById(id);
    await article.destroy();
  }

  // ---------- Public (unauthenticated) reads ----------

  async findPublished(tagName?: string) {
    const where: Record<string, unknown> = { published: true };

    if (tagName) {
      // Resolve matching article IDs first, rather than filtering the include directly —
      // a `where` on an included association also filters which rows come back in it,
      // which would leave each article showing only the one tag it was matched by.
      const rows = await this.articleTagModel.findAll({
        include: [{ model: Tag, where: { name: tagName }, attributes: [] }],
        attributes: ['articleId'],
      });
      const ids = rows.map((r) => r.articleId);
      if (ids.length === 0) return [];
      where.id = ids;
    }

    return this.articleModel.findAll({ where, include: includeAll, order: [['createdAt', 'DESC']] });
  }

  async findPublishedBySlug(slug: string) {
    const article = await this.articleModel.findOne({ where: { slug, published: true }, include: includeAll });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  /** Other published articles sharing at least one tag, ranked by number of shared tags. */
  async findRelated(articleId: string, limit = 4) {
    const article = await this.findById(articleId);
    const tagIds = article.tags.map((t) => t.id);
    if (tagIds.length === 0) return [];

    const rows = await this.articleTagModel.findAll({
      where: { tagId: tagIds, articleId: { [Op.ne]: articleId } },
    });

    const scoreByArticleId = new Map<string, number>();
    for (const row of rows) {
      scoreByArticleId.set(row.articleId, (scoreByArticleId.get(row.articleId) ?? 0) + 1);
    }

    const rankedIds = [...scoreByArticleId.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
    if (rankedIds.length === 0) return [];

    const related = await this.articleModel.findAll({
      where: { id: rankedIds, published: true },
      include: includeAll,
    });
    // Preserve the relevance ranking (findAll with an IN clause doesn't).
    return rankedIds.map((id) => related.find((a) => a.id === id)).filter((a): a is Article => Boolean(a));
  }

  private async assertSlugAvailable(slug: string) {
    const existing = await this.articleModel.findOne({ where: { slug } });
    if (existing) throw new ConflictException('An article with this slug already exists');
  }

  private async syncTags(article: Article, tagNames: string[]) {
    const tags = await this.tagsService.findOrCreateMany(tagNames);
    await article.$set('tags', tags);
  }
}
