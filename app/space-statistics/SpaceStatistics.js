'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CelestialBackground from '../celestial-database/CelestialBackground';
import { fetchSpaceStatistics } from './statisticsData';
import {
  formatNumber,
  formatPercent,
  entriesToChartData,
  analyzeTrend,
  analyzeDominantShare,
  analyzeSuccessRate,
} from './statisticsUtils';
import BarChart from './charts/BarChart';
import LineChart from './charts/LineChart';
import DonutChart from './charts/DonutChart';

const ENTER_DELAY_MS = 2000;

function StatCard({ value, label }) {
  return (
    <div className="stat-overview-card">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function AnalysisNote({ children }) {
  return (
    <div className="stat-analysis">
      <span className="stat-analysis-kicker">ANALYSIS</span>
      <p>{children}</p>
    </div>
  );
}

function DataTableToggle({ columns, rows }) {
  const [open, setOpen] = useState(false);
  if (!rows || rows.length === 0) return null;
  return (
    <div className="stat-table-wrap">
      <button type="button" className="stat-table-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? 'HIDE DATA TABLE ▲' : 'VIEW DATA TABLE ▼'}
      </button>
      {open && (
        <table className="stat-table">
          <thead>
            <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Section({ kicker, title, children }) {
  return (
    <section className="stat-section">
      <span className="stat-kicker">{kicker}</span>
      <h2>{title}</h2>
      <div className="stat-section-body">{children}</div>
    </section>
  );
}

function Panel({ title, children, wide }) {
  return (
    <div className={`stat-panel ${wide ? 'stat-panel-wide' : ''}`}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function Unavailable({ reason }) {
  return <div className="stat-chart-empty">{reason || 'DATA UNAVAILABLE'}</div>;
}

const YEAR_RANGE_OPTIONS = [
  { id: 'ALL', label: 'ALL TIME', years: null },
  { id: '10Y', label: 'LAST 10 YEARS', years: 10 },
  { id: '5Y', label: 'LAST 5 YEARS', years: 5 },
];

function filterByYearRange(entries, rangeId) {
  if (!entries || entries.length === 0) return entries;
  const option = YEAR_RANGE_OPTIONS.find((o) => o.id === rangeId);
  if (!option || !option.years) return entries;
  const maxYear = Math.max(...entries.map(([y]) => parseInt(y, 10)));
  const minYear = maxYear - option.years + 1;
  return entries.filter(([y]) => parseInt(y, 10) >= minYear);
}

export default function SpaceStatistics() {
  const [entered, setEntered] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [yearRange, setYearRange] = useState('ALL');

  useEffect(() => {
    const shrinkTimer = setTimeout(() => {
      setShowIntro(false);
      setEntered(true);
    }, ENTER_DELAY_MS);
    return () => clearTimeout(shrinkTimer);
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchSpaceStatistics()
      .then((json) => { if (mounted) setData(json); })
      .catch((err) => { if (mounted) setError(err.message); });
    return () => { mounted = false; };
  }, []);

  const launchesByYear = useMemo(
    () => (data?.launches?.available ? filterByYearRange(data.launches.byYear, yearRange) : []),
    [data, yearRange]
  );
  const missionsByYear = useMemo(
    () => (data?.missions?.available ? filterByYearRange(data.missions.byYear, yearRange) : []),
    [data, yearRange]
  );

  return (
    <main className="stat-page">
      <CelestialBackground />

      <header className="stat-header">
        <div className="stat-brand-slot">
          <button
            type="button"
            className="stat-brand-link"
            onClick={() => { if (entered) window.location.href = '/'; }}
            style={{ pointerEvents: entered ? 'auto' : 'none' }}
          >
            <motion.span
              layoutId="stat-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="stat-brand-text"
            >
              SPACETEC
            </motion.span>
          </button>
        </div>
        <button
          type="button"
          className="stat-back-btn"
          onClick={() => { window.location.href = '/'; }}
          style={{ opacity: entered ? 1 : 0, pointerEvents: entered ? 'auto' : 'none', transition: 'opacity 0.6s ease' }}
        >
          [← BACK TO MAIN]
        </button>
      </header>

      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="stat-intro"
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
              layoutId="stat-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              initial={{ scale: 0.9, letterSpacing: '0.12em' }}
              animate={{ scale: 1, letterSpacing: '0.22em' }}
            >
              <h1 style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff' }}>
                SPACETEC
              </h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              style={{ fontSize: 'calc(0.7rem + 0.3vw)', letterSpacing: '12px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '500' }}
            >
              CONNECTING TO SPACE STATISTICS...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="stat-content">
        <section className="stat-hero">
          <span className="stat-kicker">SPACETEC ANALYTICS</span>
          <h1>SPACE STATISTICS</h1>
          <p>Aggregated statistics, trends, and cross-database analysis drawn live from SpaceTec&apos;s existing Mission, Astronaut, Rocket, Launch, and Satellite databases.</p>
        </section>

        {error && <div className="stat-chart-empty" style={{ marginBottom: '32px' }}>UNABLE TO LOAD STATISTICS ({error})</div>}

        {!data && !error && (
          <div className="stat-chart-empty" style={{ marginBottom: '32px' }}>LOADING DATASETS...</div>
        )}

        {data && (
          <>
            {/* ============================ OVERVIEW ============================ */}
            <section className="stat-overview">
              <StatCard value={data.satellites.available ? formatNumber(data.satellites.total) : 'N/A'} label="TOTAL SATELLITES" />
              <StatCard value={data.satellites.available ? formatNumber(data.satellites.total) : 'N/A'} label="ACTIVE SATELLITES" />
              <StatCard value={formatNumber(data.missions.total)} label="TOTAL MISSIONS" />
              <StatCard value={formatNumber(data.missions.byStatus.find(([s]) => s === 'ACTIVE')?.[1] || 0)} label="ACTIVE MISSIONS" />
              <StatCard value={formatNumber(data.astronauts.total)} label="TOTAL ASTRONAUTS" />
              <StatCard value={data.rockets.available ? formatNumber(data.rockets.totalInCatalog) : 'N/A'} label="ROCKETS IN CATALOG" />
              <StatCard value={data.launches.available ? formatNumber(data.launches.distinctPadCount) : 'N/A'} label="LAUNCH SITES RECORDED" />
              <StatCard value={formatNumber(data.missions.distinctSpacecraft)} label="SPACECRAFT REFERENCED" />
            </section>
            {data.satellites.available && (
              <p className="stat-footnote">
                Satellite figures reflect CelesTrak&apos;s active-satellite catalog only; the tracking database does not retain inactive/decayed objects, so an active-vs-inactive split cannot be shown.
              </p>
            )}

            {/* ========================= LAUNCH STATISTICS ======================= */}
            <Section kicker="LAUNCH DATABASE" title="Launch Statistics">
              {data.launches.available ? (
                <>
                  <div className="stat-filter-row">
                    <span className="stat-kicker" style={{ margin: 0 }}>TIME RANGE</span>
                    <select value={yearRange} onChange={(e) => setYearRange(e.target.value)}>
                      {YEAR_RANGE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>

                  <Panel title="LAUNCHES OVER TIME" wide>
                    <LineChart data={entriesToChartData(launchesByYear)} />
                    <AnalysisNote>{analyzeTrend(launchesByYear, 'Launch')}</AnalysisNote>
                    <DataTableToggle columns={['YEAR', 'LAUNCHES']} rows={launchesByYear.map(([y, v]) => [y, v])} />
                  </Panel>

                  <Panel title="LAUNCHES BY PROVIDER">
                    <BarChart data={entriesToChartData(data.launches.byProvider)} />
                    <AnalysisNote>{analyzeDominantShare(data.launches.byProvider, 'provider', 'launches')}</AnalysisNote>
                  </Panel>

                  <Panel title="LAUNCH STATUS">
                    <DonutChart data={entriesToChartData(data.launches.byStatus)} />
                    <AnalysisNote>{analyzeSuccessRate(data.launches.successRate, data.launches.decidedCount)}</AnalysisNote>
                  </Panel>

                  <Panel title="MOST USED LAUNCHPADS (RECORDED LAUNCHES)">
                    <BarChart data={entriesToChartData(data.launches.byPad)} />
                    <AnalysisNote>{analyzeDominantShare(data.launches.byPad, 'launchpad', 'recorded launches')}</AnalysisNote>
                  </Panel>

                  <p className="stat-footnote">
                    Rocket-level launch counts (which vehicles have flown most, and their success rates) are covered in the Rocket Statistics section below, using the Rocket Database&apos;s own recorded totals rather than this synced launch feed.
                  </p>
                </>
              ) : (
                <Unavailable reason={data.launches.reason} />
              )}
            </Section>

            {/* ======================= SATELLITE STATISTICS ====================== */}
            <Section kicker="SATELLITE TRACKING" title="Satellite Statistics">
              {data.satellites.available ? (
                <>
                  <Panel title="SATELLITES BY ORBIT CLASS">
                    <DonutChart data={entriesToChartData(data.satellites.byOrbit)} />
                    <AnalysisNote>{analyzeDominantShare(data.satellites.byOrbit, 'orbit class', 'tracked satellites')}</AnalysisNote>
                    <p className="stat-footnote">
                      Orbit class is derived from each satellite&apos;s mean motion (GEO &asymp; 1 rev/day, MEO 1&ndash;10 rev/day, LEO &ge;10 rev/day), not a stored field.
                      {!data.satellites.isFullSample && ` Based on a sample of ${formatNumber(data.satellites.sampled)} of ${formatNumber(data.satellites.total)} tracked satellites.`}
                    </p>
                  </Panel>

                  <Panel title="SATELLITES BY OPERATOR">
                    <BarChart data={entriesToChartData(data.satellites.byOperator)} />
                    <AnalysisNote>{analyzeDominantShare(data.satellites.byOperator, 'operator', 'tracked satellites')}</AnalysisNote>
                  </Panel>

                  <p className="stat-footnote">
                    SATELLITES BY COUNTRY: DATA UNAVAILABLE — country is not tracked as a separate field, only an approximate operator label.
                    <br />
                    SATELLITE POPULATION OVER TIME: DATA UNAVAILABLE — the tracking table stores only the current catalog snapshot, not historical counts.
                  </p>
                </>
              ) : (
                <Unavailable reason={data.satellites.reason} />
              )}
            </Section>

            {/* ========================= MISSION STATISTICS ====================== */}
            <Section kicker="MISSION DATABASE" title="Mission Statistics">
              <Panel title="MISSIONS OVER TIME" wide>
                <LineChart data={entriesToChartData(missionsByYear)} />
                <AnalysisNote>{analyzeTrend(missionsByYear, 'Mission')}</AnalysisNote>
                <DataTableToggle columns={['YEAR', 'MISSIONS']} rows={missionsByYear.map(([y, v]) => [y, v])} />
              </Panel>

              <Panel title="MISSIONS BY AGENCY">
                <BarChart data={entriesToChartData(data.missions.byAgency)} />
                <AnalysisNote>{analyzeDominantShare(data.missions.byAgency, 'agency', 'missions')}</AnalysisNote>
              </Panel>

              <Panel title="MISSIONS BY DESTINATION">
                <BarChart data={entriesToChartData(data.missions.byDestination)} />
                <AnalysisNote>{analyzeDominantShare(data.missions.byDestination, 'destination', 'missions')}</AnalysisNote>
              </Panel>

              <Panel title="MISSIONS BY TYPE">
                <BarChart data={entriesToChartData(data.missions.byType)} />
              </Panel>

              <Panel title="MISSION STATUS">
                <DonutChart data={entriesToChartData(data.missions.byStatus)} />
              </Panel>

              <Panel title="CREWED VS UNCREWED">
                <DonutChart data={[{ label: 'CREWED', value: data.missions.crewed }, { label: 'UNCREWED', value: data.missions.uncrewed }]} />
              </Panel>
            </Section>

            {/* ======================= ASTRONAUT STATISTICS ====================== */}
            <Section kicker="ASTRONAUT DATABASE" title="Astronaut Statistics">
              <Panel title="ASTRONAUTS BY AGENCY">
                <BarChart data={entriesToChartData(data.astronauts.byAgency)} />
                <AnalysisNote>{analyzeDominantShare(data.astronauts.byAgency, 'agency', 'astronauts')}</AnalysisNote>
              </Panel>

              <Panel title="ASTRONAUTS BY COUNTRY">
                <BarChart data={entriesToChartData(data.astronauts.byCountry)} />
              </Panel>

              <Panel title="ASTRONAUT STATUS">
                <DonutChart data={entriesToChartData(data.astronauts.byStatus)} />
              </Panel>

              <Panel title="MISSIONS PER ASTRONAUT">
                <BarChart data={entriesToChartData(data.astronauts.missionsPerAstronautDistribution)} />
                <AnalysisNote>
                  Astronauts in the database have flown {data.astronauts.avgMissionsPerAstronaut?.toFixed(1)} spaceflights on average.
                </AnalysisNote>
              </Panel>

              <Panel title="SPACEFLIGHT EXPERIENCE (EVAs)">
                <div className="stat-inline-numbers">
                  <div><b>{formatNumber(data.astronauts.totalSpacewalks)}</b><span>TOTAL RECORDED SPACEWALKS</span></div>
                  <div><b>{formatNumber(data.astronauts.astronautsWithSpacewalks)}</b><span>ASTRONAUTS WITH AN EVA</span></div>
                </div>
                <p className="stat-footnote">Cumulative EVA duration: DATA UNAVAILABLE — recorded per-mission as free text, not as a summable numeric field.</p>
              </Panel>
            </Section>

            {/* ========================= ROCKET STATISTICS ======================= */}
            <Section kicker="ROCKET DATABASE" title="Rocket Statistics">
              {data.rockets.available ? (
                <>
                  <p className="stat-footnote">
                    Based on the top {formatNumber(data.rockets.sampled)} rockets (of {formatNumber(data.rockets.totalInCatalog)} in the catalog) ranked by recorded launch count, to keep this page fast — not every rocket ever cataloged.
                  </p>

                  <Panel title="ROCKETS BY MANUFACTURER COUNTRY">
                    <BarChart data={entriesToChartData(data.rockets.byCountry)} />
                    <AnalysisNote>{analyzeDominantShare(data.rockets.byCountry, 'country', 'top rockets')}</AnalysisNote>
                  </Panel>

                  <Panel title="ROCKETS BY FAMILY">
                    <BarChart data={entriesToChartData(data.rockets.byFamily)} />
                  </Panel>

                  <Panel title="ROCKETS BY STATUS">
                    <DonutChart data={entriesToChartData(data.rockets.byStatus)} />
                  </Panel>

                  <Panel title="MOST USED ROCKETS" wide>
                    <BarChart data={entriesToChartData(data.rockets.mostUsed)} />
                  </Panel>

                  <Panel title="ROCKET SUCCESS RATE (≥5 RECORDED LAUNCHES)" wide>
                    <BarChart
                      data={data.rockets.successRates.map((r) => ({ label: r.name, value: r.rate }))}
                      valueFormatter={(v) => formatPercent(v)}
                    />
                    <p className="stat-footnote">Only rockets with at least 5 recorded launches are ranked, to avoid misleading percentages from tiny sample sizes.</p>
                  </Panel>
                </>
              ) : (
                <Unavailable reason={data.rockets.reason} />
              )}
            </Section>

            {/* ===================== CROSS-DATABASE ANALYSIS ====================== */}
            <Section kicker="CROSS-DATABASE" title="Cross-Database Analysis">
              <div className="stat-cross-grid">
                {data.crossDatabase.topLaunchProvider && (
                  <Panel title="AGENCY VS LAUNCHES">
                    <p className="stat-cross-fact">
                      <b>{data.crossDatabase.topLaunchProvider[0]}</b> leads recorded launch activity with {formatNumber(data.crossDatabase.topLaunchProvider[1])} launches.
                    </p>
                  </Panel>
                )}
                {data.crossDatabase.topMissionAgency && (
                  <Panel title="AGENCY VS MISSIONS">
                    <p className="stat-cross-fact">
                      <b>{data.crossDatabase.topMissionAgency[0]}</b> has conducted the most missions in the database ({formatNumber(data.crossDatabase.topMissionAgency[1])}).
                    </p>
                  </Panel>
                )}
                {data.crossDatabase.topMissionDestination && (
                  <Panel title="MISSION VS DESTINATION">
                    <p className="stat-cross-fact">
                      <b>{data.crossDatabase.topMissionDestination[0]}</b> is the most frequently targeted destination ({formatNumber(data.crossDatabase.topMissionDestination[1])} missions).
                    </p>
                  </Panel>
                )}
                {data.crossDatabase.topLaunchpad && (
                  <Panel title="LAUNCHPAD VS LAUNCHES">
                    <p className="stat-cross-fact">
                      <b>{data.crossDatabase.topLaunchpad[0]}</b> has hosted the most recorded launches ({formatNumber(data.crossDatabase.topLaunchpad[1])}).
                    </p>
                  </Panel>
                )}
                {data.crossDatabase.topRocket && (
                  <Panel title="ROCKETS VS LAUNCHES">
                    <p className="stat-cross-fact">
                      <b>{data.crossDatabase.topRocket[0]}</b> is the most-flown rocket in the catalog ({formatNumber(data.crossDatabase.topRocket[1])} launches).
                    </p>
                  </Panel>
                )}
                {data.crossDatabase.topRocketBySuccessRate && (
                  <Panel title="ROCKET VS SUCCESS RATE">
                    <p className="stat-cross-fact">
                      <b>{data.crossDatabase.topRocketBySuccessRate.name}</b> has the highest success rate among rockets with 5+ launches ({formatPercent(data.crossDatabase.topRocketBySuccessRate.rate)}).
                    </p>
                  </Panel>
                )}
              </div>
            </Section>

            <p className="stat-generated-at">Statistics generated {new Date(data.generatedAt).toLocaleString('en-US')}.</p>
          </>
        )}
      </div>

      <style jsx global>{`
        .stat-page {
          min-height: 100vh;
          width: 100%;
          background: #000000;
          color: #fff;
          font-family: 'Space Grotesk', sans-serif;
        }

        .stat-header {
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

        .stat-brand-link { background: none; border: none; cursor: pointer; padding: 0; }
        .stat-brand-text { display: inline-block; color: #fff; font-weight: 800; font-size: 1rem; letter-spacing: 3px; text-transform: uppercase; }

        .stat-back-btn {
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.3); color: #fff;
          padding: 0.6rem 1.2rem; cursor: pointer; font-size: 0.7rem; letter-spacing: 2px; font-weight: 700;
          text-transform: uppercase; font-family: inherit;
        }
        .stat-back-btn:hover { background: rgba(255,255,255,0.14); }

        .stat-content { position: relative; z-index: 5; max-width: 1240px; margin: 0 auto; padding: 60px 30px 90px; }

        .stat-kicker { display: block; color: #64748b; font: 700 0.62rem/1.4 monospace; letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 10px; }

        .stat-hero { border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 32px; margin-bottom: 32px; }
        .stat-hero h1 { margin: 10px 0 18px; color: #f8fafc; font: 800 3.4rem/0.95 'Space Grotesk', sans-serif; letter-spacing: -2px; }
        .stat-hero p { max-width: 760px; color: #a1a1aa; font-size: 0.95rem; line-height: 1.6; }

        .stat-overview { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.08); margin-bottom: 12px; }
        .stat-overview-card { background: #000; padding: 20px; display: flex; flex-direction: column; gap: 6px; }
        .stat-overview-card b { color: #38bdf8; font: 800 1.6rem/1 'Space Grotesk', sans-serif; }
        .stat-overview-card span { color: #64748b; font: 700 0.58rem/1.4 monospace; letter-spacing: 1.5px; }

        .stat-footnote { color: #71717a; font-size: 0.72rem; line-height: 1.6; margin: 8px 0 32px; }

        .stat-section { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 32px; margin-top: 32px; }
        .stat-section h2 { margin: 0 0 24px; color: #f8fafc; font: 800 1.8rem/1 'Space Grotesk', sans-serif; letter-spacing: -0.5px; text-transform: uppercase; }
        .stat-section-body { display: flex; flex-direction: column; gap: 20px; }

        .stat-filter-row { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
        .stat-filter-row select {
          background: #000; border: 1px solid rgba(255, 255, 255, 0.12); color: #d4d4d8;
          padding: 6px 10px; font: 700 0.62rem/1 monospace; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer;
        }

        .stat-panel { border: 1px solid rgba(255,255,255,0.1); padding: 20px; background: rgba(255,255,255,0.02); }
        .stat-panel h3 { margin: 0 0 16px; color: #dbe4ef; font: 700 0.78rem/1.3 'Space Grotesk', sans-serif; letter-spacing: 1px; text-transform: uppercase; }
        .stat-panel-wide { grid-column: 1 / -1; }

        .stat-chart-empty { padding: 30px 0; color: #52525b; font: 700 0.7rem/1 monospace; letter-spacing: 1.5px; text-align: center; border: 1px dashed rgba(255,255,255,0.08); }

        .stat-analysis { border-top: 1px solid rgba(255,255,255,0.06); margin-top: 14px; padding-top: 12px; }
        .stat-analysis-kicker { display: block; color: #38bdf8; font: 700 0.58rem/1 monospace; letter-spacing: 2px; margin-bottom: 4px; }
        .stat-analysis p { margin: 0; color: #a1a1aa; font-size: 0.78rem; line-height: 1.6; }

        .stat-table-wrap { margin-top: 14px; }
        .stat-table-toggle { background: none; border: none; color: #64748b; font: 700 0.6rem/1 monospace; letter-spacing: 1.5px; cursor: pointer; padding: 0; }
        .stat-table-toggle:hover { color: #fff; }
        .stat-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.72rem; }
        .stat-table th { text-align: left; color: #64748b; letter-spacing: 1px; text-transform: uppercase; font-size: 0.6rem; padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,0.15); }
        .stat-table td { padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #d4d4d8; }

        .stat-inline-numbers { display: flex; gap: 32px; flex-wrap: wrap; }
        .stat-inline-numbers b { display: block; color: #38bdf8; font: 800 1.4rem/1 'Space Grotesk', sans-serif; margin-bottom: 4px; }
        .stat-inline-numbers span { color: #64748b; font: 700 0.58rem/1.4 monospace; letter-spacing: 1px; }

        .stat-cross-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .stat-cross-fact { color: #d4d4d8; font-size: 0.85rem; line-height: 1.6; margin: 0; }
        .stat-cross-fact b { color: #38bdf8; }

        .stat-generated-at { color: #52525b; font: 700 0.6rem/1 monospace; letter-spacing: 1px; text-align: right; margin-top: 40px; }

        @media (max-width: 1024px) {
          .stat-overview { grid-template-columns: repeat(2, 1fr); }
          .stat-cross-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .stat-overview { grid-template-columns: 1fr; }
          .stat-hero h1 { font-size: 2.2rem; }
          .stat-brand-text { font-size: 0.85rem; letter-spacing: 4px; }
          .stat-bar-row { grid-template-columns: 90px 1fr 46px; }
        }
      `}</style>
    </main>
  );
}
