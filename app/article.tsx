import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Linking, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ExternalLink, User, Sparkles, Clock, Globe, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ArticleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const {
    title,
    originalTitle,
    summary,
    originalSummary,
    imageUrl,
    originalUrl,
    person,
    source,
    publishedAt,
    isVerified,
  } = params;

  // Parse the AI-generated content to extract the actual article text
  const parseAIContent = (content: string) => {
    if (!content) return '';
    
    // If it's JSON, try to extract the article content
    try {
      if (content.includes('"Generated article"')) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0]["Generated article"] || content;
        } else if (parsed["Generated article"]) {
          return parsed["Generated article"];
        }
      }
    } catch (e) {
      // If parsing fails, return the content as is
    }
    
    return content;
  };

  const aiArticleContent = parseAIContent(summary as string);
  const displayTitle = title || originalTitle || 'Untitled Article';
  const sourceUrl = originalUrl as string;
  const verified = isVerified === 'true' || isVerified === true;

  const handleOpenSource = async () => {
    if (!sourceUrl || !sourceUrl.startsWith('http')) {
      Alert.alert('Invalid URL', 'This article does not have a valid source URL.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(sourceUrl);
      if (supported) {
        await Linking.openURL(sourceUrl);
      } else {
        Alert.alert('Cannot open URL', 'Unable to open this link on your device.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open the source URL.');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#BB1919', '#8B0000']}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Article Perspective</Text>
          <Text style={styles.headerSubtitle}>AI-generated vs Original Source</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image 
            source={{ uri: Array.isArray(imageUrl) ? imageUrl[0] : imageUrl as string }} 
            style={styles.heroImage} 
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.heroOverlay}
          />
        </View>

        {/* Source Verification Banner */}
        <View style={[styles.verificationBanner, verified ? styles.verifiedBanner : styles.unverifiedBanner]}>
          {verified ? (
            <>
              <CheckCircle size={20} color="#10B981" />
              <Text style={styles.verificationText}>
                ✅ This article is based on a verified news source with accessible URL
              </Text>
            </>
          ) : (
            <>
              <AlertTriangle size={20} color="#F59E0B" />
              <Text style={styles.verificationText}>
                ⚠️ Source URL verification pending
              </Text>
            </>
          )}
        </View>

        {/* AI Generated Section */}
        <View style={styles.section}>
          <View style={styles.aiLabelContainer}>
            <Sparkles color="#fff" size={20} />
            <Text style={styles.aiSectionLabel}>Written by {person}</Text>
          </View>
          
          <View style={styles.articleCard}>
            <View style={styles.articleHeader}>
              <Text style={styles.articleTitle}>{displayTitle}</Text>
              <View style={styles.articleMeta}>
                <View style={styles.metaItem}>
                  <User size={16} color="#6B7280" />
                  <Text style={styles.metaText}>{person}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Clock size={16} color="#6B7280" />
                  <Text style={styles.metaText}>{publishedAt}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.articleContent}>
              <Text style={styles.articleBody}>
                {generateFullAIArticle(person as string, displayTitle, aiArticleContent)}
              </Text>
            </View>
          </View>
        </View>

        {/* Source Verification Section */}
        <View style={styles.sourceVerificationSection}>
          <View style={styles.sourceHeader}>
            <Globe size={24} color="#3B82F6" />
            <Text style={styles.sourceTitle}>Original Source Verification</Text>
          </View>
          
          <View style={styles.sourceCard}>
            <View style={styles.sourceDetails}>
              <Text style={styles.sourceLabel}>Source:</Text>
              <Text style={styles.sourceValue}>{source}</Text>
            </View>
            
            <View style={styles.sourceDetails}>
              <Text style={styles.sourceLabel}>Original Title:</Text>
              <Text style={styles.sourceValue}>{originalTitle || displayTitle}</Text>
            </View>
            
            <View style={styles.sourceDetails}>
              <Text style={styles.sourceLabel}>URL Status:</Text>
              <View style={styles.urlStatus}>
                {verified ? (
                  <>
                    <CheckCircle size={16} color="#10B981" />
                    <Text style={[styles.sourceValue, { color: '#10B981' }]}>Verified & Accessible</Text>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} color="#F59E0B" />
                    <Text style={[styles.sourceValue, { color: '#F59E0B' }]}>Pending Verification</Text>
                  </>
                )}
              </View>
            </View>

            {sourceUrl && (
              <View style={styles.sourceDetails}>
                <Text style={styles.sourceLabel}>Source URL:</Text>
                <TouchableOpacity onPress={handleOpenSource} style={styles.urlContainer}>
                  <Text style={styles.urlText} numberOfLines={2}>
                    {sourceUrl}
                  </Text>
                  <ExternalLink size={16} color="#3B82F6" />
                </TouchableOpacity>
              </View>
            )}

            {sourceUrl && (
              <TouchableOpacity style={styles.verifySourceButton} onPress={handleOpenSource}>
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.verifySourceButtonGradient}
                >
                  <ExternalLink color="#fff" size={18} />
                  <Text style={styles.verifySourceButtonText}>Verify Original Source</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Original Article Summary</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Original Article Section */}
        <View style={styles.section}>
          <View style={styles.originalLabelContainer}>
            <Globe color="#fff" size={20} />
            <Text style={styles.originalSectionLabel}>From {source}</Text>
          </View>
          
          <View style={styles.articleCard}>
            <View style={styles.articleHeader}>
              <Text style={styles.articleTitle}>{originalTitle || displayTitle}</Text>
              <View style={styles.articleMeta}>
                <View style={styles.metaItem}>
                  <Globe size={16} color="#6B7280" />
                  <Text style={styles.metaText}>{source}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Clock size={16} color="#6B7280" />
                  <Text style={styles.metaText}>{publishedAt}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.articleContent}>
              <Text style={styles.articleBody}>
                {originalSummary || 'Original article summary would be displayed here. The full article content is available at the source URL above for verification and complete reading.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Comparison Note */}
        <View style={styles.comparisonNote}>
          <Text style={styles.comparisonTitle}>🔍 Compare & Verify</Text>
          <Text style={styles.comparisonText}>
            Notice how {person}'s unique perspective transforms the same news story while maintaining factual accuracy. 
            {verified ? 
              ' The source URL above has been verified and is accessible for fact-checking.' :
              ' Please verify the source URL to ensure the information is accurate and up-to-date.'
            }
          </Text>
          <Text style={styles.comparisonSubtext}>
            Always cross-reference AI-generated content with original sources for complete accuracy.
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

// Enhanced article generator with better formatting
function generateFullAIArticle(person: string, title: string, summary: string): string {
  const articleTemplates: Record<string, (title: string, summary: string) => string> = {
    'Albert Einstein': (title, summary) => `
My dear friends,

As I sit in my study, contemplating the intricate dance of particles and waves that governs our universe, I find myself drawn to examine this fascinating development: "${title}".

${summary}

From my perspective as a physicist, I see in this situation the same fundamental principles that govern the cosmos. Just as E=mc² reveals the profound relationship between mass and energy, so too does this event illuminate the deeper connections between human endeavor and the natural laws that bind us all.

The curiosity that drives scientific inquiry compels us to ask not merely "what" has occurred, but "why" and "how." In examining these circumstances, we must remember that the universe operates according to principles that transcend our immediate understanding, yet reward patient observation and thoughtful analysis.

I am reminded of my belief that "imagination is more important than knowledge." While we must ground ourselves in facts and evidence, we must also dare to envision possibilities that extend beyond our current comprehension. This situation presents such an opportunity for intellectual growth.

The responsibility of knowledge weighs heavily upon those who seek to understand the world's complexities. As we witness these developments unfold, we must remember that our role is not merely to observe, but to contribute to the greater understanding of humanity's place in this magnificent cosmos.

With warm regards and endless curiosity,
Albert Einstein
    `,
    'Oprah Winfrey': (title, summary) => `
Hello, beautiful souls!

What moves me most deeply about this story - "${title}" - is the human element at its very core.

${summary}

Behind every headline, every statistic, every development, there are real people with real dreams, real struggles, and real triumphs. I've learned through my years of connecting with people from all walks of life that our stories are what bind us together.

This situation reminds me of the countless conversations I've had where someone's vulnerability led to breakthrough, where their courage inspired others to find their own strength. The power of authenticity shines through in moments like these.

What I know for sure is that every challenge presents an opportunity for transformation. The individuals affected by these circumstances have within them the power to not just survive, but to thrive. Their stories will inspire others, creating ripples of positive change that extend far beyond what we can imagine.

When I look at this situation, I don't just see facts and figures - I see the beautiful, complex, ever-evolving story of human experience. I see resilience. I see hope. I see the potential for growth and healing.

As we witness these events unfold, I encourage each of us to approach them with empathy, understanding, and a willingness to learn. The greatest gift we can give one another is our presence, our attention, and our belief in the possibility of better days ahead.

This is what I see when I look at this development: not just news, but a reminder of our shared humanity and our incredible capacity for love, growth, and positive change.

Much love and light,
Oprah
    `,
    'Elon Musk': (title, summary) => `
Looking at "${title}" from first principles, we need to break down this problem to its fundamental components.

${summary}

The question I always ask is: what would it take to make this 10 times better? Incremental improvements aren't enough when we're dealing with challenges of this magnitude. We need to think exponentially, not linearly.

From an engineering perspective, every problem is solvable with the right combination of talent, resources, and determination. The key is to identify the biggest bottlenecks and attack them with relentless focus. We can't afford to optimize for the wrong variables.

What excites me about this development is the potential for technological solutions that could fundamentally change how we approach similar challenges in the future. Whether we're talking about sustainable energy, space exploration, or artificial intelligence, the principles remain the same: identify the physics constraints, gather the best team possible, and iterate rapidly.

The timeline for meaningful change is always faster than people think, but slower than we'd like. That's why we need to maintain urgency while also being realistic about the complexity of the problems we're trying to solve.

We're living in the most exciting time in human history. The tools we have access to today - from advanced manufacturing to artificial intelligence to global communication networks - give us unprecedented ability to solve problems that previous generations could only dream of addressing.

The future is going to be wild, and developments like this are just the beginning of what's possible when human ingenuity meets cutting-edge technology.

Let's build something great together.

- Elon
    `,
    'Default': (title, summary) => `
"${title}"

${summary}

This development represents a significant moment in our ongoing dialogue about the challenges and opportunities facing our world today. As we examine the various facets of this story, it becomes clear that we are witnessing a convergence of factors that will likely influence how we approach similar situations in the future.

The human element in this story cannot be overlooked. Behind every policy decision, every technological advancement, and every social movement are individuals whose lives are directly affected by these changes. Their experiences provide valuable insights into the real-world implications of these developments.

From a broader perspective, this situation highlights the interconnected nature of our global society. Actions and decisions in one area often have far-reaching consequences that extend well beyond their immediate context. Understanding these connections is crucial for anyone seeking to make informed decisions about the future.

The path forward requires careful consideration of both immediate needs and long-term implications. While it's tempting to focus solely on short-term solutions, sustainable progress often requires us to take a more comprehensive view of the challenges we face.

As we continue to monitor these developments, it's important to maintain both optimism about our collective ability to address complex challenges and realism about the work that lies ahead. The solutions we develop today will shape the world we leave for future generations.
    `
  };

  const template = articleTemplates[person] || articleTemplates.Default;
  return template(title, summary);
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  header: { 
    paddingTop: 60, 
    paddingBottom: 20, 
    paddingHorizontal: 24, 
    flexDirection: 'row', 
    alignItems: 'center',
    position: 'relative',
  },
  backButton: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  content: { 
    flex: 1,
  },
  heroContainer: {
    position: 'relative',
    height: 240,
  },
  heroImage: { 
    width: '100%', 
    height: '100%', 
    backgroundColor: '#F3F4F6',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  verifiedBanner: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  unverifiedBanner: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  verificationText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
    color: '#374151',
  },
  section: { 
    padding: 20,
  },
  aiLabelContainer: { 
    backgroundColor: '#10B981', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    alignSelf: 'flex-start',
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  aiSectionLabel: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: '700', 
    marginLeft: 8,
  },
  originalLabelContainer: { 
    backgroundColor: '#1E3A8A', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    alignSelf: 'flex-start',
    marginBottom: 16,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  originalSectionLabel: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: '700', 
    marginLeft: 8,
  },
  sourceVerificationSection: {
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sourceTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginLeft: 12,
  },
  sourceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  sourceDetails: {
    marginBottom: 16,
  },
  sourceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  sourceValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  urlStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  urlText: {
    flex: 1,
    fontSize: 14,
    color: '#3B82F6',
    marginRight: 8,
  },
  verifySourceButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  verifySourceButtonGradient: {
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  verifySourceButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700', 
    marginLeft: 8,
  },
  articleCard: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 12, 
    elevation: 8, 
    overflow: 'hidden',
  },
  articleHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  articleTitle: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#1F2937', 
    marginBottom: 16, 
    lineHeight: 32,
  },
  articleMeta: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  metaItem: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1,
  },
  metaText: { 
    fontSize: 14, 
    color: '#6B7280', 
    marginLeft: 6,
    fontWeight: '500',
  },
  articleContent: {
    padding: 24,
  },
  articleBody: { 
    fontSize: 16, 
    color: '#374151', 
    lineHeight: 28,
    textAlign: 'justify',
  },
  divider: { 
    paddingVertical: 32, 
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#6B7280', 
    backgroundColor: '#F8FAFC', 
    paddingHorizontal: 16,
  },
  comparisonNote: {
    margin: 20,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 12,
  },
  comparisonText: {
    fontSize: 15,
    color: '#1E40AF',
    lineHeight: 24,
    marginBottom: 12,
  },
  comparisonSubtext: {
    fontSize: 14,
    color: '#3B82F6',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
});