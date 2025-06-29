import Constants from 'expo-constants';
// Import the API key from environment variables and check if it exists
const rapidapi_key = Constants?.expoConfig?.extra?.RAPIDAPI_KEY ?? '';

export async function fetchNewsArticles(topic: string, section: string, limit: number, country_code: string, lang: string) {
    const url = `https://real-time-news-data.p.rapidapi.com/topic-news-by-section?topic=${topic}&section=${section}&limit=${limit}&country=${country_code}&lang=${lang}`;
    const options = {
        method: 'GET',
        headers: {
        'x-rapidapi-key': `${rapidapi_key}`,
        'x-rapidapi-host': 'real-time-news-data.p.rapidapi.com'
        }
    };
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        console.log(`API result: ${result}`);
        return result.data || [];
    } catch (error) {
        console.error(error);
    return [];
    }
}

export function mapApiArticleToNewsArticle(apiArticle: any, idx: number) {
return {
    id: String(idx + 1),
    originalTitle: apiArticle.title || '',
    originalSummary: apiArticle.snippet || '',
    imageUrl: apiArticle.thumbnail_url || 'https://images.pexels.com/photos/163064/play-stone-network-networked-interactive-163064.jpeg?auto=compress&cs=tinysrgb&w=800',
    originalUrl: apiArticle.link || '',
    source: apiArticle.source_name || '',
    publishedAt: apiArticle.published_datetime_utc || '',
    aiGenerated: false,
    };
}