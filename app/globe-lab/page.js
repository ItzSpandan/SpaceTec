'use client';

import SpaceTecGlobeEngine from '../SpaceTecGlobeEngine';
import { useOrbitalTestFleet } from '../globe/adapters/OrbitalTrackingAdapter';

// Globe Lab: the common globe engine composed with the Orbital Tracking adapter's generated test fleet.
export default function GlobeLabPage() {
  const { subject, controls } = useOrbitalTestFleet({ initialCount: 3000, timeScale: 60 });

  return (
    <main
      style={{
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <SpaceTecGlobeEngine detailedModels={true} subject={subject} legendExtras={controls} />
    </main>
  );
}
