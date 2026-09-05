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
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&display=swap"
        />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#000000', fontFamily: '"Space Grotesk", -apple-system, sans-serif' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
