import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { WordDefinition } from '../../types/dictionary';
import { Colors } from '../../constants/theme';

interface WordCardProps {
  word: WordDefinition;
  height: number;
  isStarred: boolean;
  isInAnyFolder: boolean;
  onToggleStar: () => void;
  onOpenFolderModal: () => void;
}

export function WordCard({
  word,
  height,
  isStarred,
  isInAnyFolder,
  onToggleStar,
  onOpenFolderModal,
}: WordCardProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);

  const handlePronounce = () => {
    Speech.stop();
    setIsSpeaking(true);
    Speech.speak(word.word, {
      language: 'en-US',
      rate: 0.82,
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const getPartOfSpeechColor = (pos: string) => {
    switch (pos.toLowerCase()) {
      case 'noun':
        return { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' };
      case 'verb':
        return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' };
      case 'adjective':
        return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' };
      case 'adverb':
        return { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' };
      default:
        return { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' };
    }
  };

  const posStyle = getPartOfSpeechColor(word.partOfSpeech);
  const firstLetter = (word.word[0] || '').toUpperCase();

  return (
    <View style={[{ height }]} className="w-full justify-between relative px-5 pt-12 pb-24 bg-[#090D16]">
      {/* Background Watermark Letter for Parallax Depth */}
      <View
        pointerEvents="none"
        className="absolute top-16 right-0 left-0 items-center justify-center opacity-[0.04]"
      >
        <Text className="text-[260px] font-serif font-black text-white select-none">
          {firstLetter}
        </Text>
      </View>

      {/* Ambient background glow circle */}
      <View
        pointerEvents="none"
        className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-indigo-600/10 blur-3xl"
      />
      <View
        pointerEvents="none"
        className="absolute bottom-1/3 -right-20 w-80 h-80 rounded-full bg-violet-600/10 blur-3xl"
      />

      {/* Top Header info */}
      <View className="flex-row items-center justify-between z-10">
        <View className="flex-row items-center space-x-2">
          <View className="w-2 h-2 rounded-full bg-indigo-400 mr-2" />
          <Text className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
            LexiPulse Codex
          </Text>
        </View>

        <View className="flex-row items-center bg-slate-900/90 border border-slate-800 rounded-full px-3 py-1">
          <Text className="text-indigo-400 text-xs font-semibold mr-1.5">Tier {word.difficultyLevel}</Text>
          <View className="flex-row space-x-0.5">
            {[1, 2, 3, 4].map((tier) => (
              <View
                key={tier}
                className={`w-1.5 h-1.5 rounded-full ml-0.5 ${
                  tier <= word.difficultyLevel ? 'bg-indigo-400' : 'bg-slate-750'
                }`}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Middle Card: Scrollable or adaptive content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 my-4 z-10"
        contentContainerStyle={{ paddingVertical: 10 }}
      >
        {/* Headword Section */}
        <View className="mb-4">
          <Text
            numberOfLines={2}
            className="text-white text-4xl sm:text-5xl font-serif font-bold tracking-tight mb-2"
          >
            {word.word}
          </Text>

          <View className="flex-row flex-wrap items-center gap-2">
            <View className="bg-slate-900 border border-slate-800 rounded-full px-3 py-1">
              <Text className="text-slate-300 font-mono text-sm tracking-wide">
                {word.phonetic}
              </Text>
            </View>

            <View className={`rounded-full px-3 py-1 border ${posStyle.bg} ${posStyle.border}`}>
              <Text className={`text-xs font-semibold uppercase tracking-wider ${posStyle.text}`}>
                {word.partOfSpeech}
              </Text>
            </View>
          </View>
        </View>

        {/* Short Definition Hero */}
        <View className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 mb-4 shadow-xl">
          <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase mb-2">
            Core Definition
          </Text>
          <Text className="text-white text-lg font-medium leading-relaxed">
            {word.shortDefinition}
          </Text>

          {word.translations?.pt && (
            <View className="mt-3 pt-3 border-t border-slate-800/80 flex-row items-center justify-between">
              <View className="flex-1 mr-2">
                <Text className="text-indigo-400/90 text-xs font-medium uppercase tracking-wider">
                  Tradução
                </Text>
                <Text className="text-indigo-200 text-sm font-serif italic mt-0.5">
                  {word.translations.pt}
                </Text>
              </View>
              <Ionicons name="language" size={16} color="#818CF8" />
            </View>
          )}
        </View>

        {/* Deep Nuance / Detailed Explanation */}
        {word.detailedExplanation && (
          <View className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center mb-1.5">
              <Feather name="book-open" size={14} color="#818CF8" />
              <Text className="text-indigo-400 text-xs font-semibold uppercase tracking-wider ml-1.5">
                Linguistic Nuance
              </Text>
            </View>
            <Text className="text-slate-300 text-sm leading-relaxed">
              {word.detailedExplanation}
            </Text>
          </View>
        )}

        {/* Contextual Examples */}
        {word.examples && word.examples.length > 0 && word.examples[0] && (
          <View className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center mb-2">
              <MaterialCommunityIcons name="format-quote-open" size={16} color="#818CF8" />
              <Text className="text-indigo-400 text-xs font-semibold uppercase tracking-wider ml-1">
                In Context
              </Text>
            </View>
            <Text className="text-slate-200 text-sm italic leading-relaxed">
              "{word.examples[0].sentence}"
            </Text>
            {word.examples[0].translation && (
              <Text className="text-slate-400 text-xs mt-1.5 font-serif italic">
                "{word.examples[0].translation}"
              </Text>
            )}
          </View>
        )}

        {/* Etymology / Origin */}
        {word.etymology && (
          <View className="flex-row items-center bg-indigo-950/20 border border-indigo-900/30 rounded-xl px-3 py-2">
            <Ionicons name="hourglass-outline" size={14} color="#A5B4FC" />
            <Text className="text-indigo-200/90 text-xs ml-2 font-medium flex-1">
              {word.etymology}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Rail (TikTok Style, Right Margin) */}
      <View className="absolute right-4 bottom-32 flex-col items-center space-y-4 z-20">
        {/* Pronunciation Audio Button */}
        <TouchableOpacity
          onPress={handlePronounce}
          activeOpacity={0.8}
          className={`w-12 h-12 rounded-full items-center justify-center border shadow-lg ${
            isSpeaking
              ? 'bg-indigo-600 border-indigo-400 scale-105'
              : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          <Ionicons
            name={isSpeaking ? 'volume-high' : 'volume-medium-outline'}
            size={22}
            color={isSpeaking ? '#FFFFFF' : '#818CF8'}
          />
        </TouchableOpacity>

        {/* Save to Folder Button */}
        <TouchableOpacity
          onPress={onOpenFolderModal}
          activeOpacity={0.8}
          className={`w-12 h-12 rounded-full items-center justify-center border shadow-lg mt-3 ${
            isInAnyFolder
              ? 'bg-indigo-600 border-indigo-400'
              : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          <Ionicons
            name={isInAnyFolder ? 'folder' : 'folder-outline'}
            size={22}
            color={isInAnyFolder ? '#FFFFFF' : '#94A3B8'}
          />
        </TouchableOpacity>

        {/* Star / Bookmark Button */}
        <TouchableOpacity
          onPress={onToggleStar}
          activeOpacity={0.8}
          className={`w-12 h-12 rounded-full items-center justify-center border shadow-lg mt-3 ${
            isStarred
              ? 'bg-amber-500/20 border-amber-500/50'
              : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          <Ionicons
            name={isStarred ? 'star' : 'star-outline'}
            size={22}
            color={isStarred ? Colors.brand.spark : '#94A3B8'}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Swipe-Up Affordance */}
      <View className="items-center justify-center pt-2 z-10">
        <View className="flex-row items-center space-x-1 opacity-60">
          <Ionicons name="chevron-up" size={16} color="#94A3B8" />
          <Text className="text-slate-400 text-xs font-medium ml-1">
            Swipe up for next word
          </Text>
        </View>
      </View>
    </View>
  );
}
