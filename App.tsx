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
  StyleSheet,
  Platform,
  ImageStyle,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import Animated, {
  FadeInDown,
  FadeInUp,
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
import { Colors } from './constants/theme';

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
      <View style={styles.loadingContainer}>
        <Image
          source={require('./assets/icon.png')}
          style={styles.loadingLogo}
        />
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>
          Hydrating LexiPulse Dictionary...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.rootContainer} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <Animated.View
          entering={SlideInUp.duration(300)}
          style={styles.toastBanner}
        >
          <View style={styles.toastContent}>
            <Ionicons name="sparkles" size={18} color="#FBBF24" style={{ marginRight: 8 }} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
          <TouchableOpacity onPress={() => setToastMessage(null)}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Ambient Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.brandGroup}>
            <Image
              source={require('./assets/icon.png')}
              style={styles.appIcon}
            />
            <View>
              <Text style={styles.brandTitle}>
                Lexi<Text style={styles.brandAccent}>Pulse</Text>
              </Text>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>100% Offline</Text>
              </View>
            </View>
          </View>

          {/* Streak Badge */}
          <View style={styles.streakBadge}>
            <MaterialCommunityIcons name="fire" size={18} color="#FBBF24" />
            <Text style={styles.streakText}>14 Days</Text>
          </View>
        </View>

        {/* Search Header Bar */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#818CF8" style={{ marginRight: 10 }} />
            <TextInput
              placeholder="Search offline lexicon (FTS5)..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={handleSearch}
              style={styles.searchInput}
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
              style={styles.searchResultsBox}
            >
              {searchResults.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleSelectWord(item)}
                  style={styles.searchResultItem}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.searchResultWord}>{item.word}</Text>
                    <Text style={styles.searchResultMeta} numberOfLines={1}>
                      {item.phonetic} • {item.shortDefinition}
                    </Text>
                  </View>
                  <View style={styles.posBadge}>
                    <Text style={styles.posBadgeText}>{item.partOfSpeech}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}
        </View>

        {/* Horizontal Lexicon Carousel Chips */}
        <View style={styles.carouselWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
          >
            {wordList.map((item) => {
              const isSelected = activeWord?.id === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleSelectWord(item)}
                  style={[
                    styles.chipButton,
                    isSelected ? styles.chipButtonActive : styles.chipButtonInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected ? styles.chipTextActive : styles.chipTextInactive,
                    ]}
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
            entering={FadeInDown.duration(350)}
            style={styles.heroCard}
          >
            {/* Card Header: Badge & Star Bookmark */}
            <View style={styles.cardHeader}>
              <View style={styles.headerBadges}>
                <View style={styles.wotdBadge}>
                  <Ionicons name="sparkles" size={12} color="#FBBF24" style={{ marginRight: 4 }} />
                  <Text style={styles.wotdText}>Word of the Day</Text>
                </View>
                <View style={styles.tierBadge}>
                  <Text style={styles.tierText}>Tier {activeWord.difficultyLevel}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleToggleStar}
                style={styles.starButton}
              >
                <Ionicons
                  name={activeProgress?.isStarred ? 'star' : 'star-outline'}
                  size={20}
                  color={activeProgress?.isStarred ? '#FBBF24' : '#94A3B8'}
                />
              </TouchableOpacity>
            </View>

            {/* Word Heading & Audio Pronunciation Button */}
            <View style={styles.wordTitleRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.headwordText}>{activeWord.word}</Text>
                <View style={styles.phoneticRow}>
                  <Text style={styles.phoneticText}>{activeWord.phonetic}</Text>
                  <View style={styles.posPill}>
                    <Text style={styles.posPillText}>{activeWord.partOfSpeech}</Text>
                  </View>
                </View>
              </View>

              {/* Native Speech TTS Button */}
              <TouchableOpacity
                onPress={() => handlePronounce(activeWord.word)}
                style={[
                  styles.speakerButton,
                  isSpeaking ? styles.speakerButtonActive : styles.speakerButtonInactive,
                ]}
              >
                <Ionicons
                  name={isSpeaking ? 'volume-high' : 'volume-medium'}
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            {/* Short Definition Box */}
            <View style={styles.definitionBox}>
              <Text style={styles.sectionLabel}>Definition</Text>
              <Text style={styles.definitionText}>{activeWord.shortDefinition}</Text>
            </View>

            {/* Detailed Linguistic Explanation */}
            <View style={styles.nuanceBox}>
              <Text style={styles.sectionLabel}>Linguistic Nuance</Text>
              <Text style={styles.nuanceText}>{activeWord.detailedExplanation}</Text>
            </View>

            {/* Interactive Contextual Examples */}
            {activeWord.examples && activeWord.examples.length > 0 && (
              <View style={styles.exampleSection}>
                <View style={styles.exampleHeader}>
                  <Text style={styles.sectionLabel}>Contextual Example</Text>
                  <TouchableOpacity
                    onPress={() => handlePronounce(activeWord.examples[0].sentence)}
                    style={styles.listenExampleBtn}
                  >
                    <Ionicons name="play-circle-outline" size={15} color="#818CF8" />
                    <Text style={styles.listenExampleText}>Listen</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.exampleCard}>
                  <Text style={styles.exampleSentence}>
                    "{activeWord.examples[0].sentence}"
                  </Text>
                  {activeWord.examples[0].translation && (
                    <Text style={styles.exampleTranslation}>
                      {activeWord.examples[0].translation}
                    </Text>
                  )}
                  {activeWord.examples[0].context && (
                    <View style={styles.exampleContextPill}>
                      <Text style={styles.exampleContextText}>
                        {activeWord.examples[0].context}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Etymology */}
            {activeWord.etymology && (
              <View style={styles.etymologyRow}>
                <Feather name="book-open" size={13} color="#64748B" style={{ marginRight: 6 }} />
                <Text style={styles.etymologyText}>
                  <Text style={{ fontWeight: 'bold', color: '#CBD5E1' }}>Origin: </Text>
                  {activeWord.etymology}
                </Text>
              </View>
            )}

            {/* Spaced Repetition (SM-2) Interactive Recall Rating */}
            <View style={styles.srsSection}>
              <View style={styles.srsHeader}>
                <Text style={styles.srsTitle}>Spaced Repetition Feedback</Text>
                <Text style={styles.srsRepetitions}>
                  Interval: {activeProgress?.intervalDays ?? 0}d • Streak: {activeProgress?.repetitionNumber ?? 0}
                </Text>
              </View>

              <View style={styles.srsButtonsRow}>
                <TouchableOpacity
                  onPress={() => handleGradeWord(1)}
                  style={[styles.srsButton, styles.srsForgotBtn]}
                >
                  <Ionicons name="refresh" size={16} color="#F43F5E" />
                  <Text style={[styles.srsButtonText, { color: '#F43F5E' }]}>Forgot</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleGradeWord(2)}
                  style={[styles.srsButton, styles.srsHardBtn]}
                >
                  <Ionicons name="alert-circle-outline" size={16} color="#F97316" />
                  <Text style={[styles.srsButtonText, { color: '#F97316' }]}>Hard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleGradeWord(4)}
                  style={[styles.srsButton, styles.srsGoodBtn]}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color="#818CF8" />
                  <Text style={[styles.srsButtonText, { color: '#818CF8' }]}>Good</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleGradeWord(5)}
                  style={[styles.srsButton, styles.srsMasteredBtn]}
                >
                  <Ionicons name="trophy-outline" size={16} color="#10B981" />
                  <Text style={[styles.srsButtonText, { color: '#10B981' }]}>Mastered</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Modern Floating Bottom Navigation Bar */}
      <View style={styles.bottomDock}>
        <TouchableOpacity
          onPress={() => setActiveTab('today')}
          style={styles.dockTab}
        >
          <Ionicons
            name={activeTab === 'today' ? 'sparkles' : 'sparkles-outline'}
            size={22}
            color={activeTab === 'today' ? '#6366F1' : '#64748B'}
          />
          <Text
            style={[
              styles.dockTabText,
              activeTab === 'today' ? styles.dockTabTextActive : styles.dockTabTextInactive,
            ]}
          >
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTab('browse');
            showToast('Browsing 100% offline lexicon');
          }}
          style={styles.dockTab}
        >
          <Ionicons
            name={activeTab === 'browse' ? 'book' : 'book-outline'}
            size={22}
            color={activeTab === 'browse' ? '#6366F1' : '#64748B'}
          />
          <Text
            style={[
              styles.dockTabText,
              activeTab === 'browse' ? styles.dockTabTextActive : styles.dockTabTextInactive,
            ]}
          >
            Lexicon
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTab('review');
            showToast('SRS Review Queue: 12 words ready');
          }}
          style={styles.dockTab}
        >
          <Ionicons
            name={activeTab === 'review' ? 'albums' : 'albums-outline'}
            size={22}
            color={activeTab === 'review' ? '#6366F1' : '#64748B'}
          />
          <Text
            style={[
              styles.dockTabText,
              activeTab === 'review' ? styles.dockTabTextActive : styles.dockTabTextInactive,
            ]}
          >
            Review
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090D16',
  },
  loadingLogo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: 16,
  } as ImageStyle,
  loadingText: {
    color: '#94A3B8',
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 95,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  } as ImageStyle,
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  brandAccent: {
    color: '#818CF8',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#64748B',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 27, 75, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
    marginLeft: 4,
  },
  searchWrapper: {
    paddingHorizontal: 20,
    marginVertical: 6,
    position: 'relative',
    zIndex: 20,
  },
  searchContainer: {
    backgroundColor: '#131B2E',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 2,
  },
  searchResultsBox: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    marginTop: 8,
    padding: 6,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  searchResultItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.4)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchResultWord: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchResultMeta: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  posBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  posBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#818CF8',
    textTransform: 'uppercase',
  },
  carouselWrapper: {
    paddingVertical: 6,
  },
  carouselContent: {
    paddingHorizontal: 20,
  },
  chipButton: {
    marginRight: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#818CF8',
    shadowColor: '#6366F1',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  chipButtonInactive: {
    backgroundColor: '#131B2E',
    borderColor: '#1E293B',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipTextInactive: {
    color: '#94A3B8',
  },
  heroCard: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: '#131B2E',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 28,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wotdBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  wotdText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#FBBF24',
  },
  tierBadge: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#94A3B8',
  },
  starButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headwordText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  phoneticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  phoneticText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#818CF8',
    marginRight: 10,
  },
  posPill: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  posPillText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#818CF8',
  },
  speakerButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#6366F1',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  speakerButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#818CF8',
  },
  speakerButtonInactive: {
    backgroundColor: '#1E1B4B',
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  definitionBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    borderRadius: 18,
    padding: 16,
    marginVertical: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#94A3B8',
    marginBottom: 6,
  },
  definitionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
    lineHeight: 24,
  },
  nuanceBox: {
    marginVertical: 6,
  },
  nuanceText: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 20,
  },
  exampleSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.5)',
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  listenExampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listenExampleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#818CF8',
    marginLeft: 4,
  },
  exampleCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.4)',
    borderRadius: 16,
    padding: 14,
  },
  exampleSentence: {
    fontSize: 13,
    color: '#E2E8F0',
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 4,
  },
  exampleTranslation: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  exampleContextPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#131B2E',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  exampleContextText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FBBF24',
    textTransform: 'uppercase',
  },
  etymologyRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  etymologyText: {
    fontSize: 12,
    color: '#94A3B8',
    flex: 1,
    lineHeight: 18,
  },
  srsSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.7)',
  },
  srsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  srsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  srsRepetitions: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  srsButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  srsButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  srsForgotBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  srsHardBtn: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  srsGoodBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  srsMasteredBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  srsButtonText: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
  bottomDock: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(19, 27, 46, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 32,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  dockTab: {
    alignItems: 'center',
  },
  dockTabText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  dockTabTextActive: {
    color: '#818CF8',
  },
  dockTabTextInactive: {
    color: '#64748B',
  },
  toastBanner: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 50,
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.5)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
