'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('articles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      slug: { type: Sequelize.STRING, allowNull: false, unique: true },
      title: { type: Sequelize.STRING, allowNull: false },
      body: { type: Sequelize.TEXT, allowNull: false },
      published: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      authorId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('articles', ['authorId']);
    await queryInterface.addIndex('articles', ['published']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('articles');
  },
};
