export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  adminPassword: process.env.ADMIN_PASSWORD || '',

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

  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4.5',
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    transcriptionModel:
      process.env.GROQ_TRANSCRIPTION_MODEL || 'whisper-large-v3-turbo',
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

  contentStudio: {
    strategyProvider: process.env.CONTENT_STRATEGY_PROVIDER || 'auto',
    strategyModel: process.env.CONTENT_STRATEGY_MODEL || '',
    scriptProvider: process.env.SCRIPT_GENERATION_PROVIDER || 'auto',
    scriptModel: process.env.SCRIPT_GENERATION_MODEL || '',
    reviewProvider: process.env.SCRIPT_REVIEW_PROVIDER || 'auto',
    reviewModel: process.env.SCRIPT_REVIEW_MODEL || '',
    complianceProvider: process.env.COMPLIANCE_PROVIDER || 'auto',
    complianceModel: process.env.COMPLIANCE_MODEL || '',
    transcriptionProvider: process.env.TRANSCRIPTION_PROVIDER || 'auto',
    transcriptionModel: process.env.TRANSCRIPTION_MODEL || '',
    realtimeProvider: process.env.REALTIME_VOICE_PROVIDER || 'auto',
    realtimeModel: process.env.REALTIME_VOICE_MODEL || '',
    videoProvider: process.env.VIDEO_UNDERSTANDING_PROVIDER || 'auto',
    videoModel: process.env.VIDEO_UNDERSTANDING_MODEL || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    storageDir: process.env.CONTENT_STUDIO_STORAGE_DIR || 'storage/content-studio',
    maxAudioSizeMb: parseInt(process.env.CONTENT_AUDIO_MAX_FILE_SIZE_MB || '50', 10),
    maxVideoSizeMb: parseInt(process.env.VIDEO_ANALYSIS_MAX_FILE_SIZE_MB || '300', 10),
    maxVideoDurationSeconds: parseInt(
      process.env.VIDEO_ANALYSIS_MAX_DURATION_SECONDS || '300',
      10,
    ),
  },

  cron: {
    leadInterval: process.env.LEAD_CRON_INTERVAL || '*/5 * * * *',
    figmaInterval: process.env.FIGMA_CRON_INTERVAL || '*/30 * * * *',
    leadMinConfidence: parseFloat(process.env.LEAD_MIN_CONFIDENCE || '0.5'),
  },
});
