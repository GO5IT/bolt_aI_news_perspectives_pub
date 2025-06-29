import { Tabs } from 'expo-router';
import { Sparkles, Newspaper, Headphones } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#BB1919',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          height: 88,
          paddingBottom: 34,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Perspectives',
          tabBarIcon: ({ size, color }) => (
            <Sparkles size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: 'Articles',
          tabBarIcon: ({ size, color }) => (
            <Newspaper size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="podcasts"
        options={{
          title: 'Podcasts',
          tabBarIcon: ({ size, color }) => (
            <Headphones size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}