import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import archiver from 'archiver';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

const WIDTH = 1080;
const HEIGHT = 1350;

const FONTS_DIR = join(dirname(require.resolve('@fontsource/inter/package.json')), 'files');
const regularFont = readFileSync(join(FONTS_DIR, 'inter-latin-400-normal.woff'));
const boldFont = readFileSync(join(FONTS_DIR, 'inter-latin-800-normal.woff'));

export function parseCarouselSlides(script: string): string[] {
  return script
    .split('\n')
    .map((line) => line.replace(/^(?:slide\s*)?\d+\s*[:.\-]\s*/i, '').trim())
    .filter((line) => line.length > 0);
}

function fontSizeFor(text: string, dark = false): number {
  const base = dark ? 6 : 0;
  if (text.length <= 55) return 68 + base;
  if (text.length <= 90) return 56 + base;
  if (text.length <= 140) return 46 + base;
  if (text.length <= 200) return 38 + base;
  return 32;
}

// ─── COVER SLIDE ────────────────────────────────────────────────────────────
// Dark navy background, glowing accent circles, left-aligned big white text.
function buildCoverSlide(text: string, index: number, total: number) {
  return {
    type: 'div',
    props: {
      style: {
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column' as const,
        backgroundColor: '#0f172a', padding: '80px', fontFamily: 'Inter',
        position: 'relative', overflow: 'hidden',
      },
      children: [
        // Glow blob — top-right corner (painted first so it sits behind content)
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', right: '-130px', top: '-130px',
              width: '580px', height: '580px', borderRadius: '290px',
              background: 'radial-gradient(circle at center, rgba(99,102,241,0.38) 0%, rgba(99,102,241,0) 68%)',
            },
            children: '',
          },
        },
        // Glow blob — bottom-left corner
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', left: '-90px', bottom: '-90px',
              width: '420px', height: '420px', borderRadius: '210px',
              background: 'radial-gradient(circle at center, rgba(219,39,119,0.32) 0%, rgba(219,39,119,0) 68%)',
            },
            children: '',
          },
        },
        // Top row: slide counter + "AI TOOLS" pill
        {
          type: 'div',
          props: {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
            children: [
              {
                type: 'div',
                props: {
                  style: { fontSize: 24, color: 'rgba(255,255,255,0.42)', fontWeight: 400 },
                  children: `${index + 1} / ${total}`,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 18, color: '#a5b4fc', fontWeight: 700,
                    backgroundColor: 'rgba(99,102,241,0.2)',
                    padding: '8px 20px', borderRadius: '20px', letterSpacing: '1.5px',
                  },
                  children: 'AI TOOLS',
                },
              },
            ],
          },
        },
        // Main text — fills remaining vertical space, vertically centred
        {
          type: 'div',
          props: {
            style: {
              flex: 1, display: 'flex', alignItems: 'center',
              paddingTop: '40px', paddingBottom: '40px',
            },
            children: {
              type: 'div',
              props: {
                style: {
                  fontSize: fontSizeFor(text), color: '#ffffff',
                  fontWeight: 800, lineHeight: 1.2,
                },
                children: text,
              },
            },
          },
        },
        // Bottom: gradient accent bar + swipe hint
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    height: '4px', width: '96px',
                    background: 'linear-gradient(90deg, #818cf8 0%, #ec4899 100%)',
                    borderRadius: '2px',
                  },
                  children: '',
                },
              },
              {
                type: 'div',
                props: {
                  style: { fontSize: 22, color: 'rgba(255,255,255,0.42)', fontWeight: 400 },
                  children: 'swipe for more >',
                },
              },
            ],
          },
        },
      ],
    },
  };
}

