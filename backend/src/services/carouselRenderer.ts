import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import archiver from 'archiver';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

const WIDTH = 1080;
const HEIGHT = 1350;

// require.resolve walks Node's normal module resolution instead of assuming
// a fixed __dirname depth -- needed because this package sits at the repo
// root in local dev (npm workspaces hoisting) but flat under /app in the
// production Docker image (backend installed standalone), two different
// nesting depths relative to this file.
const FONTS_DIR = join(dirname(require.resolve('@fontsource/inter/package.json')), 'files');
const regularFont = readFileSync(join(FONTS_DIR, 'inter-latin-400-normal.woff'));
const boldFont = readFileSync(join(FONTS_DIR, 'inter-latin-800-normal.woff'));

// Strips a leading "Slide 1:" or bare "1." style label Gemini sometimes adds
// (inconsistently -- neither is guaranteed), keeping just the slide's actual
// text since the rendered image already shows its own "1 / 5" indicator.
export function parseCarouselSlides(script: string): string[] {
  return script
    .split('\n')
    .map((line) => line.replace(/^(?:slide\s*)?\d+\s*[:.\-]\s*/i, '').trim())
    .filter((line) => line.length > 0);
}

// Longer slide text needs a smaller font to avoid overflowing the fixed
// 1080x1350 canvas -- satori has no auto-shrink-to-fit, so size by hand.
function fontSizeFor(text: string): number {
  if (text.length <= 80) return 60;
  if (text.length <= 150) return 48;
  if (text.length <= 220) return 40;
  return 34;
}

function buildSlideTree(text: string, index: number, total: number) {
  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)',
        padding: '90px',
        fontFamily: 'Inter',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { fontSize: 26, color: 'rgba(255,255,255,0.65)', fontWeight: 400 },
            children: `${index + 1} / ${total}`,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
            children: {
              type: 'div',
              props: {
                style: {
                  fontSize: fontSizeFor(text),
                  color: 'white',
                  fontWeight: 800,
                  textAlign: 'center',
                  lineHeight: 1.3,
                },
                children: text,
              },
            },
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: 26,
              color: 'rgba(255,255,255,0.65)',
              fontWeight: 400,
              textAlign: 'right',
            },
            children: index < total - 1 ? 'swipe for more >' : 'save this post',
          },
        },
      ],
    },
  };
}

export async function renderSlidePng(text: string, index: number, total: number): Promise<Buffer> {
  // satori's types come from React's ReactNode, but it doesn't actually need
  // React at runtime -- it just wants a plain JSX-shaped object tree, hence
  // the cast rather than pulling in @types/react for a backend-only project.
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
