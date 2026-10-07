import { ImageResponse } from 'next/og';

export const alt = 'Examina — AI tutor for CBSE board exam preparation';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#faf9f6',
          color: '#1a1a1a',
        }}
      >
        <div style={{ fontSize: 34, color: '#555' }}>CBSE Class 10 &amp; 12 · NCERT</div>
        <div style={{ fontSize: 84, fontWeight: 700, marginTop: 24, lineHeight: 1.05 }}>
          Examina
        </div>
        <div style={{ fontSize: 44, marginTop: 24, color: '#333' }}>
          An AI tutor for your CBSE board exams
        </div>
      </div>
    ),
    size,
  );
}
