'use strict';

// Closes the other half of red-team report finding #2: public signup
// previously auto-granted a fully-working EDITOR account with no approval
// step. New signups now land as 'pending' (see AuthService.signup) and can't
// log in (AuthService.login) until an admin approves them
// (UsersService.approve / PATCH /users/:id/approve). Default 'active' means
// every pre-existing row (the seeded admin/editor demo accounts) keeps
// working with no backfill needed. No RLS/grant changes needed: `users`
// already has RLS enabled (20260101000009-enable-rls.js), which applies at
// the table level to every column.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'status', {
      type: Sequelize.ENUM('pending', 'active'),
      allowNull: false,
      defaultValue: 'active',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'status');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_status"');
  },
};
