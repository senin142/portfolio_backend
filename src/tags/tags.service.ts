import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Tag } from './tag.model';

function normalize(name: string) {
  return name.trim().toLowerCase();
}

@Injectable()
export class TagsService {
  constructor(@InjectModel(Tag) private tagModel: typeof Tag) {}

  async findAll() {
    return this.tagModel.findAll({ order: [['name', 'ASC']] });
  }

  async findOrCreateMany(names: string[] = []): Promise<Tag[]> {
    const unique = [...new Set(names.map(normalize).filter(Boolean))];
    return Promise.all(
      unique.map(async (name) => {
        const [tag] = await this.tagModel.findOrCreate({ where: { name }, defaults: { name } as Tag });
        return tag;
      }),
    );
  }
}
