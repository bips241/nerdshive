import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const BADGE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  ship_log: { bg: '#064e3b', text: '#34d399', label: '🚀 SHIP LOG' },
  code_sos: { bg: '#4c0519', text: '#fb7185', label: '🚨 CODE SOS' },
  architecture_rfc: { bg: '#1e1b4b', text: '#818cf8', label: '📐 SYSTEM RFC' },
  hackathon_crew: { bg: '#164e63', text: '#22d3ee', label: '⚡ HACKATHON CREW' },
  tech_showdown: { bg: '#3b0764', text: '#c084fc', label: '⚔️ TECH SHOWDOWN' },
  profile: { bg: '#451a03', text: '#fbbf24', label: '👨‍💻 DEVELOPER DOSSIER' },
  default: { bg: '#1e293b', text: '#94a3b8', label: '⚡ NERDSHIVE' },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'NerdShive';
  const desc = searchParams.get('desc') || 'The High-Velocity Developer Network';
  const type = searchParams.get('type') || 'default';
  const author = searchParams.get('author') || '';

  const badge = BADGE_COLORS[type] || BADGE_COLORS.default;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#090d16',
          backgroundImage:
            'radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.05) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(99, 102, 241, 0.15) 0%, transparent 60%)',
          padding: '60px 70px',
          fontFamily: 'sans-serif',
          color: '#f8fafc',
          border: '1px solid #1e293b',
        }}
      >
        {/* Header Branding */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#ffffff',
                boxShadow: '0 0 24px rgba(99, 102, 241, 0.5)',
              }}
            >
              N
            </div>
            <span style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>
              NerdShive
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 18px',
              borderRadius: '9999px',
              backgroundColor: badge.bg,
              color: badge.text,
              fontSize: '15px',
              fontWeight: '700',
              letterSpacing: '0.5px',
              border: `1px solid ${badge.text}33`,
            }}
          >
            {badge.label}
          </div>
        </div>

        {/* Center Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '30px' }}>
          <div
            style={{
              fontSize: title.length > 50 ? '44px' : '54px',
              fontWeight: '800',
              lineHeight: 1.15,
              color: '#ffffff',
              letterSpacing: '-1px',
              maxWidth: '1050px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: '22px',
              color: '#94a3b8',
              lineHeight: 1.4,
              maxWidth: '980px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {desc}
          </div>
        </div>

        {/* Footer Meta */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #1e293b',
            paddingTop: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {author ? (
              <span style={{ fontSize: '18px', color: '#cbd5e1', fontWeight: '600' }}>
                by @{author}
              </span>
            ) : (
              <span style={{ fontSize: '18px', color: '#cbd5e1', fontWeight: '600' }}>
                Open-Source Community
              </span>
            )}
          </div>

          <span style={{ fontSize: '16px', color: '#64748b', fontWeight: '500' }}>
            nerdshive.online
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
