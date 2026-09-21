import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WordDefinition, PartOfSpeech } from '../../types/dictionary';
import { createCustomWord } from '../../db/queries';

interface AddWordModalProps {
  visible: boolean;
  onClose: () => void;
  onWordCreated?: (word: WordDefinition) => void;
}

const POS_OPTIONS: PartOfSpeech[] = ['noun', 'verb', 'adjective', 'adverb', 'idiom'];

export function AddWordModal({ visible, onClose, onWordCreated }: AddWordModalProps) {
  const [word, setWord] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState<PartOfSpeech>('noun');
  const [shortDefinition, setShortDefinition] = useState('');
  const [detailedExplanation, setDetailedExplanation] = useState('');
  const [translationPt, setTranslationPt] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setWord('');
    setPhonetic('');
    setPartOfSpeech('noun');
    setShortDefinition('');
    setDetailedExplanation('');
    setTranslationPt('');
    setExampleSentence('');
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!word.trim()) {
      setErrorMsg('Please enter a word.');
      return;
    }
    if (!shortDefinition.trim()) {
      setErrorMsg('Please enter a definition.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      const created = await createCustomWord({
        word: word.trim(),
        phonetic: phonetic.trim() ? phonetic.trim() : `/${word.trim().toLowerCase()}/`,
        partOfSpeech,
        shortDefinition: shortDefinition.trim(),
        detailedExplanation: detailedExplanation.trim() || shortDefinition.trim(),
        translations: translationPt.trim() ? { pt: translationPt.trim() } : undefined,
        examples: exampleSentence.trim() ? [{ sentence: exampleSentence.trim() }] : [],
        difficultyLevel: 2,
        tags: ['custom', partOfSpeech],
      });

      onWordCreated?.(created);
      resetForm();
      onClose();
    } catch (err) {
      console.error('Failed to create custom word:', err);
      setErrorMsg('Failed to save word. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/75"
      >
        <TouchableOpacity activeOpacity={1} onPress={onClose} className="h-16" />

        <View className="bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[85%] p-6 pb-10 shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <View className="flex-row items-center space-x-2">
              <View className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 items-center justify-center mr-2">
                <Ionicons name="add" size={20} color="#818CF8" />
              </View>
              <View>
                <Text className="text-white text-lg font-serif font-bold">
                  Add Custom Word
                </Text>
                <Text className="text-slate-400 text-xs">
                  Create a personal vocabulary entry
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                resetForm();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center"
            >
              <Ionicons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {errorMsg && (
              <View className="bg-red-500/15 border border-red-500/30 rounded-xl p-3 mb-4">
                <Text className="text-red-400 text-xs font-semibold">{errorMsg}</Text>
              </View>
            )}

            {/* Word & Phonetic */}
            <View className="mb-3">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                Word / Headword *
              </Text>
              <TextInput
                value={word}
                onChangeText={setWord}
                placeholder="e.g. Ephemeral"
                placeholderTextColor="#64748B"
                className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-sm"
              />
            </View>

            <View className="mb-3">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                Phonetic Pronunciation
              </Text>
              <TextInput
                value={phonetic}
                onChangeText={setPhonetic}
                placeholder="e.g. /ɪˈfɛm.ər.əl/"
                placeholderTextColor="#64748B"
                className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-sm font-mono"
              />
            </View>

            {/* Part of Speech Pill Picker */}
            <View className="mb-3">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Part of Speech
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {POS_OPTIONS.map((pos) => {
                  const isSelected = partOfSpeech === pos;
                  return (
                    <TouchableOpacity
                      key={pos}
                      onPress={() => setPartOfSpeech(pos)}
                      className={`px-3 py-1.5 rounded-xl border ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-400'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold uppercase ${
                          isSelected ? 'text-white' : 'text-slate-400'
                        }`}
                      >
                        {pos}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Definition */}
            <View className="mb-3">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                Definition *
              </Text>
              <TextInput
                value={shortDefinition}
                onChangeText={setShortDefinition}
                placeholder="Brief, clear explanation of the word..."
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={2}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-sm"
              />
            </View>

            {/* Portuguese Translation */}
            <View className="mb-3">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                Tradução (Portuguese)
              </Text>
              <TextInput
                value={translationPt}
                onChangeText={setTranslationPt}
                placeholder="e.g. Efêmero; transitório; que dura pouco."
                placeholderTextColor="#64748B"
                className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-sm"
              />
            </View>

            {/* Example Sentence */}
            <View className="mb-4">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                Contextual Example
              </Text>
              <TextInput
                value={exampleSentence}
                onChangeText={setExampleSentence}
                placeholder="e.g. Fashions are ephemeral, but style is timeless."
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={2}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-sm italic"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              className="bg-indigo-600 py-3.5 rounded-2xl items-center justify-center shadow-lg active:bg-indigo-500 mb-4"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold text-sm">
                  Add Word to Dictionary
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
