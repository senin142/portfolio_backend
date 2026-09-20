'use strict';

// Reuse of an already-rotated refresh token is a strong signal it was stolen --
// grouping tokens into a family lets AuthService.refresh() revoke every session
// descended from one login the instant that's detected, not just the one reused
// token (red-team report finding #8). RLS/grants on this table are already set
// by 20260101000012-create-refresh-tokens.js and cover all columns -- no change
// needed here.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('refresh_tokens', 'familyId', {
      type: Sequelize.UUID,
      allowNull: true,
    });
    // Backfill: each pre-existing token becomes its own family. We don't know
    // its true lineage retroactively, and treating it as a lone family is the
    // safe default -- it can't accidentally merge two unrelated sessions.
    await queryInterface.sequelize.query('UPDATE refresh_tokens SET "familyId" = id WHERE "familyId" IS NULL');
    await queryInterface.changeColumn('refresh_tokens', 'familyId', {
      type: Sequelize.UUID,
      allowNull: false,
    });
    await queryInterface.addIndex('refresh_tokens', ['familyId']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('refresh_tokens', 'familyId');
  },
};
