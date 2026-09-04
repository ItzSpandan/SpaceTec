'use client';

// The "Explore More Agencies" directory + full-screen Agency Profile.
// Split out of SpaceTecHub.js purely to keep that file smaller — nothing
// about behavior, styling, layout, or data changed in the move. This file
// only talks to the rest of the app through the props passed into
// <AllAgenciesPage />, exactly as it did when it lived inline.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- AGENCY PROFILE HELPERS (used only by the Agency Directory / Agency Profile) ---
// These only ever read fields that already exist on an agency record. Nothing
// here invents a fact — a missing field simply comes back as null and the
// profile UI shows an "Information unavailable" treatment for it.

function extractFoundedYear(text) {
  if (!text) return null;
  const match = text.match(/\b(1[6-9]\d{2}|20\d{2})\b/);
  return match ? match[0] : null;
}

function extractCountryFromHeadquarters(headquarters) {
  if (!headquarters) return null;
  const parts = headquarters.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

// A few of the original agency records only ever stated their headquarters
// inside the `brief` prose (e.g. "Headquartered in Washington, D.C., ...").
// This pulls that out rather than leaving Identity empty for those agencies.
function extractHeadquartersFromBrief(brief) {
  if (!brief) return null;
  const match = brief.match(/Headquartered (?:in|at) ([^.,]+(?:,\s*[^.,]+)?)/i);
  return match ? match[1].trim() : null;
}

function getAgencyIdentity(agency) {
  const headquarters = agency.headquarters || extractHeadquartersFromBrief(agency.brief) || null;
  return {
    officialName: agency.officialName || agency.name,
    country: extractCountryFromHeadquarters(headquarters),
    headquarters,
    founded: extractFoundedYear(agency.history) || extractFoundedYear(agency.brief),
    type: agency.category || null,
    website: agency.website || null,
  };
}

// Turns the free-text "majorPrograms" / "specialty" field into a clean bullet
// list for the Programmes & Capabilities section, without fabricating any
// category that isn't actually mentioned in the existing data.
function getAgencyCapabilities(agency) {
  const source = agency.majorPrograms || agency.specialty || null;
  if (!source) return [];
  return source
    .split(/,| and | & /i)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Best-effort match between an agency and the existing launchpad directory's
// `operator` field. Only returns a pad when the agency's name genuinely
// appears in that field — never a fabricated association.
export function findLaunchpadForAgency(agencyName, allLaunchpads) {
  if (!agencyName || !Array.isArray(allLaunchpads)) return null;
  const needle = agencyName.toUpperCase();
  return allLaunchpads.find((pad) => (pad.operator || '').toUpperCase().includes(needle)) || null;
}

export function AllAgenciesPage({ agencies, spaceBackgrounds, onClose, onOpenSatelliteWiki, onOpenLaunchpads, initialAgencyId = null }) {
  const [bgIdx, setBgIdx] = useState(0);
  const [isReturningMain, setIsReturningMain] = useState(false);
  const [hoveredAgencyId, setHoveredAgencyId] = useState(null);
  const [selectedAgency, setSelectedAgency] = useState(
    () => (initialAgencyId ? agencies.find((a) => a.id === initialAgencyId) || null : null)
  );

  useEffect(() => {
    const timer = setInterval(() => setBgIdx((current) => (current + 1) % spaceBackgrounds.length), 7000);
    return () => clearInterval(timer);
  }, [spaceBackgrounds.length]);

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
    };
  }, []);

  // Jumping into a profile (or back out to the grid) should land at the top
  // of the scroll area, right under the sticky header.
  useEffect(() => {
    const scrollArea = document.getElementById('agency-directory-scroll');
    if (scrollArea) scrollArea.scrollTo({ top: 0 });
  }, [selectedAgency]);

  const handleBackToMain = () => {
    setIsReturningMain(true);
    setTimeout(() => onClose(), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4 }}
      id="agency-directory-scroll"
      style={{ position: 'fixed', inset: 0, zIndex: 99998, overflowY: 'auto', backgroundColor: '#000000', boxSizing: 'border-box', fontFamily: '"Space Grotesk", -apple-system, sans-serif' }}
    >
      {spaceBackgrounds.map((bgUrl, idx) => (
        <div key={`all-agencies-bg-${idx}`} style={{ position: 'fixed', inset: 0, backgroundImage: `url('${bgUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0, opacity: bgIdx === idx ? 1 : 0, transition: 'opacity 1.8s ease-in-out', filter: 'brightness(0.4) contrast(1.25)', pointerEvents: 'none' }} />
      ))}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%)' }} />

      {/* STICKY SPACETEC HEADER — reused for both the directory grid and an open profile, so it never scrolls away. */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#000000', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '1.5rem 2rem' }}>
          <motion.span layoutId="spacetec-brand" style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase' }}>
            SPACETEC
          </motion.span>
          <button
            onClick={() => (selectedAgency ? setSelectedAgency(null) : handleBackToMain())}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '0.8rem 1.5rem', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '2px', fontWeight: '700', textTransform: 'uppercase' }}
          >
            {selectedAgency ? '[← BACK TO AGENCIES]' : '[← BACK TO MAIN]'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 3, padding: '2.5rem 2rem 4rem' }}>
        {!selectedAgency ? (
          <>
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '2rem', marginBottom: '2.5rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>
                // GLOBAL SPACE AGENCY DIRECTORY
              </span>
              <h2 style={{ color: '#fff', fontSize: '2rem', margin: 0, textTransform: 'uppercase', fontWeight: '900' }}>
                EXPLORE SPACE AGENCIES
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {agencies.map((agency, index) => {
                const isHovered = hoveredAgencyId === agency.id;
                return (
                  <motion.article
                    key={agency.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedAgency(agency)}
                    onMouseEnter={() => setHoveredAgencyId(agency.id)}
                    onMouseLeave={() => setHoveredAgencyId(null)}
                    style={{
                      cursor: 'pointer',
                      minHeight: '310px',
                      position: 'relative',
                      overflow: 'hidden',
                      border: isHovered ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.14)',
                      backgroundColor: 'rgba(0,0,0,0.72)',
                      padding: '2rem',
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      transition: 'border-color 0.25s ease'
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: agency.hqImage
                          ? "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.92) 100%), url('" + agency.hqImage + "')"
                          : 'linear-gradient(135deg, rgba(10,10,10,0.96), rgba(0,0,0,0.98))',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: isHovered ? 0.85 : 0.72,
                        transition: 'opacity 0.25s ease'
                      }}
                    />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <span style={{ color: isHovered ? '#ffffff' : '#a1a1aa', fontSize: '0.65rem', letterSpacing: '2px', fontWeight: '800', transition: 'color 0.25s ease' }}>
                        // {String(index + 1).padStart(2, '0')}
                      </span>
                      <h3 style={{ color: '#fff', margin: '0.7rem 0', fontSize: '1.6rem', letterSpacing: '2px' }}>{agency.name}</h3>
                      <p style={{ color: '#a1a1aa', margin: '0 0 0.8rem', fontSize: '0.72rem', letterSpacing: '1.4px', fontWeight: '700' }}>{agency.tagline}</p>
                      <p style={{ color: '#d4d4d8', margin: 0, lineHeight: '1.6', fontSize: '0.83rem' }}>{agency.brief}</p>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </>
        ) : (
          <AgencyProfile
            agency={selectedAgency}
            onOpenSatelliteWiki={onOpenSatelliteWiki}
            onOpenLaunchpads={onOpenLaunchpads}
          />
        )}
      </div>

      <AnimatePresence>
        {isReturningMain && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}>
            <div style={{ textAlign: 'center' }}>
              <motion.h1 layoutId="spacetec-brand" style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.22em' }}>SPACETEC</motion.h1>
              <p style={{ fontSize: '0.8rem', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '700' }}>CONNECTING TO MAIN...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Reusable full-screen Agency Profile & its small building blocks -----
// Every agency renders through this SAME template — no per-agency JSX.

function ProfileSection({ heading, children }) {
  return (
    <section style={{ marginBottom: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
        <h3 style={{ color: '#fff', fontSize: '0.85rem', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: '800', margin: 0, whiteSpace: 'nowrap' }}>
          {heading}
        </h3>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.15)' }} />
      </div>
      {children}
    </section>
  );
}

function IdentityRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.85rem 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <span style={{ color: '#71717a', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: '600', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function DatabaseLinkButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ marginTop: '1.2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '0.75rem 1.4rem', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '2px', fontWeight: '700', textTransform: 'uppercase' }}
    >
      [ {label} → ]
    </button>
  );
}

function AgencyProfile({ agency, onOpenSatelliteWiki, onOpenLaunchpads }) {
  const identity = getAgencyIdentity(agency);
  const capabilities = getAgencyCapabilities(agency);

  // These separate databases live on their own routes in this project, so a
  // profile link does a normal navigation to the existing page rather than
  // re-implementing it here. The `agency` query param is passed along so
  // that page can apply an agency filter if/where it already supports one.
  const goToDatabase = (path) => {
    window.location.href = `${path}?agency=${encodeURIComponent(agency.id)}`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      {/* PROFILE HEADER */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '2rem', marginBottom: '2.5rem' }}>
        <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '0.6rem' }}>
          // SPACE AGENCY PROFILE
        </span>
        <h2 style={{ color: '#fff', fontSize: '2.2rem', margin: '0 0 0.5rem 0', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1px' }}>
          {agency.name}
        </h2>
        {agency.tagline && (
          <p style={{ color: '#a1a1aa', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '700', margin: 0 }}>
            {agency.tagline}
          </p>
        )}
      </div>

      {/* LARGE HQ / AGENCY IMAGE — reuses the existing image field, nothing new is fetched or generated */}
      {agency.hqImage && (
        <div style={{ width: '100%', height: '380px', marginBottom: '3rem', position: 'relative', border: '1px solid rgba(255,255,255,0.12)' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 100%), url('${agency.hqImage}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          {agency.logoText && (
            <span style={{ position: 'absolute', bottom: '1.2rem', left: '1.5rem', color: '#fff', fontSize: '0.7rem', letterSpacing: '2px', fontWeight: '700', textTransform: 'uppercase' }}>
              {agency.logoText}
            </span>
          )}
        </div>
      )}

      <ProfileSection heading="IDENTITY">
        <IdentityRow label="Official Name" value={identity.officialName} />
        <IdentityRow label="Country" value={identity.country} />
        <IdentityRow label="Headquarters" value={identity.headquarters} />
        <IdentityRow label="Founded" value={identity.founded} />
        <IdentityRow label="Agency Type" value={identity.type} />
        <IdentityRow label="Official Website" value={identity.website} />
      </ProfileSection>

      {agency.brief && (
        <ProfileSection heading="OVERVIEW">
          <p style={{ color: '#d4d4d8', lineHeight: '1.8', fontSize: '0.9rem', margin: 0 }}>{agency.brief}</p>
          {agency.specialty && (
            <p style={{ color: '#d4d4d8', lineHeight: '1.8', fontSize: '0.9rem', margin: '1rem 0 0 0' }}>
              Its work centers on {agency.specialty.toLowerCase()}.
            </p>
          )}
        </ProfileSection>
      )}

      {agency.history && (
        <ProfileSection heading="HISTORY">
          <p style={{ color: '#d4d4d8', lineHeight: '1.8', fontSize: '0.9rem', margin: 0 }}>{agency.history}</p>
        </ProfileSection>
      )}

      {capabilities.length > 0 && (
        <ProfileSection heading="PROGRAMMES & CAPABILITIES">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem' }}>
            {capabilities.map((item, i) => (
              <div key={i} style={{ border: '1px solid rgba(255,255,255,0.1)', padding: '1rem 1.2rem', color: '#d4d4d8', fontSize: '0.82rem', lineHeight: '1.5' }}>
                {item}
              </div>
            ))}
          </div>
        </ProfileSection>
      )}

      <ProfileSection heading="MAJOR MISSIONS">
        <p style={{ color: '#71717a', fontSize: '0.82rem', lineHeight: '1.6', margin: '0 0 0.2rem 0' }}>
          Look up missions associated with {agency.name} in the existing Mission Database.
        </p>
        <DatabaseLinkButton label="VIEW MISSION DATABASE" onClick={() => goToDatabase('/mission-database')} />
      </ProfileSection>

      <ProfileSection heading="ROCKETS & LAUNCH SYSTEMS">
        <p style={{ color: '#71717a', fontSize: '0.82rem', lineHeight: '1.6', margin: '0 0 0.2rem 0' }}>
          Look up launch vehicles associated with {agency.name} in the existing Rocket Database.
        </p>
        <DatabaseLinkButton label="VIEW ROCKET DATABASE" onClick={() => goToDatabase('/rocket-database')} />
      </ProfileSection>

      <ProfileSection heading="SPACECRAFT">
        <p style={{ color: '#71717a', fontSize: '0.82rem', lineHeight: '1.6', margin: '0 0 0.2rem 0' }}>
          Look up spacecraft associated with {agency.name} in the existing Spacecraft Database.
        </p>
        <DatabaseLinkButton label="VIEW SPACECRAFT DATABASE" onClick={() => goToDatabase('/spacecraft-database')} />
      </ProfileSection>

      <ProfileSection heading="ASTRONAUTS">
        <p style={{ color: '#71717a', fontSize: '0.82rem', lineHeight: '1.6', margin: '0 0 0.2rem 0' }}>
          Look up astronauts associated with {agency.name} in the existing Astronaut Database.
        </p>
        <DatabaseLinkButton label="VIEW ASTRONAUT DATABASE" onClick={() => goToDatabase('/astronaut-database')} />
      </ProfileSection>

      <ProfileSection heading="SATELLITES">
        <p style={{ color: '#71717a', fontSize: '0.82rem', lineHeight: '1.6', margin: '0 0 0.2rem 0' }}>
          Search the existing Satellite Database for objects associated with {agency.name}.
        </p>
        <DatabaseLinkButton label="VIEW SATELLITE DATABASE" onClick={() => onOpenSatelliteWiki && onOpenSatelliteWiki(agency.name)} />
      </ProfileSection>

      <ProfileSection heading="LAUNCH FACILITIES">
        <p style={{ color: '#71717a', fontSize: '0.82rem', lineHeight: '1.6', margin: '0 0 0.2rem 0' }}>
          View launch facilities operated by or associated with {agency.name} in the existing Launchpad directory.
        </p>
        <DatabaseLinkButton label="VIEW LAUNCH PADS" onClick={() => onOpenLaunchpads && onOpenLaunchpads(agency.name)} />
      </ProfileSection>
    </motion.div>
  );
}
