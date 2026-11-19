'use client';

import SpaceTecGlobeEngine from '../SpaceTecGlobeEngine';

export default function GlobeLabPage() {
  return (
    <main
      style={{
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <SpaceTecGlobeEngine detailedModels={true} />
    </main>
  );
}
