import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Dimensions } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Search, Sparkles, User, Brain, Zap, Globe } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

// Import the API key from environment variables and check if it exists
const groqApiKey = Constants?.expoConfig?.extra?.GROQ_API_KEY ?? '';
const rapidApiKey = Constants?.expoConfig?.extra?.RAPIDAPI_KEY ?? '';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Helper function to wait for a specified time
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock news data as fallback when APIs are unavailable
const getMockNewsData = () => [
  {
    title: "Global Climate Summit Reaches Historic Agreement on Carbon Reduction",
    snippet: "World leaders at the Global Climate Summit have reached a groundbreaking agreement on carbon reduction targets, with 195 countries committing to ambitious new goals for 2030.",
    link: "https://example.com/climate-summit-agreement",
    source_name: "Global News Network",
    published_datetime_utc: new Date().toISOString()
  },
  {
    title: "Breakthrough in Quantum Computing Promises Revolutionary Changes",
    snippet: "Scientists have achieved a major breakthrough in quantum computing technology, demonstrating a new quantum processor that could revolutionize computing power and solve complex problems.",
    link: "https://example.com/quantum-computing-breakthrough",
    source_name: "Tech Today",
    published_datetime_utc: new Date().toISOString()
  },
  {
    title: "International Space Station Welcomes New Research Mission",
    snippet: "The International Space Station has welcomed a new crew of astronauts who will conduct groundbreaking research in microgravity, including experiments in medicine and materials science.",
    link: "https://example.com/iss-new-mission",
    source_name: "Space News Daily",
    published_datetime_utc: new Date().toISOString()
  }
];

// Function to fetch real news from RapidAPI
async function fetchRealNews() {
  if (!rapidApiKey || rapidApiKey.trim() === '') {
    throw new Error('RAPIDAPI_KEY is not configured. Please add your RapidAPI key to the environment variables.');
  }

  const url = 'https://real-time-news-data.p.rapidapi.com/search';
  const options = {
    method: 'POST',
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': 'real-time-news-data.p.rapidapi.com',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: 'latest news today',
      country: 'US',
      lang: 'en',
      time_published: 'anytime',
      limit: 3
    })
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`News API returned 404. This may indicate an issue with your RapidAPI subscription or the search parameters. Please check your RapidAPI dashboard and ensure your subscription is active.`);
      }
      if (response.status === 429) {
        throw new Error(`Rate limit exceeded (429). You've reached your RapidAPI quota limit. Please check your RapidAPI dashboard to upgrade your plan or wait for the quota to reset.`);
      }
      throw new Error(`News API error: ${response.status}`);
    }
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching real news:', error);
    // Fallback to a different news source if primary fails
    return await fetchFallbackNews();
  }
}

