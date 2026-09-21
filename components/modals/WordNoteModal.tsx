import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WordDefinition } from '../../types/dictionary';
import { getWordNote, saveWordNote, deleteWordNote } from '../../db/queries';

interface WordNoteModalProps {
  visible: boolean;
  onClose: () => void;
  word: WordDefinition | null;
  onNoteSaved?: (wordId: string, note: string | null) => void;
}

export function WordNoteModal({
  visible,
  onClose,
  word,
  onNoteSaved,
}: WordNoteModalProps) {
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible && word) {
      loadNote();
    } else {
      setNote('');
    }
  }, [visible, word]);

  const loadNote = async () => {
    if (!word) return;
    setIsLoading(true);
    try {
      const existing = await getWordNote(word.id);
      setNote(existing ?? '');
    } catch (err) {
      console.error('Failed to load note:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!word) return;
    setIsSaving(true);
    try {
      await saveWordNote(word.id, note);
      onNoteSaved?.(word.id, note.trim() ? note.trim() : null);
      onClose();
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!word) return;
    setIsSaving(true);
    try {
      await deleteWordNote(word.id);
      onNoteSaved?.(word.id, null);
      setNote('');
      onClose();
    } catch (err) {
      console.error('Failed to delete note:', err);
    } finally {
      setIsSaving(false);
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/70"
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="flex-1"
        />

        <View className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-6 pb-10 shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center space-x-2">
              <View className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 items-center justify-center mr-2">
                <Ionicons name="bulb-outline" size={20} color="#C084FC" />
              </View>
              <View>
                <Text className="text-white text-lg font-serif font-bold">
                  Memory Note / Mnemonic
                </Text>
                <Text className="text-slate-400 text-xs">
                  Private memory anchor for "{word.word}"
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

          {/* Loading Indicator */}
          {isLoading ? (
            <View className="py-10 items-center justify-center">
              <ActivityIndicator size="small" color="#C084FC" />
            </View>
          ) : (
            <>
              {/* Note Text Input */}
              <View className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-4">
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Add a personal mnemonic, real-life story, or association..."
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={4}
                  className="text-white text-sm leading-relaxed min-h-[100px]"
                  textAlignVertical="top"
                  maxLength={400}
                />
                <Text className="text-slate-600 text-[10px] text-right mt-1">
                  {note.length}/400
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-row items-center space-x-3">
                {note.length > 0 && (
                  <TouchableOpacity
                    onPress={handleDelete}
                    disabled={isSaving}
                    className="flex-1 bg-red-500/10 border border-red-500/30 py-3 rounded-2xl items-center justify-center mr-2"
                  >
                    <Text className="text-red-400 font-semibold text-xs">
                      Clear Note
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={isSaving}
                  className="flex-2 bg-indigo-600 py-3 rounded-2xl items-center justify-center active:bg-indigo-500 flex-1 shadow-lg"
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-white font-bold text-sm">
                      Save Mnemonic
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
