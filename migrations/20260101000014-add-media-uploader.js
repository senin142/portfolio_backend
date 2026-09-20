'use strict';

// Tracks who uploaded each image so MediaService can enforce a per-user share
// of the shared storage cap -- without this, any account that can create an
// article (trivial via open signup) can upload enough images to evict every
// other author's images via the existing oldest-first global eviction
// (red-team report finding #10). No RLS/grant changes needed: `media` already
// has RLS enabled with zero policies (20260101000009-enable-rls.js), which
// applies at the table level to every column.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('media', 'uploadedByUserId', {
      type: Sequelize.UUID,
      allowNull: true, // nullable: pre-existing rows have no known uploader
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
    await queryInterface.addIndex('media', ['uploadedByUserId']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('media', 'uploadedByUserId');
  },
};
