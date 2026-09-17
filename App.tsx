import './global.css';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Text,
  View,
  Image,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { initializeDatabase, getWordOfTheDay, searchWords } from './db';
import { WordDefinition } from './types/dictionary';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [wordOfTheDay, setWordOfTheDay] = useState<WordDefinition | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WordDefinition[]>([]);
  const [selectedWord, setSelectedWord] = useState<WordDefinition | null>(null);

  useEffect(() => {
    async function setup() {
      try {
        await initializeDatabase();
        const dailyWord = await getWordOfTheDay();
        setWordOfTheDay(dailyWord);
        setSelectedWord(dailyWord);
      } catch (error) {
        console.error('Database initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    }
    setup();
  }, []);

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

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-void">
        <ActivityIndicator size="large" color="#6366F1" />
        <Text className="text-slate-400 mt-4 text-sm font-medium">
          Hydrating offline dictionary...
        </Text>
      </View>
    );
  }

  const activeWord = selectedWord || wordOfTheDay;

  return (
    <SafeAreaView className="flex-1 bg-surface-void">
      <StatusBar style="light" />
      <View className="flex-1 px-5 pt-4">
        {/* Brand Header */}
        <View className="flex-row items-center justify-between mb-5">
          <View className="flex-row items-center">
            <Image
              source={require('./assets/icon.png')}
              style={{ width: 42, height: 42, borderRadius: 12 }}
              className="mr-3 border border-surface-border"
              resizeMode="cover"
            />
            <View>
              <Text className="text-2xl font-bold tracking-tight text-white">
                Lexi<Text className="text-brand-glow">Pulse</Text>
              </Text>
              <Text className="text-xs text-slate-400">Zero-Server • 100% Offline</Text>
            </View>
          </View>
          <View className="bg-brand-tint px-3 py-1.5 rounded-full border border-brand-primary/30">
            <Text className="text-xs font-semibold text-brand-glow">FTS5 Ready</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View className="mb-4">
          <TextInput
            placeholder="Search offline dictionary (e.g. serendipity)..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={handleSearch}
            className="bg-surface-card border border-surface-border text-white px-4 py-3 rounded-xl text-sm"
          />
        </View>

        {/* Search Results Dropdown/List */}
        {searchQuery.trim().length > 0 && searchResults.length > 0 && (
          <View className="bg-surface-elevated border border-surface-border rounded-xl p-2 mb-4 max-h-48">
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedWord(item);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="py-2.5 px-3 border-b border-surface-border/50 flex-row justify-between items-center"
                >
                  <View>
                    <Text className="text-sm font-semibold text-white">{item.word}</Text>
                    <Text className="text-xs text-slate-400 font-mono">
                      {item.phonetic} • {item.partOfSpeech}
                    </Text>
                  </View>
                  <Text className="text-xs text-brand-spark">Tier {item.difficultyLevel}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Active Word Card */}
        {activeWord ? (
          <View className="bg-surface-card border border-surface-border rounded-2xl p-5 mb-5 shadow-xl">
            <View className="flex-row items-center justify-between mb-3">
              <View className="bg-brand-spark/10 px-2.5 py-1 rounded-md border border-brand-spark/20">
                <Text className="text-xs font-semibold uppercase tracking-wider text-brand-spark">
                  ✨ Word of the Day
                </Text>
              </View>
              <Text className="text-xs text-slate-400 font-mono uppercase tracking-wider">
                {activeWord.partOfSpeech}
              </Text>
            </View>

            <Text className="text-3xl font-bold text-white mb-1 tracking-tight">
              {activeWord.word}
            </Text>
            <Text className="text-sm text-brand-glow font-mono mb-4">
              {activeWord.phonetic}
            </Text>

            <View className="bg-surface-subtle p-3.5 rounded-xl border border-surface-border/60 mb-4">
              <Text className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wide">
                Definition
              </Text>
              <Text className="text-sm text-slate-200 leading-relaxed">
                {activeWord.shortDefinition}
              </Text>
            </View>

            {activeWord.examples && activeWord.examples.length > 0 && (
              <View className="mb-3">
                <Text className="text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                  Contextual Example
                </Text>
                <Text className="text-sm text-slate-300 italic mb-1">
                  "{activeWord.examples[0].sentence}"
                </Text>
                {activeWord.examples[0].translation && (
                  <Text className="text-xs text-slate-500">
                    {activeWord.examples[0].translation}
                  </Text>
                )}
              </View>
            )}

            {activeWord.etymology && (
              <View className="border-t border-surface-border/60 pt-3 mt-1">
                <Text className="text-xs text-slate-500">
                  <Text className="font-semibold text-slate-400">Etymology: </Text>
                  {activeWord.etymology}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View className="bg-surface-card border border-surface-border rounded-2xl p-6 items-center justify-center">
            <Text className="text-slate-400 text-sm">No word selected.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
