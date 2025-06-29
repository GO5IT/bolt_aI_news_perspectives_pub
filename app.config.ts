import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'AI News Perspectives',
  slug: 'ai-news-perspectives',
  extra: {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    RAPIDAPI_KEY: process.env.RAPIDAPI_KEY,
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-web-browser',
    [
      'expo-build-properties',
      {
        android: {
          packagingOptions: {
            pickFirst: ['**/libc++_shared.so', '**/libjsc.so'],
          },
        },
      },
    ],
  ],
});