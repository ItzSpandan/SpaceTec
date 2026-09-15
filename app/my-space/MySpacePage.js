'use client';

// /my-space — the destination for the existing hamburger-menu account
// button. Replaces the old small "Log Out only" popover with a proper
// personalized page, built entirely on the existing Supabase Auth/profile
// system (AuthContext) plus two small additive tables (recently_viewed,
// saved_items — see supabase/my_space_schema.sql). No other SpaceTec page,
// route, or feature is touched.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '../supabase';
import { useAuth } from '../lib/AuthContext';
import { unsaveItem } from '../lib/spaceActivity';
import RequireAuth from '../components/RequireAuth';

// Maps a content_type value (as stored in recently_viewed/saved_items) to
// its existing SpaceTec feature name and route. Nothing new — every route
// here already exists on the site.
const CONTENT_TYPE_META = {
  agency: { label: 'Agencies', route: '/space-agencies' },
  mission: { label: 'Missions', route: '/mission-database' },
  rocket: { label: 'Rockets', route: '/rocket-database' },
  spacecraft: { label: 'Spacecraft', route: '/spacecraft-database' },
  astronaut: { label: 'Astronauts', route: '/astronaut-database' },
  satellite: { label: 'Satellites', route: '/' },
  celestial: { label: 'Celestial Database', route: '/celestial-database' },
};

function typeLabel(contentType) {
  return CONTENT_TYPE_META[contentType]?.label || contentType;
}

function typeRoute(contentType) {
  return CONTENT_TYPE_META[contentType]?.route || '/';
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const sectionStyle = {
  maxWidth: '640px',
  margin: '0 auto',
  padding: '2.2rem 0',
  borderBottom: '1px solid rgba(255,255,255,0.09)',
};

const sectionTitleStyle = {
  color: '#71717a',
  fontSize: '0.68rem',
  letterSpacing: '3px',
  textTransform: 'uppercase',
  fontWeight: 700,
  margin: '0 0 1.1rem',
};

const emptyStyle = {
  color: '#52525b',
  fontSize: '0.8rem',
  fontStyle: 'italic',
};

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  padding: '0.65rem 0',
  borderTop: '1px solid rgba(255,255,255,0.06)',
};

const pillStyle = {
  border: '1px solid rgba(255,255,255,0.18)',
  color: '#d4d4d8',
  fontSize: '0.68rem',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  padding: '0.4rem 0.85rem',
};

