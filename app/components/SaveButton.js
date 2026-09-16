'use client';

// Small, optional "Save" control for an existing content detail view
// (agency profile, mission/rocket/spacecraft/astronaut/satellite detail).
// Built directly on the existing saved_items table and saveItem/unsaveItem
// helpers in lib/spaceActivity — no new save system, no new table.
//
// Every place this is used is already behind RequireAuth, so a signed-in
// user is normally present; if one isn't (or no stable id is available for
// the item), this simply renders nothing rather than fail.

import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../supabase';
import { saveItem, unsaveItem } from '../lib/spaceActivity';

export default function SaveButton({ contentType, contentId, contentLabel, style }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  // Best-effort read of current saved status. Never blocks the surrounding
  // page — the button just starts in its default (unsaved) state until this
  // resolves, and silently stays there if it fails.
  useEffect(() => {
    let active = true;
    if (!user?.id || !contentType || !contentId) return undefined;
    supabase
      .from('saved_items')
      .select('content_id')
      .eq('user_id', user.id)
      .eq('content_type', contentType)
      .eq('content_id', String(contentId))
      .maybeSingle()
      .then(({ data }) => {
        if (active) setSaved(Boolean(data));
      })
      .catch((err) => {
        console.error('SpaceTec SaveButton status check failed:', err);
      });
    return () => {
      active = false;
    };
  }, [user?.id, contentType, contentId]);

  if (!user?.id || !contentType || !contentId) return null;

  const toggle = () => {
    const next = !saved;
    setSaved(next); // optimistic — never waits on the network
    if (next) {
      saveItem(user.id, contentType, contentId, contentLabel);
    } else {
      unsaveItem(user.id, contentType, contentId);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      style={{
        background: saved ? 'rgba(255,255,255,0.16)' : 'transparent',
        border: '1px solid rgba(255,255,255,0.3)',
        color: '#fff',
        padding: '0.6rem 1.1rem',
        cursor: 'pointer',
        fontSize: '0.68rem',
        letterSpacing: '2px',
        fontWeight: 700,
        textTransform: 'uppercase',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {saved ? '★ SAVED' : '☆ SAVE'}
    </button>
  );
}
