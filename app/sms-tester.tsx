import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Send, Zap, Trash2, RefreshCw, CircleCheck as CheckCircle, Circle as XCircle, TriangleAlert as AlertTriangle, ChartBar as BarChart3, Shield, MessageSquare, Users } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

interface TestUser {
  user_id: string;
  test_label: string;
  users: {
    name: string;
    email: string;
    phone_number: string;
  };
}

interface WebhookLog {
  id: string;
  phone_hash: string;
  matched_user_id: string | null;
  outcome: string;
  source: string;
  item_id: string | null;
  processing_duration_ms: number | null;
  error_message: string | null;
  created_at: string;
}

interface LoadTestResult {
  totalSent: number;
  succeeded: number;
  failed: number;
  userNotFound: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  isolationViolations: number;
}

interface SendResult {
  status: number;
  data: { success?: boolean; itemId?: string; error?: string };
  durationMs: number;
}

const PRESET_MESSAGES = [
  { label: 'Plain text', body: 'Meeting notes from the product sync today' },
  { label: 'URL only', body: 'https://example.com/interesting-article' },
  { label: 'URL + text', body: 'Worth reading https://example.com/article great piece on AI' },
  { label: 'YouTube', body: 'https://youtube.com/watch?v=dQw4w9WgXcQ' },
  { label: 'High priority', body: 'Important: follow up on contract priority: high' },
  { label: 'With note', body: 'https://example.com note: review before Monday' },
  { label: 'Unknown phone', body: 'This should 404 — sent from unregistered number' },
];

function OutcomeBadge({ outcome }: { outcome: string }) {
  const { theme } = useTheme();
  const config: Record<string, { color: string; icon: typeof CheckCircle }> = {
    success: { color: theme.success, icon: CheckCircle },
    user_not_found: { color: theme.warning, icon: AlertTriangle },
    signature_invalid: { color: theme.error, icon: XCircle },
    error: { color: theme.error, icon: XCircle },
  };
  const cfg = config[outcome] || { color: theme.textTertiary, icon: AlertTriangle };
  const Icon = cfg.icon;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.color + '20' }]}>
      <Icon size={10} color={cfg.color} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>{outcome.replace(/_/g, ' ')}</Text>
    </View>
  );
}

