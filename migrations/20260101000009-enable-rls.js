'use strict';

// Supabase's auto-generated PostgREST API exposes any table without Row Level
// Security to anyone holding the public "publishable" key — this only gets
// prevented automatically when a table is created through Supabase's own UI,
// which nudges you to enable RLS. Tables created via raw migrations (like this
// project's) don't get that nudge and default to fully public. This app's own
// connection uses the `postgres` superuser, which bypasses RLS entirely, so
// enabling it here with zero policies only blocks the anon/authenticated
// PostgREST roles — nothing else changes.
const TABLES = ['users', 'articles', 'tags', 'article_tags', 'media'];

module.exports = {
  up: async (queryInterface) => {
    for (const table of TABLES) {
      await queryInterface.sequelize.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    }
  },

  down: async (queryInterface) => {
    for (const table of TABLES) {
      await queryInterface.sequelize.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
    }
  },
};
