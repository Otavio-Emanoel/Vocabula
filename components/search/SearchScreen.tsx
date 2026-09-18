import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';
import { WordDefinition } from '../../types/dictionary';
import { searchWords, toggleStarWord } from '../../db/queries';
import { FolderModal } from '../modals/FolderModal';
import { Colors } from '../../constants/theme';

interface SearchScreenProps {
  initialWords: WordDefinition[];
  starredWordIds: Set<string>;
  onToggleStarSuccess?: (wordId: string, isStarred: boolean) => void;
  onShowToast?: (msg: string) => void;
}

const CATEGORY_CHIPS = ['All', 'Noun', 'Verb', 'Adjective', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'];

export function SearchScreen({
  initialWords,
  starredWordIds,
  onToggleStarSuccess,
  onShowToast,
}: SearchScreenProps) {
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [results, setResults] = useState<WordDefinition[]>(initialWords);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedWordId, setExpandedWordId] = useState<string | null>(null);

  // Folder modal state
  const [folderWord, setFolderWord] = useState<WordDefinition | null>(null);
  const [isFolderModalVisible, setIsFolderModalVisible] = useState(false);

  useEffect(() => {
    handleSearch(query, selectedFilter);
  }, [query, selectedFilter]);

  const handleSearch = async (text: string, filter: string) => {
    setIsSearching(true);
    try {
      let baseWords: WordDefinition[];
      if (!text.trim()) {
        baseWords = initialWords;
      } else {
        baseWords = await searchWords(text.trim(), 40);
      }

      // Apply Filter Pill
      let filtered = baseWords;
      if (filter !== 'All') {
        if (filter.startsWith('Tier')) {
          const tierNum = parseInt(filter.replace('Tier ', ''), 10);
          filtered = filtered.filter((w) => w.difficultyLevel === tierNum);
        } else {
          filtered = filtered.filter(
            (w) => w.partOfSpeech.toLowerCase() === filter.toLowerCase()
          );
        }
      }

      setResults(filtered);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePronounce = (word: string) => {
    Speech.stop();
    Speech.speak(word, { language: 'en-US', rate: 0.85 });
  };

  const handleToggleStar = async (word: WordDefinition) => {
    try {
      const newState = await toggleStarWord(word.id);
      onToggleStarSuccess?.(word.id, newState);
      onShowToast?.(newState ? `⭐ "${word.word}" bookmarked` : `Removed "${word.word}"`);
    } catch (err) {
      console.error('Error toggling star:', err);
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(260)}
      className="flex-1 bg-[#090D16] px-5 pt-12 pb-20"
    >
      {/* Title */}
      <View className="mb-4">
        <Text className="text-white text-3xl font-serif font-bold tracking-tight">
          Dictionary
        </Text>
        <Text className="text-slate-400 text-xs mt-1">
          Explore {initialWords.length} words offline with FTS5 search
        </Text>
      </View>

      {/* Search Input */}
      <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 mb-3 shadow-lg">
        <Ionicons name="search-outline" size={20} color="#818CF8" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search words, meanings, or tags..."
          placeholderTextColor="#64748B"
          className="flex-1 text-white text-base ml-3"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips Horizontal Scroll */}
      <View className="mb-4">
        <FlatList
          data={CATEGORY_CHIPS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isActive = selectedFilter === item;
            return (
              <TouchableOpacity
                onPress={() => setSelectedFilter(item)}
                className={`px-3.5 py-1.5 rounded-full mr-2 border ${
                  isActive
                    ? 'bg-indigo-600 border-indigo-400'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Results Header */}
      <View className="flex-row items-center justify-between mb-3 px-1">
        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
          Found {results.length} {results.length === 1 ? 'word' : 'words'}
        </Text>
        {isSearching && <ActivityIndicator size="small" color="#818CF8" />}
      </View>

      {/* Results List */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item, index }) => {
          const isExpanded = expandedWordId === item.id;
          const isStarred = starredWordIds.has(item.id);

          return (
            <Animated.View
              layout={LinearTransition.springify().damping(16).stiffness(160)}
              entering={FadeInDown.delay(Math.min(index * 35, 300)).duration(200)}
              className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 mb-3"
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setExpandedWordId(isExpanded ? null : item.id)}
              >
                {/* Header Row */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-2">
                    <View className="flex-row items-center flex-wrap gap-2 mb-1">
                      <Text className="text-white text-xl font-serif font-bold tracking-tight">
                        {item.word}
                      </Text>
                      <Text className="text-indigo-400 font-mono text-xs">
                        {item.phonetic}
                      </Text>
                      <View className="bg-slate-800 rounded-md px-2 py-0.5">
                        <Text className="text-slate-300 text-[10px] uppercase font-semibold">
                          {item.partOfSpeech}
                        </Text>
                      </View>
                    </View>
                    <Text
                      numberOfLines={isExpanded ? undefined : 2}
                      className="text-slate-300 text-sm leading-relaxed"
                    >
                      {item.shortDefinition}
                    </Text>
                  </View>

                  {/* Actions Column */}
                  <View className="flex-row items-center space-x-2">
                    <TouchableOpacity
                      onPress={() => handlePronounce(item.word)}
                      className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center mr-1"
                    >
                      <Ionicons name="volume-medium-outline" size={16} color="#818CF8" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setFolderWord(item);
                        setIsFolderModalVisible(true);
                      }}
                      className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center mr-1"
                    >
                      <Ionicons name="folder-outline" size={16} color="#94A3B8" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleToggleStar(item)}
                      className={`w-8 h-8 rounded-full items-center justify-center ${
                        isStarred ? 'bg-amber-500/20' : 'bg-slate-800'
                      }`}
                    >
                      <Ionicons
                        name={isStarred ? 'star' : 'star-outline'}
                        size={16}
                        color={isStarred ? Colors.brand.spark : '#94A3B8'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Expanded Details with Smooth Fade */}
                {isExpanded && (
                  <Animated.View
                    entering={FadeInDown.duration(200)}
                    className="mt-3 pt-3 border-t border-slate-800/80"
                  >
                    {item.translations?.pt && (
                      <View className="mb-2">
                        <Text className="text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                          Tradução
                        </Text>
                        <Text className="text-indigo-200 text-sm font-serif italic mt-0.5">
                          {item.translations.pt}
                        </Text>
                      </View>
                    )}

                    {item.detailedExplanation && (
                      <View className="mb-2">
                        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          Nuance
                        </Text>
                        <Text className="text-slate-300 text-xs leading-relaxed mt-0.5">
                          {item.detailedExplanation}
                        </Text>
                      </View>
                    )}

                    {item.examples && item.examples.length > 0 && item.examples[0] && (
                      <View className="mb-2">
                        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          Example
                        </Text>
                        <Text className="text-slate-200 text-xs italic mt-0.5">
                          "{item.examples[0].sentence}"
                        </Text>
                      </View>
                    )}

                    {item.etymology && (
                      <Text className="text-indigo-300/80 text-[11px] font-medium mt-1">
                        Origin: {item.etymology}
                      </Text>
                    )}
                  </Animated.View>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          !isSearching ? (
            <View className="py-16 items-center justify-center">
              <Feather name="search" size={32} color="#475569" />
              <Text className="text-slate-400 text-sm mt-3 font-medium">
                No words matched your search.
              </Text>
              <Text className="text-slate-600 text-xs mt-1">
                Try searching for feelings, roots, or philosophical ideas.
              </Text>
            </View>
          ) : null
        }
      />

      <FolderModal
        visible={isFolderModalVisible}
        onClose={() => setIsFolderModalVisible(false)}
        word={folderWord}
      />
    </Animated.View>
  );
}
