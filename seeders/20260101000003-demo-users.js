'use strict';
const bcrypt = require('bcrypt');

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const EDITOR_ID = '22222222-2222-4222-8222-222222222222';

module.exports = {
  up: async (queryInterface) => {
    const passwordHash = await bcrypt.hash('password123', 10);
    const now = new Date();

    await queryInterface.bulkInsert('users', [
      {
        id: ADMIN_ID,
        email: 'admin@example.com',
        passwordHash,
        name: 'Alex Morgan',
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: EDITOR_ID,
        email: 'editor@example.com',
        passwordHash,
        name: 'Jordan Lee',
        role: 'editor',
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('users', { email: ['admin@example.com', 'editor@example.com'] });
  },
};

module.exports.ADMIN_ID = ADMIN_ID;
module.exports.EDITOR_ID = EDITOR_ID;
