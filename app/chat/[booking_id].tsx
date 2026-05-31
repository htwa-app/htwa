/**
 * app/chat/[booking_id].tsx
 *
 * Stage 53 — In-app messaging for a booking.
 * Simple message list + text input with Supabase Realtime subscription.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, FontFamily } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Message {
  id:         string;
  sender_id:  string;
  content:    string;
  created_at: string;
}

export default function ChatScreen(): React.ReactElement {
  const router      = useRouter();
  const { user }    = useAuth();
  const { booking_id } = useLocalSearchParams<{ booking_id: string }>();

  const [messages,    setMessages]    = useState<Message[]>([]);
  const [text,        setText]        = useState('');
  const [isLoading,   setIsLoading]   = useState(true);
  const [isSending,   setIsSending]   = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const loadMessages = useCallback(async () => {
    if (!booking_id) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at')
      .eq('booking_id', booking_id)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
    setIsLoading(false);
  }, [booking_id]);

  useEffect(() => { void loadMessages(); }, [loadMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!booking_id) return;
    const channel = supabase
      .channel(`chat:${booking_id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `booking_id=eq.${booking_id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [booking_id]);

  const handleSend = async () => {
    if (!text.trim() || !user || !booking_id) return;
    setIsSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        booking_id, sender_id: user.id, content: text.trim(),
      });
      if (!error) setText('');
    } finally {
      setIsSending(false);
    }
  };

  const isMine = (msg: Message) => msg.sender_id === user?.id;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} testID="chat-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" testID="back-button">
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ flex: 1 }} testID="chat-loading" />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          testID="message-list"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => (
            <View style={[styles.bubble, isMine(item) ? styles.bubbleMine : styles.bubbleTheirs]}
              testID={`message-${item.id}`}>
              <Text style={[styles.bubbleText, isMine(item) ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
                {item.content}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText} testID="chat-empty">
              No messages yet. Say hello!
            </Text>
          }
        />
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor={Colors.textTertiary}
          multiline
          testID="message-input"
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || isSending}
          accessibilityRole="button"
          testID="send-button"
        >
          <Ionicons name="send" size={20} color={text.trim() ? Colors.surface : Colors.textTertiary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.xxxl + Spacing.xl, paddingBottom: Spacing.md },
  headerTitle: { ...Typography.headingMedium, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  messageList: { paddingHorizontal: Spacing.screenPadding, paddingVertical: Spacing.md, gap: Spacing.sm },
  bubble: { maxWidth: '75%', borderRadius: BorderRadius.large, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  bubbleMine: { backgroundColor: Colors.primary, alignSelf: 'flex-end' },
  bubbleTheirs: { backgroundColor: Colors.surface, alignSelf: 'flex-start', borderWidth: 1, borderColor: Colors.border },
  bubbleText: { fontSize: 14, fontFamily: FontFamily.regular },
  bubbleTextMine: { color: Colors.surface },
  bubbleTextTheirs: { color: Colors.textPrimary },
  emptyText: { ...Typography.bodyMedium, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.xxxxxl },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.screenPadding, paddingVertical: Spacing.md, gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  input: { flex: 1, fontSize: 16, fontFamily: FontFamily.regular, color: Colors.textPrimary, maxHeight: 100, paddingVertical: Spacing.sm },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.primaryLight },
});
