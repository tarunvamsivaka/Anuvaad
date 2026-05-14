import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Anuvaad AI Code Translator';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 64,
          background: '#09090b',
          color: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          borderTop: '20px solid #d97706', // Amber-600
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ 
            display: 'flex', 
            background: '#d97706', 
            padding: '20px', 
            borderRadius: '24px', 
            marginRight: '24px' 
          }}>
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7V4h16v3M9 20h6M12 4v16" />
            </svg>
          </div>
          <span style={{ fontSize: 90, fontWeight: 800, letterSpacing: '-0.05em' }}>Anuvaad</span>
        </div>
        <p style={{ fontSize: 36, color: '#a1a1aa', maxWidth: '80%', textAlign: 'center', lineHeight: 1.4 }}>
          Translate complex logic into plain English.<br/>
          <span style={{ color: '#d97706' }}>35+ Languages Supported.</span>
        </p>
      </div>
    ),
    {
      ...size,
    }
  );
}
