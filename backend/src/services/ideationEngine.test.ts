import { describe, expect, it } from 'vitest';
import { parseSingleIdeaJson } from './ideationEngine';

describe('parseSingleIdeaJson', () => {
  it('parses a clean single-object JSON response', () => {
    const text = JSON.stringify({
      hook: 'This AI tool just changed everything',
      script: 'Slide 1\nSlide 2\nSlide 3\nSlide 4\nSlide 5',
      caption: 'Save this for later.',
      tone: 'Hype',
    });
    const result = parseSingleIdeaJson(text);
    expect(result).toEqual({
      hook: 'This AI tool just changed everything',
      script: 'Slide 1\nSlide 2\nSlide 3\nSlide 4\nSlide 5',
      caption: 'Save this for later.',
      tone: 'Hype',
    });
  });

  it('extracts the JSON object even when wrapped in markdown fences or extra text', () => {
    const text = 'Here you go:\n```json\n' + JSON.stringify({
      hook: 'Hook',
      script: 'HOOK (0-3s): Hi.\nBODY (4-25s): Body.\nCTA (26-30s): Follow.',
      caption: 'Caption text.',
      tone: 'Educational',
    }) + '\n```';
    const result = parseSingleIdeaJson(text);
    expect(result).not.toBeNull();
    expect(result?.hook).toBe('Hook');
  });

  it('returns null for malformed JSON', () => {
    expect(parseSingleIdeaJson('not json at all')).toBeNull();
  });

  it('returns null when a required field is missing', () => {
    const text = JSON.stringify({ hook: 'Hook', script: 'Script', tone: 'Hype' });
    expect(parseSingleIdeaJson(text)).toBeNull();
  });
});
