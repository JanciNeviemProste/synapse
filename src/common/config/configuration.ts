export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin',

  database: {
    url: process.env.DATABASE_URL,
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    ownerChatId: process.env.TELEGRAM_OWNER_CHAT_ID || '',
  },

  gmail: {
    clientId: process.env.GMAIL_CLIENT_ID || '',
    clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
    refreshToken: process.env.GMAIL_REFRESH_TOKEN || '',
    userEmail: process.env.GMAIL_USER_EMAIL || '',
  },

  google: {
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-sonnet-4-20250514',
    provider: process.env.AI_PROVIDER || 'auto',
  },

  figma: {
    accessToken: process.env.FIGMA_ACCESS_TOKEN || '',
  },

  unsplash: {
    accessKey: process.env.UNSPLASH_ACCESS_KEY || '',
  },

  pexels: {
    apiKey: process.env.PEXELS_API_KEY || '',
  },

  github: {
    token: process.env.GITHUB_TOKEN || '',
    username: process.env.GITHUB_USERNAME || '',
  },

  vercel: {
    token: process.env.VERCEL_TOKEN || '',
  },

  cron: {
    leadInterval: process.env.LEAD_CRON_INTERVAL || '*/5 * * * *',
    figmaInterval: process.env.FIGMA_CRON_INTERVAL || '*/30 * * * *',
    leadMinConfidence: parseFloat(process.env.LEAD_MIN_CONFIDENCE || '0.5'),
  },
});
