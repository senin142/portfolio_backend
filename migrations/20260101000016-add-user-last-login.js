'use strict';

// Tracks the last successful login per user. Used by UserCleanupService to
// decide which never-approved signups are stale enough to auto-delete --
// see that service's file comment for the full policy. No RLS/grant changes
// needed: `users` already has RLS enabled (20260101000009-enable-rls.js),
// which applies at the table level to every column.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'lastLoginAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'lastLoginAt');
  },
};
