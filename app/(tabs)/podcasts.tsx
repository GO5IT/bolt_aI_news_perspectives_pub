import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Play, Clock, User, Headphones } from 'lucide-react-native';

interface PodcastEpisode {
  id: string;
  title: string;
  originalTitle: string;
  description: string;
  originalDescription: string;
  imageUrl: string;
  duration: string;
  publishedAt: string;
  originalUrl: string;
  source: string;
  aiGenerated: boolean;
}

export default function PodcastsScreen() {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState('');
  const router = useRouter();
  const params = useLocalSearchParams();
  const isMountedRef = useRef(true);

  // Cleanup function to prevent state updates on unmounted component
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (params.person && isMountedRef.current) {
      setSelectedPerson(params.person as string);
      fetchPodcasts(params.person as string);
    }
  }, [params.person]);

  const fetchPodcasts = async (person: string) => {
    if (isMountedRef.current) {
      setRefreshing(true);
    }
    
    // Simulate fetching and transforming podcasts
    setTimeout(() => {
      const mockEpisodes: PodcastEpisode[] = [
        {
          id: '1',
          title: `${person} Discusses: The AI Revolution`,
          originalTitle: 'Tech Leaders Debate AI Ethics',
          description: generateAIDescription(person, 'artificial intelligence and its impact on society'),
          originalDescription: 'Industry leaders discuss the ethical implications of AI development.',
          imageUrl: 'https://images.pexels.com/photos/3761509/pexels-photo-3761509.jpeg?auto=compress&cs=tinysrgb&w=800',
          duration: '15:32',
          publishedAt: '1 hour ago',
          originalUrl: 'https://www.bbc.com/sounds/play/m001234',
          source: 'BBC Radio 4',
          aiGenerated: true,
        },
        {
          id: '2',
          title: `${person}'s Thoughts on Climate Change`,
          originalTitle: 'Climate Scientists Report New Findings',
          description: generateAIDescription(person, 'climate change and environmental responsibility'),
          originalDescription: 'Leading climate scientists share their latest research findings.',
          imageUrl: 'https://images.pexels.com/photos/414837/pexels-photo-414837.jpeg?auto=compress&cs=tinysrgb&w=800',
          duration: '22:15',
          publishedAt: '3 hours ago',
          originalUrl: 'https://www.bbc.com/sounds/play/m001235',
          source: 'BBC World Service',
          aiGenerated: true,
        },
        {
          id: '3',
          title: `${person} on Space Exploration`,
          originalTitle: 'NASA Mission Update from Mars',
          description: generateAIDescription(person, 'space exploration and human curiosity'),
          originalDescription: 'NASA provides updates on the latest Mars exploration mission.',
          imageUrl: 'https://images.pexels.com/photos/586063/pexels-photo-586063.jpeg?auto=compress&cs=tinysrgb&w=800',
          duration: '18:45',
          publishedAt: '5 hours ago',
          originalUrl: 'https://www.bbc.com/sounds/play/m001236',
          source: 'BBC Science Focus',
          aiGenerated: true,
        },
        {
          id: '4',
          title: `${person}'s Take on Global Health`,
          originalTitle: 'WHO Reports on Global Health Initiatives',
          description: generateAIDescription(person, 'global health and medical breakthroughs'),
          originalDescription: 'World Health Organization discusses new global health initiatives.',
          imageUrl: 'https://images.pexels.com/photos/356040/pexels-photo-356040.jpeg?auto=compress&cs=tinysrgb&w=800',
          duration: '25:18',
          publishedAt: '7 hours ago',
          originalUrl: 'https://www.bbc.com/sounds/play/m001237',
          source: 'BBC Health',
          aiGenerated: true,
        },
        {
          id: '5',
          title: `${person} on Innovation and Creativity`,
          originalTitle: 'Creative Industries Showcase New Technologies',
          description: generateAIDescription(person, 'innovation, creativity, and human potential'),
          originalDescription: 'Creative industries demonstrate how new technologies are transforming art.',
          imageUrl: 'https://images.pexels.com/photos/3761509/pexels-photo-3761509.jpeg?auto=compress&cs=tinysrgb&w=800',
          duration: '20:42',
          publishedAt: '9 hours ago',
          originalUrl: 'https://www.bbc.com/sounds/play/m001238',
          source: 'BBC Arts',
          aiGenerated: true,
        },
      ];
      
      if (isMountedRef.current) {
        setEpisodes(mockEpisodes);
        setRefreshing(false);
      }
    }, 1500);
  };

  const generateAIDescription = (person: string, topic: string) => {
    const descriptions = {
      'Albert Einstein': `In this thought-provoking discussion about ${topic}, I explore the fundamental principles that govern our understanding of the universe and how curiosity drives scientific discovery.`,
      'Oprah Winfrey': `Join me as we dive deep into ${topic}, exploring the human stories and emotional connections that make these developments meaningful to all of us.`,
      'Elon Musk': `Let's break down ${topic} from first principles and discuss how we can leverage these insights to solve humanity's greatest challenges and reach for the stars.`,
      'Default': `This episode explores ${topic} through a unique lens, offering fresh perspectives on how these developments shape our world and future.`
    };
    
    return descriptions[person as keyof typeof descriptions] || descriptions.Default;
  };

  const handleEpisodePress = (episode: PodcastEpisode) => {
    router.push({
      pathname: '/podcast',
      params: {
        episodeId: episode.id,
        title: episode.title,
        originalTitle: episode.originalTitle,
        description: episode.description,
        originalDescription: episode.originalDescription,
        imageUrl: episode.imageUrl,
        duration: episode.duration,
        originalUrl: episode.originalUrl,
        person: selectedPerson,
        source: episode.source,
        publishedAt: episode.publishedAt,
      }
    });
  };

  const onRefresh = () => {
    if (selectedPerson && isMountedRef.current) {
      fetchPodcasts(selectedPerson);
    }
  };

  if (!selectedPerson) {
    return (
      <View style={styles.emptyContainer}>
        <Headphones size={48} color="#ccc" />
        <Text style={styles.emptyText}>Select a famous person from the Home tab to hear their podcast perspectives</Text>
        <TouchableOpacity
          style={styles.goHomeButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.goHomeButtonText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{selectedPerson}'s Podcast Perspectives</Text>
        <Text style={styles.headerSubtitle}>AI-generated audio content on today's topics</Text>
      </View>

      <View style={styles.episodesList}>
        {episodes.map((episode) => (
          <TouchableOpacity
            key={episode.id}
            style={styles.episodeCard}
            onPress={() => handleEpisodePress(episode)}
          >
            <Image
              source={{ uri: episode.imageUrl }}
              style={styles.episodeImage}
            />
            <View style={styles.episodeContent}>
              <View style={styles.episodeHeader}>
                <Text style={styles.aiLabel}>AI Generated</Text>
                <View style={styles.durationContainer}>
                  <Clock size={12} color="#666" />
                  <Text style={styles.duration}>{episode.duration}</Text>
                </View>
              </View>
              <Text style={styles.episodeTitle}>{episode.title}</Text>
              <Text style={styles.episodeDescription} numberOfLines={3}>
                {episode.description}
              </Text>
              <View style={styles.episodeFooter}>
                <View style={styles.sourceInfo}>
                  <User size={14} color="#666" />
                  <Text style={styles.sourceText}>{selectedPerson}</Text>
                </View>
                <View style={styles.sourceInfo}>
                  <Text style={styles.sourceText}>{episode.source}</Text>
                </View>
                <TouchableOpacity style={styles.playButton}>
                  <Play size={16} color="#BB1919" fill="#BB1919" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 22,
  },
  goHomeButton: {
    backgroundColor: '#BB1919',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  goHomeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#1E3A8A',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  episodesList: {
    padding: 16,
  },
  episodeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  episodeImage: {
    width: 120,
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  episodeContent: {
    flex: 1,
    padding: 16,
  },
  episodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiLabel: {
    backgroundColor: '#9C27B0',
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duration: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 22,
  },
  episodeDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  episodeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sourceText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BB1919',
  },
});