// Fallback news fetching function
async function fetchFallbackNews() {
  const url = 'https://real-time-news-data.p.rapidapi.com/topic-headlines';
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': 'real-time-news-data.p.rapidapi.com'
    }
  };

  try {
    const response = await fetch(`${url}?topic=WORLD&country=US&lang=en&limit=3`, options);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Fallback News API returned 404. Please verify your RapidAPI subscription includes access to the Real-Time News Data API endpoints.`);
      }
      if (response.status === 429) {
        throw new Error(`Rate limit exceeded on fallback API (429). Your RapidAPI quota has been exhausted. Please upgrade your plan or wait for quota reset.`);
      }
      throw new Error(`Fallback News API error: ${response.status}`);
    }
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching fallback news:', error);
    // Return mock data as final fallback
    console.log('Using mock news data as final fallback');
    return getMockNewsData();
  }
}

async function groqResponse(
  concatenatedTriviaQuizUser: string,
  aiModel: string,
  temperature: number,
  maxCompletionTokens: number,
  topP: number,
  stop: null,
  stream: boolean
) {
  // Check if API key is available
  if (!groqApiKey || groqApiKey.trim() === '') {
    throw new Error('GROQ_API_KEY is not set. Please check your environment configuration.');
  }

  const concatenatedTriviaQuizAssistant = `
    You are a creative writer API capable of generating JSON data about articles based on real news stories provided to you.

    IMPORTANT INSTRUCTIONS:
    1. You will be provided with real news articles including their titles, summaries, and source URLs
    2. For each news story provided, write an article as if it were written by the specified famous person
    3. Each article should be substantial (at least 300-500 words) and capture the person's unique voice, perspective, and writing style
    4. ALWAYS include the exact source URL provided for each story
    5. ALWAYS include the original title provided for each story

    Your output should be a JSON array with exactly the same number of objects as news stories provided. Respond ONLY with valid JSON (no other text). Use double quotes for all keys and string values.

    Format:
    [  
      {
          "Timestamp": "current date and time",
          "Input person name": "name of the person (string)",
          "Generated article": "substantial article written in the person's voice and style (minimum 300 words)",
          "Source URL": "exact source URL provided",
          "Original title": "exact original title provided",
          "News category": "category like Politics, Technology, Health, etc."
      }
    ]
  `;

  const messagesFinal = [
    { role: 'system', content: concatenatedTriviaQuizAssistant },
    { role: 'user', content: concatenatedTriviaQuizUser }
  ];

  const requestBody: {
    model: string;
    messages: { role: string; content: string; }[];
    temperature: number;
    max_completion_tokens: number;
    top_p: number;
    stop: null;
    stream: boolean;
    tools?: any;
  } = {
    model: aiModel,
    messages: messagesFinal,
    temperature,
    max_completion_tokens: maxCompletionTokens,
    top_p: topP,
    stop,
    stream
  };

  // Retry logic for handling 503 errors
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Groq API Error (Attempt ${attempt}):`, response.status, errorText);
        
        // Handle 503 Service Unavailable specifically
        if (response.status === 503) {
          if (attempt < MAX_RETRIES) {
            console.log(`Service temporarily unavailable. Retrying in ${RETRY_DELAY / 1000} seconds... (Attempt ${attempt}/${MAX_RETRIES})`);
            await wait(RETRY_DELAY * attempt); // Exponential backoff
            continue; // Retry the request
          } else {
            throw new Error(`Groq service is temporarily unavailable. Please try again in a few minutes. (Error: ${response.status} - ${errorText})`);
          }
        }
        
        // For other errors, throw immediately
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }
      
      // If successful, return the response
      const data = await response.json();
      return [aiModel, data.choices[0].message.content];
      
    } catch (error) {
      // If it's a network error or fetch error, retry
      if (attempt < MAX_RETRIES && (error instanceof TypeError || error.message.includes('fetch'))) {
        console.log(`Network error occurred. Retrying in ${RETRY_DELAY / 1000} seconds... (Attempt ${attempt}/${MAX_RETRIES})`);
        await wait(RETRY_DELAY * attempt);
        continue;
      }
      
      // If it's the last attempt or a non-retryable error, throw
      throw error;
    }
  }
}

