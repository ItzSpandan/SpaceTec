export const metadata = {
  title: 'SpaceTec - Global Space Intelligence Hub',
  description: 'Explore satellites, launches, missions, spacecraft, rockets, astronauts, space agencies, astronomy, space weather, and space news in one unified platform.',
};

import Providers from './components/Providers';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=Orbitron:wght@600&display=swap"
        />
        {/*
          Canonical SpaceTec brand wordmark tokens.
          Every "SPACETEC" wordmark across the app (header, intros, page
          transitions, loading screens, etc.) reads these CSS variables so
          the typography treatment stays identical everywhere. Letter
          spacing is in `em` units so it scales proportionally with
          whatever font-size a given wordmark instance uses.
        */}
        <style>{`
          :root {
            --wordmark-font-family: 'Orbitron', 'Space Grotesk', -apple-system, sans-serif;
            --wordmark-font-weight: 600;
            --wordmark-letter-spacing: 0.22em;
            --wordmark-color: #ffffff;
          }
          .spacetec-wordmark {
            font-family: var(--wordmark-font-family);
            font-weight: var(--wordmark-font-weight);
            text-transform: uppercase;
            letter-spacing: var(--wordmark-letter-spacing);
            color: var(--wordmark-color);
          }
        `}</style>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#000000', fontFamily: '"Space Grotesk", -apple-system, sans-serif' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
