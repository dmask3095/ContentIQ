import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import OpenAI from 'openai';

// Dormant until ANTHROPIC_API_KEY/OPENAI_API_KEY have billing — Gemini is the
// active ideation/caption provider for now (see ideationEngine.ts). Kept
// wired up so re-enabling either is a small, obvious change later.
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
// Every pinned model we tried (2.0-flash: 0 free quota; 2.5-flash and
// 2.5-flash-lite: capped at 20 requests/day each, both exhausted during
// testing) hit a wall. The "-latest" alias always resolves to whatever
// Google currently designates as the efficient/lite flash model, which
// sidesteps pinning to a specific deprecated/quota-zero version over time.
export const GEMINI_MODEL = 'gemini-flash-lite-latest';

export const httpClient = axios.create({
  timeout: 10_000,
  headers: { 'User-Agent': 'ContentIQ/0.1' },
});

export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
export const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID || '';
export const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '';
