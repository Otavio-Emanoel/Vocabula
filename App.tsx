import './global.css';
import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
} from 'react-native-reanimated';

import {
  initializeDatabase,
  getAllWords,
  getAllSavedWords,
} from './db';
import { WordDefinition } from './types/dictionary';
import { NotificationService } from './services/notifications/notificationService';
import { Colors } from './constants/theme';

import { TikTokFeed } from './components/feed/TikTokFeed';
import { SearchScreen } from './components/search/SearchScreen';
import { ProfileScreen } from './components/profile/ProfileScreen';

type TabType = 'feed' | 'search' | 'profile';

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
  const [words, setWords] = useState<WordDefinition[]>([]);
  const [starredWordIds, setStarredWordIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadApp();
  }, []);

  const loadApp = async () => {
    try {
      await initializeDatabase();
      const [allWords, savedWords] = await Promise.all([
        getAllWords(),
        getAllSavedWords(),
      ]);

      setWords(allWords);
      const starred = new Set(savedWords.map((w) => w.id));
      setStarredWordIds(starred);

      // Attempt background notification schedule
      NotificationService.scheduleRollingNotifications().catch(() => {});
    } catch (err) {
      console.error('App initialization error:', err);
    } finally {
      setIsLoading(false);
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
              words={words}
              starredWordIds={starredWordIds}
              onToggleStarSuccess={handleToggleStarSuccess}
              onShowToast={showToast}
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
              initialWords={words}
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

      {/* Floating Bottom Navigation Bar */}
      <View className="absolute bottom-0 left-0 right-0 h-[70px] bg-[#090D16]/95 border-t border-slate-800/80 px-8 flex-row items-center justify-around z-40">
        {/* Feed Tab */}
        <TouchableOpacity
          onPress={() => setActiveTab('feed')}
          activeOpacity={0.7}
          className="items-center justify-center py-1"
        >
          <Ionicons
            name={activeTab === 'feed' ? 'book' : 'book-outline'}
            size={22}
            color={activeTab === 'feed' ? Colors.brand.glow : '#64748B'}
          />
          <Text
            className={`text-[10px] font-semibold mt-1 tracking-wider ${
              activeTab === 'feed' ? 'text-indigo-400' : 'text-slate-500'
            }`}
          >
            Feed
          </Text>
        </TouchableOpacity>

        {/* Search Tab */}
        <TouchableOpacity
          onPress={() => setActiveTab('search')}
          activeOpacity={0.7}
          className="items-center justify-center py-1"
        >
          <Ionicons
            name={activeTab === 'search' ? 'search' : 'search-outline'}
            size={22}
            color={activeTab === 'search' ? Colors.brand.glow : '#64748B'}
          />
          <Text
            className={`text-[10px] font-semibold mt-1 tracking-wider ${
              activeTab === 'search' ? 'text-indigo-400' : 'text-slate-500'
            }`}
          >
            Search
          </Text>
        </TouchableOpacity>

        {/* Profile Tab */}
        <TouchableOpacity
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.7}
          className="items-center justify-center py-1"
        >
          <Ionicons
            name={activeTab === 'profile' ? 'person' : 'person-outline'}
            size={22}
            color={activeTab === 'profile' ? Colors.brand.glow : '#64748B'}
          />
          <Text
            className={`text-[10px] font-semibold mt-1 tracking-wider ${
              activeTab === 'profile' ? 'text-indigo-400' : 'text-slate-500'
            }`}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
