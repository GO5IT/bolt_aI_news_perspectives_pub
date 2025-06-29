import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Alert, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Clock, User, ExternalLink, Sparkles, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchNewsArticles, mapApiArticleToNewsArticle } from '../lib/newsAPI';

const { width } = Dimensions.get('window');

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
        <Sparkles size={64} color="#E5E7EB" />
        <Text style={styles.emptyTitle}>No Perspectives Found</Text>
        <Text style={styles.emptyText}>
          We couldn't generate any perspectives at the moment. Please return to the home screen and try again.
        </Text>
        <TouchableOpacity style={styles.goHomeButton} onPress={() => router.push('/')}>
          <LinearGradient colors={['#BB1919', '#8B0000']} style={styles.goHomeButtonGradient}>
            <ArrowLeft size={20} color="#fff" />
            <Text style={styles.goHomeButtonText}>Back to Home</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#BB1919', '#8B0000']}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <Sparkles size={28} color="#FFD700" />
            <Text style={styles.headerTitle}>
              {selectedPerson}'s Perspective
            </Text>
          </View>
          <Text style={styles.headerSubtitle}>
            AI-generated insights on today's most important stories
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.articlesList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {articles.map((article, index) => (
          <TouchableOpacity
            key={article.id}
            style={[styles.articleCard, { marginTop: index === 0 ? 24 : 0 }]}
            onPress={() => handleArticlePress(article)}
          >
            <Image source={{ uri: article.imageUrl }} style={styles.articleImage} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageOverlay}
            />
            <View style={styles.articleContent}>
              <View style={styles.articleHeader}>
                {article.aiGenerated && (
                  <View style={styles.aiLabelContainer}>
                    <Sparkles size={14} color="#fff" />
                    <Text style={styles.aiLabel}>AI Generated</Text>
                  </View>
                )}
                <View style={styles.timeContainer}>
                  <Clock size={14} color="#9CA3AF" />
                  <Text style={styles.publishedAt}>{article.publishedAt}</Text>
                </View>
              </View>
              
              <Text style={styles.articleTitle} numberOfLines={3}>
                {article.title || article.originalTitle}
              </Text>
              
              <Text style={styles.articleSummary} numberOfLines={4}>
                {article.summary || article.originalSummary}
              </Text>
              
              <View style={styles.articleFooter}>
                <View style={styles.sourceInfo}>
                  <User size={16} color="#6B7280" />
                  <Text style={styles.sourceText}>
                    {article.aiGenerated ? (selectedPerson || article["Input person name"]) : article.source}
                  </Text>
                </View>
                <View style={styles.sourceInfo}>
                  <ExternalLink size={16} color="#6B7280" />
                  <Text style={styles.sourceText}>{article.source}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 32,
    backgroundColor: '#F8FAFC',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: { 
    fontSize: 16, 
    color: '#6B7280', 
    textAlign: 'center', 
    marginBottom: 32,
    lineHeight: 24,
    maxWidth: 280,
  },
  goHomeButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  goHomeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24, 
    paddingVertical: 16,
  },
  goHomeButtonText: { 
    color: '#fff', 
    fontSize: 17, 
    fontWeight: '700',
    marginLeft: 8,
  },
  header: { 
    paddingTop: 60, 
    paddingBottom: 28, 
    paddingHorizontal: 24,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: 20,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: '#fff', 
    marginLeft: 12,
    textAlign: 'center',
    maxWidth: width - 120,
  },
  headerSubtitle: { 
    fontSize: 16, 
    color: '#fff', 
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: width - 48,
    lineHeight: 22,
  },
  articlesList: { 
    flex: 1,
    paddingHorizontal: 16,
  },
  articleCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  articleImage: { 
    width: '100%', 
    height: 220, 
    backgroundColor: '#F3F4F6',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  articleContent: { 
    padding: 20,
  },
  articleHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12,
  },
  aiLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  aiLabel: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '700',
    marginLeft: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  publishedAt: { 
    fontSize: 12, 
    color: '#9CA3AF',
    marginLeft: 4,
    fontWeight: '500',
  },
  articleTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#1F2937', 
    marginBottom: 12, 
    lineHeight: 28,
  },
  articleSummary: { 
    fontSize: 15, 
    color: '#6B7280', 
    lineHeight: 22, 
    marginBottom: 16,
  },
  articleFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  sourceInfo: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1,
  },
  sourceText: { 
    fontSize: 13, 
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 100,
  },
});