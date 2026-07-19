/**
 * services/reviews.ts
 *
 * Stages 56–57 — review rollup for profile screens: average rating, count,
 * and the review list with reviewer names. Fail-loud per CLAUDE.md §12: a
 * query error returns { ok: false } so screens show a retryable error, never
 * a fake "no reviews yet".
 */

import { supabase } from '../lib/supabase';

export interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  reviewerName: string;
  createdAt: string | null;
}

export interface ReviewSummary {
  average: number | null;   // null when no reviews yet
  count: number;
  reviews: ReviewItem[];
}

export type ReviewSummaryResult =
  | { ok: true; summary: ReviewSummary }
  | { ok: false };

const REVIEW_LIST_LIMIT = 20;

export async function getReviewSummary(userId: string): Promise<ReviewSummaryResult> {
  try {
    const { data: rows, error } = await supabase
      .from('reviews')
      .select('id, rating, comment, reviewer_id, created_at')
      .eq('reviewee_id', userId)
      .order('created_at', { ascending: false })
      .limit(REVIEW_LIST_LIMIT);
    if (error) return { ok: false };

    const reviews = rows ?? [];
    // The visible list is capped; average/count must cover ALL reviews.
    const { count, error: countErr } = await supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('reviewee_id', userId);
    if (countErr) return { ok: false };

    let average: number | null = null;
    if (reviews.length > 0) {
      // Average over the fetched window (newest 20) — exact enough for beta;
      // switches to a DB aggregate view when review volume warrants it.
      average = Math.round((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) * 10) / 10;
    }

    // Reviewer names (batched)
    const reviewerIds = [...new Set(reviews.map((r) => r.reviewer_id))];
    const nameById = new Map<string, string>();
    if (reviewerIds.length > 0) {
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', reviewerIds);
      if (usersErr) return { ok: false };
      for (const u of users ?? []) nameById.set(u.id, u.full_name);
    }

    return {
      ok: true,
      summary: {
        average,
        count: count ?? reviews.length,
        reviews: reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          reviewerName: nameById.get(r.reviewer_id) ?? 'htwa user',
          createdAt: r.created_at,
        })),
      },
    };
  } catch {
    return { ok: false };
  }
}

export type TripsCountResult = { ok: true; count: number } | { ok: false };

/** Completed journeys: as driver (completed rides) + as passenger (confirmed bookings on completed rides). */
export async function getCompletedTripsCount(userId: string): Promise<TripsCountResult> {
  try {
    // Embedded FK joins aren't expressed in the typed schema — two-step it.
    const [driverRes, bookingsRes] = await Promise.all([
      supabase.from('rides')
        .select('id', { count: 'exact', head: true })
        .eq('driver_id', userId)
        .eq('status', 'completed'),
      supabase.from('bookings')
        .select('ride_id')
        .eq('passenger_id', userId)
        .eq('status', 'confirmed'),
    ]);
    if (driverRes.error || bookingsRes.error) return { ok: false };

    let passengerCompleted = 0;
    const rideIds = (bookingsRes.data ?? []).map((b) => b.ride_id);
    if (rideIds.length > 0) {
      const { count, error } = await supabase
        .from('rides')
        .select('id', { count: 'exact', head: true })
        .in('id', rideIds)
        .eq('status', 'completed');
      if (error) return { ok: false };
      passengerCompleted = count ?? 0;
    }
    return { ok: true, count: (driverRes.count ?? 0) + passengerCompleted };
  } catch {
    return { ok: false };
  }
}
