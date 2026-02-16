const loadingStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  background: '#0a0a18',
  color: '#f1c40f',
  fontFamily: "'Space Mono', monospace",
  fontSize: '1.5rem',
} as const;

export default function LoadingScreen() {
  return <div style={loadingStyle}>Loading...</div>;
}
