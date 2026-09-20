import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Share,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  FadeInDown,
  FadeInUp,
  SharedValue,
} from 'react-native-reanimated';
import { WordDefinition } from '../../types/dictionary';
import { SpeechService } from '../../services/audio/speechService';
import { Colors } from '../../constants/theme';

interface WordCardProps {
  word: WordDefinition;
  height: number;
  index?: number;
  scrollY?: SharedValue<number>;
  isStarred: boolean;
  isInAnyFolder: boolean;
  onToggleStar: () => void;
  onOpenFolderModal: () => void;
}

export function WordCard({
  word,
  height,
  index,
  scrollY,
  isStarred,
  isInAnyFolder,
  onToggleStar,
  onOpenFolderModal,
}: WordCardProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Tactile Spring Scales
  const audioScale = useSharedValue(1);
  const folderScale = useSharedValue(1);
  const starScale = useSharedValue(1);
  const starRotate = useSharedValue(0);
  const ambientScale = useSharedValue(1);

  // Breathing ambient background glow
  useEffect(() => {
    ambientScale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 4000 }),
        withTiming(0.92, { duration: 4000 })
      ),
      -1,
      true
    );
  }, []);

  // Pulsing audio button when speaking
  useEffect(() => {
    if (isSpeaking) {
      audioScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 260 }),
          withTiming(0.96, { duration: 260 })
        ),
        -1,
        true
      );
    } else {
      audioScale.value = withSpring(1, { damping: 14, stiffness: 200 });
    }
  }, [isSpeaking]);

  const handlePronounce = () => {
    setIsSpeaking(true);
    SpeechService.speak(word.word, {
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleStarPress = () => {
    starScale.value = withSequence(
      withTiming(0.75, { duration: 70 }),
      withSpring(1.4, { damping: 7, stiffness: 280 }),
      withSpring(1.0, { damping: 12, stiffness: 220 })
    );
    starRotate.value = withSequence(
      withTiming(-18, { duration: 70 }),
      withSpring(18, { damping: 8, stiffness: 280 }),
      withSpring(0, { damping: 12, stiffness: 200 })
    );
    onToggleStar();
  };

  const handleShareWord = async () => {
    try {
      const shareText = `✨ Vocabula Codex\n\n` +
        `📖 ${word.word} ${word.phonetic} (${word.partOfSpeech})\n` +
        `"${word.shortDefinition}"\n` +
        (word.translations?.pt ? `Tradução: ${word.translations.pt}\n` : '') +
        (word.examples?.[0] ? `Exemplo: "${word.examples[0].sentence}"\n` : '') +
        `\nOffline Vocabulary Codex`;

      await Share.share({ message: shareText });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  // Parallax Card Container style
  const cardAnimatedStyle = useAnimatedStyle(() => {
    if (!scrollY || index === undefined) {
      return {};
    }
    const currentOffset = index * height;
    const inputRange = [
      currentOffset - height,
      currentOffset,
      currentOffset + height,
    ];

    const scale = interpolate(
      scrollY.value,
      inputRange,
      [0.93, 1, 0.93],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollY.value,
      inputRange,
      [0.55, 1, 0.55],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Parallax Watermark Letter
  const watermarkAnimatedStyle = useAnimatedStyle(() => {
    if (!scrollY || index === undefined) {
      return {};
    }
    const currentOffset = index * height;
    const inputRange = [
      currentOffset - height,
      currentOffset,
      currentOffset + height,
    ];

    const translateY = interpolate(
      scrollY.value,
      inputRange,
      [-65, 0, 65],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollY.value,
      inputRange,
      [0.015, 0.045, 0.015],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  const ambientOrbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ambientScale.value }],
  }));

  const audioAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: audioScale.value }],
  }));

  const folderAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: folderScale.value }],
  }));

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: starScale.value },
      { rotate: `${starRotate.value}deg` },
    ],
  }));

  const getPartOfSpeechColor = (pos: string) => {
    switch (pos.toLowerCase()) {
      case 'noun':
        return { bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-500/40' };
      case 'verb':
        return { bg: 'bg-indigo-950/60', text: 'text-indigo-300', border: 'border-indigo-500/40' };
      case 'adjective':
        return { bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-500/40' };
      case 'adverb':
        return { bg: 'bg-rose-950/60', text: 'text-rose-300', border: 'border-rose-500/40' };
      default:
        return { bg: 'bg-purple-950/60', text: 'text-purple-300', border: 'border-purple-500/40' };
    }
  };

  const posStyle = getPartOfSpeechColor(word.partOfSpeech);
  const firstLetter = (word.word[0] || '').toUpperCase();

  return (
    <Animated.View
      style={[{ height }, cardAnimatedStyle]}
      className="w-full justify-between relative px-5 pt-12 pb-3 bg-[#090D16]"
    >
      {/* Background Watermark Letter for Parallax Depth */}
      <Animated.View
        pointerEvents="none"
        style={watermarkAnimatedStyle}
        className="absolute top-16 right-0 left-0 items-center justify-center"
      >
        <Text className="text-[260px] font-serif font-black text-white select-none">
          {firstLetter}
        </Text>
      </Animated.View>

      {/* Ambient background glow circles with breathing animation */}
      <Animated.View
        pointerEvents="none"
        style={ambientOrbStyle}
        className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-indigo-600/15 blur-3xl"
      />
      <Animated.View
        pointerEvents="none"
        style={ambientOrbStyle}
        className="absolute bottom-1/3 -right-20 w-80 h-80 rounded-full bg-violet-600/15 blur-3xl"
      />

      {/* Top Header info with Quick Share */}
      <View className="flex-row items-center justify-between z-10">
        <View className="flex-row items-center space-x-2">
          <View className="w-2 h-2 rounded-full bg-indigo-400 mr-2" />
          <Text className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
            Vocabula Codex
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleShareWord}
          activeOpacity={0.7}
          className="flex-row items-center bg-slate-900/90 border border-slate-800 rounded-full px-2.5 py-1"
        >
          <Ionicons name="share-outline" size={13} color="#A5B4FC" />
          <Text className="text-[11px] font-medium text-slate-300 ml-1">Share</Text>
        </TouchableOpacity>
      </View>

      {/* Middle Card: Scrollable or adaptive content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        className="flex-1 my-4 z-10"
        contentContainerStyle={{ paddingVertical: 10 }}
      >
        {/* Headword Section */}
        <Animated.View
          entering={FadeInDown.duration(400).springify().damping(15)}
          className="mb-4"
        >
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
        </Animated.View>

        {/* Short Definition Hero */}
        <Animated.View
          entering={FadeInDown.delay(90).duration(450).springify().damping(15)}
          className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 mb-4 shadow-xl"
        >
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
        </Animated.View>

        {/* Deep Nuance / Detailed Explanation */}
        {word.detailedExplanation && (
          <Animated.View
            entering={FadeInDown.delay(160).duration(450).springify().damping(15)}
            className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 mb-4"
          >
            <View className="flex-row items-center mb-1.5">
              <Feather name="book-open" size={14} color="#818CF8" />
              <Text className="text-indigo-400 text-xs font-semibold uppercase tracking-wider ml-1.5">
                Linguistic Nuance
              </Text>
            </View>
            <Text className="text-slate-300 text-sm leading-relaxed">
              {word.detailedExplanation}
            </Text>
          </Animated.View>
        )}

        {/* Contextual Examples */}
        {word.examples && word.examples.length > 0 && word.examples[0] && (
          <Animated.View
            entering={FadeInDown.delay(230).duration(450).springify().damping(15)}
            className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 mb-4"
          >
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
          </Animated.View>
        )}

        {/* Etymology / Origin */}
        {word.etymology && (
          <Animated.View
            entering={FadeInDown.delay(300).duration(450).springify().damping(15)}
            className="flex-row items-center bg-indigo-950/20 border border-indigo-900/30 rounded-xl px-3 py-2"
          >
            <Ionicons name="hourglass-outline" size={14} color="#A5B4FC" />
            <Text className="text-indigo-200/90 text-xs ml-2 font-medium flex-1">
              {word.etymology}
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Action Bar (Under Card Content - Zero Overlap, Tactile Springs) */}
      <Animated.View
        entering={FadeInUp.delay(180).duration(450).springify().damping(15)}
        className="flex-row items-center justify-between gap-3 pt-2 pb-1 z-10"
      >
        {/* Audio Pronunciation Button with spring feedback */}
        <Animated.View style={[audioAnimatedStyle, { flex: 1 }]}>
          <Pressable
            onPress={handlePronounce}
            onPressIn={() => {
              audioScale.value = withTiming(0.92, { duration: 80 });
            }}
            onPressOut={() => {
              audioScale.value = withSpring(1.0, { damping: 12, stiffness: 220 });
            }}
            className={`flex-row items-center justify-center py-2.5 px-3 rounded-2xl border ${
              isSpeaking
                ? 'bg-indigo-600/35 border-indigo-400'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <Ionicons
              name={isSpeaking ? 'volume-high' : 'volume-medium-outline'}
              size={18}
              color={isSpeaking ? '#818CF8' : '#A5B4FC'}
            />
            <Text
              numberOfLines={1}
              className={`text-xs font-semibold ml-1.5 ${
                isSpeaking ? 'text-indigo-300 font-bold' : 'text-slate-300'
              }`}
            >
              {isSpeaking ? 'Playing...' : 'Audio'}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Save to Folder Button with spring feedback */}
        <Animated.View style={[folderAnimatedStyle, { flex: 1 }]}>
          <Pressable
            onPress={onOpenFolderModal}
            onPressIn={() => {
              folderScale.value = withTiming(0.92, { duration: 80 });
            }}
            onPressOut={() => {
              folderScale.value = withSpring(1.0, { damping: 12, stiffness: 220 });
            }}
            className={`flex-row items-center justify-center py-2.5 px-3 rounded-2xl border ${
              isInAnyFolder
                ? 'bg-indigo-600/30 border-indigo-400'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <Ionicons
              name={isInAnyFolder ? 'folder' : 'folder-outline'}
              size={18}
              color={isInAnyFolder ? '#818CF8' : '#94A3B8'}
            />
            <Text
              numberOfLines={1}
              className={`text-xs font-semibold ml-1.5 ${
                isInAnyFolder ? 'text-indigo-200' : 'text-slate-300'
              }`}
            >
              Folder
            </Text>
          </Pressable>
        </Animated.View>

        {/* Star / Bookmark Button with bouncy particle burst */}
        <Animated.View style={[starAnimatedStyle, { flex: 1 }]}>
          <Pressable
            onPress={handleStarPress}
            className={`flex-row items-center justify-center py-2.5 px-3 rounded-2xl border ${
              isStarred
                ? 'bg-amber-500/20 border-amber-500/60'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <Ionicons
              name={isStarred ? 'star' : 'star-outline'}
              size={18}
              color={isStarred ? Colors.brand.spark : '#94A3B8'}
            />
            <Text
              numberOfLines={1}
              className={`text-xs font-semibold ml-1.5 ${
                isStarred ? 'text-amber-400 font-bold' : 'text-slate-300'
              }`}
            >
              {isStarred ? 'Saved' : 'Save'}
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>

      {/* Bottom Swipe-Up Affordance */}
      <View className="items-center justify-center pt-1 z-10">
        <View className="flex-row items-center opacity-50">
          <Ionicons name="chevron-up" size={14} color="#94A3B8" />
          <Text className="text-slate-400 text-[11px] font-medium ml-1">
            Swipe up for next word
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

