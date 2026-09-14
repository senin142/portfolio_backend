'use strict';

// The app previously connected as the `postgres` superuser -- full control over the
// entire Supabase project (every schema, DDL, other tables), not just this app's 4
// tables. If backend/.env ever leaked, that's the whole project's blast radius, not
// just this app's data. This creates a dedicated least-privilege role instead.
//
// Since RLS is enabled with no policies (see migration 20260101000009), a normal
// non-superuser role would be blocked from everything by default -- so this also adds
// an explicit "full access for this role" policy per table. The app's own NestJS layer
// still does all the real authorization (JWT + RBAC); these policies just let the app's
// own connection do its job, without granting broader Postgres-level privileges.
//
// Requires DB_APP_ROLE_PASSWORD to be set (see .env.example) -- this migration will
// throw a clear error if it isn't, rather than silently using a weak/blank password.
const TABLES = ['users', 'articles', 'tags', 'article_tags', 'media'];
const ROLE = 'cms_app';

module.exports = {
  up: async (queryInterface) => {
    const password = process.env.DB_APP_ROLE_PASSWORD;
    if (!password) {
      throw new Error('DB_APP_ROLE_PASSWORD must be set to run this migration (see .env.example)');
    }

    const sequelize = queryInterface.sequelize;
    const [[{ exists }]] = await sequelize.query(
      `SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${ROLE}') AS exists`,
    );
    if (!exists) {
      await sequelize.query(`CREATE ROLE ${ROLE} WITH LOGIN PASSWORD '${password}'`);
    } else {
      await sequelize.query(`ALTER ROLE ${ROLE} WITH LOGIN PASSWORD '${password}'`);
    }

    await sequelize.query(`GRANT USAGE ON SCHEMA public TO ${ROLE}`);
    for (const table of TABLES) {
      await sequelize.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${table} TO ${ROLE}`);
      await sequelize.query(
        `DROP POLICY IF EXISTS ${ROLE}_full_access ON ${table}`,
      );
      await sequelize.query(
        `CREATE POLICY ${ROLE}_full_access ON ${table} FOR ALL TO ${ROLE} USING (true) WITH CHECK (true)`,
      );
    }
  },

  down: async (queryInterface) => {
    const sequelize = queryInterface.sequelize;
    for (const table of TABLES) {
      await sequelize.query(`DROP POLICY IF EXISTS ${ROLE}_full_access ON ${table}`);
      await sequelize.query(`REVOKE ALL ON ${table} FROM ${ROLE}`);
    }
    await sequelize.query(`REVOKE USAGE ON SCHEMA public FROM ${ROLE}`);
  },
};
