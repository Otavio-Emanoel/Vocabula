import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  useWindowDimensions,
  ViewToken,
  ActivityIndicator,
  Text,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { WordDefinition } from '../../types/dictionary';
import { WordCard } from './WordCard';
import { FolderModal } from '../modals/FolderModal';
import { WordNoteModal } from '../modals/WordNoteModal';
import {
  markWordSeen,
  toggleStarWord,
  getWordDeckIds,
  getMasteryMap,
  getAllWordNotes,
} from '../../db/queries';

interface TikTokFeedProps {
  words: WordDefinition[];
  starredWordIds: Set<string>;
  onToggleStarSuccess?: (wordId: string, isStarred: boolean) => void;
  onShowToast?: (msg: string) => void;
  onRefreshFeed?: () => Promise<void>;
  isRefreshing?: boolean;
}

export function TikTokFeed({
  words,
  starredWordIds,
  onToggleStarSuccess,
  onShowToast,
  onRefreshFeed,
  isRefreshing,
}: TikTokFeedProps) {
  const { height } = useWindowDimensions();
  // Accounting for the bottom navigation bar (~70px)
  const cardHeight = height - 70;

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const [selectedWordForFolder, setSelectedWordForFolder] = useState<WordDefinition | null>(null);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [folderMap, setFolderMap] = useState<Record<string, boolean>>({});
  const [masteryMap, setMasteryMap] = useState<Map<string, 'new' | 'learning' | 'mastered'>>(new Map());

  // Note Modal state
  const [selectedWordForNote, setSelectedWordForNote] = useState<WordDefinition | null>(null);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [notesMap, setNotesMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    getMasteryMap().then(setMasteryMap).catch(() => {});
    getAllWordNotes().then(setNotesMap).catch(() => {});
  }, [words]);

  const handleNoteSaved = (wordId: string, note: string | null) => {
    setNotesMap((prev) => {
      const next = new Map(prev);
      if (note) {
        next.set(wordId, note);
      } else {
        next.delete(wordId);
      }
      return next;
    });
    onShowToast?.(note ? '💡 Memory note saved' : 'Note cleared');
  };

  // Check folder assignments for active words
  const checkFolderStatus = useCallback(async (wordId: string) => {
    try {
      const decks = await getWordDeckIds(wordId);
      setFolderMap((prev) => ({
        ...prev,
        [wordId]: decks.length > 0,
      }));
    } catch (err) {
      console.error('Error checking folder status:', err);
    }
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[]; changed: ViewToken[] }) => {
      if (viewableItems && viewableItems.length > 0) {
        const currentItem = viewableItems[0].item as WordDefinition;
        if (currentItem?.id) {
          // Track word as seen in SQLite
          markWordSeen(currentItem.id).catch((e) => console.warn('Seen mark failed:', e));
          checkFolderStatus(currentItem.id);
        }
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const handleToggleStar = async (word: WordDefinition) => {
    try {
      const newState = await toggleStarWord(word.id);
      onToggleStarSuccess?.(word.id, newState);
      onShowToast?.(newState ? `⭐ "${word.word}" bookmarked` : `Removed "${word.word}"`);
    } catch (err) {
      console.error('Error toggling star:', err);
    }
  };

  const handleOpenFolderModal = (word: WordDefinition) => {
    setSelectedWordForFolder(word);
    setFolderModalVisible(true);
  };

  const handleFoldersUpdated = () => {
    if (selectedWordForFolder) {
      checkFolderStatus(selectedWordForFolder.id);
    }
  };

  if (!words || words.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-[#090D16]">
        <ActivityIndicator size="large" color="#818CF8" />
        <Text className="text-slate-400 text-sm mt-3">Loading Vocabula Codex...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#090D16]" style={{ marginBottom: 70 }}>
      <Animated.FlatList
        data={words}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <WordCard
            word={item}
            index={index}
            scrollY={scrollY}
            height={cardHeight}
            isStarred={starredWordIds.has(item.id)}
            isInAnyFolder={!!folderMap[item.id]}
            masteryLevel={masteryMap.get(item.id)}
            note={notesMap.get(item.id)}
            onToggleStar={() => handleToggleStar(item)}
            onOpenFolderModal={() => handleOpenFolderModal(item)}
            onOpenNoteModal={() => {
              setSelectedWordForNote(item);
              setNoteModalVisible(true);
            }}
          />
        )}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToInterval={cardHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum={true}
        showsVerticalScrollIndicator={false}
        refreshing={isRefreshing}
        onRefresh={onRefreshFeed}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: cardHeight,
          offset: cardHeight * index,
          index,
        })}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      <FolderModal
        visible={folderModalVisible}
        onClose={() => setFolderModalVisible(false)}
        word={selectedWordForFolder}
        onFoldersUpdated={handleFoldersUpdated}
      />

      <WordNoteModal
        visible={noteModalVisible}
        onClose={() => setNoteModalVisible(false)}
        word={selectedWordForNote}
        onNoteSaved={handleNoteSaved}
      />
    </View>
  );
}
