'use client';

// Small, optional helpers for "My Space" personalization — built on the
// existing Supabase client and the same best-effort pattern as
// AuthContext's logActivity: never throws, never blocks the caller, and
// is a no-op if nobody is signed in.
//
// Nothing in the existing site calls these yet. To make an existing
// content page (an agency, mission, rocket, spacecraft, astronaut or
// satellite detail view) show up under "Recently Explored"/"Your
// Interests" on /my-space, call logRecentView() from it — one line, no
// UI change. Wiring that into each page is a separate, deliberate change
// left for the SpaceTec team to make page-by-page rather than done here,
// since it touches files outside the account page itself.

import { supabase } from '../supabase';

// contentType is a short label for an existing SpaceTec feature, e.g.
// 'agency' | 'mission' | 'rocket' | 'spacecraft' | 'astronaut' | 'satellite'.
export async function logRecentView(userId, contentType, contentId, contentLabel) {
  if (!userId || !contentType || !contentId) return;
  try {
    await supabase
      .from('recently_viewed')
      .upsert(
        { user_id: userId, content_type: contentType, content_id: String(contentId), content_label: contentLabel || String(contentId), viewed_at: new Date().toISOString() },
        { onConflict: 'user_id,content_type,content_id' }
      );
  } catch (err) {
    console.error('SpaceTec logRecentView failed:', err);
  }
}

export async function saveItem(userId, contentType, contentId, contentLabel) {
  if (!userId || !contentType || !contentId) return;
  try {
    await supabase
      .from('saved_items')
      .upsert(
        { user_id: userId, content_type: contentType, content_id: String(contentId), content_label: contentLabel || String(contentId) },
        { onConflict: 'user_id,content_type,content_id' }
      );
  } catch (err) {
    console.error('SpaceTec saveItem failed:', err);
  }
}

export async function unsaveItem(userId, contentType, contentId) {
  if (!userId || !contentType || !contentId) return;
  try {
    await supabase
      .from('saved_items')
      .delete()
      .eq('user_id', userId)
      .eq('content_type', contentType)
      .eq('content_id', String(contentId));
  } catch (err) {
    console.error('SpaceTec unsaveItem failed:', err);
  }
}