export default function HomeScreen() {
  const [personName, setPersonName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!personName.trim()) {
      Alert.alert('Please enter a famous person\'s name');
      return;
    }

    // Check if API keys are available before making the request
    if (!groqApiKey || groqApiKey.trim() === '') {
      setError('GROQ_API_KEY is not configured. Please check your .env file and restart the development server.');
      return;
    }

    if (!rapidApiKey || rapidApiKey.trim() === '') {
      setError('RAPIDAPI_KEY is not configured. Please add your RapidAPI key to generate real news perspectives.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setUsingMockData(false);

    try {
      // First, fetch real news articles
      const realNewsArticles = await fetchRealNews();
      
      if (!realNewsArticles || realNewsArticles.length === 0) {
        console.log('Using mock news data as fallback');
        setUsingMockData(true);
        const mockData = getMockNewsData();
        
        // Prepare the mock news data for the AI
        const newsData = mockData.map((article: any, index: number) => ({
          title: article.title || `News Story ${index + 1}`,
          summary: article.snippet || article.summary || 'No summary available',
          url: article.link || article.url || '',
          source: article.source_name || article.source || 'Unknown Source',
          published: article.published_datetime_utc || article.published_at || new Date().toISOString()
        }));

        // Create the prompt with mock news data
        const concatenatedTriviaQuizUser = `
          Please write articles about the following news stories as if they were written by ${personName.trim()}.

          Here are the news stories with their source URLs:

          ${newsData.map((news, index) => `
          Story ${index + 1}:
          Title: "${news.title}"
          Summary: "${news.summary}"
          Source URL: "${news.url}"
          Source: "${news.source}"
          Published: "${news.published}"
          `).join('\n')}

          For each article:
          1. Write a substantial article (300-500 words) in ${personName.trim()}'s distinctive voice and perspective
          2. Capture their unique writing style, worldview, and way of thinking
          3. Include the EXACT source URL provided above
          4. Include the EXACT original title provided above
          5. Make sure each article reflects how ${personName.trim()} would interpret and discuss the news

          CRITICAL: You must use the exact URLs and titles provided above. Do not modify or create new URLs.
        `;

        // Prepare Groq API parameters
        const temperature = 0.7;
        const maxCompletionTokens = 4096;
        const topP = 1;
        const stop = null;
        const stream = false;
        
        // Use a supported model
        const finalAiModel = 'llama3-8b-8192';

        const groqOutput = await groqResponse(
          concatenatedTriviaQuizUser,
          finalAiModel,
          temperature,
          maxCompletionTokens,
          topP,
          stop,
          stream
        );

        setIsLoading(false);

        // Safely log the AI response to prevent JSON parsing errors
        try {
          const parsedResponse = JSON.parse(groqOutput[1]);
          console.log('AI Response (parsed):', JSON.stringify(parsedResponse, null, 2));
        } catch (parseError) {
          console.log('AI Response (raw text):', groqOutput[1]);
        }

        router.push({
          pathname: '/news',
          params: {
            person: personName.trim(),
            aiResponse: groqOutput[1],
            realNewsData: JSON.stringify(newsData),
            usingMockData: 'true'
          }
        });
        return;
      }

      // Check if we got mock data (fallback was used)
      const isMockData = realNewsArticles.some((article: any) => 
        article.link && article.link.includes('example.com')
      );
      
      if (isMockData) {
        setUsingMockData(true);
      }

      // Prepare the news data for the AI
      const newsData = realNewsArticles.map((article: any, index: number) => ({
        title: article.title || `News Story ${index + 1}`,
        summary: article.snippet || article.summary || 'No summary available',
        url: article.link || article.url || '',
        source: article.source_name || article.source || 'Unknown Source',
        published: article.published_datetime_utc || article.published_at || new Date().toISOString()
      }));

      // Create the prompt with real news data
      const concatenatedTriviaQuizUser = `
        Please write articles about the following ${isMockData ? 'sample' : 'real'} news stories as if they were written by ${personName.trim()}.

        Here are the news stories with their source URLs:

        ${newsData.map((news, index) => `
        Story ${index + 1}:
        Title: "${news.title}"
        Summary: "${news.summary}"
        Source URL: "${news.url}"
        Source: "${news.source}"
        Published: "${news.published}"
        `).join('\n')}

        For each article:
        1. Write a substantial article (300-500 words) in ${personName.trim()}'s distinctive voice and perspective
        2. Capture their unique writing style, worldview, and way of thinking
        3. Include the EXACT source URL provided above
        4. Include the EXACT original title provided above
        5. Make sure each article reflects how ${personName.trim()} would interpret and discuss the news

        CRITICAL: You must use the exact URLs and titles provided above. Do not modify or create new URLs.
      `;

      // Prepare Groq API parameters
      const temperature = 0.7;
      const maxCompletionTokens = 4096;
      const topP = 1;
      const stop = null;
      const stream = false;
      
      // Use a supported model
      const finalAiModel = 'llama3-8b-8192';

      const groqOutput = await groqResponse(
        concatenatedTriviaQuizUser,
        finalAiModel,
        temperature,
        maxCompletionTokens,
        topP,
        stop,
        stream
      );

      setIsLoading(false);

      // Safely log the AI response to prevent JSON parsing errors
      try {
        const parsedResponse = JSON.parse(groqOutput[1]);
        console.log('AI Response (parsed):', JSON.stringify(parsedResponse, null, 2));
      } catch (parseError) {
        console.log('AI Response (raw text):', groqOutput[1]);
      }

      router.push({
        pathname: '/news',
        params: {
          person: personName.trim(),
          aiResponse: groqOutput[1],
          realNewsData: JSON.stringify(newsData),
          usingMockData: isMockData ? 'true' : 'false'
        }
      });
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error:', error);
    }
  };

  const famousPersons = [
    { name: 'Albert Einstein', field: 'Physics' },
    { name: 'Oprah Winfrey', field: 'Media' },
    { name: 'Elon Musk', field: 'Technology' },
    { name: 'Maya Angelou', field: 'Literature' },
    { name: 'Steve Jobs', field: 'Innovation' },
    { name: 'Nelson Mandela', field: 'Leadership' },
    { name: 'Marie Curie', field: 'Science' },
    { name: 'Winston Churchill', field: 'Politics' },
    { name: 'Leonardo da Vinci', field: 'Renaissance' },
    { name: 'Jane Austen', field: 'Literature' },
    { name: 'Martin Luther King Jr.', field: 'Civil Rights' },
    { name: 'Nikola Tesla', field: 'Innovation' }
  ];

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      description: 'Advanced AI transforms real news through unique historical perspectives'
    },
    {
      icon: Globe,
      title: 'Live News Sources',
      description: 'Latest stories sourced directly from verified news outlets with source URLs'
    },
    {
      icon: Zap,
      title: 'Instant Generation',
      description: 'Get personalized perspectives on current events in seconds'
    }
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#BB1919', '#8B0000', '#1E3A8A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Sparkles size={48} color="#fff" />
            <View style={styles.sparkleAccent}>
              <Sparkles size={24} color="#FFD700" />
            </View>
          </View>
          <Text style={styles.headerTitle}>AI News Perspectives</Text>
          <Text style={styles.headerSubtitle}>
            Experience today's real news through the minds of history's greatest thinkers
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {usingMockData && (
          <View style={styles.mockDataNotice}>
            <Text style={styles.mockDataTitle}>📰 Demo Mode Active</Text>
            <Text style={styles.mockDataText}>
              Using sample news stories for demonstration. Configure your RapidAPI key to access real-time news.
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>
              {error.includes('temporarily unavailable') ? '⏳ Service Temporarily Unavailable' : 
               error.includes('RAPIDAPI_KEY') ? '🔑 News API Key Required' :
               error.includes('404') ? '🔍 API Access Issue' :
               error.includes('429') || error.includes('Rate limit') ? '⏱️ Rate Limit Exceeded' :
               '⚠️ Configuration Required'}
            </Text>
            <Text style={styles.errorText}>{error}</Text>
            {error.includes('temporarily unavailable') ? (
              <View style={styles.errorInstructionsContainer}>
                <Text style={styles.errorInstructionsTitle}>What happened?</Text>
                <Text style={styles.errorInstructions}>
                  The Groq AI service is experiencing high demand or temporary maintenance. This is not an issue with your setup.
                  {'\n\n'}Please try again in a few minutes. The service should be back online shortly.
                </Text>
              </View>
            ) : error.includes('404') ? (
              <View style={styles.errorInstructionsContainer}>
                <Text style={styles.errorInstructionsTitle}>API Access Issue (404):</Text>
                <Text style={styles.errorInstructions}>
                  1. Check your RapidAPI subscription status{'\n'}
                  2. Ensure you're subscribed to "Real-Time News Data" API{'\n'}
                  3. Verify your API key is correct in the .env file{'\n'}
                  4. Check if your subscription includes the required endpoints{'\n'}
                  5. Visit your RapidAPI dashboard to confirm access
                </Text>
              </View>
            ) : error.includes('429') || error.includes('Rate limit') ? (
              <View style={styles.errorInstructionsContainer}>
                <Text style={styles.errorInstructionsTitle}>Rate Limit Exceeded (429):</Text>
                <Text style={styles.errorInstructions}>
                  1. You've reached your RapidAPI quota limit{'\n'}
                  2. Check your usage in the RapidAPI dashboard{'\n'}
                  3. Upgrade your plan for higher limits{'\n'}
                  4. Wait for your quota to reset (usually monthly){'\n'}
                  5. Consider optimizing your API usage
                </Text>
              </View>
            ) : error.includes('RAPIDAPI_KEY') ? (
              <View style={styles.errorInstructionsContainer}>
                <Text style={styles.errorInstructionsTitle}>Setup RapidAPI for Real News:</Text>
                <Text style={styles.errorInstructions}>
                  1. Sign up at https://rapidapi.com{'\n'}
                  2. Subscribe to "Real-Time News Data" API{'\n'}
                  3. Add RAPIDAPI_KEY=your_key to your .env file{'\n'}
                  4. Restart the development server{'\n\n'}
                  This enables fetching real news with verifiable source URLs.
                </Text>
              </View>
            ) : (
              <View style={styles.errorInstructionsContainer}>
                <Text style={styles.errorInstructionsTitle}>Quick Setup:</Text>
                <Text style={styles.errorInstructions}>
                  1. Create a .env file in your project root{'\n'}
                  2. Add: GROQ_API_KEY=your_api_key_here{'\n'}
                  3. Add: RAPIDAPI_KEY=your_rapidapi_key_here{'\n'}
                  4. Get GROQ key from https://console.groq.com{'\n'}
                  5. Get RapidAPI key from https://rapidapi.com{'\n'}
                  6. Restart the development server (npm run dev)
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Choose Your Perspective</Text>
            <Text style={styles.sectionSubtitle}>
              Enter any famous person's name to see today's real news through their unique worldview
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <User size={22} color="#BB1919" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="e.g., Albert Einstein, Frida Kahlo, Leonardo da Vinci..."
              value={personName}
              onChangeText={setPersonName}
              placeholderTextColor="#9CA3AF"
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <LinearGradient
              colors={isLoading ? ['#9CA3AF', '#6B7280'] : ['#BB1919', '#8B0000']}
              style={styles.submitButtonGradient}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <View style={styles.loadingSpinner} />
                  <Text style={styles.submitButtonText}>Fetching Real News & Generating...</Text>
                </View>
              ) : (
                <>
                  <Search size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Generate Real News Perspectives</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Why AI Perspectives?</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <feature.icon size={28} color="#BB1919" />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.suggestionsSection}>
          <Text style={styles.suggestionsTitle}>Popular Perspectives</Text>
          <Text style={styles.suggestionsSubtitle}>
            Tap any name to instantly generate their unique take on today's real news
          </Text>
          <View style={styles.suggestionsGrid}>
            {famousPersons.map((person, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => setPersonName(person.name)}
                disabled={isLoading}
              >
                <Text style={styles.suggestionName}>{person.name}</Text>
                <Text style={styles.suggestionField}>{person.field}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How It Works</Text>
          <View style={styles.stepsContainer}>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Real News Fetching</Text>
                <Text style={styles.stepText}>
                  AI fetches the latest real news stories from verified sources with accessible URLs
                </Text>
              </View>
            </View>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Perspective Analysis</Text>
                <Text style={styles.stepText}>
                  AI analyzes your chosen person's worldview, writing style, and philosophy
                </Text>
              </View>
            </View>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Verifiable Articles</Text>
                <Text style={styles.stepText}>
                  Get substantial articles with original source URLs for fact-checking and verification
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            🔗 All AI-generated content is based on real news stories with verifiable source URLs. 
            Original articles are always provided for comparison and fact-checking.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: 24,
    position: 'relative',
  },
  headerContent: {
    alignItems: 'center',
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  sparkleAccent: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 17,
    color: '#fff',
    opacity: 0.95,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: width - 48,
  },
  content: {
    padding: 24,
  },
  mockDataNotice: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  mockDataTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
  },
  mockDataText: {
    fontSize: 15,
    color: '#A16207',
    lineHeight: 22,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: '#B91C1C',
    marginBottom: 16,
    lineHeight: 22,
  },
  errorInstructionsContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
  },
  errorInstructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 8,
  },
  errorInstructions: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 4,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  inputIconContainer: {
    marginRight: 12,
    padding: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 18,
    color: '#1F2937',
    fontWeight: '500',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingSpinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    borderTopColor: 'transparent',
    marginRight: 8,
  },
  featuresSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  featuresTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  featuresGrid: {
    gap: 20,
  },
  featureCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
  },
  featureIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  suggestionsSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  suggestionsTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  suggestionsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  suggestionChip: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 140,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 2,
  },
  suggestionField: {
    fontSize: 12,
    color: '#BB1919',
    textAlign: 'center',
    fontWeight: '500',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  stepsContainer: {
    gap: 20,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#BB1919',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  disclaimer: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  disclaimerText: {
    fontSize: 14,
    color: '#0369A1',
    textAlign: 'center',
    lineHeight: 20,
  },
});