'use strict';
const { randomUUID } = require('crypto');

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const EDITOR_ID = '22222222-2222-4222-8222-222222222222';

const articles = [
  {
    slug: 'welcome-to-our-platform',
    title: 'Welcome to Our Platform',
    body: 'We are excited to launch our new platform, built to serve our community across the region with fast, reliable, and accessible services.',
    published: true,
    authorId: ADMIN_ID,
  },
  {
    slug: 'how-to-reset-your-password',
    title: 'How to Reset Your Password',
    body: 'If you have forgotten your password, click "Forgot password" on the login screen and follow the instructions sent to your registered email.',
    published: true,
    authorId: EDITOR_ID,
  },
  {
    slug: 'new-product-launch-2026',
    title: 'New Product Launch: 2026 Lineup',
    body: 'Our 2026 product lineup introduces faster performance, a redesigned interface, and deeper integration with third-party tools.',
    published: true,
    authorId: EDITOR_ID,
  },
  {
    slug: 'q1-earnings-report',
    title: 'Q1 Earnings Report Summary',
    body: 'Revenue grew 18% year-over-year in the first quarter, driven primarily by strong demand in our enterprise segment.',
    published: true,
    authorId: ADMIN_ID,
  },
  {
    slug: 'spring-office-hours',
    title: 'Spring Office Hours Announcement',
    body: 'Starting this month, our offices will operate from 9:00 AM to 5:00 PM. Customer support remains available online around the clock.',
    published: true,
    authorId: ADMIN_ID,
  },
  {
    slug: 'customer-support-hours',
    title: 'Updated Customer Support Hours',
    body: 'Starting next month, our customer support team will be available 24/7 through live chat and email.',
    published: false,
    authorId: EDITOR_ID,
  },
  {
    slug: 'terms-of-service-update',
    title: 'Terms of Service Update',
    body: 'We have updated our Terms of Service to clarify data retention policies and add new provisions for regional compliance.',
    published: true,
    authorId: ADMIN_ID,
  },
  {
    slug: 'privacy-policy-update',
    title: 'Privacy Policy Update',
    body: 'Our updated privacy policy explains in more detail how we collect, use, and protect your personal information.',
    published: true,
    authorId: ADMIN_ID,
  },
  {
    slug: 'we-are-hiring',
    title: 'We Are Hiring: Open Positions',
    body: 'We are growing our engineering and customer success teams. Explore open roles and apply directly through our careers page.',
    published: true,
    authorId: EDITOR_ID,
  },
  {
    slug: 'interview-with-the-ceo',
    title: 'An Interview With Our CEO',
    body: 'In this interview, our CEO shares the vision behind our regional expansion and what it means for our customers.',
    published: false,
    authorId: EDITOR_ID,
  },
  {
    slug: 'sustainability-initiative',
    title: 'Our New Sustainability Initiative',
    body: 'We are committing to reducing our carbon footprint by 30% over the next three years through renewable energy partnerships.',
    published: true,
    authorId: ADMIN_ID,
  },
  {
    slug: 'mobile-app-release-notes',
    title: 'Mobile App Release Notes: Version 4.2',
    body: 'Version 4.2 adds offline mode, improved accessibility, and several bug fixes reported by our community.',
    published: true,
    authorId: EDITOR_ID,
  },
  {
    slug: 'holiday-schedule',
    title: 'Public Holiday Schedule',
    body: 'Please review our updated public holiday schedule to plan around office closures for the remainder of the year.',
    published: true,
    authorId: ADMIN_ID,
  },
  {
    slug: 'strategic-partnership-announcement',
    title: 'Strategic Partnership Announcement',
    body: 'We are proud to announce a new strategic partnership that will expand our services to three additional countries.',
    published: false,
    authorId: ADMIN_ID,
  },
  {
    slug: 'community-event-recap',
    title: 'Community Event Recap: Regional Meetup',
    body: 'Thank you to everyone who joined our regional meetup last week. Here are the highlights and photos from the event.',
    published: true,
    authorId: EDITOR_ID,
  },
  {
    slug: 'security-advisory-march',
    title: 'Security Advisory',
    body: 'We identified and patched a vulnerability affecting a small subset of accounts. No customer data was exposed.',
    published: true,
    authorId: ADMIN_ID,
  },
  {
    slug: 'api-changelog-august',
    title: 'API Changelog: August Updates',
    body: 'This month we added pagination cursors, rate-limit headers, and a new webhook for content publish events.',
    published: true,
    authorId: EDITOR_ID,
  },
  {
    slug: 'annual-report-highlights',
    title: 'Annual Report Highlights',
    body: 'Our annual report highlights record growth, expanded regional presence, and continued investment in customer experience.',
    published: false,
    authorId: ADMIN_ID,
  },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert(
      'articles',
      articles.map((article) => ({ id: randomUUID(), ...article, createdAt: now, updatedAt: now })),
    );
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('articles', {
      slug: articles.map((article) => article.slug),
    });
  },
};
