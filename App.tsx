import './global.css';
import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Text,
  View,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  SlideInUp,
} from 'react-native-reanimated';

import {
  initializeDatabase,
  getWordOfTheDay,
  searchWords,
  getWordById,
  toggleStarWord,
  recordReviewProgress,
  getUpcomingWordsForScheduling,
} from './db';
import { WordDefinition } from './types/dictionary';
import { UserWordProgress, ReviewGrade } from './types/srs';
import { calculateSM2 } from './services/srs/sm2';

export default function App() {
  return (
    <SafeAreaProvider>
      <LexiPulseMain />
    </SafeAreaProvider>
  );
}

function LexiPulseMain() {
  const [isLoading, setIsLoading] = useState(true);
  const [wordList, setWordList] = useState<WordDefinition[]>([]);
  const [activeWord, setActiveWord] = useState<WordDefinition | null>(null);
  const [activeProgress, setActiveProgress] = useState<UserWordProgress | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WordDefinition[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'browse' | 'review'>('today');
  const [selectedExampleIndex, setSelectedExampleIndex] = useState(0);

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function setup() {
      try {
        await initializeDatabase();
        const allWords = await getUpcomingWordsForScheduling(20);
        setWordList(allWords);

        const dailyWord = await getWordOfTheDay();
        if (dailyWord) {
          const detail = await getWordById(dailyWord.id);
          setActiveWord(detail?.word || dailyWord);
          setActiveProgress(detail?.progress);
        }
      } catch (error) {
        console.error('Database initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    }
    setup();
  }, []);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleSelectWord = async (word: WordDefinition) => {
    const detail = await getWordById(word.id);
    setActiveWord(detail?.word || word);
    setActiveProgress(detail?.progress);
    setSelectedExampleIndex(0);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await searchWords(text, 10);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handlePronounce = (textToSpeak: string) => {
    Speech.stop();
    setIsSpeaking(true);
    Speech.speak(textToSpeak, {
      language: 'en-US',
      rate: 0.85,
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleToggleStar = async () => {
    if (!activeWord) return;
    try {
      const isStarred = await toggleStarWord(activeWord.id);
      setActiveProgress((prev) =>
        prev
          ? { ...prev, isStarred }
          : {
              wordId: activeWord.id,
              status: 'new',
              easeFactor: 2.5,
              intervalDays: 0,
              repetitionNumber: 0,
              nextReviewAt: Date.now(),
              isStarred,
            }
      );
      showToast(isStarred ? '⭐ Saved to bookmarks' : 'Removed from bookmarks');
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  const handleGradeWord = async (grade: ReviewGrade) => {
    if (!activeWord) return;

    const currentStats = {
      grade,
      repetitionNumber: activeProgress?.repetitionNumber ?? 0,
      easeFactor: activeProgress?.easeFactor ?? 2.5,
      intervalDays: activeProgress?.intervalDays ?? 0,
    };

    const nextSM2 = calculateSM2(currentStats);

    await recordReviewProgress(
      activeWord.id,
      grade,
      nextSM2.easeFactor,
      nextSM2.intervalDays,
      nextSM2.repetitionNumber,
      nextSM2.nextReviewAt,
      nextSM2.status
    );

    setActiveProgress((prev) => ({
      wordId: activeWord.id,
      status: nextSM2.status,
      easeFactor: nextSM2.easeFactor,
      intervalDays: nextSM2.intervalDays,
      repetitionNumber: nextSM2.repetitionNumber,
      nextReviewAt: nextSM2.nextReviewAt,
      isStarred: prev?.isStarred ?? false,
      lastReviewedAt: Date.now(),
    }));

    if (grade >= 4) {
      showToast(`✨ Mastered! Next review in ${nextSM2.intervalDays} day${nextSM2.intervalDays > 1 ? 's' : ''}`);
    } else if (grade >= 3) {
      showToast(`👍 Reviewed. Next repetition in ${nextSM2.intervalDays} days.`);
    } else {
      showToast(`🔄 Word queued for quick review tomorrow.`);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-void">
        <Image
          source={require('./assets/icon.png')}
          style={{ width: 72, height: 72, borderRadius: 18 }}
          className="mb-4"
        />
        <ActivityIndicator size="large" color="#6366F1" />
        <Text className="text-slate-400 mt-4 text-sm font-medium tracking-wide">
          Hydrating LexiPulse Dictionary...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-void" edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <Animated.View
          entering={SlideInUp.duration(300)}
          className="absolute top-12 left-5 right-5 z-50 bg-slate-900/95 border border-brand-primary/50 py-3 px-4 rounded-2xl shadow-2xl flex-row items-center justify-between"
        >
          <View className="flex-row items-center flex-1 mr-2">
            <Ionicons name="sparkles" size={18} color="#FBBF24" style={{ marginRight: 8 }} />
            <Text className="text-white text-xs font-semibold">{toastMessage}</Text>
          </View>
          <TouchableOpacity onPress={() => setToastMessage(null)}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </Animated.View>
      )}

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
        {/* Ambient Top Bar */}
        <View className="px-5 pt-2 pb-3 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Image
              source={require('./assets/icon.png')}
              style={{ width: 38, height: 38, borderRadius: 12 }}
              className="mr-3 border border-surface-border"
            />
            <View>
              <Text className="text-2xl font-black tracking-tight text-white">
                Lexi<Text className="text-brand-glow">Pulse</Text>
              </Text>
              <View className="flex-row items-center mt-0.5">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                <Text className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  100% Offline
                </Text>
              </View>
            </View>
          </View>

          {/* Streak Badge */}
          <View className="flex-row items-center bg-brand-tint/60 border border-brand-primary/30 px-3 py-1.5 rounded-full">
            <MaterialCommunityIcons name="fire" size={18} color="#FBBF24" />
            <Text className="text-xs font-bold text-brand-spark ml-1">14 Days</Text>
          </View>
        </View>

        {/* Search Header Bar */}
        <View className="px-5 my-2">
          <View className="bg-surface-card border border-surface-border rounded-2xl flex-row items-center px-4 py-2.5 shadow-lg">
            <Ionicons name="search" size={18} color="#818CF8" style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search offline lexicon (FTS5)..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={handleSearch}
              className="flex-1 text-white text-sm py-1 font-medium"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Ionicons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Live FTS5 Search Results Dropdown */}
          {searchQuery.trim().length > 0 && searchResults.length > 0 && (
            <Animated.View
              entering={FadeInDown.duration(200)}
              className="bg-surface-elevated border border-surface-border rounded-2xl mt-2 p-2 shadow-2xl z-40"
            >
              {searchResults.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleSelectWord(item)}
                  className="py-2.5 px-3 border-b border-surface-border/40 flex-row justify-between items-center rounded-lg active:bg-brand-tint/40"
                >
                  <View className="flex-1 mr-2">
                    <Text className="text-sm font-bold text-white">{item.word}</Text>
                    <Text className="text-xs text-slate-400 font-mono" numberOfLines={1}>
                      {item.phonetic} • {item.shortDefinition}
                    </Text>
                  </View>
                  <View className="bg-brand-tint px-2 py-0.5 rounded-md border border-brand-primary/20">
                    <Text className="text-[10px] font-bold text-brand-glow uppercase">
                      {item.partOfSpeech}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}
        </View>

        {/* Horizontal Lexicon Carousel Chips */}
        <View className="py-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {wordList.map((item) => {
              const isSelected = activeWord?.id === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleSelectWord(item)}
                  className={`mr-2.5 px-3.5 py-2 rounded-xl flex-row items-center border ${
                    isSelected
                      ? 'bg-brand-primary border-brand-glow shadow-md shadow-brand-primary/40'
                      : 'bg-surface-card border-surface-border'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? 'text-white' : 'text-slate-300'
                    }`}
                  >
                    {item.word}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Hero Interactive Word Card */}
        {activeWord && (
          <Animated.View
            key={activeWord.id}
            entering={FadeInDown.duration(400)}
            className="mx-5 mt-2 bg-surface-card border border-surface-border rounded-3xl p-6 shadow-2xl overflow-hidden"
          >
            {/* Ambient Background Glow Effect */}
            <View className="absolute -top-16 -right-16 w-36 h-36 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Card Header: Badge & Star Bookmark */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="bg-brand-spark/10 border border-brand-spark/30 px-3 py-1 rounded-full flex-row items-center mr-2">
                  <Ionicons name="sparkles" size={12} color="#FBBF24" style={{ marginRight: 4 }} />
                  <Text className="text-[11px] font-bold tracking-wider uppercase text-brand-spark">
                    Word of the Day
                  </Text>
                </View>
                <View className="bg-surface-elevated border border-surface-border px-2.5 py-1 rounded-full">
                  <Text className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                    Tier {activeWord.difficultyLevel}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleToggleStar}
                className="w-10 h-10 rounded-full bg-surface-elevated border border-surface-border items-center justify-center active:scale-95"
              >
                <Ionicons
                  name={activeProgress?.isStarred ? 'star' : 'star-outline'}
                  size={20}
                  color={activeProgress?.isStarred ? '#FBBF24' : '#94A3B8'}
                />
              </TouchableOpacity>
            </View>

            {/* Word Heading & Audio Pronunciation Button */}
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1 mr-3">
                <Text className="text-3xl font-black text-white tracking-tight">
                  {activeWord.word}
                </Text>
                <View className="flex-row items-center mt-1.5 flex-wrap">
                  <Text className="text-sm font-mono text-brand-glow mr-2.5">
                    {activeWord.phonetic}
                  </Text>
                  <View className="bg-brand-tint/60 px-2 py-0.5 rounded border border-brand-primary/30">
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-brand-glow">
                      {activeWord.partOfSpeech}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Native Speech TTS Button */}
              <TouchableOpacity
                onPress={() => handlePronounce(activeWord.word)}
                className={`w-12 h-12 rounded-2xl items-center justify-center border shadow-lg ${
                  isSpeaking
                    ? 'bg-brand-primary border-brand-glow shadow-brand-primary/50 scale-105'
                    : 'bg-brand-tint border-brand-primary/40'
                }`}
              >
                <Ionicons
                  name={isSpeaking ? 'volume-high' : 'volume-medium'}
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            {/* Short Definition Box */}
            <View className="bg-surface-elevated/70 border border-surface-border/70 rounded-2xl p-4 my-3">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Definition
              </Text>
              <Text className="text-base text-slate-100 font-medium leading-relaxed">
                {activeWord.shortDefinition}
              </Text>
            </View>

            {/* Detailed Explanation */}
            <View className="my-1">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Linguistic Nuance
              </Text>
              <Text className="text-xs text-slate-300 leading-relaxed">
                {activeWord.detailedExplanation}
              </Text>
            </View>

            {/* Interactive Contextual Examples */}
            {activeWord.examples && activeWord.examples.length > 0 && (
              <View className="mt-4 pt-3 border-t border-surface-border/60">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Contextual Example
                  </Text>
                  <TouchableOpacity
                    onPress={() => handlePronounce(activeWord.examples[selectedExampleIndex].sentence)}
                    className="flex-row items-center"
                  >
                    <Ionicons name="play-circle-outline" size={14} color="#818CF8" />
                    <Text className="text-[11px] font-semibold text-brand-glow ml-1">Listen</Text>
                  </TouchableOpacity>
                </View>

                <View className="bg-surface-subtle/80 border border-surface-border/50 rounded-xl p-3">
                  <Text className="text-xs text-slate-200 italic leading-relaxed mb-1">
                    "{activeWord.examples[selectedExampleIndex].sentence}"
                  </Text>
                  {activeWord.examples[selectedExampleIndex].translation && (
                    <Text className="text-[11px] text-slate-400 mt-1">
                      {activeWord.examples[selectedExampleIndex].translation}
                    </Text>
                  )}
                  {activeWord.examples[selectedExampleIndex].context && (
                    <View className="self-start mt-2 bg-surface-card px-2 py-0.5 rounded border border-surface-border">
                      <Text className="text-[9px] font-semibold text-brand-spark uppercase">
                        {activeWord.examples[selectedExampleIndex].context}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Etymology */}
            {activeWord.etymology && (
              <View className="mt-3 pt-3 border-t border-surface-border/60 flex-row items-center">
                <Feather name="book-open" size={13} color="#64748B" style={{ marginRight: 6 }} />
                <Text className="text-[11px] text-slate-400 flex-1 leading-snug">
                  <Text className="font-bold text-slate-300">Origin: </Text>
                  {activeWord.etymology}
                </Text>
              </View>
            )}

            {/* Spaced Repetition (SM-2) Interactive Recall Rating */}
            <View className="mt-5 pt-4 border-t border-surface-border/80">
              <View className="flex-row items-center justify-between mb-2.5">
                <Text className="text-xs font-bold text-white tracking-wide">
                  Spaced Repetition Feedback
                </Text>
                <Text className="text-[10px] text-slate-400 font-mono">
                  Repetitions: {activeProgress?.repetitionNumber ?? 0}
                </Text>
              </View>

              <View className="flex-row justify-between gap-1.5">
                <TouchableOpacity
                  onPress={() => handleGradeWord(1)}
                  className="flex-1 py-2.5 rounded-xl items-center bg-rose-500/10 border border-rose-500/30 active:scale-95"
                >
                  <Ionicons name="refresh" size={16} color="#F43F5E" />
                  <Text className="text-[10px] font-bold text-rose-400 mt-0.5">Forgot</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleGradeWord(2)}
                  className="flex-1 py-2.5 rounded-xl items-center bg-orange-500/10 border border-orange-500/30 active:scale-95"
                >
                  <Ionicons name="alert-circle-outline" size={16} color="#F97316" />
                  <Text className="text-[10px] font-bold text-orange-400 mt-0.5">Hard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleGradeWord(4)}
                  className="flex-1 py-2.5 rounded-xl items-center bg-indigo-500/10 border border-indigo-500/30 active:scale-95"
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color="#818CF8" />
                  <Text className="text-[10px] font-bold text-brand-glow mt-0.5">Good</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleGradeWord(5)}
                  className="flex-1 py-2.5 rounded-xl items-center bg-emerald-500/10 border border-emerald-500/30 active:scale-95"
                >
                  <Ionicons name="trophy-outline" size={16} color="#10B981" />
                  <Text className="text-[10px] font-bold text-emerald-400 mt-0.5">Mastered</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Modern Floating Bottom Navigation Bar */}
      <View className="absolute bottom-4 left-5 right-5 bg-surface-card/90 border border-surface-border py-3 px-6 rounded-3xl shadow-2xl flex-row justify-around items-center backdrop-blur-xl">
        <TouchableOpacity
          onPress={() => setActiveTab('today')}
          className="items-center"
        >
          <Ionicons
            name={activeTab === 'today' ? 'sparkles' : 'sparkles-outline'}
            size={22}
            color={activeTab === 'today' ? '#6366F1' : '#64748B'}
          />
          <Text
            className={`text-[10px] font-bold mt-1 ${
              activeTab === 'today' ? 'text-brand-glow' : 'text-slate-500'
            }`}
          >
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTab('browse');
            showToast('Showing curated offline lexicon');
          }}
          className="items-center"
        >
          <Ionicons
            name={activeTab === 'browse' ? 'book' : 'book-outline'}
            size={22}
            color={activeTab === 'browse' ? '#6366F1' : '#64748B'}
          />
          <Text
            className={`text-[10px] font-bold mt-1 ${
              activeTab === 'browse' ? 'text-brand-glow' : 'text-slate-500'
            }`}
          >
            Lexicon
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTab('review');
            showToast('SRS Review Queue: 12 words ready');
          }}
          className="items-center"
        >
          <Ionicons
            name={activeTab === 'review' ? 'albums' : 'albums-outline'}
            size={22}
            color={activeTab === 'review' ? '#6366F1' : '#64748B'}
          />
          <Text
            className={`text-[10px] font-bold mt-1 ${
              activeTab === 'review' ? 'text-brand-glow' : 'text-slate-500'
            }`}
          >
            Review
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
