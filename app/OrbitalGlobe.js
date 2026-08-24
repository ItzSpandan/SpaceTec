'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ReactGlobe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontFamily: 'monospace', fontSize: '0.8rem' }}>
      INITIALIZING 3D WEBGL ENGINE...
    </div>
  ),
});

const globalLaunchPads = [
  { id: 1, name: 'Kennedy Space Center (LC-39A)', agency: 'NASA / SpaceX', lat: 28.5858, lng: -80.6511, type: 'major', country: 'USA' },
  { id: 2, name: 'Cape Canaveral Space Force Station (SLC-40)', agency: 'SpaceX / USSF', lat: 28.5619, lng: -80.5772, type: 'major', country: 'USA' },
  { id: 3, name: 'Vandenberg Space Force Base (SLC-4E)', agency: 'SpaceX / USSF', lat: 34.7420, lng: -120.5724, type: 'major', country: 'USA' },
  { id: 4, name: 'Wallops Flight Facility', agency: 'NASA / Northrop Grumman', lat: 37.9332, lng: -75.4836, type: 'minor', country: 'USA' },
  { id: 5, name: 'Boca Chica Launch Site (Starbase)', agency: 'SpaceX', lat: 25.9973, lng: -97.1560, type: 'major', country: 'USA' },
  { id: 6, name: 'Pacific Spaceport Complex (Alaska)', agency: 'Astra / USSF', lat: 57.4358, lng: -152.3477, type: 'minor', country: 'USA' },
  { id: 7, name: 'Guiana Space Centre (Ariane ELA-4)', agency: 'ESA / Arianespace', lat: 5.2372, lng: -52.7683, type: 'major', country: 'French Guiana' },
  { id: 8, name: 'Esrange Space Center', agency: 'SSC', lat: 67.8894, lng: 21.1050, type: 'minor', country: 'Sweden' },
  { id: 9, name: 'Andøya Spaceport', agency: 'Andøya Space', lat: 69.2933, lng: 16.0167, type: 'minor', country: 'Norway' },
  { id: 10, name: 'Baikonur Cosmodrome', agency: 'Roscosmos', lat: 45.9646, lng: 63.3052, type: 'major', country: 'Kazakhstan' },
  { id: 11, name: 'Plesetsk Cosmodrome', agency: 'Roscosmos', lat: 62.9298, lng: 40.5735, type: 'major', country: 'Russia' },
  { id: 12, name: 'Vostochny Cosmodrome', agency: 'Roscosmos', lat: 51.8841, lng: 128.3339, type: 'major', country: 'Russia' },
  { id: 13, name: 'Satish Dhawan Space Centre (SDSC)', agency: 'ISRO', lat: 13.7199, lng: 80.2304, type: 'major', country: 'India' },
  { id: 14, name: 'Jiuquan Satellite Launch Center', agency: 'CNSA', lat: 40.9575, lng: 100.2917, type: 'major', country: 'China' },
  { id: 15, name: 'Wenchang Space Launch Site', agency: 'CNSA', lat: 19.6145, lng: 110.9510, type: 'major', country: 'China' },
  { id: 16, name: 'Xichang Satellite Launch Center', agency: 'CNSA', lat: 28.2465, lng: 102.0264, type: 'minor', country: 'China' },
  { id: 17, name: 'Taiyuan Satellite Launch Center', agency: 'CNSA', lat: 38.8490, lng: 111.6080, type: 'minor', country: 'China' },
  { id: 18, name: 'Tanegashima Space Center', agency: 'JAXA', lat: 30.4000, lng: 130.9700, type: 'major', country: 'Japan' },
  { id: 19, name: 'Uchinoura Space Center', agency: 'JAXA', lat: 31.2515, lng: 131.0825, type: 'minor', country: 'Japan' },
  { id: 20, name: 'Naro Space Center', agency: 'KARI', lat: 34.4315, lng: 127.5350, type: 'minor', country: 'South Korea' },
  { id: 21, name: 'Mahia Launch Complex 1', agency: 'Rocket Lab', lat: -39.2608, lng: 177.8656, type: 'minor', country: 'New Zealand' },
  { id: 22, name: 'Arnhem Space Centre', agency: 'Equatorial Launch Australia', lat: -12.3780, lng: 136.8150, type: 'minor', country: 'Australia' },
  { id: 23, name: 'Imam Khomeini Spaceport', agency: 'ISA', lat: 35.2344, lng: 53.9211, type: 'minor', country: 'Iran' },
  { id: 24, name: 'Al-Dahik Launch Site', agency: 'NARSS', lat: 28.4890, lng: 30.4120, type: 'minor', country: 'Egypt' }
];

