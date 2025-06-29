import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: 'Bolt Expo Starter',
    slug: 'bolt-expo-starter',
    extra: {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    RAPIDAPI_KEY: process.env.RAPIDAPI_KEY,
    },
});