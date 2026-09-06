'use strict';
const { randomUUID } = require('crypto');

const ARTICLE_TAGS = {
  'welcome-to-our-platform': ['announcements', 'company'],
  'how-to-reset-your-password': ['product', 'engineering'],
  'new-product-launch-2026': ['product', 'announcements'],
  'q1-earnings-report': ['company', 'announcements'],
  'spring-office-hours': ['announcements', 'company'],
  'customer-support-hours': ['product', 'announcements'],
  'terms-of-service-update': ['policy', 'company'],
  'privacy-policy-update': ['policy', 'security'],
  'we-are-hiring': ['hiring', 'company'],
  'interview-with-the-ceo': ['company', 'community'],
  'sustainability-initiative': ['company', 'announcements'],
  'mobile-app-release-notes': ['product', 'engineering'],
  'holiday-schedule': ['announcements', 'company'],
  'strategic-partnership-announcement': ['company', 'announcements'],
  'community-event-recap': ['community', 'announcements'],
  'security-advisory-march': ['security', 'engineering'],
  'api-changelog-august': ['engineering', 'product'],
  'annual-report-highlights': ['company', 'announcements'],
};

const ALL_TAG_NAMES = [...new Set(Object.values(ARTICLE_TAGS).flat())];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert(
      'tags',
      ALL_TAG_NAMES.map((name) => ({ id: randomUUID(), name })),
    );

    const [tagRows] = await queryInterface.sequelize.query('SELECT id, name FROM tags');
    const [articleRows] = await queryInterface.sequelize.query('SELECT id, slug FROM articles');
    const tagIdByName = Object.fromEntries(tagRows.map((t) => [t.name, t.id]));
    const articleIdBySlug = Object.fromEntries(articleRows.map((a) => [a.slug, a.id]));

    const joinRows = [];
    for (const [slug, tagNames] of Object.entries(ARTICLE_TAGS)) {
      const articleId = articleIdBySlug[slug];
      if (!articleId) continue;
      for (const tagName of tagNames) {
        joinRows.push({ articleId, tagId: tagIdByName[tagName] });
      }
    }

    await queryInterface.bulkInsert('article_tags', joinRows);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('tags', { name: ALL_TAG_NAMES });
  },
};
