export const metadata = {
  title: 'SpaceTec - Global Space Hub',
  description: 'Multi-agency space tracker for NASA, ISRO, SpaceX, and ESA.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#080c14' }}>
        {children}
      </body>
    </html>
  );
}
