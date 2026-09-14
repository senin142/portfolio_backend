'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('media', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      articleId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'articles', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      filename: { type: Sequelize.STRING, allowNull: false },
      mimeType: { type: Sequelize.STRING, allowNull: false },
      sizeBytes: { type: Sequelize.INTEGER, allowNull: false },
      resized: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      data: { type: Sequelize.BLOB('long'), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('media', ['articleId']);
    await queryInterface.addIndex('media', ['createdAt']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('media');
  },
};
