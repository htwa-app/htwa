/**
 * app/rate-trip/[booking_id].tsx
 *
 * Stage 55 — Post-trip rating screen.
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { Colors, Typography, Spacing, BorderRadius, FontFamily } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const STAR_SIZE = 36;

export default function RateTripScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();
  const { booking_id } = useLocalSearchParams<{ booking_id: string }>();

  const [rating,       setRating]       = useState(0);
  const [comment,      setComment]      = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user || !booking_id || rating === 0) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const { data: booking, error: bErr } = await supabase
        .from('bookings')
        .select('ride_id, passenger_id')
        .eq('id', booking_id)
        .single();

      if (bErr || !booking) { setError('Booking not found.'); return; }

      // Fetch the ride's driver explicitly (embedded FK relations aren't typed).
      // Passenger reviews the driver; driver reviews the passenger.
      const { data: ride } = await supabase
        .from('rides').select('driver_id').eq('id', booking.ride_id).maybeSingle();
      const revieweeId = user.id === booking.passenger_id ? ride?.driver_id : booking.passenger_id;

      if (!revieweeId) { setError('Cannot determine who to review.'); return; }

      // Upsert keyed on the full unique constraint so a driver can review each
      // passenger on a trip, and any reviewer can amend their own rating.
      const { error: revErr } = await supabase.from('reviews').upsert({
        trip_id:     booking.ride_id,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating,
        comment: comment.trim() || null,
      }, { onConflict: 'trip_id,reviewer_id,reviewee_id' });

      if (revErr) { setError(revErr.message); return; }
      router.replace('/(tabs)/history');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not submit review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen} testID="rate-trip-screen">
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back" testID="back-button">
        <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.title}>Rate your trip</Text>
      <Text style={styles.subtitle}>How did it go?</Text>
      <View style={styles.starRow} testID="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)} accessibilityRole="button" accessibilityLabel={`${star} star`} testID={`star-${star}`}>
            <Ionicons name={star <= rating ? 'star' : 'star-outline'} size={STAR_SIZE} color={star <= rating ? Colors.amber : Colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={styles.commentInput} placeholder="Leave a comment (optional)" placeholderTextColor={Colors.textTertiary} value={comment} onChangeText={setComment} multiline numberOfLines={3} testID="comment-input" />
      {error && <Text style={styles.errorText} testID="review-error">{error}</Text>}
      {isSubmitting ? <ActivityIndicator size="large" color={Colors.primary} /> : (
        <Button title="Submit review" onPress={handleSubmit} disabled={rating === 0} testID="submit-button" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.xxxl + Spacing.xl, gap: Spacing.lg },
  backBtn: { alignSelf: 'flex-start' },
  title: { ...Typography.headingLarge, color: Colors.textPrimary },
  subtitle: { ...Typography.bodyLarge, color: Colors.textSecondary },
  starRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center', paddingVertical: Spacing.md },
  commentInput: { backgroundColor: Colors.surface, borderRadius: BorderRadius.medium, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.cardPadding, paddingVertical: Spacing.md, fontSize: 16, fontFamily: FontFamily.regular, color: Colors.textPrimary, minHeight: 80, textAlignVertical: 'top' },
  errorText: { ...Typography.bodySmall, color: Colors.sos, textAlign: 'center' },
});
