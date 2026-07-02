import axios from 'axios';
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

// Consistent seed strings for picsum.photos — same seed always returns the
// same photo. These seeds were chosen because picsum maps them to dark,
// cinematic images that sit well under a semi-transparent overlay with white
// text on top. Cycling through them per slide position guarantees each slide
// has a different but always on-brand background.
const SLIDE_SEEDS = ['dark', 'night', 'tech', 'purple', 'minimal', 'space', 'future', 'blur', 'glow', 'abstract'];

// Fetch a background photo as a base64 data-URI so satori can embed it
// without making its own HTTP request during rendering.
// picsum.photos is a free CDN — no API key needed, no usage limits.
async function fetchBackgroundDataUri(slideIndex: number): Promise<string | null> {
  const seed = SLIDE_SEEDS[slideIndex % SLIDE_SEEDS.length];
  // 540×675 = half resolution; sufficient for a background that's covered by
  // a dark overlay (1/4 the data of full 1080×1350, much faster to fetch)
  const url = `https://picsum.photos/seed/${seed}/540/675`;
  try {
    const res = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer', timeout: 8000 });
    const ct = (res.headers['content-type'] as string) || 'image/jpeg';
    const b64 = Buffer.from(res.data).toString('base64');
    return `data:${ct};base64,${b64}`;
  } catch {
    return null;
  }
}

export function parseCarouselSlides(script: string): string[] {
  return script
    .split('\n')
    .map((line) => line.replace(/^(?:slide\s*)?\d+\s*[:.\-]\s*/i, '').trim())
    .filter((line) => line.length > 0);
}

function fontSizeFor(text: string): number {
  if (text.length <= 55) return 68;
  if (text.length <= 90) return 56;
  if (text.length <= 140) return 46;
  if (text.length <= 200) return 38;
  return 32;
}

