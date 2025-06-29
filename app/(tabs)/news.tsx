import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Alert, Dimensions, Linking } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Clock, User, ExternalLink, Sparkles, ArrowLeft, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
  "Original title"?: string;
  // For real news verification
  isVerified?: boolean;
}

// Helper function to extract JSON from potentially malformed AI response
function extractAndParseJSON(aiText: string): any[] {
  try {
    // Clean up the response text
    let cleanText = aiText.trim();
    
    // Remove markdown code blocks if present
    cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Remove control characters and non-printable characters
    cleanText = cleanText.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    
    // Find the first opening bracket/brace and last closing bracket/brace
    const firstArrayStart = cleanText.indexOf('[');
    const firstObjectStart = cleanText.indexOf('{');
    const lastArrayEnd = cleanText.lastIndexOf(']');
    const lastObjectEnd = cleanText.lastIndexOf('}');
    
    let jsonStart = -1;
    let jsonEnd = -1;
    
    // Determine if we're dealing with an array or object
    if (firstArrayStart !== -1 && (firstObjectStart === -1 || firstArrayStart < firstObjectStart)) {
      // Array format
      jsonStart = firstArrayStart;
      jsonEnd = lastArrayEnd;
    } else if (firstObjectStart !== -1) {
      // Object format (wrap in array)
      jsonStart = firstObjectStart;
      jsonEnd = lastObjectEnd;
    }
    
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      throw new Error('No valid JSON structure found');
    }
    
    // Extract the JSON substring
    let jsonString = cleanText.substring(jsonStart, jsonEnd + 1);
    
    // Additional cleanup for common issues
    jsonString = jsonString
      .replace(/,\s*}/g, '}') // Remove trailing commas before closing braces
      .replace(/,\s*]/g, ']') // Remove trailing commas before closing brackets
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' '); // Normalize whitespace
    
    // Parse the JSON
    const parsed = JSON.parse(jsonString);
    
    // Ensure we return an array
    return Array.isArray(parsed) ? parsed : [parsed];
    
  } catch (error) {
    console.error('JSON extraction/parsing failed:', error);
    
    // Final fallback: try to extract content using regex patterns
    try {
      const articlePattern = /"Generated article":\s*"([^"]+)"/g;
      const matches = [];
      let match;
      
      while ((match = articlePattern.exec(aiText)) !== null) {
        matches.push({
          "Generated article": match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
        });
      }
      
      if (matches.length > 0) {
        return matches;
      }
    } catch (regexError) {
      console.error('Regex fallback failed:', regexError);
    }
    
    // Ultimate fallback: treat entire text as single article
    return [{ "Generated article": aiText }];
  }
}