function MySpaceContent() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const [recent, setRecent] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user?.id) return undefined;

    setLoadingData(true);
    Promise.all([
      supabase
        .from('recently_viewed')
        .select('content_type, content_id, content_label, viewed_at')
        .eq('user_id', user.id)
        .order('viewed_at', { ascending: false }),
      supabase
        .from('saved_items')
        .select('content_type, content_id, content_label, saved_at')
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false }),
    ])
      .then(([recentRes, savedRes]) => {
        if (!active) return;
        if (recentRes.error) console.error('SpaceTec my-space recently_viewed failed:', recentRes.error);
        if (savedRes.error) console.error('SpaceTec my-space saved_items failed:', savedRes.error);
        setRecent(recentRes.data || []);
        setSaved(savedRes.data || []);
      })
      .catch((err) => {
        if (!active) return;
        console.error('SpaceTec my-space load failed:', err);
      })
      .finally(() => {
        if (active) setLoadingData(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  // Simple activity-frequency logic — no ML, no scoring model. Count how
  // often each content_type shows up in recently_viewed and take the top 3.
  const typeCounts = recent.reduce((acc, row) => {
    acc[row.content_type] = (acc[row.content_type] || 0) + 1;
    return acc;
  }, {});
  const interests = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([contentType]) => contentType);

  const exploredCount = recent.length;
  const exploredByType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  const handleUnsave = async (item) => {
    setSaved((current) => current.filter((s) => !(s.content_type === item.content_type && s.content_id === item.content_id)));
    await unsaveItem(user.id, item.content_type, item.content_id);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#000000',
        fontFamily: '"Space Grotesk", -apple-system, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.4rem 1.75rem',
          borderBottom: '1px solid rgba(255,255,255,0.09)',
        }}
      >
        <button
          type="button"
          onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <span style={{ fontSize: '0.85rem' }} className="spacetec-wordmark">SPACETEC</span>
        </button>
        <span style={{ color: '#71717a', fontSize: '0.62rem', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}>
          My Space
        </span>
        <button
          type="button"
          onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', color: '#71717a', fontSize: '0.68rem', letterSpacing: '1px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          [← BACK TO MAIN]
        </button>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ padding: '2rem 1.5rem 4rem' }}
      >
        {/* 1. ACCOUNT */}
        <section style={{ ...sectionStyle, paddingTop: '0.4rem' }}>
          <p style={sectionTitleStyle}>Account</p>
          <h1 style={{ color: '#fff', fontSize: '1.5rem', margin: '0 0 0.35rem', fontWeight: 700 }}>
            {profile?.display_name || 'SpaceTec Member'}
          </h1>
          <p style={{ color: '#71717a', fontSize: '0.8rem', margin: 0 }}>{user?.email}</p>
          {profile?.created_at && (
            <p style={{ color: '#52525b', fontSize: '0.7rem', margin: '0.5rem 0 0', letterSpacing: '0.5px' }}>
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </p>
          )}
        </section>

        {/* 2. RECENTLY EXPLORED */}
        <section style={sectionStyle}>
          <p style={sectionTitleStyle}>Recently Explored</p>
          {loadingData ? (
            <p style={emptyStyle}>Loading…</p>
          ) : recent.length === 0 ? (
            <p style={emptyStyle}>Nothing explored yet — browse SpaceTec and it&apos;ll show up here.</p>
          ) : (
            <div>
              {recent.slice(0, 8).map((item) => (
                <div key={`${item.content_type}-${item.content_id}`} style={rowStyle}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                    <span style={{ color: '#e4e4e7', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.content_label}
                    </span>
                    <span style={{ color: '#52525b', fontSize: '0.65rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      {typeLabel(item.content_type)}
                    </span>
                  </div>
                  <span style={{ color: '#52525b', fontSize: '0.68rem', flexShrink: 0 }}>{timeAgo(item.viewed_at)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 3. SAVED */}
        <section style={sectionStyle}>
          <p style={sectionTitleStyle}>Saved</p>
          {loadingData ? (
            <p style={emptyStyle}>Loading…</p>
          ) : saved.length === 0 ? (
            <p style={emptyStyle}>Nothing saved yet.</p>
          ) : (
            <div>
              {saved.map((item) => (
                <div key={`${item.content_type}-${item.content_id}`} style={rowStyle}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                    <span style={{ color: '#e4e4e7', fontSize: '0.82rem' }}>{item.content_label}</span>
                    <span style={{ color: '#52525b', fontSize: '0.65rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      {typeLabel(item.content_type)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnsave(item)}
                    style={{ background: 'none', border: 'none', color: '#71717a', fontSize: '0.65rem', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. YOUR INTERESTS */}
        <section style={sectionStyle}>
          <p style={sectionTitleStyle}>Your Interests</p>
          {interests.length === 0 ? (
            <p style={emptyStyle}>Explore SpaceTec a bit more and we&apos;ll pick up on what you&apos;re into.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {interests.map((contentType) => (
                <span key={contentType} style={pillStyle}>{typeLabel(contentType)}</span>
              ))}
            </div>
          )}
        </section>

        {/* 5. RECOMMENDED FOR YOU */}
        <section style={sectionStyle}>
          <p style={sectionTitleStyle}>Recommended For You</p>
          {interests.length === 0 ? (
            <p style={emptyStyle}>Recommendations will appear here as you explore.</p>
          ) : (
            <div>
              {interests.map((contentType) => (
                <div key={contentType} style={rowStyle}>
                  <span style={{ color: '#e4e4e7', fontSize: '0.82rem' }}>More {typeLabel(contentType)}</span>
                  <button
                    type="button"
                    onClick={() => router.push(typeRoute(contentType))}
                    style={{ background: 'none', border: 'none', color: '#a1a1aa', fontSize: '0.68rem', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                  >
                    Explore →
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 6. ACTIVITY */}
        <section style={sectionStyle}>
          <p style={sectionTitleStyle}>Activity</p>
          <div style={rowStyle}>
            <span style={{ color: '#e4e4e7', fontSize: '0.82rem' }}>Items Explored</span>
            <span style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 700 }}>{exploredCount}</span>
          </div>
          {exploredByType.map(([contentType, count]) => (
            <div key={contentType} style={rowStyle}>
              <span style={{ color: '#a1a1aa', fontSize: '0.78rem' }}>{typeLabel(contentType)} Explored</span>
              <span style={{ color: '#e4e4e7', fontSize: '0.78rem' }}>{count}</span>
            </div>
          ))}
        </section>

        {/* 7. LOG OUT */}
        <section style={{ ...sectionStyle, borderBottom: 'none', paddingBottom: 0 }}>
          <button
            type="button"
            onClick={handleSignOut}
            style={{
              width: '100%',
              maxWidth: '220px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              padding: '0.85rem',
              fontSize: '0.7rem',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Log Out
          </button>
        </section>
      </motion.div>
    </main>
  );
}

export default function MySpacePage() {
  return (
    <RequireAuth title="Sign In To Continue" message="Sign in to view My Space.">
      <MySpaceContent />
    </RequireAuth>
  );
}
