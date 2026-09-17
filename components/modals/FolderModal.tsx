import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, SlideInDown } from 'react-native-reanimated';
import { WordDefinition } from '../../types/dictionary';
import {
  getUserDecks,
  createUserDeck,
  addWordToDeck,
  removeWordFromDeck,
  getWordDeckIds,
  UserDeck,
} from '../../db/queries';
import { Colors } from '../../constants/theme';

interface FolderModalProps {
  visible: boolean;
  onClose: () => void;
  word: WordDefinition | null;
  onFoldersUpdated?: () => void;
}

export function FolderModal({
  visible,
  onClose,
  word,
  onFoldersUpdated,
}: FolderModalProps) {
  const [decks, setDecks] = useState<UserDeck[]>([]);
  const [assignedDeckIds, setAssignedDeckIds] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (visible && word) {
      loadData();
    }
  }, [visible, word]);

  const loadData = async () => {
    if (!word) return;
    setIsLoading(true);
    try {
      const [allDecks, wordDecks] = await Promise.all([
        getUserDecks(),
        getWordDeckIds(word.id),
      ]);
      setDecks(allDecks);
      setAssignedDeckIds(new Set(wordDecks));
    } catch (err) {
      console.error('Failed to load folders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDeck = async (deckId: string) => {
    if (!word) return;
    const isAssigned = assignedDeckIds.has(deckId);

    try {
      if (isAssigned) {
        await removeWordFromDeck(deckId, word.id);
        setAssignedDeckIds((prev) => {
          const next = new Set(prev);
          next.delete(deckId);
          return next;
        });
      } else {
        await addWordToDeck(deckId, word.id);
        setAssignedDeckIds((prev) => {
          const next = new Set(prev);
          next.add(deckId);
          return next;
        });
      }
      // Refresh deck counts
      const updatedDecks = await getUserDecks();
      setDecks(updatedDecks);
      onFoldersUpdated?.();
    } catch (err) {
      console.error('Error toggling folder assignment:', err);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !word) return;
    setIsCreating(true);
    try {
      const newDeck = await createUserDeck(newFolderName.trim());
      await addWordToDeck(newDeck.id, word.id);
      setNewFolderName('');
      await loadData();
      onFoldersUpdated?.();
    } catch (err) {
      console.error('Error creating folder:', err);
    } finally {
      setIsCreating(false);
    }
  };

  if (!word) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/70"
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="flex-1"
        />

        <Animated.View
          entering={SlideInDown.springify().damping(22)}
          className="bg-[#111827] rounded-t-3xl border-t border-slate-800 p-6 max-h-[80%]"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-slate-800/80">
            <View className="flex-row items-center space-x-2">
              <View className="w-9 h-9 rounded-full bg-indigo-500/20 items-center justify-center mr-2">
                <Ionicons name="folder" size={20} color={Colors.brand.glow} />
              </View>
              <View>
                <Text className="text-white text-lg font-semibold tracking-wide">
                  Save to Folder
                </Text>
                <Text className="text-slate-400 text-xs">
                  Adding <Text className="text-indigo-300 font-medium font-serif italic">"{word.word}"</Text>
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center"
            >
              <Ionicons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Inline Create Folder Form */}
          <View className="my-4">
            <Text className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
              Create New Folder
            </Text>
            <View className="flex-row items-center space-x-2">
              <View className="flex-1 flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 mr-2">
                <Ionicons name="folder-open-outline" size={18} color="#64748B" className="mr-2" />
                <TextInput
                  value={newFolderName}
                  onChangeText={setNewFolderName}
                  placeholder="e.g. Literary Favorites, Philosophy..."
                  placeholderTextColor="#64748B"
                  className="flex-1 text-white text-sm ml-2"
                  returnKeyType="done"
                  onSubmitEditing={handleCreateFolder}
                />
              </View>
              <TouchableOpacity
                onPress={handleCreateFolder}
                disabled={!newFolderName.trim() || isCreating}
                className={`px-4 py-2.5 rounded-xl flex-row items-center justify-center ${
                  newFolderName.trim() && !isCreating
                    ? 'bg-indigo-600 active:bg-indigo-700'
                    : 'bg-slate-800 opacity-50'
                }`}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text className="text-white text-xs font-semibold ml-1">Create</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Folder List */}
          <Text className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
            Your Folders ({decks.length})
          </Text>

          {isLoading ? (
            <View className="py-8 items-center justify-center">
              <ActivityIndicator color={Colors.brand.glow} />
            </View>
          ) : (
            <ScrollView
              className="max-h-64"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {decks.length === 0 ? (
                <View className="py-8 items-center">
                  <Text className="text-slate-500 text-sm">No folders created yet.</Text>
                </View>
              ) : (
                decks.map((deck) => {
                  const isChecked = assignedDeckIds.has(deck.id);
                  return (
                    <TouchableOpacity
                      key={deck.id}
                      onPress={() => handleToggleDeck(deck.id)}
                      activeOpacity={0.7}
                      className={`flex-row items-center justify-between p-3.5 mb-2 rounded-2xl border ${
                        isChecked
                          ? 'bg-indigo-950/40 border-indigo-500/50'
                          : 'bg-slate-900/60 border-slate-800/80'
                      }`}
                    >
                      <View className="flex-row items-center flex-1 mr-3">
                        <View
                          className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${
                            isChecked ? 'bg-indigo-600' : 'bg-slate-800'
                          }`}
                        >
                          <Ionicons
                            name={isChecked ? 'folder' : 'folder-outline'}
                            size={18}
                            color={isChecked ? '#FFFFFF' : '#94A3B8'}
                          />
                        </View>
                        <View className="flex-1">
                          <Text
                            numberOfLines={1}
                            className={`text-sm font-medium ${
                              isChecked ? 'text-white' : 'text-slate-300'
                            }`}
                          >
                            {deck.name}
                          </Text>
                          <Text className="text-slate-500 text-xs mt-0.5">
                            {deck.wordCount} {deck.wordCount === 1 ? 'word' : 'words'}
                          </Text>
                        </View>
                      </View>

                      <View
                        className={`w-6 h-6 rounded-full items-center justify-center border ${
                          isChecked
                            ? 'bg-indigo-500 border-indigo-400'
                            : 'border-slate-700 bg-transparent'
                        }`}
                      >
                        {isChecked && (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* Done Button */}
          <TouchableOpacity
            onPress={onClose}
            className="w-full bg-indigo-600 py-3 rounded-2xl items-center justify-center mt-2 shadow-lg active:bg-indigo-700"
          >
            <Text className="text-white font-semibold text-sm">Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