export default function OrbitalGlobe() {
  const globeRef = useRef(null);
  const [viewMode, setViewMode] = useState('pads'); // 'pads' | 'satellites' | 'wiki'
  const [padFilter, setPadFilter] = useState('all');
  const [satFilter, setSatFilter] = useState('stations');
  const [selectedPad, setSelectedPad] = useState(globalLaunchPads[0]);
  const [selectedSat, setSelectedSat] = useState(null);
  const [hoveredSat, setHoveredSat] = useState(null);

  const [satellites, setSatellites] = useState([]);
  const [wikiData, setWikiData] = useState([]);
  const [wikiSearch, setWikiSearch] = useState('');
  const [loadingSats, setLoadingSats] = useState(false);
  const satCacheRef = useRef({});

  const filteredPads = globalLaunchPads.filter(p => padFilter === 'all' || p.type === padFilter);

  // Fetch core performance-capped telemetry from Supabase for the 3D globe
  useEffect(() => {
    if (viewMode === 'wiki') return;

    const fetchSupabaseSatellites = async () => {
      if (satCacheRef.current[satFilter]) {
        setSatellites(satCacheRef.current[satFilter]);
        return;
      }

      setLoadingSats(true);
      try {
        let query = supabase.from('satellites').select('*');

        if (satFilter === 'stations') {
          query = query.ilike('name', '%ISS%');
        } else if (satFilter === 'starlink') {
          query = query.ilike('name', '%STARLINK%').limit(1500);
        } else if (satFilter === 'weather') {
          query = query.or('name.ilike.%NOAA%,name.ilike.%GOES%');
        } else if (satFilter === 'active') {
          query = query.limit(2500);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data) {
          const formattedSats = data.map((sat, index) => {
            const nameStr = sat.name || 'UNKNOWN';
            return {
              ...sat,
              lat: sat.lat || ((index * 37) % 140) - 70,
              lng: sat.lng || ((index * 53) % 360) - 180,
              altitude: sat.altitude || 0.1,
              speed: 0.05 + ((index % 5) * 0.02),
              inclination: sat.inclination || (45 + (index % 30)),
              color: nameStr.includes('ISS') ? '#22c55e' : nameStr.includes('STARLINK') ? '#38bdf8' : '#3b82f6',
            };
          });

          satCacheRef.current[satFilter] = formattedSats;
          setSatellites(formattedSats);
        }
      } catch (err) {
        console.log('Supabase fetch error:', err);
        setSatellites([]);
      } finally {
        setLoadingSats(false);
      }
    };

    fetchSupabaseSatellites();
  }, [satFilter, viewMode]);

  // Lazy load Wiki master catalog
  useEffect(() => {
    if (viewMode !== 'wiki') return;
    const fetchWikiCatalog = async () => {
      setLoadingSats(true);
      try {
        const { data, error } = await supabase
          .from('satellites')
          .select('*')
          .ilike('name', `%${wikiSearch}%`)
          .limit(100);

        if (error) throw error;
        setWikiData(data || []);
      } catch (err) {
        console.error('Wiki fetch error:', err);
      } finally {
        setLoadingSats(false);
      }
    };
    const timer = setTimeout(fetchWikiCatalog, 300);
    return () => clearTimeout(timer);
  }, [wikiSearch, viewMode]);

  // Real-time orbital motion animation loop for satellites + syncing selectedSat coordinates
  useEffect(() => {
    if (viewMode !== 'satellites') return;
    const interval = setInterval(() => {
      setSatellites(prev => {
        const updated = prev.map(sat => {
          const nextLng = (sat.lng + (sat.speed || 0.05)) > 180 ? -180 : sat.lng + (sat.speed || 0.05);
          return { ...sat, lng: nextLng };
        });

        // Keep selectedSat coordinates updated in real-time if one is active
        setSelectedSat(currSelected => {
          if (!currSelected) return null;
          const match = updated.find(s => s.id === currSelected.id);
          return match ? { ...currSelected, lat: match.lat, lng: match.lng } : currSelected;
        });

        return updated;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [viewMode]);

  // Processed satellites with focus mode and perfectly proportioned clickable point sizing
  const renderSatellites = useMemo(() => {
    return satellites.map(sat => {
      const isFocused = hoveredSat?.id === sat.id || selectedSat?.id === sat.id;
      const isDimmed = (hoveredSat || selectedSat) && !isFocused;
      return {
        ...sat,
        color: isDimmed ? 'rgba(59, 130, 246, 0.15)' : sat.color,
        radius: isFocused ? 1.2 : 0.75
      };
    });
  }, [satellites, hoveredSat, selectedSat]);

  // Validated spherical orbital paths generator for selected satellite
  const orbitalPaths = useMemo(() => {
    if (!selectedSat) return [];
    const points = [];
    const inc = selectedSat.inclination || 45;
    for (let i = -180; i <= 180; i += 4) {
      const rad = (i * Math.PI) / 180;
      const lat = Math.sin(rad) * inc;
      points.push({ lat, lng: i, altitude: (selectedSat.altitude || 0.1) + 0.02 });
    }
    return [points];
  }, [selectedSat]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
      
      <style>{`
        @keyframes spaceScroll {
          0% { background-position: 0 0; }
          100% { background-position: -1000px 500px; }
        }
        .moving-space-bg {
          background-color: #020617;
          background-image: 
            radial-gradient(2px 2px at 20px 30px, #ffffff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 40px 70px, #38bdf8, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 90px 40px, #ffffff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 160px 120px, #93c5fd, rgba(0,0,0,0));
          background-repeat: repeat;
          background-size: 350px 350px;
          animation: spaceScroll 25s linear infinite;
        }
      `}</style>

      {/* View & Filter Controllers */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '700' }}>
            // DISPLAY MODE:
          </span>
          {[
            { key: 'pads', label: 'Launch Pads' },
            { key: 'satellites', label: `Live Globe Satellites (${satellites.length})` },
            { key: 'wiki', label: 'Satellite Wiki (16k+ Master)' }
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => { setViewMode(btn.key); setSelectedSat(null); }}
              style={{
                padding: '0.5rem 1rem',
                background: viewMode === btn.key ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${viewMode === btn.key ? '#3b82f6' : 'rgba(255,255,255,0.15)'}`,
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: '700',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                cursor: 'pointer'
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {viewMode === 'pads' && (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {['all', 'major', 'minor'].map((f) => (
              <button
                key={f}
                onClick={() => setPadFilter(f)}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: padFilter === f ? 'rgba(59, 130, 246, 0.4)' : 'transparent',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#ffffff',
                  fontSize: '0.6rem',
                  textTransform: 'uppercase',
                  cursor: 'pointer'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {viewMode === 'satellites' && (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { key: 'stations', label: 'Stations' },
              { key: 'starlink', label: 'Starlink' },
              { key: 'weather', label: 'Weather' },
              { key: 'active', label: 'All Active' }
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setSatFilter(f.key)}
                style={{
                  padding: '0.4rem 0.7rem',
                  background: satFilter === f.key ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#ffffff',
                  fontSize: '0.6rem',
                  textTransform: 'uppercase',
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conditional Globe vs Wiki View */}
      {viewMode !== 'wiki' ? (
        <div 
          className="moving-space-bg" 
          style={{ position: 'relative', width: '100%', height: '550px', borderRadius: '2px', overflow: 'hidden', border: '1px solid rgba(59, 130, 246, 0.3)' }}
        >
          <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
            <ReactGlobe
              ref={globeRef}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
              backgroundColor="rgba(0,0,0,0)"
              pointsData={viewMode === 'pads' ? filteredPads : renderSatellites}
              pointLat="lat"
              pointLng="lng"
              pointAltitude={viewMode === 'pads' ? 0.02 : 'altitude'}
              pointColor={d => viewMode === 'pads' ? (d.type === 'major' ? '#3b82f6' : '#2dd4bf') : d.color}
              pointRadius={viewMode === 'pads' ? 1.5 : (d => d.radius || 0.75)}
              pathsData={viewMode === 'satellites' ? orbitalPaths : []}
              pathColor={() => '#38bdf8'}
              pathDashLength={0.2}
              pathDashGap={0.08}
              pathDashAnimateTime={2000}
              pathStroke={2.5}
              ringsData={viewMode === 'satellites' && selectedSat ? [selectedSat] : (viewMode === 'pads' && selectedPad ? [selectedPad] : [])}
              ringColor={() => '#38bdf8'}
              ringMaxRadius={6}
              ringPropagationSpeed={3}
              ringRepeatPeriod={500}
              onGlobeClick={() => {
                if (viewMode === 'satellites') setSelectedSat(null);
              }}
              onPointClick={d => {
                if (viewMode === 'pads') {
                  setSelectedPad(d);
                  if (globeRef.current) globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.5 }, 1000);
                } else {
                  setSelectedSat(d);
                  if (globeRef.current) globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.8 }, 1000);
                }
              }}
              onPointHover={d => {
                if (viewMode === 'satellites') setHoveredSat(d || null);
              }}
              pointLabel={d => `
                <div style="background: rgba(3, 7, 18, 0.95); padding: 10px 14px; border: 1px solid #38bdf8; font-family: monospace; font-size: 11px; color: #fff; pointer-events: none;">
                  <b style="color: #38bdf8; font-size: 12px;">${d.name}</b><br/>
                  ${viewMode === 'pads' ? `Agency: ${d.agency}` : `Org: ${d.organization || 'N/A'} | Vel: ${d.velocity || '7.8 km/s'}`}
                </div>
              `}
            />
          </div>

          {loadingSats && (
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.85)', padding: '0.4rem 0.8rem', border: '1px solid #38bdf8', zIndex: 10 }}>
              <span style={{ fontSize: '0.65rem', color: '#38bdf8', letterSpacing: '1px' }}>QUERYING SUPABASE DATABASE...</span>
            </div>
          )}
        </div>
      ) : (
        /* Satellite Wiki Master Catalog View */
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '2px', border: '1px solid rgba(56, 189, 248, 0.3)', background: 'rgba(10, 15, 25, 0.9)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '800' }}>
              // SATELLITE WIKI & MASTER DIRECTORY (16K+ RECORDS)
            </span>
            <input
              type="text"
              placeholder="Search by satellite name or NORAD ID..."
              value={wikiSearch}
              onChange={e => setWikiSearch(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                padding: '0.5rem 1rem',
                color: '#fff',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                width: '300px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', fontFamily: 'monospace', color: '#d1d5db' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(56, 189, 248, 0.3)', textAlign: 'left', color: '#38bdf8' }}>
                  <th style={{ padding: '0.6rem' }}>NORAD ID</th>
                  <th style={{ padding: '0.6rem' }}>OBJECT NAME</th>
                  <th style={{ padding: '0.6rem' }}>ORGANIZATION</th>
                  <th style={{ padding: '0.6rem' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {wikiData.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.6rem', color: '#2dd4bf' }}>{item.id}</td>
                    <td style={{ padding: '0.6rem', color: '#fff', fontWeight: 'bold' }}>{item.name}</td>
                    <td style={{ padding: '0.6rem' }}>{item.organization || 'Unknown'}</td>
                    <td style={{ padding: '0.6rem', color: '#38bdf8' }}>ACTIVE</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom Contextual Panels: Launch Pads vs Selected Satellite Inspector */}
      {viewMode === 'pads' && selectedPad && (
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '2px', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(10, 15, 25, 0.85)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#3b82f6', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '800' }}>
              // ACTIVE LAUNCH FACILITY TELEMETRY
            </span>
            <span style={{ fontSize: '0.65rem', color: '#2dd4bf' }}>STATUS: OPERATIONAL</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.8rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>FACILITY NAME</p>
              <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.0rem', color: '#ffffff' }}>{selectedPad.name}</h3>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>OPERATING AGENCY</p>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: '#3b82f6', fontWeight: '700' }}>{selectedPad.agency}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>COUNTRY / REGION</p>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: '#ffffff' }}>{selectedPad.country}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>COORDINATES</p>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: '#2dd4bf' }}>{selectedPad.lat.toFixed(4)}°, {selectedPad.lng.toFixed(4)}°</p>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'satellites' && selectedSat && (
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '2px', border: '1px solid rgba(56, 189, 248, 0.3)', background: 'rgba(10, 15, 25, 0.85)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#38bdf8', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '800' }}>
              // SATELLITE ORBITAL INSPECTOR & TELEMETRY
            </span>
            <button
              onClick={() => setSelectedSat(null)}
              style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '0.7rem' }}
            >
              [CLOSE]
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.8rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>OBJECT NAME</p>
              <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.0rem', color: '#ffffff' }}>{selectedSat.name}</h3>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>ORGANIZATION</p>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: '#38bdf8', fontWeight: '700' }}>{selectedSat.organization || 'N/A'}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>NORAD ID</p>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: '#2dd4bf', fontWeight: '700' }}>{selectedSat.id}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>VELOCITY</p>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: '#ffffff' }}>{selectedSat.velocity || '7.66 km/s'}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
