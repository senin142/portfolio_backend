import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../common/enums/role.enum';
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

  @HasMany(() => Article, { foreignKey: 'authorId' })
  articles: Article[];

  toJSON() {
    const values = { ...this.get() } as Partial<User>;
    delete values.passwordHash;
    return values;
  }
}