// ─── SHARED: full-bleed photo layer (position: absolute, behind everything) ─
function photoLayer(dataUri: string) {
  return {
    type: 'img',
    props: {
      src: dataUri,
      width: WIDTH,
      height: HEIGHT,
      style: { position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%' },
    },
  };
}

// ─── COVER SLIDE ─────────────────────────────────────────────────────────────
// Full-bleed photo + purple-to-transparent gradient overlay + large white title.
function buildCoverSlide(text: string, index: number, total: number, bg: string | null) {
  return {
    type: 'div',
    props: {
      style: {
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column' as const,
        backgroundColor: '#0f172a', // shown if photo fails
        fontFamily: 'Inter', position: 'relative', overflow: 'hidden',
      },
      children: [
        // Background photo
        ...(bg ? [photoLayer(bg)] : []),
        // Gradient overlay: strong at bottom, lighter at top
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              background: 'linear-gradient(to bottom, rgba(10,7,30,0.55) 0%, rgba(10,7,30,0.88) 100%)',
            },
            children: '',
          },
        },
        // Purple glow top-right
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', right: '-100px', top: '-100px',
              width: '500px', height: '500px', borderRadius: '250px',
              background: 'radial-gradient(circle, rgba(124,58,237,0.45) 0%, transparent 70%)',
            },
            children: '',
          },
        },
        // Content layer — column layout, sits on top of all absolute layers
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column' as const, padding: '80px',
            },
            children: [
              // Top row: counter + "AI TOOLS" pill
              {
                type: 'div',
                props: {
                  style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: { fontSize: 24, color: 'rgba(255,255,255,0.5)', fontWeight: 400 },
                        children: `${index + 1} / ${total}`,
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: 18, fontWeight: 700, color: '#c4b5fd',
                          backgroundColor: 'rgba(124,58,237,0.3)',
                          padding: '8px 22px', borderRadius: '24px', letterSpacing: '1.5px',
                        },
                        children: 'AI TOOLS',
                      },
                    },
                  ],
                },
              },
              // Main title — fills the centre
              {
                type: 'div',
                props: {
                  style: { flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: '36px' },
                  children: {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: fontSizeFor(text), color: '#ffffff',
                        fontWeight: 800, lineHeight: 1.18,
                      },
                      children: text,
                    },
                  },
                },
              },
              // Bottom: gradient line + swipe hint
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column' as const, gap: '18px' },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          height: '4px', width: '100px',
                          background: 'linear-gradient(90deg, #818cf8 0%, #ec4899 100%)',
                          borderRadius: '2px',
                        },
                        children: '',
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: { fontSize: 22, color: 'rgba(255,255,255,0.5)', fontWeight: 400 },
                        children: 'swipe for more >',
                      },
                    },
                  ],
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
// Photo background + heavy dark overlay + frosted white card holding the text.
function buildContentSlide(text: string, index: number, total: number, bg: string | null) {
  const pointNum = String(index);

  return {
    type: 'div',
    props: {
      style: {
        width: '100%', height: '100%', display: 'flex',
        backgroundColor: '#1e1b4b',
        fontFamily: 'Inter', position: 'relative', overflow: 'hidden',
      },
      children: [
        ...(bg ? [photoLayer(bg)] : []),
        // Dark overlay (heavier than cover so text card pops)
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              background: 'linear-gradient(160deg, rgba(15,7,40,0.78) 0%, rgba(15,7,40,0.92) 100%)',
            },
            children: '',
          },
        },
        // Content column (absolute, full-size)
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column' as const, padding: '72px 80px',
            },
            children: [
              // Top row: numbered badge + slide counter
              {
                type: 'div',
                props: {
                  style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '56px' },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          width: '72px', height: '72px', borderRadius: '36px',
                          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '32px', fontWeight: 800, color: '#ffffff',
                        },
                        children: pointNum,
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: { fontSize: 22, color: 'rgba(255,255,255,0.45)', fontWeight: 400 },
                        children: `${index + 1} / ${total}`,
                      },
                    },
                  ],
                },
              },
              // Frosted white card for the main text
              {
                type: 'div',
                props: {
                  style: {
                    flex: 1, backgroundColor: 'rgba(255,255,255,0.96)',
                    borderRadius: '28px', padding: '52px',
                    display: 'flex', flexDirection: 'column' as const,
                    justifyContent: 'center',
                  },
                  children: [
                    // Thin coloured top accent on the card
                    {
                      type: 'div',
                      props: {
                        style: {
                          height: '5px', width: '72px', borderRadius: '3px',
                          background: 'linear-gradient(90deg, #6366f1 0%, #ec4899 100%)',
                          marginBottom: '36px',
                        },
                        children: '',
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: fontSizeFor(text),
                          color: '#1e293b', fontWeight: 700, lineHeight: 1.35,
                        },
                        children: text,
                      },
                    },
                  ],
                },
              },
              // Bottom hint
              {
                type: 'div',
                props: {
                  style: {
                    marginTop: '28px', textAlign: 'right' as const,
                    fontSize: 22, color: 'rgba(255,255,255,0.42)', fontWeight: 400,
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
// Photo + strong gradient overlay (almost opaque) so it feels like pure
// purple/pink, then centred white CTA text.
function buildCtaSlide(text: string, index: number, total: number, bg: string | null) {
  return {
    type: 'div',
    props: {
      style: {
        width: '100%', height: '100%', display: 'flex',
        backgroundColor: '#4c1d95',
        fontFamily: 'Inter', position: 'relative', overflow: 'hidden',
      },
      children: [
        ...(bg ? [photoLayer(bg)] : []),
        // Very heavy gradient overlay — photo shows through just slightly for texture
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              background: 'linear-gradient(135deg, rgba(79,46,229,0.93) 0%, rgba(124,58,237,0.93) 45%, rgba(219,39,119,0.93) 100%)',
            },
            children: '',
          },
        },
        // Radial glow in the centre
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', top: '50%', left: '50%',
              width: '800px', height: '800px', borderRadius: '400px',
              marginTop: '-400px', marginLeft: '-400px',
              background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 60%)',
            },
            children: '',
          },
        },
        // Content column
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column' as const, padding: '80px',
              alignItems: 'center',
            },
            children: [
              // Slide counter (top-left)
              {
                type: 'div',
                props: {
                  style: { fontSize: 24, color: 'rgba(255,255,255,0.45)', fontWeight: 400, alignSelf: 'flex-start' as const },
                  children: `${index + 1} / ${total}`,
                },
              },
              // Centre: decorative circle + CTA text
              {
                type: 'div',
                props: {
                  style: {
                    flex: 1, display: 'flex', flexDirection: 'column' as const,
                    alignItems: 'center', justifyContent: 'center', gap: '40px',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          width: '120px', height: '120px', borderRadius: '60px',
                          backgroundColor: 'rgba(255,255,255,0.22)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '56px', fontWeight: 800, color: '#ffffff',
                        },
                        children: '*',
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: fontSizeFor(text), color: '#ffffff',
                          fontWeight: 800, textAlign: 'center' as const, lineHeight: 1.22,
                        },
                        children: text,
                      },
                    },
                  ],
                },
              },
              // Save prompt
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 24, color: 'rgba(255,255,255,0.5)',
                    fontWeight: 400, textAlign: 'center' as const,
                  },
                  children: 'save this post',
                },
              },
            ],
          },
        },
      ],
    },
  };
}

function buildSlideTree(text: string, index: number, total: number, bg: string | null) {
  if (index === 0) return buildCoverSlide(text, index, total, bg);
  if (index === total - 1) return buildCtaSlide(text, index, total, bg);
  return buildContentSlide(text, index, total, bg);
}

export async function renderSlidePng(text: string, index: number, total: number): Promise<Buffer> {
  const bg = await fetchBackgroundDataUri(index);
  const svg = await satori(buildSlideTree(text, index, total, bg) as Parameters<typeof satori>[0], {
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
