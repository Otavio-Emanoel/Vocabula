import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  LinearTransition,
} from 'react-native-reanimated';

import { WordDefinition } from '../../types/dictionary';
import { calculateSM2 } from '../../services/srs/sm2';
import {
  getWordsForPractice,
  getWordById,
  recordReviewProgress,
  PracticeFilter,
} from '../../db/queries';
import { ReviewGrade } from '../../types/srs';
import { Colors } from '../../constants/theme';

interface FlashcardReviewModalProps {
  visible: boolean;
  onClose: () => void;
  filter?: PracticeFilter;
  sessionTitle?: string;
  onSessionComplete?: () => void;
  onShowToast?: (msg: string) => void;
}

export function FlashcardReviewModal({
  visible,
  onClose,
  filter,
  sessionTitle = 'Vocabulary Practice',
  onSessionComplete,
  onShowToast,
}: FlashcardReviewModalProps) {
  const [words, setWords] = useState<WordDefinition[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Session stats
  const [reviewedCount, setReviewedCount] = useState(0);
  const [masteredInSession, setMasteredInSession] = useState(0);

  // Audio scale animation
  const audioScale = useSharedValue(1);
  const audioAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: audioScale.value }],
  }));

  useEffect(() => {
    if (visible) {
      loadPracticeWords();
    } else {
      // Reset state on modal close
      setIsCompleted(false);
      setCurrentIndex(0);
      setIsRevealed(false);
      setReviewedCount(0);
      setMasteredInSession(0);
    }
  }, [visible]);

  const loadPracticeWords = async () => {
    setIsLoading(true);
    try {
      const practiceWords = await getWordsForPractice(filter);
      setWords(practiceWords);
      setCurrentIndex(0);
      setIsRevealed(false);
      setIsCompleted(false);
      setReviewedCount(0);
      setMasteredInSession(0);
    } catch (err) {
      console.error('Failed to load practice words:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePronounce = (text: string) => {
    Speech.stop();
    setIsSpeaking(true);
    audioScale.value = withSpring(1.15, { damping: 10 });
    Speech.speak(text, {
      language: 'en-US',
      rate: 0.85,
      onDone: () => {
        setIsSpeaking(false);
        audioScale.value = withSpring(1.0);
      },
      onError: () => {
        setIsSpeaking(false);
        audioScale.value = withSpring(1.0);
      },
    });
  };

  const handleGrade = async (grade: ReviewGrade) => {
    if (currentIndex >= words.length) return;
    const currentWord = words[currentIndex];

    try {
      // Fetch current word progress from SQLite
      const wordData = await getWordById(currentWord.id);
      const currentProgress = wordData?.progress;

      const easeFactor = currentProgress?.easeFactor ?? 2.5;
      const intervalDays = currentProgress?.intervalDays ?? 0;
      const repetitionNumber = currentProgress?.repetitionNumber ?? 0;

      // Calculate new SM-2 values
      const sm2Result = calculateSM2({
        grade,
        easeFactor,
        intervalDays,
        repetitionNumber,
      });

      // Record review progress in SQLite
      await recordReviewProgress(
        currentWord.id,
        grade,
        sm2Result.easeFactor,
        sm2Result.intervalDays,
        sm2Result.repetitionNumber,
        sm2Result.nextReviewAt,
        sm2Result.status
      );

      setReviewedCount((prev) => prev + 1);
      if (grade >= 3) {
        setMasteredInSession((prev) => prev + 1);
      }

      // Transition to next card or completion
      if (currentIndex + 1 < words.length) {
        setCurrentIndex((prev) => prev + 1);
        setIsRevealed(false);
      } else {
        setIsCompleted(true);
        onSessionComplete?.();
      }
    } catch (err) {
      console.error('Error recording review grade:', err);
    }
  };

  const handleShareCurrentWord = async () => {
    const word = words[currentIndex];
    if (!word) return;

    try {
      const shareText = `✨ Vocabula Codex\n\n` +
        `📖 ${word.word} ${word.phonetic} (${word.partOfSpeech})\n` +
        `"${word.shortDefinition}"\n` +
        (word.translations?.pt ? `Tradução: ${word.translations.pt}\n` : '') +
        (word.examples?.[0] ? `Exemplo: "${word.examples[0].sentence}"\n` : '') +
        `\nOffline Vocabulary Codex`;

      await Share.share({ message: shareText });
      onShowToast?.(`Shared "${word.word}"`);
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  if (!visible) return null;

  const currentWord = words[currentIndex];

  // Part of speech badge styling
  const getPosBadge = (pos: string) => {
    switch (pos.toLowerCase()) {
      case 'noun':
        return { bg: 'bg-emerald-950/60', border: 'border-emerald-500/40', text: 'text-emerald-300' };
      case 'verb':
        return { bg: 'bg-indigo-950/60', border: 'border-indigo-500/40', text: 'text-indigo-300' };
      case 'adjective':
        return { bg: 'bg-amber-950/60', border: 'border-amber-500/40', text: 'text-amber-300' };
      case 'adverb':
        return { bg: 'bg-rose-950/60', border: 'border-rose-500/40', text: 'text-rose-300' };
      default:
        return { bg: 'bg-slate-800', border: 'border-slate-700', text: 'text-slate-300' };
    }
  };

  const posStyle = currentWord ? getPosBadge(currentWord.partOfSpeech) : getPosBadge('noun');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-[#090D16] px-6 pt-12 pb-8">
        {/* Top Header */}
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={onClose}
            className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center"
          >
            <Ionicons name="close" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-white text-base font-serif font-bold tracking-tight">
              {sessionTitle}
            </Text>
            {words.length > 0 && !isCompleted && (
              <Text className="text-slate-400 text-xs mt-0.5">
                Card {currentIndex + 1} of {words.length}
              </Text>
            )}
          </View>

          {currentWord && !isCompleted ? (
            <TouchableOpacity
              onPress={handleShareCurrentWord}
              className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center"
            >
              <Ionicons name="share-outline" size={18} color="#818CF8" />
            </TouchableOpacity>
          ) : (
            <View className="w-10" />
          )}
        </View>

        {/* Horizontal Progress Bar */}
        {words.length > 0 && !isCompleted && (
          <View className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden mb-6">
            <View
              className="h-full bg-indigo-500 rounded-full"
              style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
            />
          </View>
        )}

        {/* Loading View */}
        {isLoading && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={Colors.brand.glow} />
            <Text className="text-slate-400 text-sm mt-3 font-medium">
              Preparing your practice deck...
            </Text>
          </View>
        )}

        {/* Empty View */}
        {!isLoading && words.length === 0 && (
          <View className="flex-1 items-center justify-center px-4">
            <Ionicons name="sparkles-outline" size={48} color="#818CF8" />
            <Text className="text-white text-xl font-serif font-bold mt-4 text-center">
              No Cards Due for Practice
            </Text>
            <Text className="text-slate-400 text-sm text-center mt-2 leading-relaxed">
              You're completely caught up! Save words to your folders or star words from the feed to practice them anytime.
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="mt-6 bg-indigo-600 px-6 py-3 rounded-2xl"
            >
              <Text className="text-white font-semibold text-sm">Return to Codex</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Session Complete View */}
        {!isLoading && isCompleted && (
          <Animated.View
            entering={FadeIn.duration(300)}
            className="flex-1 items-center justify-center px-4"
          >
            <View className="w-20 h-20 rounded-3xl bg-indigo-600/20 border border-indigo-500/40 items-center justify-center mb-6 shadow-2xl">
              <Ionicons name="trophy" size={36} color="#FBBF24" />
            </View>

            <Text className="text-white text-3xl font-serif font-bold tracking-tight text-center">
              Practice Complete!
            </Text>
            <Text className="text-slate-400 text-sm text-center mt-2">
              You just strengthened your neural recall with SuperMemo-2.
            </Text>

            {/* Stats Badge */}
            <View className="flex-row items-center justify-around w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 my-6">
              <View className="items-center">
                <Text className="text-indigo-400 text-2xl font-serif font-bold">
                  {reviewedCount}
                </Text>
                <Text className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
                  Cards Studied
                </Text>
              </View>
              <View className="w-[1px] h-8 bg-slate-800" />
              <View className="items-center">
                <Text className="text-emerald-400 text-2xl font-serif font-bold">
                  {reviewedCount > 0 ? Math.round((masteredInSession / reviewedCount) * 100) : 0}%
                </Text>
                <Text className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
                  Retention Rate
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="w-full bg-indigo-600 py-3.5 rounded-2xl items-center justify-center shadow-lg"
            >
              <Text className="text-white font-semibold text-base">Done</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Active Flashcard View */}
        {!isLoading && !isCompleted && currentWord && (
          <View className="flex-1 justify-between">
            {/* Flashcard Body */}
            <Pressable
              onPress={() => !isRevealed && setIsRevealed(true)}
              className="flex-1 bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 mb-4 shadow-2xl justify-between overflow-hidden"
            >
              <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                {/* Front Info */}
                <View className="items-center mt-4 mb-6">
                  <Text className="text-white text-4xl sm:text-5xl font-serif font-bold tracking-tight text-center mb-2">
                    {currentWord.word}
                  </Text>
                  <Text className="text-indigo-400 font-mono text-base mb-3">
                    {currentWord.phonetic}
                  </Text>

                  <View className="flex-row items-center gap-2">
                    <View className={`rounded-full px-3 py-1 border ${posStyle.bg} ${posStyle.border}`}>
                      <Text className={`text-xs font-semibold uppercase tracking-wider ${posStyle.text}`}>
                        {currentWord.partOfSpeech}
                      </Text>
                    </View>

                    <Animated.View style={audioAnimatedStyle}>
                      <TouchableOpacity
                        onPress={() => handlePronounce(currentWord.word)}
                        className={`w-9 h-9 rounded-full items-center justify-center border ${
                          isSpeaking ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-800 border-slate-700'
                        }`}
                      >
                        <Ionicons
                          name={isSpeaking ? 'volume-high' : 'volume-medium-outline'}
                          size={18}
                          color={isSpeaking ? '#FFFFFF' : '#818CF8'}
                        />
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                </View>

                {/* Back / Revealed Details */}
                {isRevealed ? (
                  <Animated.View
                    entering={FadeInDown.duration(280).springify().damping(16)}
                    className="pt-4 border-t border-slate-800/80"
                  >
                    {/* Definition */}
                    <View className="mb-4">
                      <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                        Definition
                      </Text>
                      <Text className="text-white text-lg font-medium leading-relaxed">
                        {currentWord.shortDefinition}
                      </Text>
                    </View>

                    {/* Portuguese Translation */}
                    {currentWord.translations?.pt && (
                      <View className="bg-indigo-950/30 border border-indigo-900/40 rounded-2xl p-3.5 mb-4">
                        <Text className="text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-0.5">
                          Tradução
                        </Text>
                        <Text className="text-indigo-200 text-base font-serif italic">
                          {currentWord.translations.pt}
                        </Text>
                      </View>
                    )}

                    {/* Nuance */}
                    {currentWord.detailedExplanation && (
                      <View className="mb-4">
                        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                          Linguistic Nuance
                        </Text>
                        <Text className="text-slate-300 text-sm leading-relaxed">
                          {currentWord.detailedExplanation}
                        </Text>
                      </View>
                    )}

                    {/* Example Sentence */}
                    {currentWord.examples && currentWord.examples[0] && (
                      <View className="bg-slate-950/50 border border-slate-800/60 rounded-2xl p-4 mb-4">
                        <View className="flex-row items-center mb-1.5">
                          <MaterialCommunityIcons name="format-quote-open" size={16} color="#818CF8" />
                          <Text className="text-indigo-400 text-xs font-semibold uppercase tracking-wider ml-1">
                            In Context
                          </Text>
                        </View>
                        <Text className="text-slate-200 text-sm italic leading-relaxed">
                          "{currentWord.examples[0].sentence}"
                        </Text>
                        {currentWord.examples[0].translation && (
                          <Text className="text-slate-400 text-xs font-serif italic mt-1.5">
                            "{currentWord.examples[0].translation}"
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Etymology */}
                    {currentWord.etymology && (
                      <View className="flex-row items-center bg-indigo-950/20 border border-indigo-900/30 rounded-xl px-3 py-2">
                        <Ionicons name="hourglass-outline" size={14} color="#A5B4FC" />
                        <Text className="text-indigo-200/90 text-xs ml-2 font-medium flex-1">
                          {currentWord.etymology}
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                ) : (
                  <View className="flex-1 items-center justify-center py-12">
                    <View className="w-12 h-12 rounded-full bg-slate-800/60 items-center justify-center mb-2">
                      <Feather name="eye" size={20} color="#818CF8" />
                    </View>
                    <Text className="text-slate-400 text-sm font-medium">
                      Tap card to reveal definition
                    </Text>
                  </View>
                )}
              </ScrollView>
            </Pressable>

            {/* Bottom Action Controls */}
            {!isRevealed ? (
              <TouchableOpacity
                onPress={() => setIsRevealed(true)}
                className="w-full bg-indigo-600 py-4 rounded-2xl items-center justify-center shadow-lg"
              >
                <Text className="text-white font-semibold text-base tracking-wide">
                  Show Answer
                </Text>
              </TouchableOpacity>
            ) : (
              <Animated.View
                entering={FadeInUp.duration(260)}
                className="flex-row items-center justify-between gap-2"
              >
                {/* Again (q=1) */}
                <TouchableOpacity
                  onPress={() => handleGrade(1)}
                  className="flex-1 bg-red-950/40 border border-red-500/50 py-3 rounded-2xl items-center"
                >
                  <Text className="text-red-400 font-bold text-sm">Again</Text>
                  <Text className="text-red-300/70 text-[10px] mt-0.5">1 day</Text>
                </TouchableOpacity>

                {/* Hard (q=2) */}
                <TouchableOpacity
                  onPress={() => handleGrade(2)}
                  className="flex-1 bg-amber-950/40 border border-amber-500/50 py-3 rounded-2xl items-center"
                >
                  <Text className="text-amber-400 font-bold text-sm">Hard</Text>
                  <Text className="text-amber-300/70 text-[10px] mt-0.5">2 days</Text>
                </TouchableOpacity>

                {/* Good (q=3) */}
                <TouchableOpacity
                  onPress={() => handleGrade(3)}
                  className="flex-1 bg-indigo-950/40 border border-indigo-500/50 py-3 rounded-2xl items-center"
                >
                  <Text className="text-indigo-300 font-bold text-sm">Good</Text>
                  <Text className="text-indigo-300/70 text-[10px] mt-0.5">Normal</Text>
                </TouchableOpacity>

                {/* Easy (q=5) */}
                <TouchableOpacity
                  onPress={() => handleGrade(5)}
                  className="flex-1 bg-emerald-950/40 border border-emerald-500/50 py-3 rounded-2xl items-center"
                >
                  <Text className="text-emerald-400 font-bold text-sm">Easy</Text>
                  <Text className="text-emerald-300/70 text-[10px] mt-0.5">4+ days</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}
