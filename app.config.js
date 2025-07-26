module.exports = {
  name: 'Inga',
  version: '1.0.0',
  extra: {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    oaiSessionModel: process.env.OAI_SESSION_MODEL || 'gpt-4.1-2025-04-14',
  },
  plugins: [
    'expo-font', // Add the expo-font plugin here
    'expo-secure-store',
  ],
};