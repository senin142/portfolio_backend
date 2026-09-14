'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('audit_logs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      action: { type: Sequelize.STRING, allowNull: false },
      actorUserId: { type: Sequelize.UUID, allowNull: true },
      actorEmail: { type: Sequelize.STRING, allowNull: true },
      targetType: { type: Sequelize.STRING, allowNull: true },
      targetId: { type: Sequelize.STRING, allowNull: true },
      metadata: { type: Sequelize.JSONB, allowNull: true },
      ipAddress: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('audit_logs', ['createdAt']);
    await queryInterface.addIndex('audit_logs', ['actorUserId']);

    // See 20260101000009-enable-rls.js — any table added outside Supabase's own UI
    // needs this explicitly, it's not automatic.
    await queryInterface.sequelize.query('ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY');
    await queryInterface.sequelize.query(
      'CREATE POLICY cms_app_full_access ON audit_logs FOR ALL TO cms_app USING (true) WITH CHECK (true)',
    );
    await queryInterface.sequelize.query('GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs TO cms_app');
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('audit_logs');
  },
};
