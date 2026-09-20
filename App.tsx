import './global.css';
import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  initializeDatabase,
  getAllWords,
  getRandomWords,
  getAllSavedWords,
} from './db';
import { WordDefinition } from './types/dictionary';
import { NotificationService } from './services/notifications/notificationService';
import { Colors } from './constants/theme';

import { TikTokFeed } from './components/feed/TikTokFeed';
import { SearchScreen } from './components/search/SearchScreen';
import { ProfileScreen } from './components/profile/ProfileScreen';
import { FlashcardReviewModal } from './components/modals/FlashcardReviewModal';
import { PracticeFilter } from './db/queries';
import { DailyService } from './services/learning/dailyService';

type TabType = 'feed' | 'search' | 'profile';

interface TabItemConfig {
  id: TabType;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const TABS: TabItemConfig[] = [
  { id: 'feed', label: 'Feed', iconActive: 'book', iconInactive: 'book-outline' },
  { id: 'search', label: 'Search', iconActive: 'search', iconInactive: 'search-outline' },
  { id: 'profile', label: 'Profile', iconActive: 'person', iconInactive: 'person-outline' },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <VocabulaApp />
    </SafeAreaProvider>
  );
}

function VocabulaApp() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [feedWords, setFeedWords] = useState<WordDefinition[]>([]);
  const [dictionaryWords, setDictionaryWords] = useState<WordDefinition[]>([]);
  const [isRefreshingFeed, setIsRefreshingFeed] = useState(false);
  const [starredWordIds, setStarredWordIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Practice Flashcards Modal State
  const [isPracticeModalVisible, setIsPracticeModalVisible] = useState(false);
  const [practiceFilter, setPracticeFilter] = useState<PracticeFilter | undefined>(undefined);
  const [practiceDeckTitle, setPracticeDeckTitle] = useState<string | undefined>(undefined);

  // Layout width for bottom bar sliding indicator
  const [barWidth, setBarWidth] = useState(0);
  const tabIndicatorPos = useSharedValue(0);

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadApp();
  }, []);

  const handleStartPractice = (filter?: PracticeFilter, title?: string) => {
    setPracticeFilter(filter);
    setPracticeDeckTitle(title);
    setIsPracticeModalVisible(true);
  };

  const handleTabPress = (tab: TabType, index: number) => {
    setActiveTab(tab);
    tabIndicatorPos.value = withSpring(index, {
      damping: 22,
      stiffness: 240,
      mass: 0.8,
    });
  };

  const loadApp = async () => {
    try {
      await initializeDatabase();
      const [allWords, randomWords, savedWords] = await Promise.all([
        getAllWords(),
        getRandomWords(),
        getAllSavedWords(),
      ]);

      setDictionaryWords(allWords);
      setFeedWords(randomWords);
      const starred = new Set(savedWords.map((w) => w.id));
      setStarredWordIds(starred);

      // Track and update daily streak
      const { streak: activeStreak, isNewDay } = await DailyService.recordDailyActivity();
      if (isNewDay && activeStreak > 1) {
        showToast(`🔥 ${activeStreak}-day streak active! Welcome back to Vocabula!`);
      }

      // Attempt background notification schedule
      NotificationService.scheduleRollingNotifications().catch(() => {});
    } catch (err) {
      console.error('App initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshFeed = async () => {
    setIsRefreshingFeed(true);
    try {
      const freshWords = await getRandomWords();
      setFeedWords(freshWords);
      showToast('🔀 Shuffled Vocabula feed');
    } catch (err) {
      console.error('Failed to randomize feed:', err);
    } finally {
      setIsRefreshingFeed(false);
    }
  };

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleToggleStarSuccess = (wordId: string, isStarred: boolean) => {
    setStarredWordIds((prev) => {
      const next = new Set(prev);
      if (isStarred) {
        next.add(wordId);
      } else {
        next.delete(wordId);
      }
      return next;
    });
  };

  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    if (barWidth === 0) return {};
    const tabWidth = barWidth / TABS.length;
    return {
      transform: [
        {
          translateX: tabIndicatorPos.value * tabWidth,
        },
      ],
      width: tabWidth,
    };
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#090D16] items-center justify-center">
        <StatusBar style="light" />
        <View className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/40 items-center justify-center mb-4 shadow-xl">
          <Ionicons name="sparkles" size={28} color="#818CF8" />
        </View>
        <Text className="text-white text-2xl font-serif font-bold tracking-tight mb-2">
          Vocabula
        </Text>
        <Text className="text-slate-400 text-xs tracking-widest uppercase mb-4">
          Offline Vocabulary Codex
        </Text>
        <ActivityIndicator size="small" color="#818CF8" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#090D16]">
      <StatusBar style="light" />

      {/* Screen Views with Reanimated Enter/Exit Transitions */}
      <View className="flex-1">
        {activeTab === 'feed' && (
          <Animated.View
            key="tab-feed"
            entering={FadeIn.duration(240)}
            exiting={FadeOut.duration(180)}
            className="flex-1"
          >
            <TikTokFeed
              words={feedWords}
              starredWordIds={starredWordIds}
              onToggleStarSuccess={handleToggleStarSuccess}
              onShowToast={showToast}
              onRefreshFeed={handleRefreshFeed}
              isRefreshing={isRefreshingFeed}
            />
          </Animated.View>
        )}

        {activeTab === 'search' && (
          <Animated.View
            key="tab-search"
            entering={FadeIn.duration(240)}
            exiting={FadeOut.duration(180)}
            className="flex-1"
          >
            <SearchScreen
              initialWords={dictionaryWords}
              starredWordIds={starredWordIds}
              onToggleStarSuccess={handleToggleStarSuccess}
              onShowToast={showToast}
            />
          </Animated.View>
        )}

        {activeTab === 'profile' && (
          <Animated.View
            key="tab-profile"
            entering={FadeIn.duration(240)}
            exiting={FadeOut.duration(180)}
            className="flex-1"
          >
            <ProfileScreen
              onShowToast={showToast}
              onRefreshData={loadApp}
              onStartPractice={handleStartPractice}
            />
          </Animated.View>
        )}
      </View>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <Animated.View
          entering={SlideInUp.duration(200)}
          exiting={FadeOut.duration(180)}
          className="absolute top-14 left-6 right-6 z-50 bg-slate-900/95 border border-slate-700/80 rounded-2xl px-4 py-3 shadow-2xl flex-row items-center justify-center"
        >
          <Text className="text-white text-xs font-semibold text-center tracking-wide">
            {toastMessage}
          </Text>
        </Animated.View>
      )}

      {/* Floating Fluid Bottom Navigation Bar */}
      <View
        onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
        className="absolute bottom-0 left-0 right-0 h-[72px] bg-[#090D16]/95 border-t border-slate-800/80 flex-row items-center justify-around z-40 overflow-hidden"
      >
        {/* Animated Sliding Pill Indicator */}
        {barWidth > 0 && (
          <Animated.View
            style={[
              indicatorAnimatedStyle,
              {
                position: 'absolute',
                top: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}
          >
            <View className="h-12 w-[82%] rounded-2xl bg-indigo-600/15 border border-indigo-500/30" />
          </Animated.View>
        )}

        {/* Tab Buttons with tactile physics */}
        {TABS.map((tab, idx) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => handleTabPress(tab.id, idx)}
              className="flex-1 items-center justify-center py-2 h-full z-10"
            >
              <Ionicons
                name={isActive ? tab.iconActive : tab.iconInactive}
                size={22}
                color={isActive ? Colors.brand.glow : '#64748B'}
              />
              <Text
                className={`text-[11px] font-semibold mt-1 tracking-wider ${
                  isActive ? 'text-indigo-300 font-bold' : 'text-slate-500'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Interactive Spaced Repetition (SM-2) Flashcard Study Modal */}
      <FlashcardReviewModal
        visible={isPracticeModalVisible}
        onClose={() => setIsPracticeModalVisible(false)}
        filter={practiceFilter}
        sessionTitle={practiceDeckTitle}
        onSessionComplete={() => {
          loadApp();
          showToast('🎉 Flashcard study session completed!');
        }}
      />
    </View>
  );
}
