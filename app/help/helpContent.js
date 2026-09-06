// FAQ content for /help. Kept as plain data (no logic) so the questions
// and answers are easy to review/edit without touching the page component.
// Every answer below describes something SpaceTec actually does today —
// no invented functionality.

export const HELP_SECTIONS = [
  {
    id: 'getting-started',
    title: 'GETTING STARTED',
    items: [
      {
        q: 'What is SpaceTec?',
        a: 'SpaceTec is a hub that brings together live space data in one place — space agencies, satellites, launchpads, the ISS, space weather, astronomy conditions, space news, and searchable databases of missions, astronauts, spacecraft, and rockets.',
      },
      {
        q: 'How do I navigate SpaceTec?',
        a: 'The homepage sections (Live Telemetry, Agencies, Launchpads, and more) link out to each feature. The hamburger menu in the top-right corner also lists every destination in one place, including items with their own dropdowns like Live Telemetry and Database.',
      },
      {
        q: 'How do I create an account?',
        a: 'Open the hamburger menu and select Sign In at the bottom, then choose Create Account. You\'ll need a display name, email, and password. A confirmation link is sent to your email before the account becomes active.',
      },
      {
        q: 'Why do some features require an account?',
        a: 'The homepage and its previews — Agencies, Launchpads, About SpaceTec, and more — stay public. Deeper exploration (full agency profiles, the full launchpad directory, the Satellite Database, and the Mission/Astronaut/Spacecraft/Rocket databases) requires a free SpaceTec account.',
      },
    ],
  },
  {
    id: 'account',
    title: 'ACCOUNT',
    items: [
      {
        q: 'How do I sign in?',
        a: 'Open the hamburger menu and select Sign In at the bottom of the panel. Enter your email and password.',
      },
      {
        q: 'How do I create an account?',
        a: 'From the same Sign In panel, choose "Create Account," then enter a display name, email, and password.',
      },
      {
        q: 'How do I confirm my email?',
        a: 'After creating an account, SpaceTec emails you a confirmation link. Click it to activate your account — your session becomes active automatically once it\'s confirmed.',
      },
      {
        q: "What happens if I don't receive the confirmation email?",
        a: 'Use the "Resend Confirmation Email" button shown on the confirmation-pending screen (or on the "Email Not Confirmed" screen if you try to sign in first). Check your spam folder if it still doesn\'t arrive.',
      },
      {
        q: 'How do I sign out?',
        a: 'Once signed in, the hamburger menu\'s bottom row shows your display name instead of Sign In. Open it to find a Sign Out button.',
      },
    ],
  },
  {
    id: 'satellites',
    title: 'SATELLITES',
    items: [
      {
        q: 'How does the Satellite Tracker work?',
        a: 'The homepage\'s Orbital Globe visualizes live satellite positions in 3D. Selecting "Live Satellite Tracking" from the Live Telemetry menu jumps you to it.',
      },
      {
        q: 'What is the Satellite Database?',
        a: 'A searchable database of satellites, opened from the hamburger menu\'s Database dropdown. It requires a signed-in account.',
      },
      {
        q: 'What are the satellite filters?',
        a: 'On the Orbital Globe, satellites can be filtered to Space Stations, Starlink, Weather, or All Active. Launchpads on the same globe can be filtered to All, Major, or Minor.',
      },
    ],
  },
  {
    id: 'space',
    title: 'SPACE',
    items: [
      {
        q: 'How does ISS Tracker work?',
        a: 'ISS Tracker shows the International Space Station\'s live position on a globe along with upcoming visible passes for your location, and is free to use without an account.',
      },
      {
        q: 'What is Space Weather?',
        a: 'A dedicated page summarizing current solar activity, solar wind, and geomagnetic conditions (including the Kp index and recent solar flares).',
      },
      {
        q: 'What is Space News?',
        a: 'A feed of recent space-related news articles with headlines, sources, and summaries.',
      },
      {
        q: 'What is Astronomy Tonight?',
        a: 'A page showing tonight\'s sky conditions for your location — sunrise/sunset times and current moon phase, illumination, and age, plus the next full and new moons.',
      },
      {
        q: 'What is the Celestial Database?',
        a: 'A public database of celestial bodies you can browse without an account.',
      },
    ],
  },
  {
    id: 'databases',
    title: 'DATABASES',
    items: [
      {
        q: 'Mission Database',
        a: 'A searchable database of spaceflight missions. Requires a signed-in account to open.',
      },
      {
        q: 'Astronaut Database',
        a: 'A searchable database of astronauts and cosmonauts. Requires a signed-in account to open.',
      },
      {
        q: 'Spacecraft Database',
        a: 'A searchable database of spacecraft. Requires a signed-in account to open.',
      },
      {
        q: 'Rocket Database',
        a: 'A searchable, sortable database of rockets with launch counts and specifications. Requires a signed-in account to open.',
      },
      {
        q: 'Space Agency Database',
        a: 'The homepage previews a handful of agencies; opening the full agency directory (with every agency\'s profile) requires a signed-in account.',
      },
      {
        q: 'Launchpad Directory',
        a: 'The homepage previews launchpads on the globe and in cards; opening the full launchpad directory requires a signed-in account.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'TROUBLESHOOTING',
    items: [
      {
        q: "A page isn't loading",
        a: 'Try refreshing the page and checking your internet connection. If the problem continues, let us know via the Feedback page.',
      },
      {
        q: "Data isn't appearing",
        a: 'Several pages pull live data from external sources and Supabase, which can occasionally be slow to respond. Give it a moment and refresh if a section stays empty.',
      },
      {
        q: "Satellite data isn't appearing",
        a: 'The Orbital Globe loads live orbital data on each visit. If it appears empty, refresh the page — this usually resolves it.',
      },
      {
        q: "I can't access a feature",
        a: 'Several features (full agency profiles, the launchpad directory, the Satellite Database, and the Mission/Astronaut/Spacecraft/Rocket databases) require a signed-in SpaceTec account. Sign in from the hamburger menu to unlock them.',
      },
      {
        q: "My account isn't working",
        a: "Make sure you've confirmed your email — an unconfirmed account can't sign in yet. Use the Resend Confirmation Email option if needed. Still stuck? Tell us about it on the Feedback page.",
      },
    ],
  },
];
