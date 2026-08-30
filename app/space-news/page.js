'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const POLL_INTERVAL_MS = 3 * 60 * 1000;
const ENTER_DELAY_MS = 2000;

const CATEGORIES = [
  'ALL', 'LAUNCHES', 'MISSIONS', 'ROCKETS', 'SATELLITES',
  'ASTRONOMY', 'AGENCIES', 'SPACE WEATHER', 'SCIENCE', 'INDUSTRY',
];

function formatPublished(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const time = d.toISOString().substring(11, 16);
  return `${day} · ${time} UTC`;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff) || diff < 0) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'JUST NOW';
  if (mins < 60) return `${mins}M AGO`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}H AGO`;
  return `${Math.floor(hrs / 24)}D AGO`;
}

function ArticleCard({ article, featured }) {
  return (
    <article className={`sn-card${featured ? ' sn-card-featured' : ''}`}>
      <div className="sn-card-meta">
        <span className="sn-source">{article.source}</span>
        <span className="sn-dot-sep" />
        <span className="sn-category">{article.category}</span>
        {article.breaking && <span className="sn-breaking-tag">IMPORTANT</span>}
      </div>

      <h3 className="sn-headline">{article.headline}</h3>

      <div className="sn-timestamp">
        {formatPublished(article.publishedAt)}
        {article.publishedAt && <span className="sn-ago"> · {timeAgo(article.publishedAt)}</span>}
      </div>

      {article.summary && <p className="sn-summary">{article.summary}</p>}

      <div className="sn-card-footer">
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="sn-read-link">
          READ FULL STORY →
        </a>
        {article.relatedFeature && (
          <a href={article.relatedFeature.href} className="sn-related-link">
            {article.relatedFeature.label}
          </a>
        )}
      </div>
    </article>
  );
}

export default function SpaceNewsPage() {
  const [entered, setEntered] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [articles, setArticles] = useState([]);
  const [status, setStatus] = useState('ACQUIRING'); // ACQUIRING | LIVE | DELAYED | ERROR
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [query, setQuery] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    const shrinkTimer = setTimeout(() => {
      setShowIntro(false);
      setEntered(true);
    }, ENTER_DELAY_MS);
    return () => clearTimeout(shrinkTimer);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/space-news', { cache: 'no-store' });
      const json = await res.json();
      if (!mounted.current) return;
      if (!res.ok || !Array.isArray(json.articles)) {
        setStatus('ERROR');
        return;
      }
      setArticles(json.articles);
      setLastUpdate(new Date());
      setStatus('LIVE');
    } catch (err) {
      console.error('Space news fetch failed:', err);
      if (!mounted.current) return;
      setStatus('ERROR');
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [load]);

  const breakingArticles = useMemo(
    () => articles.filter((a) => a.breaking).slice(0, 3),
    [articles]
  );

  const featured = articles[0] ?? null;

  const filtered = useMemo(() => {
    const rest = featured ? articles.slice(1) : articles;
    const q = query.trim().toLowerCase();
    return rest.filter((a) => {
      const matchesCategory = activeCategory === 'ALL' || a.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        a.headline.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.summary || '').toLowerCase().includes(q)
      );
    });
  }, [articles, featured, activeCategory, query]);

  const showFeatured = featured && activeCategory === 'ALL' && !query.trim();

  return (
    <main className="sn-page">
      <div className="sn-stars" />

      <header className="sn-header">
        <div className="sn-brand-slot">
          <button
            type="button"
            className="sn-brand-link"
            onClick={() => { if (entered) window.location.href = '/'; }}
            style={{ pointerEvents: entered ? 'auto' : 'none' }}
          >
            <motion.span
              layoutId="sn-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="sn-brand-text"
            >
              SPACETEC
            </motion.span>
          </button>
        </div>

        <div className="sn-header-status" style={{ opacity: entered ? 1 : 0, transition: 'opacity 0.6s ease' }}>
          <span className={`sn-dot ${status.toLowerCase()}`} />
          {status === 'LIVE' ? 'LIVE FEED' : status === 'ACQUIRING' ? 'ACQUIRING' : status === 'ERROR' ? 'FEED ERROR' : 'DATA DELAYED'}
        </div>
        <button
          type="button"
          className="sn-back"
          onClick={() => { window.location.href = '/'; }}
          style={{ opacity: entered ? 1 : 0, transition: 'opacity 0.6s ease', pointerEvents: entered ? 'auto' : 'none' }}
        >
          [← BACK TO MAIN]
        </button>
      </header>

      {/* ENTRY TRANSITION: SPACETEC -> SPACE NEWS -> SPACETEC (matches other SpaceTec sub-pages) */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="sn-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              backgroundColor: '#000000', padding: '2rem',
            }}
          >
            <motion.div
              layoutId="sn-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              initial={{ scale: 0.9, letterSpacing: '0.12em' }}
              animate={{ scale: 1, letterSpacing: '0.22em' }}
            >
              <h1 style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff' }}>
                SPACE NEWS
              </h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              style={{ fontSize: 'calc(0.7rem + 0.3vw)', letterSpacing: '12px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '500' }}
            >
              CONNECTING TO NEWS NETWORK...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sn-content">
        <section className="sn-hero">
          <span className="sn-kicker">SPACETEC NEWS &amp; UPDATES</span>
          <h1>SPACE NEWS</h1>
          <p>Latest developments across launches, missions, spacecraft, astronomy and the global space industry.</p>

          <div className="sn-status-line">
            <span>LAST UPDATED</span>
            <b>{lastUpdate ? lastUpdate.toISOString().substring(11, 19) + ' UTC' : '--:--:--'}</b>
          </div>
        </section>

        {breakingArticles.length > 0 && (
          <section className="sn-breaking">
            <span className="sn-kicker sn-kicker-alert">BREAKING / IMPORTANT</span>
            <div className="sn-breaking-list">
              {breakingArticles.map((a) => (
                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="sn-breaking-item">
                  <span className="sn-source">{a.source}</span>
                  <span className="sn-breaking-headline">{a.headline}</span>
                  <span className="sn-read-link">READ FULL STORY →</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="sn-controls">
          <div className="sn-search">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Space News..."
            />
          </div>
          <div className="sn-filters">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`sn-filter-btn${activeCategory === cat ? ' active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {showFeatured && (
          <section className="sn-featured-section">
            <span className="sn-kicker">FEATURED</span>
            <ArticleCard article={featured} featured />
          </section>
        )}

        <section className="sn-feed">
          <span className="sn-kicker">LATEST</span>

          {status === 'ERROR' && articles.length === 0 && (
            <div className="sn-empty">NEWS DATA TEMPORARILY UNAVAILABLE</div>
          )}

          {status !== 'ERROR' && filtered.length === 0 && (
            <div className="sn-empty">NO RECENT STORIES AVAILABLE</div>
          )}

          <div className="sn-grid">
            {filtered.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      </div>

      <style jsx global>{`
        .sn-page {
          min-height: 100vh;
          width: 100%;
          background: #000000;
          color: #fff;
          font-family: 'Space Grotesk', sans-serif;
        }

        .sn-stars {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.3;
          z-index: 0;
          background-image: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0 1px, transparent 1.2px),
            radial-gradient(circle, rgba(255, 255, 255, 0.5) 0 1px, transparent 1.2px);
          background-size: 97px 97px, 157px 157px;
          background-position: 10px 20px, 50px 70px;
        }

        .sn-header {
          position: sticky;
          top: 0;
          z-index: 20;
          height: 68px;
          padding: 0 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .sn-brand-link {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }

        .sn-back {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: #fff;
          padding: 0.6rem 1.1rem;
          cursor: pointer;
          font-size: 0.68rem;
          letter-spacing: 1.5px;
          font-weight: 700;
          text-transform: uppercase;
          font-family: inherit;
        }
        .sn-back:hover {
          background: rgba(255, 255, 255, 0.14);
        }

        .sn-brand-text {
          display: inline-block;
          color: #fff;
          font-weight: 800;
          font-size: 1rem;
          letter-spacing: 3px;
          text-transform: uppercase;
        }

        .sn-header-status {
          min-width: 110px;
          text-align: right;
          color: #64748b;
          font: 600 0.58rem/1 monospace;
          letter-spacing: 2px;
        }

        .sn-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          margin-right: 7px;
          background: #64748b;
        }

        .sn-dot.live {
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.7);
        }

        .sn-dot.delayed, .sn-dot.error {
          background: #eab308;
          box-shadow: 0 0 8px rgba(234, 179, 8, 0.6);
        }

        .sn-content {
          position: relative;
          z-index: 5;
          max-width: 1240px;
          margin: 0 auto;
          padding: 60px 30px 90px;
        }

        .sn-kicker {
          display: block;
          color: #64748b;
          font: 700 0.62rem/1.4 monospace;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .sn-kicker-alert {
          color: #ef4444;
        }

        .sn-hero {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 36px;
          margin-bottom: 40px;
        }

        .sn-hero h1 {
          margin: 10px 0 18px;
          color: #f8fafc;
          font: 800 3.4rem/0.95 'Space Grotesk', sans-serif;
          letter-spacing: -2px;
        }

        .sn-hero p {
          max-width: 720px;
          color: #a1a1aa;
          font-size: 0.95rem;
          line-height: 1.6;
        }

        .sn-status-line {
          margin-top: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
          font: 700 0.72rem/1 monospace;
          letter-spacing: 1.5px;
        }

        .sn-status-line span {
          color: #64748b;
        }

        .sn-status-line b {
          color: #dbe4ef;
          font-size: 0.72rem;
        }

        .sn-breaking {
          border: 1px solid rgba(239, 68, 68, 0.35);
          padding: 20px 22px;
          margin-bottom: 40px;
        }

        .sn-breaking-list {
          display: flex;
          flex-direction: column;
        }

        .sn-breaking-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 10px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          text-decoration: none;
        }

        .sn-breaking-item:first-child {
          border-top: none;
        }

        .sn-breaking-headline {
          flex: 1;
          color: #f1f5f9;
          font: 700 0.85rem/1.3 'Space Grotesk', sans-serif;
        }

        .sn-controls {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 24px 0;
          margin-bottom: 40px;
        }

        .sn-search {
          margin-bottom: 16px;
        }

        .sn-search input {
          width: 100%;
          max-width: 420px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #fff;
          padding: 10px 14px;
          font: 500 0.8rem 'Space Grotesk', sans-serif;
          letter-spacing: 0.4px;
        }

        .sn-search input::placeholder {
          color: #52525b;
        }

        .sn-search input:focus {
          outline: none;
          border-color: rgba(56, 189, 248, 0.5);
        }

        .sn-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .sn-filter-btn {
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #a1a1aa;
          padding: 7px 14px;
          font: 700 0.62rem/1 monospace;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          cursor: pointer;
          transition: border-color 0.2s ease, color 0.2s ease;
        }

        .sn-filter-btn:hover {
          color: #fff;
          border-color: rgba(255, 255, 255, 0.3);
        }

        .sn-filter-btn.active {
          color: #38bdf8;
          border-color: rgba(56, 189, 248, 0.5);
        }

        .sn-featured-section {
          margin-bottom: 40px;
        }

        .sn-feed {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 24px;
        }

        .sn-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .sn-card {
          background: #000000;
          padding: 22px 22px 20px;
          display: flex;
          flex-direction: column;
        }

        .sn-card-featured {
          background: #000000;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 28px;
        }

        .sn-card-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          color: #64748b;
          font: 700 0.6rem/1 monospace;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .sn-source {
          color: #dbe4ef;
        }

        .sn-dot-sep {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #64748b;
        }

        .sn-category {
          color: #38bdf8;
        }

        .sn-breaking-tag {
          margin-left: auto;
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.4);
          padding: 2px 6px;
        }

        .sn-headline {
          margin: 0 0 8px;
          color: #f8fafc;
          font: 700 1.05rem/1.3 'Space Grotesk', sans-serif;
        }

        .sn-card-featured .sn-headline {
          font-size: 1.5rem;
        }

        .sn-timestamp {
          color: #52525b;
          font: 600 0.6rem/1 monospace;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }

        .sn-ago {
          color: #3f3f46;
        }

        .sn-summary {
          color: #a1a1aa;
          font-size: 0.82rem;
          line-height: 1.6;
          margin: 0 0 16px;
          flex: 1;
        }

        .sn-card-footer {
          display: flex;
          align-items: center;
          gap: 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 14px;
        }

        .sn-read-link {
          color: #38bdf8;
          text-decoration: none;
          font: 700 0.65rem/1 monospace;
          letter-spacing: 1px;
        }

        .sn-read-link:hover {
          text-decoration: underline;
        }

        .sn-related-link {
          color: #64748b;
          text-decoration: none;
          font: 600 0.6rem/1 monospace;
          letter-spacing: 1px;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          padding-left: 18px;
        }

        .sn-related-link:hover {
          color: #fff;
        }

        .sn-empty {
          padding: 40px 0;
          color: #52525b;
          font: 700 0.75rem/1 monospace;
          letter-spacing: 1.5px;
          text-align: center;
          border: 1px dashed rgba(255, 255, 255, 0.08);
        }

        @media (max-width: 900px) {
          .sn-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .sn-brand-slot,
          .sn-header-status {
            min-width: 0;
            font-size: 0.5rem;
          }

          .sn-brand-text {
            font-size: 0.85rem;
            letter-spacing: 4px;
          }

          .sn-hero h1 {
            font-size: 2.4rem;
          }
        }
      `}</style>
    </main>
  );
}
