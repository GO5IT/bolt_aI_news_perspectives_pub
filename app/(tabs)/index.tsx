import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Dimensions } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Search, Sparkles, User, Brain, Zap, Globe } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { } from 'newsAPI';

const { width } = Dimensions.get('window');

// Import the API key from environment variables and check if it exists
const groqApiKey = Constants?.expoConfig?.extra?.GROQ_API_KEY ?? '';

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
    You are a creative writer API capable of generating JSON data about three articles based on real news from the BBC website (https://www.bbc.com/). 

    IMPORTANT INSTRUCTIONS:
    1. First, search for the latest news on BBC website
    2. Select exactly 3 different current news stories from BBC
    3. For each story, write an article as if it were written by the specified famous person
    4. Each article should be substantial (at least 300-500 words) and capture the person's unique voice, perspective, and writing style
    5. Include the actual BBC source URL for each story

    Your output should be a JSON array with exactly 3 objects. Respond ONLY with valid JSON (no other text). Use double quotes for all keys and string values.

    Format:
    [  
      {
          "Timestamp": "current date and time when the source news was published",
          "Input person name": "name of the person (string)",
          "Generated article": "substantial article written in the person's voice and style (minimum 300 words)",
          "Source URL": "actual BBC URL of the source news story",
          "Original title": "original BBC article title",
          "News category": "category like Politics, Technology, Health, etc."
      }
    ]
  `;

  const messagesFinal = [
    { role: 'system', content: concatenatedTriviaQuizAssistant },
    { role: 'user', content: concatenatedTriviaQuizUser }
  ];

  const requestBody = {
    model: aiModel,
    messages: messagesFinal,
    temperature,
    max_completion_tokens: maxCompletionTokens,
    top_p: topP,
    stop,
    stream
  };

  // Add web search for models that support it
  if (aiModel.includes('llama') || aiModel.includes('mixtral')) {
    requestBody.tools = [
      {
        type: "function",
        function: {
          name: "web_search",
          description: "Search the web for current information",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query"
              }
            },
            required: ["query"]
          }
        }
      }
    ];
    requestBody.tool_choice = "auto";
  }

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
    console.error('Groq API Error:', response.status, errorText);
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  return [aiModel, data.choices[0].message.content];
}

export default function HomeScreen() {
  const [personName, setPersonName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!personName.trim()) {
      Alert.alert('Please enter a famous person\'s name');
      return;
    }

    // Check if API key is available before making the request
    if (!groqApiKey || groqApiKey.trim() === '') {
      setError('GROQ_API_KEY is not configured. Please check your .env file and restart the development server.');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Prepare Groq API parameters
    const temperature = 0.7;
    const maxCompletionTokens = 4096; // Increased for longer articles
    const topP = 1;
    const stop = null;
    const stream = false;
    
    const concatenatedTriviaQuizUser: string = `
      Please search for the latest 3 news stories from BBC News (https://www.bbc.com/) and write articles about them as if they were written by ${personName.trim()}.

      For each article:
      1. Find a current BBC news story
      2. Write a substantial article (300-500 words) in ${personName.trim()}'s distinctive voice and perspective
      3. Capture their unique writing style, worldview, and way of thinking
      4. Include the actual BBC source URL
      5. Make sure each article reflects how ${personName.trim()} would interpret and discuss the news

      Focus on current, important news stories from different categories if possible (politics, technology, health, science, etc.).
    `;

    // Use a model that supports web search
    const finalAiModel = "llama-3.1-70b-versatile"; // This model supports web search

    try {
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

      // Print the AI response to the console
      console.log('AI Response:', groqOutput[1]);

      router.push({
        pathname: '/news',
        params: {
          person: personName.trim(),
          aiResponse: groqOutput[1],
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
      description: 'Advanced AI transforms real BBC news through unique historical perspectives'
    },
    {
      icon: Globe,
      title: 'Live BBC News',
      description: 'Latest stories sourced directly from BBC News website'
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
            Experience today's BBC news through the minds of history's greatest thinkers
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>⚠️ Configuration Required</Text>
            <Text style={styles.errorText}>{error}</Text>
            <View style={styles.errorInstructionsContainer}>
              <Text style={styles.errorInstructionsTitle}>Quick Setup:</Text>
              <Text style={styles.errorInstructions}>
                1. Create a .env file in your project root{'\n'}
                2. Add: GROQ_API_KEY=your_api_key_here{'\n'}
                3. Get your API key from https://console.groq.com{'\n'}
                4. Restart the development server (npm run dev)
              </Text>
            </View>
          </View>
        )}

        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Choose Your Perspective</Text>
            <Text style={styles.sectionSubtitle}>
              Enter any famous person's name to see today's BBC news through their unique worldview
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
                  <Text style={styles.submitButtonText}>Searching BBC News & Generating...</Text>
                </View>
              ) : (
                <>
                  <Search size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Generate Live BBC Perspectives</Text>
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
            Tap any name to instantly generate their unique take on today's BBC news
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
                <Text style={styles.stepTitle}>Live News Search</Text>
                <Text style={styles.stepText}>
                  AI searches BBC News for the latest 3 current stories
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
                <Text style={styles.stepTitle}>Unique Articles</Text>
                <Text style={styles.stepText}>
                  Get substantial articles written in their distinctive voice and perspective
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            🤖 All AI-generated content is based on real BBC news stories and clearly labeled. 
            Original BBC articles are always provided for comparison and verification.
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