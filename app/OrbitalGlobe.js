'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [viewMode, setViewMode] = useState('pads'); 
  const [padFilter, setPadFilter] = useState('all'); 
  const [satFilter, setSatFilter] = useState('stations'); 
  const [selectedPad, setSelectedPad] = useState(globalLaunchPads[0]);
  const [selectedSat, setSelectedSat] = useState(null);
  
  const [satellites, setSatellites] = useState([]);
  const [loadingSats, setLoadingSats] = useState(false);
  const satCacheRef = useRef({});

  const filteredPads = globalLaunchPads.filter(p => padFilter === 'all' || p.type === padFilter);

  // Fetch telemetry data from Supabase Database instead of live external API calls
  useEffect(() => {
    const fetchSupabaseSatellites = async () => {
      if (satCacheRef.current[satFilter]) {
        setSatellites(satCacheRef.current[satFilter]);
        return;
      }

      setLoadingSats(true);
      try {
        let query = supabase.from('satellites').select('*');

        // Apply filters directly based on user's category choices
        if (satFilter === 'stations') {
          query = query.ilike('name', '%ISS%');
        } else if (satFilter === 'starlink') {
          query = query.ilike('name', '%STARLINK%');
        } else if (satFilter === 'weather') {
          query = query.or('name.ilike.%NOAA%,name.ilike.%GOES%');
        } else if (satFilter === 'active') {
          // Cap heavy payload view for browser optimization
          query = query.limit(3000);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (data) {
          const formattedSats = data.map((sat) => {
            const nameStr = sat.name || 'UNKNOWN';
            return {
              ...sat,
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
  }, [satFilter]);

  // Orbital paths generator
  const orbitalPaths = selectedSat ? (() => {
    const points = [];
    const inc = selectedSat.inclination || 45;
    for (let i = 0; i <= 360; i += 5) {
      const rad = (i * Math.PI) / 180;
      const lat = Math.sin(rad) * inc;
      const lng = i - 180;
      points.push({ lat, lng, altitude: selectedSat.altitude + 0.02 });
    }
    return [points];
  })() : [];

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
            radial-gradient(2px 2px at 160px 120px, #93c5fd, rgba(0,0,0,0)),
            radial-gradient(1.5px 1.5px at 230px 180px, #ffffff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 300px 250px, #38bdf8, rgba(0,0,0,0));
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
            { key: 'satellites', label: `Live Database Satellites (${satellites.length})` }
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
              { key: 'visual', label: 'Bright / Visual' },
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

      {/* Globe Component */}
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
            pointsData={viewMode === 'pads' ? filteredPads : satellites}
            pointLat="lat"
            pointLng="lng"
            pointAltitude={viewMode === 'pads' ? 0.02 : 'altitude'}
            pointColor={d => viewMode === 'pads' ? (d.type === 'major' ? '#3b82f6' : '#2dd4bf') : d.color}
            pointRadius={viewMode === 'pads' ? 1.5 : 0.5}
            pathsData={orbitalPaths}
            pathColor={() => '#ffffff'}
            pathDashLength={0.15}
            pathDashGap={0.05}
            pathDashAnimateTime={3000}
            pathStroke={2}
            ringsData={selectedSat ? [selectedSat] : (selectedPad ? [selectedPad] : [])}
            ringColor={() => '#38bdf8'}
            ringMaxRadius={6}
            ringPropagationSpeed={3}
            ringRepeatPeriod={500}
            onPointClick={d => {
              if (viewMode === 'pads') {
                setSelectedPad(d);
                if (globeRef.current) globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.5 }, 1000);
              } else {
                setSelectedSat(d);
                if (globeRef.current) globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.8 }, 1000);
              }
            }}
            pointLabel={d => `
              <div style="background: rgba(3, 7, 18, 0.95); padding: 10px 14px; border: 1px solid #38bdf8; font-family: monospace; font-size: 11px; color: #fff; pointer-events: none;">
                <b style="color: #38bdf8; font-size: 12px;">${d.name}</b><br/>
                ${viewMode === 'pads' ? `Agency: ${d.agency}` : `Org: ${d.organization} | Vel: ${d.velocity}`}
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

      {/* Details Panels */}
      {viewMode === 'pads' && (
        <div className="glass-card" style={{ padding: '1.2rem', borderRadius: '2px', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(10, 15, 25, 0.9)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <span style={{ fontSize: '0.65rem', color: '#3b82f6', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '800' }}>
              // LAUNCH FACILITIES ({padFilter.toUpperCase()} FILTER: {filteredPads.length} SITES FOUND)
            </span>
            <span style={{ fontSize: '0.6rem', color: '#71717a' }}>Click any card to lock target on globe</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.8rem', maxHeight: '200px', overflowY: 'auto' }}>
            {filteredPads.map((pad) => {
              const isSelected = selectedPad?.id === pad.id;
              return (
                <div
                  key={pad.id}
                  onClick={() => {
                    setSelectedPad(pad);
                    if (globeRef.current) globeRef.current.pointOfView({ lat: pad.lat, lng: pad.lng, altitude: 1.5 }, 1000);
                  }}
                  style={{
                    padding: '0.8rem',
                    background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isSelected ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ margin: 0, fontSize: '0.8rem', color: '#ffffff', fontWeight: '700' }}>{pad.name}</h4>
                    <span style={{ fontSize: '0.55rem', padding: '2px 6px', background: pad.type === 'major' ? '#3b82f6' : '#2dd4bf', color: '#030712', fontWeight: '800' }}>
                      {pad.type.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.7rem', color: '#2dd4bf' }}>{pad.agency}</p>
                  <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.65rem', color: '#a1a1aa' }}>Region: {pad.country}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'satellites' && selectedSat && (
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '2px', border: '1px solid rgba(56, 189, 248, 0.3)', background: 'rgba(10, 15, 25, 0.85)' }}>
          <span style={{ fontSize: '0.65rem', color: '#38bdf8', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '800' }}>
            // SATELLITE ORBITAL INSPECTOR
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.8rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>OBJECT NAME</p>
              <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.0rem', color: '#ffffff' }}>{selectedSat.name}</h3>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>ORGANIZATION</p>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: '#38bdf8', fontWeight: '700' }}>{selectedSat.organization}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>NORAD ID</p>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: '#2dd4bf', fontWeight: '700' }}>{selectedSat.id}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>VELOCITY</p>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: '#ffffff' }}>{selectedSat.velocity}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
