// SocialIcons.js
//
// Hand-drawn, monochrome, outline-style versions of the platform marks —
// no colorful brand fills, no glow, styled to sit inside SpaceTec's
// black/white/gray UI. Each stays recognizable as its platform while
// using only `currentColor`, so hover/theme color is controlled entirely
// via CSS on the wrapping button.

export function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4.5 3.2H8.6L12 8.1L15.9 3.2H18.7L13.2 10L19.3 20.8H15.2L11.5 15.3L7.1 20.8H4.3L10.3 13.4L4.5 3.2Z" fill="currentColor" />
    </svg>
  );
}

export function DiscordIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M8 5.5C8 5.5 6.1 6 4.7 7.4C3.3 9.3 2.8 13 3.2 15.8C3.2 15.8 5.1 17.3 7.1 17.8L7.6 16.6C6.6 16.2 5.7 15.7 5 15.1C5.7 15.5 6.8 16.1 8 16.5C9.2 16.9 10.5 17.1 12 17.1C13.5 17.1 14.8 16.9 16 16.5C17.2 16.1 18.3 15.5 19 15.1C18.3 15.7 17.4 16.2 16.4 16.6L16.9 17.8C18.9 17.3 20.8 15.8 20.8 15.8C21.2 13 20.7 9.3 19.3 7.4C17.9 6 16 5.5 16 5.5L15.5 6.6C14.5 6.3 13.3 6.1 12 6.1C10.7 6.1 9.5 6.3 8.5 6.6L8 5.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="12.2" r="1.15" fill="currentColor" />
      <circle cx="15" cy="12.2" r="1.15" fill="currentColor" />
    </svg>
  );
}

export function YouTubeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3" y="6" width="18" height="12" rx="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.4 9.6L14.8 12L10.4 14.4V9.6Z" fill="currentColor" />
    </svg>
  );
}

export function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16.6" cy="7.4" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function GitHubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 3.2C7.36 3.2 3.6 6.96 3.6 11.6C3.6 15.31 6 18.44 9.32 19.55C9.74 19.63 9.89 19.37 9.89 19.14C9.89 18.94 9.88 18.29 9.88 17.6C7.6 18.08 7.12 16.63 7.12 16.63C6.75 15.69 6.21 15.44 6.21 15.44C5.47 14.93 6.27 14.94 6.27 14.94C7.09 15 7.52 15.79 7.52 15.79C8.24 17.02 9.41 16.67 9.87 16.46C9.94 15.94 10.15 15.59 10.38 15.39C8.56 15.19 6.64 14.49 6.64 11.32C6.64 10.42 6.96 9.69 7.5 9.11C7.42 8.91 7.13 8.07 7.58 6.94C7.58 6.94 8.28 6.72 9.87 7.79C10.54 7.61 11.26 7.51 11.98 7.51C12.7 7.51 13.42 7.61 14.09 7.79C15.68 6.72 16.38 6.94 16.38 6.94C16.83 8.07 16.54 8.91 16.46 9.11C17 9.69 17.32 10.42 17.32 11.32C17.32 14.5 15.4 15.18 13.57 15.39C13.86 15.63 14.12 16.11 14.12 16.84C14.12 17.89 14.11 18.86 14.11 19.14C14.11 19.37 14.26 19.64 14.69 19.55C18.01 18.43 20.4 15.31 20.4 11.6C20.4 6.96 16.64 3.2 12 3.2Z"
        fill="currentColor"
      />
    </svg>
  );
}
