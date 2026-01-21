import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated';
import {
  X,
  Upload,
  FileText,
  Check,
  AlertCircle,
  Folder,
  Link,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, supabaseUrl } from '@/lib/supabase';

interface ParsedBookmark {
  title: string;
  url: string;
  folder?: string;
  addDate?: string;
  selected: boolean;
}

interface BookmarkImportProps {
  visible: boolean;
  onClose: () => void;
  onImportComplete?: (count: number) => void;
}

export function BookmarkImport({ visible, onClose, onImportComplete }: BookmarkImportProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bookmarks, setBookmarks] = useState<ParsedBookmark[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const [error, setError] = useState<string | null>(null);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const parseBookmarkFile = (content: string): ParsedBookmark[] => {
    const bookmarks: ParsedBookmark[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');

    let currentFolder = 'Imported';

    const processNode = (node: Element, folder: string) => {
      if (node.tagName === 'H3') {
        currentFolder = node.textContent || 'Imported';
      }

      if (node.tagName === 'A') {
        const url = node.getAttribute('href');
        const title = node.textContent || url || 'Untitled';
        const addDate = node.getAttribute('add_date');

        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          bookmarks.push({
            title: title.trim(),
            url: url.trim(),
            folder: currentFolder,
            addDate: addDate ? new Date(parseInt(addDate) * 1000).toISOString() : undefined,
            selected: true,
          });
        }
      }

      Array.from(node.children).forEach((child) => {
        processNode(child as Element, currentFolder);
      });
    };

    const root = doc.querySelector('DL') || doc.body;
    if (root) {
      processNode(root, 'Imported');
    }

    return bookmarks;
  };

  const handleFileSelect = () => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: any) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    triggerHaptic();
    setError(null);

    try {
      const content = await file.text();
      const parsed = parseBookmarkFile(content);

      if (parsed.length === 0) {
        setError('No valid bookmarks found in the file. Make sure you exported your bookmarks as HTML.');
        return;
      }

      setBookmarks(parsed);
      setStep('preview');
    } catch (err) {
      setError('Failed to parse bookmark file. Please try again with a valid HTML bookmark file.');
    }
  };

  const toggleBookmark = (index: number) => {
    triggerHaptic();
    setBookmarks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, selected: !b.selected } : b))
    );
  };

  const toggleAll = (selected: boolean) => {
    triggerHaptic();
    setBookmarks((prev) => prev.map((b) => ({ ...b, selected })));
  };

  const handleImport = async () => {
    const selectedBookmarks = bookmarks.filter((b) => b.selected);
    if (selectedBookmarks.length === 0) {
      setError('Please select at least one bookmark to import');
      return;
    }

    triggerHaptic();
    setImporting(true);
    setStep('importing');
    setProgress({ current: 0, total: selectedBookmarks.length, success: 0, failed: 0 });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Please log in to import bookmarks');
      setImporting(false);
      setStep('preview');
      return;
    }

    let success = 0;
    let failed = 0;

    for (let i = 0; i < selectedBookmarks.length; i++) {
      const bookmark = selectedBookmarks[i];
      setProgress({ current: i + 1, total: selectedBookmarks.length, success, failed });

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/import-bookmarks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: bookmark.url,
            title: bookmark.title,
            folder: bookmark.folder,
            addDate: bookmark.addDate,
          }),
        });

        if (response.ok) {
          success++;
        } else {
          failed++;
        }
      } catch (err) {
        failed++;
      }

      setProgress({ current: i + 1, total: selectedBookmarks.length, success, failed });

      if (i < selectedBookmarks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    setImporting(false);
    setStep('complete');

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    onImportComplete?.(success);
  };

  const handleClose = () => {
    setBookmarks([]);
    setStep('upload');
    setError(null);
    setProgress({ current: 0, total: 0, success: 0, failed: 0 });
    onClose();
  };

  const selectedCount = bookmarks.filter((b) => b.selected).length;
  const folderGroups = bookmarks.reduce((acc, b) => {
    const folder = b.folder || 'Other';
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(b);
    return acc;
  }, {} as Record<string, ParsedBookmark[]>);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          style={[styles.container, { backgroundColor: theme.cardBackground }]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Import Bookmarks</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {step === 'upload' && (
              <Animated.View entering={FadeIn.duration(300)}>
                <View style={[styles.uploadBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={[styles.uploadIcon, { backgroundColor: theme.primary + '20' }]}>
                    <Upload size={32} color={theme.primary} />
                  </View>
                  <Text style={[styles.uploadTitle, { color: theme.text }]}>
                    Upload Bookmark File
                  </Text>
                  <Text style={[styles.uploadSubtitle, { color: theme.textSecondary }]}>
                    Export your bookmarks from Chrome, Safari, or Firefox as HTML
                  </Text>
                  <TouchableOpacity
                    style={[styles.selectButton, { backgroundColor: theme.primary }]}
                    onPress={handleFileSelect}
                  >
                    <FileText size={18} color="#FFFFFF" />
                    <Text style={styles.selectButtonText}>Select File</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.instructionsBox, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.instructionsTitle, { color: theme.text }]}>
                    How to export bookmarks:
                  </Text>
                  <View style={styles.instructionItem}>
                    <Text style={[styles.instructionBullet, { color: theme.primary }]}>Chrome:</Text>
                    <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
                      Bookmarks Manager &gt; Export bookmarks
                    </Text>
                  </View>
                  <View style={styles.instructionItem}>
                    <Text style={[styles.instructionBullet, { color: theme.primary }]}>Safari:</Text>
                    <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
                      File &gt; Export Bookmarks...
                    </Text>
                  </View>
                  <View style={styles.instructionItem}>
                    <Text style={[styles.instructionBullet, { color: theme.primary }]}>Firefox:</Text>
                    <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
                      Bookmarks &gt; Manage &gt; Import and Backup &gt; Export to HTML
                    </Text>
                  </View>
                </View>

                {Platform.OS === 'web' && (
                  <input
                    ref={fileInputRef as any}
                    type="file"
                    accept=".html,.htm"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                )}
              </Animated.View>
            )}

            {step === 'preview' && (
              <Animated.View entering={FadeIn.duration(300)}>
                <View style={styles.previewHeader}>
                  <Text style={[styles.previewTitle, { color: theme.text }]}>
                    {bookmarks.length} bookmarks found
                  </Text>
                  <View style={styles.previewActions}>
                    <TouchableOpacity
                      style={[styles.selectAllButton, { backgroundColor: theme.surface }]}
                      onPress={() => toggleAll(true)}
                    >
                      <Text style={[styles.selectAllText, { color: theme.primary }]}>Select All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.selectAllButton, { backgroundColor: theme.surface }]}
                      onPress={() => toggleAll(false)}
                    >
                      <Text style={[styles.selectAllText, { color: theme.textSecondary }]}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {Object.entries(folderGroups).map(([folder, items]) => (
                  <View key={folder} style={styles.folderGroup}>
                    <View style={styles.folderHeader}>
                      <Folder size={16} color={theme.primary} />
                      <Text style={[styles.folderName, { color: theme.text }]}>{folder}</Text>
                      <Text style={[styles.folderCount, { color: theme.textTertiary }]}>
                        {items.filter((i) => i.selected).length}/{items.length}
                      </Text>
                    </View>
                    {items.map((bookmark, idx) => {
                      const globalIdx = bookmarks.findIndex((b) => b === bookmark);
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.bookmarkItem,
                            { backgroundColor: bookmark.selected ? theme.primary + '10' : theme.surface },
                          ]}
                          onPress={() => toggleBookmark(globalIdx)}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              {
                                backgroundColor: bookmark.selected ? theme.primary : 'transparent',
                                borderColor: bookmark.selected ? theme.primary : theme.border,
                              },
                            ]}
                          >
                            {bookmark.selected && <Check size={12} color="#FFFFFF" />}
                          </View>
                          <View style={styles.bookmarkInfo}>
                            <Text style={[styles.bookmarkTitle, { color: theme.text }]} numberOfLines={1}>
                              {bookmark.title}
                            </Text>
                            <Text style={[styles.bookmarkUrl, { color: theme.textTertiary }]} numberOfLines={1}>
                              {bookmark.url}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}

                <TouchableOpacity
                  style={[
                    styles.importButton,
                    { backgroundColor: selectedCount > 0 ? theme.primary : theme.surface },
                  ]}
                  onPress={handleImport}
                  disabled={selectedCount === 0}
                >
                  <Text
                    style={[
                      styles.importButtonText,
                      { color: selectedCount > 0 ? '#FFFFFF' : theme.textTertiary },
                    ]}
                  >
                    Import {selectedCount} Bookmark{selectedCount !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {step === 'importing' && (
              <Animated.View entering={FadeIn.duration(300)} style={styles.progressContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.progressTitle, { color: theme.text }]}>
                  Importing bookmarks...
                </Text>
                <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                  {progress.current} of {progress.total}
                </Text>
                <View style={[styles.progressBar, { backgroundColor: theme.surface }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: theme.primary,
                        width: `${(progress.current / progress.total) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.progressStats}>
                  <View style={styles.progressStat}>
                    <CheckCircle size={16} color={theme.success} />
                    <Text style={[styles.progressStatText, { color: theme.success }]}>
                      {progress.success} imported
                    </Text>
                  </View>
                  {progress.failed > 0 && (
                    <View style={styles.progressStat}>
                      <XCircle size={16} color={theme.error} />
                      <Text style={[styles.progressStatText, { color: theme.error }]}>
                        {progress.failed} failed
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            )}

            {step === 'complete' && (
              <Animated.View entering={FadeIn.duration(300)} style={styles.completeContainer}>
                <View style={[styles.completeIcon, { backgroundColor: theme.success + '20' }]}>
                  <CheckCircle size={48} color={theme.success} />
                </View>
                <Text style={[styles.completeTitle, { color: theme.text }]}>Import Complete!</Text>
                <Text style={[styles.completeText, { color: theme.textSecondary }]}>
                  Successfully imported {progress.success} bookmark{progress.success !== 1 ? 's' : ''}
                </Text>
                {progress.failed > 0 && (
                  <Text style={[styles.failedText, { color: theme.error }]}>
                    {progress.failed} bookmark{progress.failed !== 1 ? 's' : ''} failed to import
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.doneButton, { backgroundColor: theme.primary }]}
                  onPress={handleClose}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {error && (
              <View style={[styles.errorBox, { backgroundColor: theme.error + '15', borderColor: theme.error }]}>
                <AlertCircle size={18} color={theme.error} />
                <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
  },
  uploadBox: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  uploadIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  instructionBullet: {
    fontSize: 13,
    fontWeight: '600',
    width: 60,
  },
  instructionText: {
    fontSize: 13,
    flex: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  selectAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '500',
  },
  folderGroup: {
    marginBottom: 16,
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  folderName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  folderCount: {
    fontSize: 12,
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookmarkInfo: {
    flex: 1,
  },
  bookmarkTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  bookmarkUrl: {
    fontSize: 12,
  },
  importButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  progressText: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 16,
  },
  progressStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressStatText: {
    fontSize: 14,
    fontWeight: '500',
  },
  completeContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  completeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  completeTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  completeText: {
    fontSize: 14,
    marginBottom: 8,
  },
  failedText: {
    fontSize: 14,
    marginBottom: 20,
  },
  doneButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 20,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
  },
});
