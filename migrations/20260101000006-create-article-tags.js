'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('article_tags', {
      articleId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'articles', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      tagId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tags', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
    });

    await queryInterface.addConstraint('article_tags', {
      fields: ['articleId', 'tagId'],
      type: 'primary key',
      name: 'article_tags_pkey',
    });
    await queryInterface.addIndex('article_tags', ['tagId']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('article_tags');
  },
};
