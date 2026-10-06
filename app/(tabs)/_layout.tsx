import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../utils/ThemeContext';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { dark } = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: COLORS.blue,
        tabBarInactiveTintColor: dark ? '#91A0B7' : '#A0A0A0',

        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingTop: 7,
          paddingBottom: Math.max(7, insets.bottom),
          backgroundColor: dark ? '#111B2B' : COLORS.surface,
          borderTopColor: dark ? '#2B3A52' : COLORS.border,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="reviewers"
        options={{
          title: 'Reviewers',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
