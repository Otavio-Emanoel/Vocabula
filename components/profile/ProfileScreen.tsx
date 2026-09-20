import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';
import {
  getAppStats,
  getUserDecks,
  getAllSavedWords,
  getWordsInDeck,
  deleteUserDeck,
  toggleStarWord,
  UserDeck,
  PracticeFilter,
} from '../../db/queries';
import { WordDefinition } from '../../types/dictionary';
import { AppStorage } from '../../services/storage';
import { NotificationService } from '../../services/notifications/notificationService';
import { Colors } from '../../constants/theme';

interface ProfileScreenProps {
  onShowToast?: (msg: string) => void;
  onRefreshData?: () => void;
  onStartPractice?: (filter?: PracticeFilter, title?: string) => void;
}

const TIME_PRESETS = ['08:00', '12:30', '19:00', '21:30'];
const FREQUENCY_OPTIONS = [1, 2, 3];

export function ProfileScreen({ onShowToast, onRefreshData, onStartPractice }: ProfileScreenProps) {
  const [stats, setStats] = useState({
    seenCount: 0,
    savedCount: 0,
    decksCount: 0,
    totalWords: 0,
  });
  const [decks, setDecks] = useState<UserDeck[]>([]);
  const [savedWords, setSavedWords] = useState<WordDefinition[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<UserDeck | null>(null);
  const [deckWords, setDeckWords] = useState<WordDefinition[]>([]);

  // Notification Settings State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationTime, setNotificationTime] = useState('08:30');
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [isEditingCustomTime, setIsEditingCustomTime] = useState(false);
  const [notificationFreq, setNotificationFreq] = useState(1);
  const [streak, setStreak] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setIsLoading(true);
    try {
      const [
        appStats,
        userDecks,
        allSaved,
        notifEnabled,
        notifTime,
        notifFreq,
        currentStreak,
      ] = await Promise.all([
        getAppStats(),
        getUserDecks(),
        getAllSavedWords(),
        AppStorage.isNotificationsEnabled(),
        AppStorage.getNotificationTime(),
        AppStorage.getNotificationFrequency(),
        AppStorage.getStreak(),
      ]);

      setStats(appStats);
      setDecks(userDecks);
      setSavedWords(allSaved);
      setNotificationsEnabled(notifEnabled);
      setNotificationTime(notifTime);
      setCustomTimeInput(notifTime);
      setNotificationFreq(notifFreq);
      setStreak(Math.max(currentStreak, 1));
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleNotifications = async (val: boolean) => {
    setNotificationsEnabled(val);
    await AppStorage.setNotificationsEnabled(val);
    if (val) {
      await NotificationService.scheduleRollingNotifications();
      onShowToast?.('🔔 Daily notifications enabled');
    } else {
      await NotificationService.scheduleRollingNotifications();
      onShowToast?.('🔕 Notifications turned off');
    }
  };

  const handleSelectTime = async (time: string) => {
    setNotificationTime(time);
    setCustomTimeInput(time);
    setIsEditingCustomTime(false);
    await AppStorage.setNotificationTime(time);
    if (notificationsEnabled) {
      await NotificationService.scheduleRollingNotifications();
    }
    onShowToast?.(`⏰ Notification set to ${time}`);
  };

  const handleSaveCustomTime = async () => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(customTimeInput.trim())) {
      onShowToast?.('Please enter time in HH:MM format (e.g. 09:15)');
      return;
    }
    await handleSelectTime(customTimeInput.trim());
  };

  const handleSelectFrequency = async (freq: number) => {
    setNotificationFreq(freq);
    await AppStorage.setNotificationFrequency(freq);
    if (notificationsEnabled) {
      await NotificationService.scheduleRollingNotifications();
    }
    onShowToast?.(`Updated delivery to ${freq}x per day`);
  };

  const handleTestNotification = async () => {
    await NotificationService.sendTestNotification();
    onShowToast?.(`🔔 Scheduled: Vocabula at ${notificationTime} (${notificationFreq}x daily)`);
  };

  const handleOpenDeck = async (deck: UserDeck) => {
    setSelectedDeck(deck);
    try {
      const words = await getWordsInDeck(deck.id);
      setDeckWords(words);
    } catch (err) {
      console.error('Failed to get words in deck:', err);
    }
  };

  const handleDeleteDeck = async (deckId: string, deckName: string) => {
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${deckName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteUserDeck(deckId);
            setSelectedDeck(null);
            await loadProfileData();
            onShowToast?.(`Deleted "${deckName}"`);
          },
        },
      ]
    );
  };

  const handlePronounce = (word: string) => {
    Speech.stop();
    Speech.speak(word, { language: 'en-US', rate: 0.85 });
  };

  const handleToggleStarInProfile = async (word: WordDefinition) => {
    await toggleStarWord(word.id);
    await loadProfileData();
    onRefreshData?.();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(260)}
      className="flex-1 bg-[#090D16] px-5 pt-12 pb-24"
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Monogram & Streak */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center space-x-3">
            <View className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 items-center justify-center mr-3 shadow-lg">
              <Text className="text-indigo-400 font-serif font-black text-2xl">
                VB
              </Text>
            </View>
            <View>
              <Text className="text-white text-2xl font-serif font-bold tracking-tight">
                Profile & Library
              </Text>
              <Text className="text-slate-400 text-xs">
                Your offline vocabulary journey
              </Text>
            </View>
          </View>

          {/* Streak pill */}
          <View className="flex-row items-center bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1.5">
            <Ionicons name="flame" size={16} color={Colors.brand.spark} />
            <Text className="text-amber-400 font-bold text-xs ml-1">
              {streak}d
            </Text>
          </View>
        </View>

        {/* Quick Flashcard Practice Hero Banner */}
        <Animated.View
          entering={FadeInDown.delay(30).duration(300)}
          className="bg-indigo-950/40 border border-indigo-500/30 rounded-3xl p-5 mb-6 shadow-xl"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center space-x-1.5 mb-1">
                <Ionicons name="flash" size={16} color="#FBBF24" />
                <Text className="text-amber-400 text-xs font-bold uppercase tracking-wider ml-1">
                  Active Recall
                </Text>
              </View>
              <Text className="text-white text-lg font-serif font-bold">
                Spaced Repetition Study
              </Text>
              <Text className="text-slate-300 text-xs mt-1 leading-relaxed">
                Train your memory with the SM-2 algorithm and interactive flashcards.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => onStartPractice?.({ limit: 20 }, 'Full Vocabulary Deck')}
              className="bg-indigo-600 px-4 py-3 rounded-2xl flex-row items-center shadow-lg active:bg-indigo-500"
            >
              <Ionicons name="play" size={16} color="#FFFFFF" />
              <Text className="text-white font-bold text-xs ml-1.5">Study</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Study Pill Row */}
          <View className="flex-row items-center mt-3 pt-3 border-t border-indigo-500/20 gap-2">
            <TouchableOpacity
              onPress={() => onStartPractice?.({ starredOnly: true }, '⭐ Starred Words')}
              className="flex-row items-center bg-slate-900/90 border border-amber-500/30 px-3 py-1.5 rounded-full"
            >
              <Ionicons name="star" size={13} color="#FBBF24" />
              <Text className="text-amber-300 text-xs font-semibold ml-1">
                Review Starred ({savedWords.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onStartPractice?.({ limit: 20 }, 'Random Mix')}
              className="flex-row items-center bg-slate-900/90 border border-indigo-500/30 px-3 py-1.5 rounded-full"
            >
              <Ionicons name="shuffle" size={13} color="#818CF8" />
              <Text className="text-indigo-300 text-xs font-semibold ml-1">
                Random Mix (20)
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* 4-Stat Metric Grid with Staggered Fluid Springs */}
        <View className="flex-row flex-wrap justify-between gap-y-3 mb-6">
          {/* Words Seen */}
          <Animated.View
            entering={FadeInDown.delay(50).duration(350).springify().damping(15)}
            className="w-[48%] bg-slate-900/80 border border-slate-800 rounded-2xl p-4"
          >
            <View className="flex-row items-center justify-between mb-2">
              <Ionicons name="eye-outline" size={20} color="#818CF8" />
              <Text className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Seen
              </Text>
            </View>
            <Text className="text-white text-3xl font-serif font-bold">
              {stats.seenCount}
            </Text>
            <Text className="text-slate-400 text-xs mt-0.5">
              of {stats.totalWords} words explored
            </Text>
          </Animated.View>

          {/* Saved Words */}
          <Animated.View
            entering={FadeInDown.delay(110).duration(350).springify().damping(15)}
            className="w-[48%] bg-slate-900/80 border border-slate-800 rounded-2xl p-4"
          >
            <View className="flex-row items-center justify-between mb-2">
              <Ionicons name="bookmark-outline" size={20} color="#FBBF24" />
              <Text className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Saved
              </Text>
            </View>
            <Text className="text-white text-3xl font-serif font-bold">
              {stats.savedCount}
            </Text>
            <Text className="text-slate-400 text-xs mt-0.5">
              bookmarked words
            </Text>
          </Animated.View>

          {/* Custom Folders */}
          <Animated.View
            entering={FadeInDown.delay(170).duration(350).springify().damping(15)}
            className="w-[48%] bg-slate-900/80 border border-slate-800 rounded-2xl p-4"
          >
            <View className="flex-row items-center justify-between mb-2">
              <Ionicons name="folder-outline" size={20} color="#34D399" />
              <Text className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Folders
              </Text>
            </View>
            <Text className="text-white text-3xl font-serif font-bold">
              {stats.decksCount}
            </Text>
            <Text className="text-slate-400 text-xs mt-0.5">
              custom collections
            </Text>
          </Animated.View>

          {/* Completion Progress */}
          <Animated.View
            entering={FadeInDown.delay(230).duration(350).springify().damping(15)}
            className="w-[48%] bg-slate-900/80 border border-slate-800 rounded-2xl p-4"
          >
            <View className="flex-row items-center justify-between mb-2">
              <Ionicons name="pie-chart-outline" size={20} color="#A78BFA" />
              <Text className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Covered
              </Text>
            </View>
            <Text className="text-white text-3xl font-serif font-bold">
              {stats.totalWords > 0
                ? Math.round((stats.seenCount / stats.totalWords) * 100)
                : 0}
              %
            </Text>
            {/* Visual Progress Bar */}
            <View className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <View
                className="bg-indigo-500 h-full rounded-full"
                style={{
                  width: `${stats.totalWords > 0 ? Math.min(100, Math.round((stats.seenCount / stats.totalWords) * 100)) : 0}%`,
                }}
              />
            </View>
            <Text className="text-slate-400 text-xs mt-1">
              of full dictionary
            </Text>
          </Animated.View>
        </View>

        {/* Notification Delivery Settings Section */}
        <View className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 mb-6 shadow-xl">
          <View className="flex-row items-center justify-between pb-4 border-b border-slate-800">
            <View className="flex-row items-center space-x-2">
              <View className="w-8 h-8 rounded-full bg-indigo-500/20 items-center justify-center mr-2">
                <Ionicons name="notifications-outline" size={18} color="#818CF8" />
              </View>
              <View>
                <Text className="text-white text-base font-semibold">
                  Word Delivery
                </Text>
                <Text className="text-slate-400 text-xs">
                  Local offline lock screen alerts
                </Text>
              </View>
            </View>

            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#334155', true: '#6366F1' }}
              thumbColor={notificationsEnabled ? '#FFFFFF' : '#94A3B8'}
            />
          </View>

          {notificationsEnabled && (
            <View className="mt-4">
              {/* Delivery Time Selection */}
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Choose Delivery Time
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {TIME_PRESETS.map((time) => {
                  const isSelected = notificationTime === time;
                  return (
                    <TouchableOpacity
                      key={time}
                      onPress={() => handleSelectTime(time)}
                      className={`px-3.5 py-2 rounded-xl border ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-400'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-white' : 'text-slate-300'
                        }`}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  onPress={() => setIsEditingCustomTime(!isEditingCustomTime)}
                  className={`px-3.5 py-2 rounded-xl border ${
                    !TIME_PRESETS.includes(notificationTime)
                      ? 'bg-indigo-600 border-indigo-400'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      !TIME_PRESETS.includes(notificationTime)
                        ? 'text-white'
                        : 'text-slate-300'
                    }`}
                  >
                    Custom {notificationTime ? `(${notificationTime})` : ''}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Custom Time Input Form */}
              {isEditingCustomTime && (
                <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 mb-3">
                  <Ionicons name="time-outline" size={18} color="#64748B" className="mr-2" />
                  <TextInput
                    value={customTimeInput}
                    onChangeText={setCustomTimeInput}
                    placeholder="HH:MM (e.g. 09:30)"
                    placeholderTextColor="#64748B"
                    className="flex-1 text-white text-sm ml-2"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                  <TouchableOpacity
                    onPress={handleSaveCustomTime}
                    className="bg-indigo-600 px-3 py-1.5 rounded-lg ml-2"
                  >
                    <Text className="text-white text-xs font-semibold">Set</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Daily Frequency Selection */}
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Daily Frequency
              </Text>
              <View className="flex-row space-x-2 mb-4">
                {FREQUENCY_OPTIONS.map((freq) => {
                  const isSelected = notificationFreq === freq;
                  return (
                    <TouchableOpacity
                      key={freq}
                      onPress={() => handleSelectFrequency(freq)}
                      className={`flex-1 py-2 rounded-xl items-center justify-center border mr-2 ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-400'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-white' : 'text-slate-300'
                        }`}
                      >
                        {freq}x / day
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Send Test Notification Button */}
              <TouchableOpacity
                onPress={handleTestNotification}
                className="flex-row items-center justify-center bg-indigo-600/20 border border-indigo-500/40 py-2.5 rounded-xl active:bg-indigo-600/30"
              >
                <Ionicons name="paper-plane-outline" size={16} color="#818CF8" />
                <Text className="text-indigo-300 text-xs font-semibold ml-2">
                  Test Notification on Device
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* My Folders Section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center space-x-2">
              <Ionicons name="folder-open-outline" size={18} color="#818CF8" />
              <Text className="text-white text-lg font-serif font-bold ml-1.5">
                My Folders
              </Text>
            </View>
            <Text className="text-slate-500 text-xs font-semibold">
              {decks.length} collections
            </Text>
          </View>

          {decks.map((deck) => {
            const isOpened = selectedDeck?.id === deck.id;
            return (
              <Animated.View
                key={deck.id}
                layout={LinearTransition.springify().damping(16).stiffness(160)}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl mb-2.5 overflow-hidden"
              >
                <TouchableOpacity
                  onPress={() => (isOpened ? setSelectedDeck(null) : handleOpenDeck(deck))}
                  className="p-4 flex-row items-center justify-between"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-10 h-10 rounded-xl bg-slate-800 items-center justify-center mr-3">
                      <Ionicons name="folder" size={20} color="#818CF8" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-medium text-sm">
                        {deck.name}
                      </Text>
                      <Text className="text-slate-400 text-xs mt-0.5">
                        {deck.wordCount} {deck.wordCount === 1 ? 'word' : 'words'}
                        {deck.description ? ` • ${deck.description}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center space-x-2">
                    <Ionicons
                      name={isOpened ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#94A3B8"
                    />
                  </View>
                </TouchableOpacity>

                {/* Expanded Words in Folder */}
                {isOpened && (
                  <Animated.View
                    entering={FadeInDown.duration(200)}
                    className="px-4 pb-4 pt-1 border-t border-slate-800/60 bg-slate-950/40"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                        Words in this folder
                      </Text>
                      <View className="flex-row items-center">
                        {deckWords.length > 0 && (
                          <TouchableOpacity
                            onPress={() => onStartPractice?.({ deckId: deck.id }, deck.name)}
                            className="flex-row items-center bg-indigo-600/30 border border-indigo-500/50 px-2.5 py-1 rounded-lg mr-2"
                          >
                            <Ionicons name="flash-outline" size={13} color="#A5B4FC" />
                            <Text className="text-indigo-200 text-xs font-semibold ml-1">Study Deck</Text>
                          </TouchableOpacity>
                        )}
                        {!deck.id.startsWith('deck_favorites') && (
                          <TouchableOpacity
                            onPress={() => handleDeleteDeck(deck.id, deck.name)}
                            className="flex-row items-center"
                          >
                            <Ionicons name="trash-outline" size={14} color="#F87171" />
                            <Text className="text-red-400 text-xs ml-1">Delete</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {deckWords.length === 0 ? (
                      <Text className="text-slate-500 text-xs italic py-2">
                        No words added to this folder yet. Use the folder icon on any word card to save it here!
                      </Text>
                    ) : (
                      deckWords.map((dw) => (
                        <View
                          key={dw.id}
                          className="flex-row items-center justify-between py-2 border-b border-slate-800/40"
                        >
                          <View className="flex-1 mr-2">
                            <Text className="text-white text-sm font-serif font-bold">
                              {dw.word}
                            </Text>
                            <Text
                              numberOfLines={1}
                              className="text-slate-400 text-xs"
                            >
                              {dw.shortDefinition}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handlePronounce(dw.word)}
                            className="w-7 h-7 rounded-full bg-slate-800 items-center justify-center"
                          >
                            <Ionicons name="volume-medium-outline" size={14} color="#818CF8" />
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </Animated.View>
                )}
              </Animated.View>
            );
          })}
        </View>

        {/* All Saved & Starred Words Collection */}
        <View className="mb-10">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center space-x-2">
              <Ionicons name="star" size={18} color={Colors.brand.spark} />
              <Text className="text-white text-lg font-serif font-bold ml-1.5">
                Saved & Starred Words
              </Text>
            </View>
            <Text className="text-slate-500 text-xs font-semibold">
              {savedWords.length} saved
            </Text>
          </View>

          {savedWords.length === 0 ? (
            <View className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 items-center">
              <Ionicons name="bookmark-outline" size={28} color="#475569" />
              <Text className="text-slate-400 text-sm mt-2 font-medium">
                No saved words yet
              </Text>
              <Text className="text-slate-600 text-xs text-center mt-1">
                Tap the star or folder icon on any word card in the feed to save it to your library.
              </Text>
            </View>
          ) : (
            savedWords.map((sw) => (
              <Animated.View
                key={sw.id}
                layout={LinearTransition.springify().damping(16)}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 mb-2 flex-row items-center justify-between"
              >
                <View className="flex-1 mr-2">
                  <View className="flex-row items-center space-x-2">
                    <Text className="text-white text-base font-serif font-bold">
                      {sw.word}
                    </Text>
                    <Text className="text-indigo-400 text-xs font-mono ml-2">
                      {sw.phonetic}
                    </Text>
                  </View>
                  <Text numberOfLines={1} className="text-slate-400 text-xs mt-0.5">
                    {sw.shortDefinition}
                  </Text>
                </View>

                <View className="flex-row items-center space-x-2">
                  <TouchableOpacity
                    onPress={() => handlePronounce(sw.word)}
                    className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center mr-1"
                  >
                    <Ionicons name="volume-medium-outline" size={16} color="#818CF8" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleToggleStarInProfile(sw)}
                    className="w-8 h-8 rounded-full bg-amber-500/20 items-center justify-center"
                  >
                    <Ionicons name="star" size={16} color={Colors.brand.spark} />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );
}
