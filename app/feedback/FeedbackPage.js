'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import { useAuth } from '../lib/AuthContext';

const ENTER_DELAY_MS = 2000;

const CATEGORY_OPTIONS = [
  'GENERAL', 'FEATURE REQUEST', 'UI / DESIGN', 'BUG', 'DATA / INFORMATION', 'PERFORMANCE', 'OTHER',
];

const FEATURE_OPTIONS = [
  'Live Telemetry / Satellite Tracker', 'Agencies', 'Launchpads', 'ISS Tracker',
  'Satellite Database', 'Rocket Database', 'Mission Database', 'Astronaut Database',
  'Spacecraft Database', 'Celestial Database', 'Space Weather', 'Astronomy Tonight',
  'Space News', 'Space Statistics', 'About SpaceTec', 'Other',
];

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="fb-stars" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="fb-star"
          aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
          aria-pressed={value === n}
          onMouseEnter={() => setHovered(n)}
          onFocus={() => setHovered(n)}
          onBlur={() => setHovered(0)}
          onClick={() => onChange(n)}
        >
          {display >= n ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const { user, profile, loading: authLoading, openAuthModal, rememberIntent } = useAuth();

  const [entered, setEntered] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('');
  const [feature, setFeature] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitState, setSubmitState] = useState(null); // 'submitting' | 'success' | 'error' | null
  const submittingRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setShowIntro(false);
      setEntered(true);
    }, ENTER_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // If a visitor lands here logged out and goes on to create an account,
  // this is what sends them back to /feedback once email confirmation
  // completes (see AuthContext's resumeIntent).
  useEffect(() => {
    if (!authLoading && !user) {
      rememberIntent({ type: 'route', path: '/feedback' });
    }
  }, [authLoading, user, rememberIntent]);

  const goHome = () => { window.location.href = '/'; };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;

    setFormError(null);
    if (rating < 1) {
      setFormError('Please select a rating.');
      return;
    }
    if (!category) {
      setFormError('Please choose a feedback category.');
      return;
    }
    if (!message.trim()) {
      setFormError('Please enter your feedback.');
      return;
    }

    submittingRef.current = true;
    setSubmitState('submitting');

    try {
      // user_id is intentionally NOT sent — a database trigger fills it in
      // from the authenticated session server-side (see
      // supabase/feedback_schema.sql), so the browser can never spoof it.
      const { error } = await supabase.from('feedback').insert({
        rating,
        category,
        feature: feature || null,
        message: message.trim(),
      });

      if (error) throw error;

      setSubmitState('success');
      setRating(0);
      setCategory('');
      setFeature('');
      setMessage('');
    } catch (err) {
      console.error('SpaceTec feedback submit failed:', err);
      setSubmitState('error');
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <main className="fb-page">
      <div className="fb-stars-bg" />

      <header className="fb-header">
        <div className="fb-brand-slot">
          <button
            type="button"
            className="fb-brand-link"
            onClick={() => { if (entered) goHome(); }}
            style={{ pointerEvents: entered ? 'auto' : 'none' }}
          >
            <motion.span
              layoutId="fb-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="fb-brand-text"
            >
              SPACETEC
            </motion.span>
          </button>
        </div>

        <div className="fb-header-tag" style={{ opacity: entered ? 1 : 0, transition: 'opacity 0.6s ease' }}>
          FEEDBACK
        </div>

        <button
          type="button"
          className="fb-back"
          onClick={goHome}
          style={{ opacity: entered ? 1 : 0, transition: 'opacity 0.6s ease', pointerEvents: entered ? 'auto' : 'none' }}
        >
          [← BACK TO MAIN]
        </button>
      </header>

      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="fb-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="fb-intro-screen"
          >
            <motion.div
              layoutId="fb-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              initial={{ scale: 0.9, letterSpacing: '0.12em' }}
              animate={{ scale: 1, letterSpacing: '0.22em' }}
            >
              <h1 className="fb-intro-title">SPACETEC</h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="fb-intro-tagline"
            >
              FEEDBACK
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="fb-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: entered ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      >
        <span className="fb-kicker">FEEDBACK</span>
        <h1 className="fb-title">Help improve SpaceTec.</h1>

        {authLoading ? (
          <p className="fb-loading">Loading session…</p>
        ) : !user ? (
          <div className="fb-gate">
            <p className="fb-gate-title">FEEDBACK REQUIRES AN ACCOUNT</p>
            <p className="fb-gate-sub">Please sign in to send feedback.</p>
            <button type="button" className="fb-primary-btn" onClick={() => openAuthModal('signin')}>
              Sign In
            </button>
          </div>
        ) : (
          <>
            <p className="fb-signed-in">
              SIGNED IN AS<br />
              <span>{profile?.display_name || 'SpaceTec Member'}</span>
            </p>

            <form onSubmit={handleSubmit} className="fb-form">
              <div className="fb-field">
                <label className="fb-label">HOW WOULD YOU RATE SPACETEC?</label>
                <StarRating value={rating} onChange={setRating} />
              </div>

              <div className="fb-field">
                <label className="fb-label" htmlFor="fb-category">FEEDBACK CATEGORY</label>
                <select
                  id="fb-category"
                  className="fb-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">— Select a category —</option>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="fb-field">
                <label className="fb-label" htmlFor="fb-message">YOUR FEEDBACK</label>
                <textarea
                  id="fb-message"
                  className="fb-textarea"
                  rows={5}
                  placeholder="Tell us what you think about SpaceTec…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="fb-field">
                <label className="fb-label" htmlFor="fb-feature">FEATURE / PAGE (OPTIONAL)</label>
                <select
                  id="fb-feature"
                  className="fb-select"
                  value={feature}
                  onChange={(e) => setFeature(e.target.value)}
                >
                  <option value="">— Not specific to one feature —</option>
                  {FEATURE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {formError && <p className="fb-message-error">{formError}</p>}
              {submitState === 'success' && (
                <p className="fb-message-success">FEEDBACK RECEIVED — Thank you for helping improve SpaceTec.</p>
              )}
              {submitState === 'error' && (
                <p className="fb-message-error">COULD NOT SEND FEEDBACK — please try again.</p>
              )}

              <button
                type="submit"
                className="fb-primary-btn"
                disabled={submitState === 'submitting'}
                style={{ opacity: submitState === 'submitting' ? 0.6 : 1, cursor: submitState === 'submitting' ? 'default' : 'pointer' }}
              >
                {submitState === 'submitting' ? 'SUBMITTING…' : 'SUBMIT FEEDBACK'}
              </button>
            </form>
          </>
        )}
      </motion.div>

      <style jsx global>{`
        .fb-page {
          position: relative; min-height: 100vh; width: 100%;
          background: #000000; color: #fff; font-family: 'Space Grotesk', -apple-system, sans-serif;
        }
        .fb-stars-bg {
          position: fixed; inset: 0; pointer-events: none; opacity: 0.3; z-index: 0;
          background-image: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0 1px, transparent 1.2px),
            radial-gradient(circle, rgba(255, 255, 255, 0.5) 0 1px, transparent 1.2px);
          background-size: 97px 97px, 157px 157px;
          background-position: 10px 20px, 50px 70px;
        }
        .fb-header {
          position: sticky; top: 0; z-index: 20; height: 68px; padding: 0 30px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: #000000;
        }
        .fb-brand-slot { display: flex; align-items: center; min-width: 180px; }
        .fb-brand-link { border: 0; background: transparent; cursor: pointer; padding: 0; }
        .fb-brand-text {
          display: inline-block; color: #ffffff; font-weight: 900; font-size: 1.25rem;
          letter-spacing: 8px; text-transform: uppercase; white-space: nowrap;
        }
        .fb-header-tag { color: #64748b; font-size: 0.7rem; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; }
        .fb-back {
          background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.3); color: #fff;
          padding: 0.6rem 1.1rem; cursor: pointer; font-size: 0.7rem; letter-spacing: 2px; font-weight: 700;
          text-transform: uppercase; font-family: inherit; min-width: 150px; text-align: right;
        }
        .fb-back:hover { background: rgba(255, 255, 255, 0.15); }

        .fb-intro-screen {
          position: fixed; inset: 0; z-index: 9999; display: flex; flex-direction: column;
          justify-content: center; align-items: center; background: #000000; padding: 2rem;
        }
        .fb-intro-title { font-size: calc(3.5rem + 4vw); font-weight: 900; margin: 0; text-transform: uppercase; color: #ffffff; }
        .fb-intro-tagline {
          font-size: calc(0.7rem + 0.3vw); letter-spacing: 12px; color: #ffffff; text-transform: uppercase;
          margin-top: 1.5rem; font-weight: 500; text-align: center;
        }

        .fb-content {
          position: relative; z-index: 3; max-width: 560px; margin: 0 auto;
          padding: 4rem 2rem 8rem; box-sizing: border-box;
        }
        .fb-kicker { display: inline-block; color: #71717a; font-size: 0.68rem; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; }
        .fb-title { margin: 0.8rem 0 2rem; font-size: clamp(1.5rem, 3vw, 2.1rem); font-weight: 800; color: #f8fafc; }

        .fb-loading { color: #71717a; font-size: 0.75rem; letter-spacing: 2px; text-transform: uppercase; }

        .fb-gate {
          border: 1px solid rgba(255,255,255,0.15); padding: 2rem; text-align: center;
        }
        .fb-gate-title { color: #fff; font-size: 0.95rem; font-weight: 800; letter-spacing: 1.5px; margin: 0 0 0.5rem; text-transform: uppercase; }
        .fb-gate-sub { color: #a1a1aa; font-size: 0.85rem; margin: 0 0 1.5rem; }

        .fb-signed-in {
          color: #71717a; font-size: 0.65rem; letter-spacing: 2px; text-transform: uppercase;
          margin: 0 0 2.2rem; line-height: 1.8;
        }
        .fb-signed-in span { color: #f8fafc; font-size: 0.95rem; letter-spacing: 0.5px; text-transform: none; font-weight: 700; }

        .fb-form { display: flex; flex-direction: column; gap: 1.6rem; }
        .fb-field { display: flex; flex-direction: column; gap: 0.6rem; }
        .fb-label { color: #71717a; font-size: 0.65rem; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; }

        .fb-stars { display: flex; gap: 0.4rem; }
        .fb-star {
          background: none; border: none; color: #71717a; font-size: 1.8rem; line-height: 1;
          cursor: pointer; padding: 0.15rem; transition: color 0.15s ease;
        }
        .fb-star:hover, .fb-star:focus-visible { color: #f8fafc; }
        .fb-star:focus-visible { outline: 1px solid rgba(255,255,255,0.4); outline-offset: 2px; }

        .fb-select, .fb-textarea {
          width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 0.8rem 0.9rem;
          font-size: 0.85rem; font-family: inherit; outline: none;
        }
        .fb-select:focus, .fb-textarea:focus { border-color: rgba(255,255,255,0.45); }
        .fb-textarea { resize: vertical; min-height: 120px; }
        .fb-select { cursor: pointer; }

        .fb-message-error { color: #f87171; font-size: 0.75rem; margin: 0; }
        .fb-message-success { color: #4ade80; font-size: 0.75rem; margin: 0; }

        .fb-primary-btn {
          width: 100%; background: #ffffff; border: none; color: #000; padding: 0.95rem;
          font-size: 0.75rem; letter-spacing: 2px; text-transform: uppercase; font-weight: 800;
          font-family: inherit; cursor: pointer;
        }

        @media (max-width: 720px) {
          .fb-header { padding: 0 1.1rem; }
          .fb-header-tag { display: none; }
          .fb-content { padding: 3rem 1.1rem 6rem; }
        }
      `}</style>
    </main>
  );
}