export default function SmsTester() {
  const router = useRouter();
  const { theme } = useTheme();

  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<TestUser | null>(null);
  const [customPhone, setCustomPhone] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loadTestResult, setLoadTestResult] = useState<LoadTestResult | null>(null);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [sending, setSending] = useState(false);
  const [runningLoadTest, setRunningLoadTest] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

  const callSimulator = useCallback(async (body: object) => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${supabaseUrl}/functions/v1/sms-simulator`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return response.json();
  }, [supabaseUrl, supabaseAnonKey]);

  const loadTestUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await callSimulator({ action: 'list_test_users' });
      setTestUsers(data.testUsers || []);
    } catch (e) {
      console.error('Failed to load test users', e);
    } finally {
      setLoadingUsers(false);
    }
  }, [callSimulator]);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const data = await callSimulator({ action: 'get_logs' });
      setLogs(data.logs || []);
    } catch (e) {
      console.error('Failed to load logs', e);
    } finally {
      setLoadingLogs(false);
    }
  }, [callSimulator]);

  useEffect(() => {
    loadTestUsers();
    loadLogs();
  }, []);

  const handleSend = async () => {
    const phone = customPhone.trim() || selectedUser?.users?.phone_number;
    if (!phone || !messageBody.trim()) return;

    setSending(true);
    setSendResult(null);
    try {
      const data = await callSimulator({
        action: 'send',
        fromPhone: phone.startsWith('+') ? phone : `+${phone}`,
        body: messageBody.trim(),
      });
      setSendResult(data.result);
      await loadLogs();
    } catch (e) {
      console.error('Send failed', e);
    } finally {
      setSending(false);
    }
  };

  const handleLoadTest = async () => {
    setRunningLoadTest(true);
    setLoadTestResult(null);
    try {
      const data = await callSimulator({
        action: 'load_test',
        concurrentUsers: Math.min(testUsers.length, 10),
        messagesPerUser: 3,
      });
      setLoadTestResult(data.loadTestResult);
      await loadLogs();
    } catch (e) {
      console.error('Load test failed', e);
    } finally {
      setRunningLoadTest(false);
    }
  };

  const handleCleanup = async () => {
    setCleaningUp(true);
    try {
      await callSimulator({ action: 'cleanup' });
      await loadLogs();
    } catch (e) {
      console.error('Cleanup failed', e);
    } finally {
      setCleaningUp(false);
    }
  };

  const activePhone = customPhone.trim() || selectedUser?.users?.phone_number || '';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={theme.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>SMS Tester</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Test without real phone numbers</Text>
        </View>
        <TouchableOpacity onPress={() => { loadTestUsers(); loadLogs(); }} style={[styles.refreshButton, { backgroundColor: theme.surface }]}>
          <RefreshCw size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Users size={18} color={theme.success} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Test Users</Text>
            {loadingUsers && <ActivityIndicator size="small" color={theme.textTertiary} />}
          </View>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            10 seeded users with reserved +1555000000X numbers. Tap to select sender.
          </Text>
          <ScrollView style={styles.userList} nestedScrollEnabled>
            {testUsers.map((u) => (
              <TouchableOpacity
                key={u.user_id}
                style={[
                  styles.userRow,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  selectedUser?.user_id === u.user_id && { borderColor: theme.success, borderWidth: 2 },
                ]}
                onPress={() => {
                  setSelectedUser(u);
                  setCustomPhone('');
                }}
              >
                <View style={styles.userRowLeft}>
                  <Text style={[styles.userRowName, { color: theme.text }]}>{u.users?.name}</Text>
                  <Text style={[styles.userRowPhone, { color: theme.textSecondary }]}>
                    +{u.users?.phone_number}
                  </Text>
                </View>
                {selectedUser?.user_id === u.user_id && (
                  <CheckCircle size={16} color={theme.success} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <MessageSquare size={18} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Send a Message</Text>
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>From phone (or select above)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="+15550000001"
            placeholderTextColor={theme.textTertiary}
            value={customPhone}
            onChangeText={(v) => { setCustomPhone(v); setSelectedUser(null); }}
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>Preset messages</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
            {PRESET_MESSAGES.map((p) => (
              <TouchableOpacity
                key={p.label}
                style={[styles.presetChip, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => {
                  setMessageBody(p.body);
                  if (p.label === 'Unknown phone') {
                    setCustomPhone('+15559999999');
                    setSelectedUser(null);
                  }
                }}
              >
                <Text style={[styles.presetChipText, { color: theme.textSecondary }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Message body</Text>
          <TextInput
            style={[styles.textarea, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="Type a message or pick a preset..."
            placeholderTextColor={theme.textTertiary}
            value={messageBody}
            onChangeText={setMessageBody}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {activePhone ? (
            <Text style={[styles.sendingAs, { color: theme.textTertiary }]}>
              Sending as: {activePhone.startsWith('+') ? activePhone : `+${activePhone}`}
            </Text>
          ) : null}

          {sendResult && (
            <View style={[
              styles.resultBox,
              {
                backgroundColor: sendResult.status === 200 ? theme.success + '15' : theme.error + '15',
                borderColor: sendResult.status === 200 ? theme.success + '40' : theme.error + '40',
              }
            ]}>
              <Text style={[styles.resultStatus, { color: sendResult.status === 200 ? theme.success : theme.error }]}>
                {sendResult.status === 200 ? 'Item saved successfully' : `Failed: ${sendResult.data?.error || 'Unknown error'}`}
              </Text>
              {sendResult.data?.itemId && (
                <Text style={[styles.resultDetail, { color: theme.textSecondary }]}>Item ID: {sendResult.data.itemId}</Text>
              )}
              <Text style={[styles.resultDetail, { color: theme.textTertiary }]}>{sendResult.durationMs}ms</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: (!activePhone || !messageBody.trim() || sending) ? theme.border : theme.primary },
            ]}
            onPress={handleSend}
            disabled={!activePhone || !messageBody.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Send size={18} color="#FFF" />
                <Text style={styles.primaryButtonText}>Send via Webhook</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Zap size={18} color={theme.warning} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Load Test</Text>
          </View>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            Fires 3 messages each to all 10 test users concurrently (30 total). Checks isolation — verifies each item landed in the correct account.
          </Text>

          {loadTestResult && (
            <View style={[styles.statsGrid, { borderColor: theme.border }]}>
              {[
                { label: 'Total sent', value: loadTestResult.totalSent, color: theme.text },
                { label: 'Succeeded', value: loadTestResult.succeeded, color: theme.success },
                { label: 'Failed', value: loadTestResult.failed, color: theme.error },
                { label: 'Not found', value: loadTestResult.userNotFound, color: theme.warning },
                { label: 'Avg ms', value: loadTestResult.avgDurationMs, color: theme.primary },
                { label: 'Max ms', value: loadTestResult.maxDurationMs, color: theme.textSecondary },
              ].map((stat) => (
                <View key={stat.label} style={[styles.statItem, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: theme.textTertiary }]}>{stat.label}</Text>
                </View>
              ))}
              <View style={[
                styles.isolationRow,
                {
                  backgroundColor: loadTestResult.isolationViolations === 0 ? theme.success + '15' : theme.error + '15',
                  borderColor: loadTestResult.isolationViolations === 0 ? theme.success + '40' : theme.error + '40',
                }
              ]}>
                <Shield size={16} color={loadTestResult.isolationViolations === 0 ? theme.success : theme.error} />
                <Text style={[styles.isolationText, { color: loadTestResult.isolationViolations === 0 ? theme.success : theme.error }]}>
                  {loadTestResult.isolationViolations === 0
                    ? 'Isolation verified — all items in correct accounts'
                    : `VIOLATION: ${loadTestResult.isolationViolations} item(s) in wrong account`}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: runningLoadTest ? theme.border : theme.warning }]}
            onPress={handleLoadTest}
            disabled={runningLoadTest || testUsers.length === 0}
          >
            {runningLoadTest ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <BarChart3 size={18} color="#FFF" />
                <Text style={styles.primaryButtonText}>Run Load Test (30 messages)</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: theme.error + '60' }]}
            onPress={handleCleanup}
            disabled={cleaningUp}
          >
            {cleaningUp ? (
              <ActivityIndicator size="small" color={theme.error} />
            ) : (
              <>
                <Trash2 size={16} color={theme.error} />
                <Text style={[styles.secondaryButtonText, { color: theme.error }]}>Clear Test Data</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <BarChart3 size={18} color={theme.textSecondary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Webhook Audit Log</Text>
            {loadingLogs && <ActivityIndicator size="small" color={theme.textTertiary} />}
            <TouchableOpacity onPress={loadLogs} style={{ marginLeft: 'auto' }}>
              <RefreshCw size={14} color={theme.textTertiary} />
            </TouchableOpacity>
          </View>

          {logs.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No logs yet. Send a message to see entries.</Text>
          ) : (
            logs.slice(0, 20).map((log) => (
              <View key={log.id} style={[styles.logRow, { borderBottomColor: theme.borderLight }]}>
                <View style={styles.logLeft}>
                  <OutcomeBadge outcome={log.outcome} />
                  <Text style={[styles.logSource, { color: theme.textTertiary }]}>{log.source}</Text>
                </View>
                <View style={styles.logRight}>
                  {log.processing_duration_ms != null && (
                    <Text style={[styles.logDuration, { color: theme.textTertiary }]}>{log.processing_duration_ms}ms</Text>
                  )}
                  <Text style={[styles.logTime, { color: theme.textTertiary }]}>
                    {new Date(log.created_at).toLocaleTimeString()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 1 },
  refreshButton: { marginLeft: 'auto', padding: 8, borderRadius: 8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: -4 },
  input: {
    padding: 12,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  textarea: {
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    borderWidth: 1,
    minHeight: 90,
  },
  presetScroll: { marginBottom: -4 },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  presetChipText: { fontSize: 12 },
  sendingAs: { fontSize: 12, textAlign: 'center' },
  resultBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  resultStatus: { fontSize: 14, fontWeight: '600' },
  resultDetail: { fontSize: 12 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '500' },
  userList: { maxHeight: 220 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
  },
  userRowLeft: { flex: 1 },
  userRowName: { fontSize: 14, fontWeight: '600' },
  userRowPhone: { fontSize: 12, marginTop: 2 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    flex: 1,
    minWidth: 80,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  isolationRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  isolationText: { fontSize: 13, fontWeight: '500', flex: 1 },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  logLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logRight: { alignItems: 'flex-end', gap: 2 },
  logSource: { fontSize: 11 },
  logDuration: { fontSize: 11 },
  logTime: { fontSize: 11 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: '500' },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },
});
