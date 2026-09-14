'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('refresh_tokens', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      tokenHash: { type: Sequelize.STRING, allowNull: false, unique: true },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      revokedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('refresh_tokens', ['userId']);
    await queryInterface.addIndex('refresh_tokens', ['tokenHash']);

    await queryInterface.sequelize.query('ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY');
    await queryInterface.sequelize.query(
      'CREATE POLICY cms_app_full_access ON refresh_tokens FOR ALL TO cms_app USING (true) WITH CHECK (true)',
    );
    await queryInterface.sequelize.query('GRANT SELECT, INSERT, UPDATE, DELETE ON refresh_tokens TO cms_app');
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('refresh_tokens');
  },
};
