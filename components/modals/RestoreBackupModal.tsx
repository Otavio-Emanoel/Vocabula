import React, { useState } from 'react';
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
import { BackupService } from '../../services/backup/backupService';

interface RestoreBackupModalProps {
  visible: boolean;
  onClose: () => void;
  onRestoreSuccess?: (summary: { restoredDecks: number; restoredProgress: number }) => void;
}

export function RestoreBackupModal({
  visible,
  onClose,
  onRestoreSuccess,
}: RestoreBackupModalProps) {
  const [jsonText, setJsonText] = useState('');
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRestore = async () => {
    if (!jsonText.trim()) {
      setErrorMsg('Please paste a Vocabula backup JSON string.');
      return;
    }

    setIsRestoring(true);
    setErrorMsg(null);
    try {
      const summary = await BackupService.importBackup(jsonText.trim(), restoreMode);
      onRestoreSuccess?.(summary);
      setJsonText('');
      onClose();
    } catch (err: any) {
      console.error('Restore failed:', err);
      setErrorMsg(err.message || 'Invalid backup JSON format.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/75"
      >
        <TouchableOpacity activeOpacity={1} onPress={onClose} className="h-16" />

        <View className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-6 pb-10 shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <View className="flex-row items-center space-x-2">
              <View className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 items-center justify-center mr-2">
                <Ionicons name="cloud-upload-outline" size={20} color="#34D399" />
              </View>
              <View>
                <Text className="text-white text-lg font-serif font-bold">
                  Restore Backup
                </Text>
                <Text className="text-slate-400 text-xs">
                  Import offline JSON backup data
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

          {errorMsg && (
            <View className="bg-red-500/15 border border-red-500/30 rounded-xl p-3 mb-4">
              <Text className="text-red-400 text-xs font-semibold">{errorMsg}</Text>
            </View>
          )}

          {/* Mode Selector */}
          <View className="mb-4">
            <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Restore Mode
            </Text>
            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={() => setRestoreMode('merge')}
                className={`flex-1 p-3 rounded-2xl border mr-2 ${
                  restoreMode === 'merge'
                    ? 'bg-emerald-600/20 border-emerald-500'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    restoreMode === 'merge' ? 'text-emerald-300' : 'text-slate-300'
                  }`}
                >
                  Merge Data
                </Text>
                <Text className="text-slate-500 text-[11px] mt-0.5">
                  Keep existing & add imported
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setRestoreMode('replace')}
                className={`flex-1 p-3 rounded-2xl border ${
                  restoreMode === 'replace'
                    ? 'bg-red-600/20 border-red-500'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    restoreMode === 'replace' ? 'text-red-300' : 'text-slate-300'
                  }`}
                >
                  Clean Replace
                </Text>
                <Text className="text-slate-500 text-[11px] mt-0.5">
                  Overwrite local state
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* JSON Input */}
          <View className="mb-4">
            <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
              Paste Backup JSON
            </Text>
            <TextInput
              value={jsonText}
              onChangeText={setJsonText}
              placeholder='Paste {"vocabula_version": "1.0.0", ...} here'
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={5}
              className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-white text-xs font-mono min-h-[120px]"
              textAlignVertical="top"
            />
          </View>

          {/* Restore Button */}
          <TouchableOpacity
            onPress={handleRestore}
            disabled={isRestoring}
            className="bg-emerald-600 py-3.5 rounded-2xl items-center justify-center shadow-lg active:bg-emerald-500"
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-sm">
                Restore Offline Data ({restoreMode === 'merge' ? 'Merge' : 'Replace'})
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