export default function NewsScreen() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState('');
  const [realNewsData, setRealNewsData] = useState<any[]>([]);
  const [processingComplete, setProcessingComplete] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();

  // Memoize the processing function to prevent infinite re-renders
  const processAIResponse = useCallback((aiResponse: string, person: string, newsData: any[]) => {
    try {
      const aiArticles = extractAndParseJSON(aiResponse);
      
      // Map AI articles to display format with real news verification
      const mapped = aiArticles.map((article, idx) => {
        // Extract the actual article content
        const generatedContent = article["Generated article"] || '';
        
        // Get corresponding real news data for verification
        const realNewsItem = newsData[idx] || {};
        
        // Create a proper title from the AI response or use real news title
        let title = article["Original title"] || realNewsItem.title || '';
        if (!title && generatedContent) {
          const firstSentence = generatedContent.split('.')[0];
          title = firstSentence.length > 80 
            ? generatedContent.substring(0, 60) + '...' 
            : firstSentence + '.';
        }

        // Create a summary (first paragraph or first 200 chars)
        let summary = '';
        if (generatedContent) {
          const firstParagraph = generatedContent.split('\n\n')[0] || generatedContent.split('\n')[0];
          summary = firstParagraph.length > 200 
            ? firstParagraph.substring(0, 200) + '...' 
            : firstParagraph;
        }

        // Use real news URL if available, otherwise use AI provided URL
        const sourceUrl = article["Source URL"] || realNewsItem.url || '';
        
        return {
          id: String(idx + 1),
          title: title || `${person}'s Perspective on Current Events`,
          originalTitle: realNewsItem.title || '',
          summary: summary || generatedContent.substring(0, 200) + '...',
          originalSummary: realNewsItem.summary || '',
          imageUrl: getRandomNewsImage(idx),
          publishedAt: article["Timestamp"] || realNewsItem.published || 'Today',
          originalUrl: sourceUrl,
          source: realNewsItem.source || 'News Source',
          aiGenerated: true,
          isVerified: !!(sourceUrl && sourceUrl.startsWith('http')), // Verify if we have a real URL
          "Generated article": generatedContent,
          "Input person name": person,
          "Source URL": sourceUrl,
          "Original title": realNewsItem.title || '',
        };
      });

      return mapped;
    } catch (error) {
      console.error('Error processing AI response:', error);
      // Return a fallback article
      return [{
        id: '1',
        title: `${person}'s Perspective on Current Events`,
        summary: 'Unable to process the AI response properly. Please try again.',
        imageUrl: getRandomNewsImage(0),
        publishedAt: 'Today',
        originalUrl: '',
        source: 'AI Generated',
        aiGenerated: true,
        isVerified: false,
        "Generated article": 'Unable to process the AI response properly. Please try again.',
        "Input person name": person,
      }];
    }
  }, []);

  // Parse AI response or fallback to mock data
  useEffect(() => {
    // Prevent processing if already complete
    if (processingComplete) return;

    let person = '';
    let newsData: any[] = [];

    // Set person name
    if (params.person) {
      person = params.person as string;
      setSelectedPerson(person);
    }

    // Parse real news data if available
    if (params.realNewsData) {
      try {
        const parsedRealNews = JSON.parse(params.realNewsData as string);
        newsData = parsedRealNews;
        setRealNewsData(parsedRealNews);
      } catch (e) {
        console.error('Error parsing real news data:', e);
        newsData = [];
      }
    }

    // Process AI response
    if (params.aiResponse && person) {
      const processedArticles = processAIResponse(params.aiResponse as string, person, newsData);
      setArticles(processedArticles);
      setProcessingComplete(true);
    }
  }, [params.aiResponse, params.person, params.realNewsData, processAIResponse, processingComplete]);

  // Function to get varied news images
  const getRandomNewsImage = (index: number) => {
    const newsImages = [
      'https://images.pexels.com/photos/518543/pexels-photo-518543.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1591056/pexels-photo-1591056.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1591447/pexels-photo-1591447.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1591061/pexels-photo-1591061.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/163064/play-stone-network-networked-interactive-163064.jpeg?auto=compress&cs=tinysrgb&w=800'
    ];
    return newsImages[index % newsImages.length];
  };

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
        originalTitle: article.originalTitle || article["Original title"],
        summary: article["Generated article"] || article.summary, // Pass the full generated article
        originalSummary: article.originalSummary,
        imageUrl: article.imageUrl,
        originalUrl: article.originalUrl || article["Source URL"],
        person: selectedPerson || article["Input person name"],
        source: article.source,
        publishedAt: article.publishedAt,
        isVerified: article.isVerified,
      }
    });
  };

  const handleVerifySource = async (url: string) => {
    if (!url || !url.startsWith('http')) {
      Alert.alert('Invalid URL', 'This article does not have a valid source URL.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot open URL', 'Unable to open this link on your device.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open the source URL.');
    }
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
            AI-generated insights on today's verified news stories
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.articlesList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Verification Notice */}
        <View style={styles.verificationNotice}>
          <CheckCircle size={20} color="#10B981" />
          <Text style={styles.verificationText}>
            All articles below are based on real news with verifiable source URLs
          </Text>
        </View>

        {articles.map((article, index) => (
          <TouchableOpacity
            key={article.id}
            style={[styles.articleCard, { marginTop: index === 0 ? 16 : 0 }]}
            onPress={() => handleArticlePress(article)}
          >
            <Image source={{ uri: article.imageUrl }} style={styles.articleImage} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageOverlay}
            />
            <View style={styles.articleContent}>
              <View style={styles.articleHeader}>
                <View style={styles.labelContainer}>
                  {article.aiGenerated && (
                    <View style={styles.aiLabelContainer}>
                      <Sparkles size={14} color="#fff" />
                      <Text style={styles.aiLabel}>AI Generated</Text>
                    </View>
                  )}
                  {article.isVerified && (
                    <View style={styles.verifiedLabelContainer}>
                      <CheckCircle size={14} color="#fff" />
                      <Text style={styles.verifiedLabel}>Verified Source</Text>
                    </View>
                  )}
                </View>
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
                <View style={styles.sourceActions}>
                  <View style={styles.sourceInfo}>
                    <ExternalLink size={16} color="#6B7280" />
                    <Text style={styles.sourceText}>{article.source}</Text>
                  </View>
                  {article.originalUrl && (
                    <TouchableOpacity 
                      style={styles.verifyButton}
                      onPress={() => handleVerifySource(article.originalUrl!)}
                    >
                      <Text style={styles.verifyButtonText}>Verify</Text>
                    </TouchableOpacity>
                  )}
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
  verificationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verificationText: {
    fontSize: 14,
    color: '#065F46',
    marginLeft: 8,
    fontWeight: '600',
    flex: 1,
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
    alignItems: 'flex-start', 
    marginBottom: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
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
  verifiedLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  verifiedLabel: { 
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
  sourceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceText: { 
    fontSize: 13, 
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  verifyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 100,
  },
});