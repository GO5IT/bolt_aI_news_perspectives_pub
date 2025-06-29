import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Clock, User, ExternalLink } from 'lucide-react-native';
import { fetchNewsArticles, mapApiArticleToNewsArticle } from './newsAPI';

// Type for article, matching both old and new data shape
interface NewsArticle {
  id?: string;
  title?: string;
  originalTitle?: string;
  summary?: string;
  originalSummary?: string;
  imageUrl?: string;
  publishedAt?: string;
  originalUrl?: string;
  source?: string;
  aiGenerated?: boolean;
  // For AI response fallback
  "Generated article"?: string;
  "Input person name"?: string;
  "Timestamp"?: string;
  "Source URL"?: string;
}

export default function NewsScreen() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState('');
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse AI response or fallback to mock data
  useEffect(() => {
    if (params.person) setSelectedPerson(params.person as string);

    if (params.aiResponse) {
      let aiArticles: NewsArticle[] = [];
      let aiText = String(params.aiResponse).trim();

      try {
        if (aiText.startsWith('[') || aiText.startsWith('{')) {
          aiText = aiText.replace(/'/g, '"');
          aiArticles = JSON.parse(aiText);
          if (!Array.isArray(aiArticles)) aiArticles = [aiArticles];
        } else {
          aiArticles = [{ "Generated article": aiText }];
        }
      } catch (e) {
        aiArticles = [{ "Generated article": aiText }];
      }

      // Map AI articles to old UI article structure
      const mapped = aiArticles.map((a, idx) => ({
        id: String(idx + 1),
        title: a["Generated article"] || a.title || '',
        originalTitle: a.originalTitle || '',
        summary: a["Generated article"] || a.summary || '',
        originalSummary: a.originalSummary || '',
        imageUrl: a.imageUrl || 'https://images.pexels.com/photos/163064/play-stone-network-networked-interactive-163064.jpeg?auto=compress&cs=tinysrgb&w=800',
        publishedAt: a["Timestamp"] || a.publishedAt || 'Today',
        originalUrl: a["Source URL"] || a.originalUrl || '',
        source: a.source || 'BBC',
        aiGenerated: true,
        "Input person name": Array.isArray(a["Input person name"])
          ? a["Input person name"].join(', ')
          : (a["Input person name"] || (Array.isArray(params.person) ? params.person.join(', ') : params.person) || ''),
      }));
      setArticles(mapped);
    }
  }, [params.aiResponse, params.person]);

  useEffect(() => {
    // Only fetch real news if there is NO aiResponse
    if (!params.aiResponse) {
      async function loadRealNews() {
        const apiArticles = await fetchNewsArticles(
          "TECHNOLOGY", // or your chosen topic
          "CAQiSkNCQVNNUW9JTDIwdk1EZGpNWFlTQldWdUxVZENHZ0pKVENJT0NBUWFDZ29JTDIwdk1ETnliSFFxQ2hJSUwyMHZNRE55YkhRb0FBKi4IACoqCAoiJENCQVNGUW9JTDIwdk1EZGpNWFlTQldWdUxVZENHZ0pKVENnQVABUAE", // section
          10, // limit
          "US", // country_code
          "en" // lang
        );
        const mapped = apiArticles.map(mapApiArticleToNewsArticle);
        setArticles(mapped);
      }
      loadRealNews();
    }
  }, [params.aiResponse]);


  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleArticlePress = (article: NewsArticle) => {
    router.push({
      pathname: '/article',
      params: {
        articleId: article.id,
        title: article.title,
        originalTitle: article.originalTitle,
        summary: article.summary,
        originalSummary: article.originalSummary,
        imageUrl: article.imageUrl,
        originalUrl: article.originalUrl,
        person: selectedPerson || article["Input person name"],
        source: article.source,
        publishedAt: article.publishedAt,
      }
    });
  };

  // If no articles and AI response, show empty state
  if ((params.aiResponse && (!selectedPerson || articles.length === 0)) ||
      (!params.aiResponse && articles.length === 0)) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No news found. Please return to Home and try again.</Text>
        <TouchableOpacity style={styles.goHomeButton} onPress={() => router.push('/')}>
          <Text style={styles.goHomeButtonText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>News Through {selectedPerson}'s Eyes</Text>
        <Text style={styles.headerSubtitle}>AI-generated perspectives on today's top stories</Text>
      </View>
      <ScrollView
        style={styles.articlesList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        
        {articles.map((article) => (
          <TouchableOpacity
            key={article.id}
            style={styles.articleCard}
            onPress={() => handleArticlePress(article)}
          >
            <Image source={{ uri: article.imageUrl }} style={styles.articleImage} />
            <View style={styles.articleContent}>
              <View style={styles.articleHeader}>
                {article.aiGenerated && (
                  <Text style={styles.aiLabel}>AI Generated</Text>
                )}
                <Text style={styles.publishedAt}>{article.publishedAt}</Text>
              </View>
              <Text style={styles.articleTitle}>
                {article.title || article.originalTitle}
              </Text>
              <Text style={styles.articleSummary}>
                {article.summary || article.originalSummary}
              </Text>
              <View style={styles.articleFooter}>
                <View style={styles.sourceInfo}>
                  <User size={16} color="#666" />
                  <Text style={styles.sourceText}>
                    {article.aiGenerated ? (selectedPerson || article["Input person name"]) : article.source}
                  </Text>
                </View>
                <View style={styles.sourceInfo}>
                  <ExternalLink size={16} color="#666" />
                  <Text style={styles.sourceText}>{article.source}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },
  goHomeButton: { backgroundColor: '#BB1919', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  goHomeButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  header: { backgroundColor: '#BB1919', paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 16, color: '#fff', opacity: 0.9 },
  articlesList: { padding: 16 },
  articleCard: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, overflow: 'hidden',
  },
  articleImage: { width: '100%', height: 200, backgroundColor: '#f0f0f0' },
  articleContent: { padding: 16 },
  articleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  aiLabel: { backgroundColor: '#4CAF50', color: '#fff', fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  publishedAt: { fontSize: 12, color: '#666' },
  articleTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8, lineHeight: 24 },
  articleSummary: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 12 },
  articleFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sourceInfo: { flexDirection: 'row', alignItems: 'center' },
  sourceText: { fontSize: 12, color: '#666', marginLeft: 4 },
});