// ─── CONTENT SLIDE ───────────────────────────────────────────────────────────
// Clean off-white background. Left rainbow accent bar. Bold numbered badge.
// Faint oversized number watermark for visual depth.
function buildContentSlide(text: string, index: number, total: number) {
  // The badge shows the content point number (1, 2, 3…) — index 0 is cover,
  // so the first content slide at index 1 shows badge "1".
  const pointNumber = String(index);

  return {
    type: 'div',
    props: {
      style: {
        width: '100%', height: '100%', display: 'flex', flexDirection: 'row' as const,
        backgroundColor: '#f8fafc', fontFamily: 'Inter',
        position: 'relative', overflow: 'hidden',
      },
      children: [
        // Faint oversized watermark number — absolutely positioned behind content
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', right: '-10px', bottom: '-80px',
              fontSize: '420px', fontWeight: 800,
              color: 'rgba(99,102,241,0.055)', lineHeight: 1,
            },
            children: pointNumber,
          },
        },
        // Left rainbow accent bar (flex-row child, full-height self-stretching)
        {
          type: 'div',
          props: {
            style: {
              width: '12px', flexShrink: 0,
              background: 'linear-gradient(180deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
            },
            children: '',
          },
        },
        // Content area
        {
          type: 'div',
          props: {
            style: {
              flex: 1, display: 'flex', flexDirection: 'column' as const,
              padding: '80px 80px 70px 88px',
            },
            children: [
              // Top row: numbered badge + slide counter
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '56px',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          width: '68px', height: '68px', borderRadius: '34px',
                          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '30px', fontWeight: 800, color: '#ffffff',
                        },
                        children: pointNumber,
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: { fontSize: 22, color: '#94a3b8', fontWeight: 400 },
                        children: `${index + 1} / ${total}`,
                      },
                    },
                  ],
                },
              },
              // Main content text
              {
                type: 'div',
                props: {
                  style: { flex: 1, display: 'flex', alignItems: 'center' },
                  children: {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: fontSizeFor(text, true),
                        color: '#1e293b', fontWeight: 700, lineHeight: 1.35,
                      },
                      children: text,
                    },
                  },
                },
              },
              // Bottom-right swipe hint
              {
                type: 'div',
                props: {
                  style: {
                    textAlign: 'right' as const, fontSize: 22,
                    color: '#94a3b8', fontWeight: 400, marginTop: '32px',
                  },
                  children: 'swipe >',
                },
              },
            ],
          },
        },
      ],
    },
  };
}

// ─── CTA SLIDE ───────────────────────────────────────────────────────────────
// Vibrant indigo→violet→pink gradient. Centred CTA text with a decorative
// circle accent above it.
function buildCtaSlide(text: string, index: number, total: number) {
  return {
    type: 'div',
    props: {
      style: {
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column' as const,
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 45%, #db2777 100%)',
        padding: '80px', fontFamily: 'Inter',
        position: 'relative', overflow: 'hidden',
      },
      children: [
        // Soft white radial glow (top-left, behind content)
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', left: '-160px', top: '-160px',
              width: '660px', height: '660px', borderRadius: '330px',
              background: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 62%)',
            },
            children: '',
          },
        },
        // Slide counter
        {
          type: 'div',
          props: {
            style: { fontSize: 24, color: 'rgba(255,255,255,0.42)', fontWeight: 400 },
            children: `${index + 1} / ${total}`,
          },
        },
        // Centre: decorative circle + CTA text
        {
          type: 'div',
          props: {
            style: {
              flex: 1, display: 'flex', flexDirection: 'column' as const,
              alignItems: 'center', justifyContent: 'center', gap: '36px',
            },
            children: [
              // White frosted circle
              {
                type: 'div',
                props: {
                  style: {
                    width: '116px', height: '116px', borderRadius: '58px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '54px', fontWeight: 800, color: '#ffffff',
                  },
                  children: '*',
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: fontSizeFor(text),
                    color: '#ffffff', fontWeight: 800,
                    textAlign: 'center' as const, lineHeight: 1.25,
                  },
                  children: text,
                },
              },
            ],
          },
        },
        // Bottom save prompt
        {
          type: 'div',
          props: {
            style: {
              textAlign: 'center' as const, fontSize: 22,
              color: 'rgba(255,255,255,0.52)', fontWeight: 400,
            },
            children: 'save this post',
          },
        },
      ],
    },
  };
}

function buildSlideTree(text: string, index: number, total: number) {
  if (index === 0) return buildCoverSlide(text, index, total);
  if (index === total - 1) return buildCtaSlide(text, index, total);
  return buildContentSlide(text, index, total);
}

export async function renderSlidePng(text: string, index: number, total: number): Promise<Buffer> {
  const svg = await satori(buildSlideTree(text, index, total) as Parameters<typeof satori>[0], {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: 'Inter', data: regularFont, weight: 400, style: 'normal' },
      { name: 'Inter', data: boldFont, weight: 800, style: 'normal' },
    ],
  });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } });
  return Buffer.from(resvg.render().asPng());
}

export async function renderCarouselZip(slides: string[]): Promise<Buffer> {
  const pngs = await Promise.all(slides.map((text, i) => renderSlidePng(text, i, slides.length)));

  const archive = new archiver.ZipArchive();
  const chunks: Buffer[] = [];
  archive.on('data', (chunk: Buffer) => chunks.push(chunk));

  pngs.forEach((png, i) => {
    archive.append(png, { name: `slide-${i + 1}.png` });
  });
  await archive.finalize();

  return Buffer.concat(chunks);
}
