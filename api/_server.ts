import express from 'express';
export const app = express();
const PORT = Number(process.env.PORT) || 3000;

// --- SERVER READINESS STATE ---
let isAppReady = false;

// --- CRITICAL: IMMEDIATE HEALTH CHECK & READINESS MIDDLEWARE ---
// This must be registered and listening BEFORE any heavy imports or middleware
app.get('/api/ping', (_req, res) => res.status(200).send('pong'));

// Readiness middleware for API routes
app.use('/api', (req, res, next) => {
  if (!isAppReady && req.path !== '/ping' && !req.path.startsWith('/health')) {
    return res.status(503).json({ 
      success: false, 
      error: 'SERVER_STARTING', 
      message: 'Server is still initializing. Please wait a few seconds and try again.' 
    });
  }
  next();
});

app.get(['/api', '/api/'], (_req, res) => res.status(200).json({ 
  status: isAppReady ? 'online' : 'initializing', 
  service: 'SomnoAI Digital Sleep Lab API',
  version: '1.2.5',
  timestamp: new Date().toISOString()
}));

const isProd =
  process.env.NODE_ENV === 'production' ||
  process.argv.includes('--production') ||
  process.env.K_SERVICE !== undefined;
const isVercel = process.env.VERCEL === '1';

if (!isVercel || process.env.K_SERVICE) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] API listening on port ${PORT} (isProd: ${isProd}, isVercel: ${isVercel})`);
  });
}

import compression from 'compression';
import cors from 'cors';
console.log('[SERVER] _server.ts loading heavy modules...');
import crypto from 'crypto';
import { Resend } from 'resend';
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { writeAuditLog, auditLogger } from '../src/services/auditLog.js';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import * as otplib from 'otplib';
const authenticator = otplib.authenticator;
const otp = authenticator;
import QRCode from 'qrcode';
import validator from 'validator';
import { requireAdminFromRequest } from '../src/lib/admin-auth.js';
import { getUserFromRequest, requireUserFromRequest, requireUserMiddleware, isAdmin } from '../src/lib/auth-utils.js';
import { adminServices } from '../src/services/adminServices.js';
import { OFFICIAL_LINKS } from '../src/constants/links.js';
import { encrypt, decrypt } from '../src/lib/encryption.js';

// --- Auth Core Helpers ---
export function safeHandler(fn: any) {
  return async (req: any, res: any) => {
    const start = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[SAFE-HANDLER] [${requestId}] Starting ${req.method} ${req.path}`);
    try {
      await Promise.race([
        fn(req, res),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request Timeout')), 25000))
      ]);
      const duration = Date.now() - start;
      console.log(`[SAFE-HANDLER] [${requestId}] Completed ${req.method} ${req.path} in ${duration}ms`);
      if (duration > 5000) {
        console.warn(`[SAFE-HANDLER] [${requestId}] Slow request: ${req.method} ${req.path} took ${duration}ms`);
      }
    } catch (err: any) {
      const duration = Date.now() - start;
      console.error(`[SAFE-HANDLER] [${requestId}] Error after ${duration}ms:`, err);
      console.error("STACK TRACE:", err.stack);
      
      let status = 500;
      let errorCode = "INTERNAL_ERROR";
      
      if (err.message && (err.message.includes('Unauthorized') || err.message.includes('Authentication required'))) {
        status = 401;
        errorCode = "UNAUTHORIZED";
      } else if (err.message && err.message.includes('Account Blocked')) {
        status = 403;
        errorCode = "FORBIDDEN";
      } else if (err.message && err.message.includes('not found')) {
        status = 404;
        errorCode = "NOT_FOUND";
      } else if (err.message && err.message.includes('Request Timeout')) {
        status = 504;
        errorCode = "GATEWAY_TIMEOUT";
      } else if (err.message && (err.message.includes('Database not configured') || err.message.includes('Supabase client is null'))) {
        status = 400;
        errorCode = "BAD_REQUEST";
      }
      
      if (!res.headersSent) {
        res.status(status).json({
          success: false,
          error: errorCode,
          message: err.message,
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
      }
    }
  };
}

export function validateEnv(required: string[]) {
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing ENV: ${key}`);
    }
  }
}
// -------------------------

// --- Validation Helpers ---
function validateEmail(email: string): boolean {
  return validator.isEmail(email);
}

function sanitizeEmail(email: string): string {
  return validator.normalizeEmail(email) || email;
}
// -------------------------

import { serverEmailService } from '../src/services/serverEmailService.js';

const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  console.error('[SERVER] dotenv.config() failed:', dotenvResult.error);
} else {
  console.log('[SERVER] dotenv.config() successful');
}

class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = 0;
  
  constructor(
    private failureThreshold = 5,
    private resetTimeout = 30000,
    private halfOpenMaxSuccess = 2
  ) {}

  async execute<T>(action: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (error: any) {
      const isRateLimit = error?.message?.toLowerCase().includes('429') || error?.message?.toLowerCase().includes('rate limit');
      if (!isRateLimit && error.name !== 'AbortError') {
        this.onFailure();
      }
      throw error;
    }
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.halfOpenMaxSuccess) {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      console.warn(`[CircuitBreaker] State changed to OPEN. Next attempt at ${new Date(this.nextAttempt).toISOString()}`);
    }
  }
}

const groqCircuitBreaker = new CircuitBreaker(5, 30000);
const geminiCircuitBreaker = new CircuitBreaker(5, 30000);
const fetchCircuitBreaker = new CircuitBreaker(5, 30000);

// --- AI Response Caching ---
const aiCache = new Map<string, { result: any, expires: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function getCachedAIResponse(prompt: string, model?: string): any | null {
  const key = `${model || 'default'}:${prompt}`;
  const cached = aiCache.get(key);
  if (cached && cached.expires > Date.now()) {
    console.log(`[AI Cache] Hit for: ${key.substring(0, 50)}...`);
    return cached.result;
  }
  return null;
}

function setCachedAIResponse(prompt: string, result: any, model?: string) {
  const key = `${model || 'default'}:${prompt}`;
  aiCache.set(key, {
    result,
    expires: Date.now() + CACHE_TTL
  });
  // Limit cache size
  if (aiCache.size > 500) {
    const firstKey = aiCache.keys().next().value;
    if (firstKey) aiCache.delete(firstKey);
  }
}
// -------------------------

// --- AI Error Logging ---
async function logAIError(service: string, error: any, context: any) {
  console.error(`[AI ERROR] ${service}:`, error);
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('ai_logs').insert({
        service,
        error_message: error?.message || String(error),
        error_stack: error?.stack,
        context,
        level: 'error',
        created_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('[AI ERROR LOGGING FAILED]', e);
    }
  }
}
// -------------------------

// Helper for Groq content generation
async function generateWithGroq(params: any, maxRetries = 2): Promise<any> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API Key not configured');
  }

  const groq = new Groq({ apiKey });
  let lastError: any = null;
  
  const baseSystemInstruction = params.config?.systemInstruction || "";
  const somnoContext = `\n\nYou are SomnoAI, an advanced AI sleep coach and digital sleep lab assistant. Your branding and core identity are based on the SomnoAI platform (https://sleepsomno.com). You have a professional, empathetic, and scientifically-backed persona. You are highly capable, precise, and helpful.`;
  const systemInstruction = baseSystemInstruction + somnoContext;
  
    const prompt = typeof params.contents === 'string' ? params.contents : JSON.stringify(params.contents);
    const model = params.model || "llama-3.3-70b-versatile";

    // Check cache
    const cached = getCachedAIResponse(prompt, model);
    if (cached) return cached;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[AI] Attempting generation with Groq (Attempt ${attempt + 1}/${maxRetries})`);
        
        const controller = new AbortController();
        const timeoutMs = 25000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const actionPromise = groqCircuitBreaker.execute(async () => {
            return await groq.chat.completions.create({
              model: model,
              messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: prompt }
              ],
              max_completion_tokens: params.config?.maxOutputTokens || 6861,
              temperature: params.config?.temperature ?? 1,
              top_p: params.config?.topP ?? 1,
              reasoning_effort: params.config?.reasoningEffort || "medium",
              stop: params.config?.stop || null,
              stream: params.stream || false,
            } as any, { signal: controller.signal });
          });

          const fallbackTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Groq API request timed out (fallback)')), timeoutMs + 2000)
          );

          const response = await Promise.race([actionPromise, fallbackTimeoutPromise]) as any;

          if (params.stream) {
            // For streams, we don't clear the timeout here. It will abort the stream if it takes > 45s.
            // We attach the timeoutId so the caller can clear it when done.
            (response as any).timeoutId = timeoutId;
            return response;
          }

          clearTimeout(timeoutId);

          const result = {
            text: (response.choices[0]?.message?.content || "").trim()
          };

          // Cache the result
          setCachedAIResponse(prompt, result, model);

          return result;
      } catch (error: any) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error: any) {
      lastError = error;
      const errorMessage = String(error?.message || '').toLowerCase();
      
      const isRetryable = errorMessage.includes('rate limit') || 
                          errorMessage.includes('429') || 
                          errorMessage.includes('500') || 
                          errorMessage.includes('502') || 
                          errorMessage.includes('503') || 
                          errorMessage.includes('504') ||
                          errorMessage.includes('timeout') ||
                          errorMessage.includes('abort');

      if (isRetryable && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500; // Exponential backoff with jitter
        console.warn(`[AI] Groq retryable error (${errorMessage}). Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      console.error(`[AI] Error with Groq:`, error?.message || 'Unknown error');
      await logAIError('Groq', error, { params, attempt });
      break; 
    }
  }
  throw lastError;
}

// Helper for Gemini content generation with exponential backoff and fallback
async function generateWithFallback(params: any, maxRetries = 2): Promise<{ text: string }> {
  const timeoutMs = 25000; // Reduced to prevent 504
  
  const executeWithTimeout = async () => {
    // Prefer Groq if available
    if (process.env.GROQ_API_KEY) {
      try {
        const response = await generateWithGroq(params, maxRetries);
        return { text: response.text || "" };
      } catch (error) {
        console.warn('[AI] Groq failed, falling back to Gemini if available');
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      if (process.env.GROQ_API_KEY) {
        throw new Error('Groq failed and Gemini API Key not configured');
      }
      throw new Error('AI service not configured (Missing GROQ_API_KEY or GEMINI_API_KEY)');
    }

    const ai = new GoogleGenAI({ apiKey });
    let lastError: any = null;
    
    const baseSystemInstruction = params.config?.systemInstruction || "";
    const somnoContext = `\n\nYou are SomnoAI, an advanced AI sleep coach and digital sleep lab assistant. Your branding and core identity are based on the SomnoAI platform (https://sleepsomno.com). You have a professional, empathetic, and scientifically-backed persona. You are highly capable, precise, and helpful.`;
    const systemInstruction = baseSystemInstruction + somnoContext;
    
    const contents = params.contents;
    const prompt = typeof contents === 'string' ? contents : JSON.stringify(contents);
    const model = "gemini-3-flash-preview";

    // Check cache
    const cached = getCachedAIResponse(prompt, model);
    if (cached) return cached;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[AI] Attempting generation with Gemini (Attempt ${attempt + 1}/${maxRetries})`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        try {
          const response = await geminiCircuitBreaker.execute(async () => {
            return await ai.models.generateContent({
              model: model,
              contents: contents,
              config: {
                systemInstruction: systemInstruction,
                maxOutputTokens: params.config?.maxOutputTokens || 1024,
                temperature: params.config?.temperature || 0.7,
                // @ts-ignore - The SDK supports signal but types might be outdated
                signal: controller.signal
              }
            });
          });

          clearTimeout(timeoutId);

          const result = {
            text: (response.text || "").trim()
          };

          // Cache the result
          setCachedAIResponse(prompt, result, model);

          return result;
        } catch (error: any) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error: any) {
        lastError = error;
        const errorMessage = String(error?.message || '').toLowerCase();
        
        const isRetryable = errorMessage.includes('quota') || 
                            errorMessage.includes('429') || 
                            errorMessage.includes('limit') ||
                            errorMessage.includes('500') || 
                            errorMessage.includes('502') || 
                            errorMessage.includes('503') || 
                            errorMessage.includes('504') ||
                            errorMessage.includes('timeout') ||
                            errorMessage.includes('abort');

        if (isRetryable && attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500; // Exponential backoff with jitter
          console.warn(`[AI] Gemini retryable error (${errorMessage}). Retrying in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        console.error(`[AI] Error with Gemini:`, error?.message || 'Unknown error');
        await logAIError('Gemini', error, { params, attempt });
        break; 
      }
    }
    throw lastError;
  };

  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('AI request timed out')), timeoutMs)
  );

  return Promise.race([executeWithTimeout(), timeoutPromise]) as Promise<{ text: string }>;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

console.log('[DEBUG] Supabase URL set:', !!supabaseUrl);
console.log('[DEBUG] Supabase Service Key set:', !!supabaseServiceKey);
const supabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

import { sendTelegramMessage } from '../src/lib/telegram.js';
import { supabaseAdmin } from '../src/services/supabaseAdmin.js';

// Warm up Supabase connection
if (supabaseAdmin && typeof supabaseAdmin.from === 'function') {
  supabaseAdmin.from('profiles').select('id').limit(1).then(() => {
    console.log('[SERVER] Supabase connection warmed up');
  }).catch((err: any) => {
    console.warn('[SERVER] Supabase warmup failed (this is expected if DB not yet ready):', err.message);
  });
}

// Enable Gzip compression
app.use(compression());

// Request Logger for Debugging 504s
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[REQUEST] ${new Date().toISOString()} - ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  // Add Server-Timing header
  res.setHeader('Server-Timing', `total;dur=0`); 
  next();
});

// Enable CORS with refined origins
const allowedOrigins = [
  'https://sleepsomno.com',
  'https://www.sleepsomno.com',
  'https://digitalsleeplab.com',
  'https://www.digitalsleeplab.com',
  process.env.APP_URL
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
}));

let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'none'"],
      "img-src": ["'self'", "data:", "blob:", "https://*.supabase.co", "https://*.sleepsomno.com", "https://picsum.photos", "https://*.google-analytics.com", "https://*.googletagmanager.com", "https://*.gstatic.com", "https://*.run.app"],
      "script-src": ["'self'", "'unsafe-inline'", "https://*.googletagmanager.com", "https://app.livechatai.com", "https://challenges.cloudflare.com", "https://*.run.app", "https://*.google-analytics.com", "https://static.cloudflareinsights.com"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
      "frame-src": ["'self'", "https://challenges.cloudflare.com", "https://app.livechatai.com", "https://*.supabase.co"],
      "frame-ancestors": ["'self'", "https://*.google.com", "https://*.aistudio.google", "https://*.run.app"],
      "connect-src": ["'self'", "https://*.supabase.co", "https://*.google-analytics.com", "https://*.googletagmanager.com", "wss://*.supabase.co", "https://app.livechatai.com", "https://api.elevenlabs.io", "wss://api.elevenlabs.io", "https://connectors.windsor.ai", "https://*.run.app", "wss://*.run.app", "https://*.google-analytics.com", "https://stats.g.doubleclick.net", "https://cloudflareinsights.com"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "manifest-src": ["'self'"],
      "upgrade-insecure-requests": [],
    },
  },
  crossOriginEmbedderPolicy: false,
  xContentTypeOptions: true,
  xFrameOptions: { action: "sameorigin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  dnsPrefetchControl: { allow: false },
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" }
}));

// Permissions Policy
app.use((_req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  next();
});

// Cookie Security Middleware
app.use((_req, res, next) => {
  const originalCookie = res.cookie.bind(res);
  res.cookie = function(name: string, value: any, options: any = {}) {
    const secureOptions = {
      ...options,
      httpOnly: options.httpOnly !== undefined ? options.httpOnly : true,
      secure: options.secure !== undefined ? options.secure : true,
      sameSite: options.sameSite !== undefined ? options.sameSite : 'strict'
    };
    return originalCookie(name, value, secureOptions);
  };
  next();
});

// Relaxed CSRF for API routes in development/preview
app.use('/api', (req: any, res: any, next: any) => {
  // Completely bypass CSRF for API routes in non-production or preview environments
  if (process.env.NODE_ENV !== 'production' || (req.hostname && req.hostname.includes('.run.app'))) {
    return next();
  }
  
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const host = req.headers.host;

    // Allow if origin matches host or if it's from a trusted preview URL
    const isTrusted = !origin || 
                      (origin && origin.includes(host || '')) || 
                      (referer && referer.includes(host || '')) ||
                      (origin && origin.includes('.run.app')) ||
                      (referer && referer.includes('.run.app'));

    if (!isTrusted) {
      console.warn(`[SECURITY] Potential CSRF attempt from origin: ${origin}, referer: ${referer}`);
      return res.status(403).json({ error: 'Forbidden: CSRF protection triggered' });
    }
  }
  next();
});

// Rate Limiting - Tiered approach for security and performance
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 300, // 300 requests per minute
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 requests per 15 minutes for sensitive forms
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts from this IP, please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 login attempts per 15 minutes
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' }
});

const webauthnLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20, // 20 passkey operations per hour
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: "Too many passkey operations, please try again later." }
});

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 sensitive requests per 15 minutes
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: "Too many sensitive requests, please try again later." }
});

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 10, // 10 AI requests per minute
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: "AI rate limit exceeded, please wait a minute." }
});

// Apply rate limiters to specific routes
app.use('/api/contact', strictLimiter);
app.use('/api/subscribe', strictLimiter);
app.use('/api/audit/login', authLimiter);
app.use('/api/audit/auth-signup', authLimiter);
app.use('/api/chat', aiLimiter);
app.use('/api/analyze-sleep', aiLimiter);
app.use('/api/sleep-recommendation', aiLimiter);
app.use('/api/ai/inference', aiLimiter);
app.use('/api/health', generalLimiter);
app.use('/api/webauthn/*', webauthnLimiter);
app.use('/api/2fa/*', sensitiveLimiter);
app.use('/api/admin/*', sensitiveLimiter);

  // Regular JSON parsing for other routes
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.post(['/api/subscribe', '/api/subscribe/'], async (req: any, res: any) => {
    console.log('Received subscribe request:', req.method, req.url);
    let { email } = req.body;
    
    if (!email || typeof email !== 'string' || !validateEmail(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }

    email = sanitizeEmail(email);

    try {
      // In a real app, you would save this to a database or newsletter service like Mailchimp/Resend
      // For now, we'll just log it and return success
      console.log(`New newsletter subscription request`);
      
      // Optional: Send a welcome email if Resend is configured
      if (resend) {
        try {
          await resend.emails.send({
            from: 'SomnoAI <onboarding@resend.dev>',
            to: email,
            subject: 'Welcome to SomnoAI Newsletter',
            html: `
              <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
                <h2>Welcome to SomnoAI</h2>
                <p>Thank you for subscribing to our newsletter. You will now receive the latest updates on sleep science and AI.</p>
                <p>Best regards,<br>The SomnoAI Team</p>
              </div>
            `
          });
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          // Don't fail the subscription if the welcome email fails
        }
      }

      res.status(200).json({ success: true, message: 'Subscribed successfully' });
    } catch (error) {
      console.error('Subscription error:', error);
      res.status(400).json({ error: 'Failed to subscribe' });
    }
  });

  app.post(['/api/contact', '/api/contact/'], safeHandler(async (req: any, res: any) => {
    console.log('Received contact request:', req.method, req.url);
    let { subject, email, message } = req.body;
    
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }

    email = sanitizeEmail(email);

    try {
      // Generate verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Store in contact_verifications table
      if (supabase) {
        const { error: dbError } = await supabase.from('contact_verifications').insert([{
          email,
          subject,
          message,
          verification_code: verificationCode,
          is_verified: false
        }]);
        
        if (dbError) {
          console.error('Failed to store contact verification:', dbError);
          throw new Error('Failed to process contact request');
        }
      } else {
        throw new Error('Database not configured');
      }

      // Send verification email
      await serverEmailService.sendContactVerification(email, verificationCode);

      res.status(200).json({ 
        success: true, 
        verificationRequired: true,
        message: 'Verification code sent to your email'
      });
    } catch (error: any) {
      console.error('Failed to process contact message:', error);
      res.status(400).json({ 
        error: 'Failed to send message',
        details: error?.message
      });
    }
  }));

  app.post(['/api/contact/verify', '/api/contact/verify/'], safeHandler(async (req: any, res: any) => {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    try {
      if (!supabase) throw new Error('Database not configured');

      // Find the latest unverified request for this email
      const { data: verification, error: fetchError } = await supabase
        .from('contact_verifications')
        .select('*')
        .eq('email', email)
        .eq('verification_code', code)
        .eq('is_verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !verification) {
        return res.status(400).json({ error: 'Invalid or expired verification code' });
      }

      // Mark as verified
      await supabase
        .from('contact_verifications')
        .update({ is_verified: true })
        .eq('id', verification.id);

      // Log the contact message to audit logs
      try {
        await writeAuditLog({
          source: 'web',
          level: 'info',
          category: 'communication',
          action: 'contact_form_verified',
          status: 'success',
          actorUserId: null,
          message: `Verified contact message from ${email}: ${verification.subject}`,
          metadata: { subject: verification.subject, email, verification_id: verification.id }
        });
      } catch (auditError) {
        console.warn('Failed to write audit log for contact verification:', auditError);
      }

      // Record in communications table if supabase is available
      if (supabase) {
        try {
          await supabase.from('communications').insert([{
            type: 'contact_form',
            subject: verification.subject,
            sender_email: email,
            message: verification.message,
            status: 'new'
          }]);
        } catch (dbError) {
          console.error('Failed to record in communications table:', dbError);
        }
      }

      // If Resend is configured, send an email to support
      try {
        await serverEmailService.sendEmail({
          to: OFFICIAL_LINKS.email,
          subject: `Contact Form: ${verification.subject}`,
          category: 'contact_form',
          html: `
            <h1>New Contact Message (Verified)</h1>
            <p><strong>From:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${verification.subject}</p>
            <p><strong>Message:</strong></p>
            <p>${verification.message}</p>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send contact email via serverEmailService:', emailError);
        // Don't fail the request if only email notification fails
      }

      res.status(200).json({ success: true, message: 'Message verified and sent' });
    } catch (error: any) {
      console.error('Verification error:', error);
      res.status(400).json({ error: error.message || 'Verification failed' });
    }
  }));

  // API routes FIRST
  app.get("/api/health", (_req: any, res: any) => {
    res.json({ 
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        supabase: !!supabase,
        gemini: !!process.env.GEMINI_API_KEY,
        groq: !!process.env.GROQ_API_KEY,
        resend: !!process.env.RESEND_API_KEY
      },
      environment: process.env.NODE_ENV
    });
  });

  // AI Diagnostic Endpoint
  app.get("/api/ai/status", safeHandler(async (_req: any, res: any) => {
    const fs = await import('fs/promises');
    const artifacts = [
      'digit_model.keras', 'somnoai_dsl_file.keras', 'somnoai_dsl_text.keras',
      'somnoai_dsl_voice.keras', 'somnoai_file.keras', 'somnoai_model.keras',
      'somnoai_text.keras', 'somnoai_voice.keras', 'somnoai_dsl_vocab.json',
      'somnoai_vocab.json', 'somnoai_dsl_report.png', 'somnoai_full_report.png',
      'somnoai_result.png', 'training_result.png'
    ];

    const artifactStatus: Record<string, boolean> = {};
    for (const file of artifacts) {
      try {
        await fs.access(path.join(process.cwd(), file));
        artifactStatus[file] = true;
      } catch {
        artifactStatus[file] = false;
      }
    }

    const status = {
      groq: {
        configured: !!process.env.GROQ_API_KEY,
        circuitBreaker: (groqCircuitBreaker as any).state
      },
      gemini: {
        configured: !!process.env.GEMINI_API_KEY,
        circuitBreaker: (geminiCircuitBreaker as any).state
      },
      trainingArtifacts: artifactStatus
    };
    
    res.json({
      success: true,
      status,
      message: "AI services and artifacts checked."
    });
  }));

  // AI Inference Service
  const getModelMetadata = async (filename: string) => {
    try {
      const AdmZip = (await import('adm-zip')).default;
      const filePath = path.join(process.cwd(), filename);
      if (!fs.existsSync(filePath)) return null;
      const zip = new AdmZip(filePath);
      const configEntry = zip.getEntry('config.json');
      if (configEntry) {
        const config = JSON.parse(configEntry.getData().toString('utf8'));
        return {
          name: filename,
          layers: config.config.layers.map((l: any) => l.class_name),
          type: filename.includes('text') ? 'text' : filename.includes('voice') ? 'audio' : 'data'
        };
      }
    } catch (e) {
      console.error(`Error reading metadata for ${filename}:`, e);
    }
    return null;
  };

  app.post("/api/ai/inference", safeHandler(async (req: any, res: any) => {
    const { modelName, inputData } = req.body;
    
    const artifacts = [
      'digit_model.keras', 'somnoai_dsl_file.keras', 'somnoai_dsl_text.keras',
      'somnoai_dsl_voice.keras', 'somnoai_file.keras', 'somnoai_model.keras',
      'somnoai_text.keras', 'somnoai_voice.keras'
    ];

    if (!artifacts.includes(modelName)) {
      return res.status(404).json({ error: "Model not found" });
    }

    const metadata = await getModelMetadata(modelName);
    if (!metadata) {
      return res.status(500).json({ error: "Failed to load model metadata" });
    }

    // Use Gemini as a Neural Proxy for the specific model
    const prompt = `
      You are the Neural Proxy for the SomnoAI Digital Sleep Lab.
      Your task is to simulate the inference output of a specific Keras model.
      
      MODEL NAME: ${modelName}
      MODEL ARCHITECTURE: ${metadata.layers.join(' -> ')}
      MODEL TYPE: ${metadata.type}
      
      INPUT DATA: ${JSON.stringify(inputData)}
      
      Based on the model's purpose and architecture, provide a realistic inference result.
      If it's a classification model, provide probabilities.
      If it's a regression model, provide a value.
      Return ONLY a JSON object with the result.
    `;

    try {
      const response = await generateWithFallback({ contents: prompt });
      const resultText = response.text;
      // Try to parse JSON from the response
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      const inferenceResult = jsonMatch ? JSON.parse(jsonMatch[0]) : { output: resultText };

      res.json({
        success: true,
        model: modelName,
        metadata,
        result: inferenceResult
      });
    } catch (error) {
      console.error("Inference failed:", error);
      res.status(500).json({ error: "Inference engine failed" });
    }
  }));

  // Serve AI Training Reports
  app.get("/api/ai/artifacts/:filename", safeHandler(async (req: any, res: any) => {
    const { filename } = req.params;
    const allowedExtensions = ['.png', '.json', '.keras'];
    const ext = path.extname(filename).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      return res.status(403).json({ error: "Access denied to this file type" });
    }

    const artifacts = [
      'digit_model.keras', 'somnoai_dsl_file.keras', 'somnoai_dsl_text.keras',
      'somnoai_dsl_voice.keras', 'somnoai_file.keras', 'somnoai_model.keras',
      'somnoai_text.keras', 'somnoai_voice.keras', 'somnoai_dsl_vocab.json',
      'somnoai_vocab.json', 'somnoai_dsl_report.png', 'somnoai_full_report.png',
      'somnoai_result.png', 'training_result.png'
    ];

    if (!artifacts.includes(filename)) {
      return res.status(404).json({ error: "Artifact not found" });
    }

    const filePath = path.join(process.cwd(), filename);
    res.sendFile(filePath);
  }));

  // Simple AI Test Endpoint (Internal/Diagnostic)
  app.get("/api/ai/test", safeHandler(async (_req: any, res: any) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: "Test endpoint disabled in production" });
    }

    try {
      const response = await generateWithFallback({
        contents: "Say 'AI is working' in one sentence.",
        config: { maxOutputTokens: 20 }
      });
      res.json({ success: true, result: response.text });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }));

  // Secure login recording
  // Consolidated Login Logging Endpoint
  app.post(['/api/audit/login', '/api/audit/login/'], async (req: any, res: any) => {
    let { email, status, errorCode, userId, metadata } = req.body;
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : (req.socket.remoteAddress || null);
    const userAgent = req.headers['user-agent'] || 'unknown';
    let token = null;
    let isNewDevice = false;

    // Validate and sanitize email
    if (email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      email = sanitizeEmail(email);
    }

    try {
      // Check if user is blocked due to failed login attempts
      if (status === 'failed' && email && supabase) {
        // Record failed attempt
        await supabase.from('login_attempts').insert([{
          email,
          ip_address: ip,
          user_agent: userAgent,
          success: false,
          error_code: errorCode
        }]);

        // Count failed attempts in the last 15 minutes
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from('login_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('email', email)
          .eq('success', false)
          .gt('created_at', fifteenMinutesAgo);

        if (count && count >= 5) {
          // Auto-block user
          console.warn(`[SECURITY] Auto-blocking user ${email} due to ${count} failed attempts`);
          
          // Find user by email to get ID
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle();
          
          if (profile) {
            await adminServices.blockUser({
              adminUserId: 'SYSTEM_AUTO_BLOCK',
              targetUserId: profile.id,
              reason: `Automatic block: ${count} failed login attempts in 15 minutes.`
            });
          }
        }
      }

      await auditLogger.logAuth({
        source: 'web',
        level: status === 'success' ? 'info' : 'warning',
        action: 'USER_LOGIN',
        status: status,
        actorUserId: userId || null,
        ipAddress: ip as string,
        userAgent: userAgent as string,
        message: status === 'success' ? `Login success for ${email}` : `Login failed for ${email}: ${errorCode}`,
        metadata: { ...metadata, email, errorCode }
      });

      // Send Telegram alert for failed login
      if (status === 'failed') {
        await sendTelegramMessage(`🚨 <b>Failed Login Attempt</b>\nEmail: <code>${email}</code>\nError: <code>${errorCode}</code>\nIP: <code>${ip}</code>\nDevice: <code>${userAgent}</code>`);
      }

      // If success, also record in logins table and check for new device
      if (status === 'success' && userId && supabase) {
        // Clear failed attempts on success
        if (email) {
          await supabase.from('login_attempts').delete().eq('email', email);
        }

        // Issue a JWT for the user
        try {
          const { signToken } = await import('../src/lib/jwt-utils.js');
          token = signToken({ 
            id: userId, 
            email: email,
            role: metadata?.role || 'user'
          });
        } catch (jwtErr) {
          console.error('Failed to sign JWT:', jwtErr);
        }

        // 1. Check if it's a new device
        const { data: previousLogins } = await supabase
          .from('logins')
          .select('id')
          .eq('user_id', userId)
          .eq('ip_address', ip)
          .eq('user_agent', userAgent)
          .eq('success', true)
          .limit(1);
        
        isNewDevice = !previousLogins || previousLogins.length === 0;

        // 2. Record successful login
        await supabase.from('logins').insert([{
          user_id: userId,
          user_name: metadata?.user_name || 'User',
          device_info: userAgent,
          user_agent: userAgent,
          ip_address: ip,
          success: true,
          status: 'success',
          role: metadata?.role || 'user'
        }]);

        // 3. Check user preferences for alerts
        const { data: profile } = await supabase
          .from('profiles')
          .select('login_alert_enabled, login_alert_mode, email, full_name, preferred_notification_email')
          .eq('id', userId)
          .single();

        if (profile && profile.login_alert_enabled) {
          const notificationEmail = profile.preferred_notification_email || profile.email;
          if (notificationEmail) {
            const shouldAlert = profile.login_alert_mode === 'EVERY_LOGIN' || isNewDevice;
            
            if (shouldAlert) {
              // Get location info
              let locationStr = 'Unknown Location';
              try {
                const locRes = await fetchCircuitBreaker.execute(() => fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/ip-info/${ip}`));
                if (locRes.ok) {
                  const locData: any = await locRes.json();
                  locationStr = `${locData.city || ''}, ${locData.region || ''}, ${locData.country || ''}`.replace(/^, |, $/g, '').trim() || 'Unknown Location';
                }
              } catch (e) {
                console.warn('Failed to fetch IP info for security email:', e);
              }

              await serverEmailService.sendNewDeviceAlert(notificationEmail, {
                ip: ip as string,
                location: locationStr,
                userAgent: userAgent as string,
                isNewDevice,
                fullName: profile.full_name
              });
            }
          }
        }
      }

      res.status(200).json({ 
        success: true,
        token,
        isNewDevice
      });
    } catch (error: any) {
      console.error('Failed to log login event:', error);
      res.status(400).json({ error: error?.message || 'Unknown error' });
    }
  });

  // General Event Logging Endpoint
  app.post(['/api/audit/log-event', '/api/audit/log-event/'], async (req: any, res: any) => {
    try {
      const user = await getUserFromRequest(req);
      const { category, action, status, level, message, metadata } = req.body;
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      await writeAuditLog({
        source: 'web',
        level: level || 'info',
        category: category || 'system',
        action: action || 'unknown',
        status: status || 'success',
        actorUserId: user?.id || null,
        ipAddress: ip as string,
        userAgent: userAgent as string,
        message: message || '',
        metadata: metadata || {}
      });

      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error?.message || 'Unknown error' });
    }
  });

  // --- PIN AUTHENTICATION ENDPOINTS ---
  app.post('/api/pin/verify', requireUserMiddleware, safeHandler(async (req: any, res: any) => {
    const { pin } = req.body;
    const userId = req.user.id;

    if (!pin) {
      return res.status(400).json({ success: false, error: 'PIN_REQUIRED', message: 'PIN is required' });
    }

    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('pin_hash, failed_pin_attempts, pin_blocked_until')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      return res.status(404).json({ success: false, error: 'PROFILE_NOT_FOUND', message: 'User profile not found' });
    }

    // Check if blocked
    if (profile.pin_blocked_until && new Date(profile.pin_blocked_until) > new Date()) {
      const remaining = Math.ceil((new Date(profile.pin_blocked_until).getTime() - Date.now()) / 60000);
      return res.status(403).json({ 
        success: false, 
        error: 'PIN_BLOCKED', 
        message: `PIN is temporarily blocked. Try again in ${remaining} minutes.`,
        blockedUntil: profile.pin_blocked_until
      });
    }

    if (!profile.pin_hash) {
      return res.status(400).json({ success: false, error: 'PIN_NOT_SET', message: 'PIN has not been set for this account' });
    }

    const hashedPin = crypto.createHash('sha256').update(pin).digest('hex');
    
    if (profile.pin_hash === hashedPin) {
      // Success: Reset failed attempts
      await supabaseAdmin
        .from('profiles')
        .update({ 
          failed_pin_attempts: 0, 
          pin_blocked_until: null 
        })
        .eq('id', userId);

      await writeAuditLog({
        actorUserId: userId,
        action: 'PIN_VERIFIED',
        category: 'auth',
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.json({ success: true, message: 'PIN verified successfully' });
    } else {
      // Failure: Increment attempts
      const newAttempts = (profile.failed_pin_attempts || 0) + 1;
      const MAX_ATTEMPTS = 5;
      const updates: any = { failed_pin_attempts: newAttempts };
      
      let isBlocked = false;
      if (newAttempts >= MAX_ATTEMPTS) {
        const blockedUntil = new Date();
        blockedUntil.setHours(blockedUntil.getHours() + 1); // Block for 1 hour
        updates.pin_blocked_until = blockedUntil.toISOString();
        isBlocked = true;
      }

      await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      await writeAuditLog({
        actorUserId: userId,
        action: 'PIN_VERIFICATION_FAILED',
        category: 'auth',
        status: 'failed',
        level: isBlocked ? 'warning' : 'info',
        message: `Attempt ${newAttempts}/${MAX_ATTEMPTS}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(401).json({ 
        success: false, 
        error: 'INVALID_PIN', 
        message: 'Incorrect PIN',
        attemptsRemaining: Math.max(0, MAX_ATTEMPTS - newAttempts),
        isBlocked
      });
    }
  }));

  app.post(['/api/pin/setup', '/api/pin/setup/'], requireUserMiddleware, safeHandler(async (req: any, res: any) => {
    const { pin } = req.body;
    const userId = req.user.id;
    console.log(`[PIN-SETUP] Starting for user ${userId}`);

    if (!pin || pin.length < 6) {
      return res.status(400).json({ success: false, error: 'INVALID_PIN', message: 'PIN must be at least 6 digits' });
    }

    const hashedPin = crypto.createHash('sha256').update(pin).digest('hex');
    const recoveryKey = crypto.randomBytes(16).toString('hex');
    const hashedRecoveryKey = crypto.createHash('sha256').update(recoveryKey).digest('hex');

    console.log(`[PIN-SETUP] Updating profile for user ${userId}...`);
    
    // Add timeout to Supabase update to prevent 504s
    const { error } = await Promise.race([
      supabaseAdmin
        .from('profiles')
        .update({ 
          pin_hash: hashedPin,
          has_pin_set: true,
          recovery_key_hash: hashedRecoveryKey,
          failed_pin_attempts: 0,
          pin_blocked_until: null
        })
        .eq('id', userId),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase Update Timeout')), 10000))
    ]) as any;

    if (error) {
      console.error(`[PIN-SETUP] Profile update failed for user ${userId}:`, error);
      return res.status(500).json({ success: false, error: 'UPDATE_FAILED', message: 'Failed to set PIN. Please try again.' });
    }

    console.log(`[PIN-SETUP] Success for user ${userId}. Writing audit log...`);
    writeAuditLog({
      actorUserId: userId,
      action: 'PIN_SETUP',
      category: 'auth',
      status: 'success',
      message: 'User set up a new PIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    }).catch(err => console.error('[PIN-SETUP] Audit log failed:', err));

    return res.json({ 
      success: true, 
      message: 'PIN set up successfully',
      recoveryKey // Return the raw recovery key once to the user
    });
  }));

  app.post('/api/pin/reset', requireUserMiddleware, safeHandler(async (req: any, res: any) => {
    const { recoveryKey, newPin } = req.body;
    const userId = req.user.id;

    if (!recoveryKey || !newPin || newPin.length < 4) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', message: 'Recovery key and new PIN are required' });
    }

    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('recovery_key_hash')
      .eq('id', userId)
      .single();

    if (fetchError || !profile || !profile.recovery_key_hash) {
      return res.status(404).json({ success: false, error: 'RECOVERY_NOT_AVAILABLE', message: 'PIN recovery is not set up for this account' });
    }

    const hashedInputKey = crypto.createHash('sha256').update(recoveryKey).digest('hex');

    if (profile.recovery_key_hash === hashedInputKey) {
      const hashedNewPin = crypto.createHash('sha256').update(newPin).digest('hex');
      
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          pin_hash: hashedNewPin,
          has_pin_set: true,
          failed_pin_attempts: 0,
          pin_blocked_until: null
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      await writeAuditLog({
        actorUserId: userId,
        action: 'PIN_RESET_RECOVERY',
        category: 'auth',
        status: 'success',
        message: 'User reset PIN using recovery key',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.json({ success: true, message: 'PIN reset successfully' });
    } else {
      await writeAuditLog({
        actorUserId: userId,
        action: 'PIN_RESET_RECOVERY_FAILED',
        category: 'auth',
        status: 'failed',
        message: 'Invalid recovery key attempt',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(401).json({ success: false, error: 'INVALID_RECOVERY_KEY', message: 'Invalid recovery key' });
    }
  }));

  // --- SECURITY RECOGNITION & CERTIFICATES ---
  app.get('/api/security/hall-of-fame', safeHandler(async (_req: any, res: any) => {
    res.set('Cache-Control', 'public, max-age=300');
    const { data, error } = await supabaseAdmin
      .from('security_contributions')
      .select('*')
      .eq('is_public', true)
      .order('points', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  }));

  // --- Security Reports ---

  app.post('/api/security/report/submit', requireUserMiddleware, safeHandler(async (req: any, res: any) => {
    const { title, description, steps, expected_result, actual_result, type } = req.body;
    const user = req.user;

    if (!title || !description || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Basic rule-based AI classification mock
    let ai_suggested_type = type;
    let ai_suggested_severity = 'low';
    let ai_confidence = 70;

    const text = (title + ' ' + description).toLowerCase();
    if (text.includes('sql') || text.includes('xss') || text.includes('bypass')) {
      ai_suggested_type = 'security';
      ai_suggested_severity = 'high';
      ai_confidence = 90;
    } else if (text.includes('login') || text.includes('not working') || text.includes('error')) {
      ai_suggested_type = 'functional';
      ai_suggested_severity = 'medium';
      ai_confidence = 85;
    } else if (text.includes('slow') || text.includes('lag')) {
      ai_suggested_type = 'performance';
      ai_suggested_severity = 'low';
      ai_confidence = 80;
    }

    const { data, error } = await supabaseAdmin
      .from('security_reports')
      .insert([{
        user_id: user.id,
        title,
        description,
        steps,
        expected_result,
        actual_result,
        type,
        ai_suggested_type,
        ai_suggested_severity,
        ai_confidence
      }])
      .select()
      .single();

    if (error) throw error;

    // Send Telegram Notification
    try {
      const { SecurityAlertService } = await import('../src/services/securityAlertService.js');
      await SecurityAlertService.notifyNewReport(
        { id: data.id, title: data.title, type: data.type, user_id: user.id },
        { type: ai_suggested_type, severity: ai_suggested_severity, confidence: ai_confidence }
      );
    } catch (e) {
      console.error('Failed to send telegram alert:', e);
    }

    res.json({ success: true, data });
  }));

  app.get('/api/security/admin/reports', requireAdminFromRequest, safeHandler(async (_req: any, res: any) => {
    const { data, error } = await supabaseAdmin
      .from('security_reports')
      .select('*, profiles:user_id(email, full_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  }));

  app.post('/api/security/admin/reports/update', requireAdminFromRequest, safeHandler(async (req: any, res: any) => {
    const { report_id, updates } = req.body;
    const { data, error } = await supabaseAdmin
      .from('reports')
      .update(updates)
      .eq('id', report_id);

    if (error) throw error;
    res.json({ success: true, data });
  }));

  app.post('/api/security/admin/reports/approve', requireAdminFromRequest, safeHandler(async (req: any, res: any) => {
    const { report_id, severity } = req.body;

    if (!report_id || !severity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: report, error: fetchError } = await supabaseAdmin
      .from('security_reports')
      .select('*, profiles:user_id(id, email)')
      .eq('id', report_id)
      .single();

    if (fetchError || !report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Scoring Logic
    const calculateScore = (type: string, severity: string) => {
      if (type === 'security') {
        if (severity === 'critical') return 100;
        if (severity === 'medium') return 70;
      }
      if (type === 'ai') return 60;
      if (type === 'functional') return 40;
      if (type === 'performance') return 20;
      if (type === 'ux') return 10;
      return 0;
    };

    const getLevel = (score: number) => {
      if (score >= 800) return 'Legend';
      if (score >= 400) return 'Elite';
      if (score >= 150) return 'Advanced';
      return 'Contributor';
    };

    const scoreIncrement = calculateScore(report.type, severity);
    const researcherId = report.profiles.id;

    // Get current researcher data
    const { data: researcher } = await supabaseAdmin
      .from('security_researchers')
      .select('*')
      .eq('user_id', researcherId)
      .single();

    const newScore = (researcher?.score || 0) + scoreIncrement;
    const newLevel = getLevel(newScore);

    // Update researcher
    await supabaseAdmin
      .from('security_researchers')
      .upsert({ 
        user_id: researcherId, 
        score: newScore, 
        level: newLevel,
        name: researcher?.name || report.profiles.email
      });

    // Trigger certificate generation if conditions are met
    if (severity === 'critical' || newScore >= 150) {
      const { error: certError } = await supabaseAdmin
        .from('certificates')
        .insert({
          user_id: researcherId,
          cert_id: `SDSL-${Date.now()}`,
          level: newLevel,
          category: report.type,
          verify_token: Math.random().toString(36).substring(7)
        });
      
      if (certError) console.error('Failed to generate certificate:', certError);
    }

    const { data, error } = await supabaseAdmin
      .from('security_reports')
      .update({ status: 'validated', severity })
      .eq('id', report_id)
      .select()
      .single();

    if (error) throw error;

    // Send Telegram Notification
    try {
      const { SecurityAlertService } = await import('../src/services/securityAlertService.js');
      await SecurityAlertService.notifyReportValidated(
        { id: data.id, title: data.title, type: data.type, user_id: data.user_id },
        severity
      );
    } catch (e) {
      console.error('Failed to send telegram alert:', e);
    }

    res.json({ success: true, data });
  }));

  app.post('/api/security/admin/reports/reject', requireAdminFromRequest, safeHandler(async (req: any, res: any) => {
    const { report_id } = req.body;

    if (!report_id) {
      return res.status(400).json({ error: 'Missing report_id' });
    }

    const { data, error } = await supabaseAdmin
      .from('security_reports')
      .update({ status: 'rejected' })
      .eq('id', report_id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  }));

  app.get('/api/security/verify-certificate/:certId', safeHandler(async (req: any, res: any) => {
    const { certId } = req.params;
    const { data, error } = await supabaseAdmin
      .from('certificates')
      .select('*')
      .eq('cert_id', certId)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'CERTIFICATE_NOT_FOUND', message: 'Certificate not found or invalid' });
    }

    res.json({ success: true, data });
  }));

  app.post('/api/security/admin/generate-certificate', requireAdminFromRequest, safeHandler(async (req: any, res: any) => {
    const { recipientName, recipientEmail, achievementLevel, userId } = req.body;

    if (!recipientName || !recipientEmail || !achievementLevel) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate a unique cert ID
    const countResult = await supabaseAdmin
      .from('certificates')
      .select('id', { count: 'exact', head: true });
    
    const count = (countResult.count || 0) + 1;
    const year = new Date().getFullYear();
    const certId = `SDSL-CERT-${year}-${count.toString().padStart(4, '0')}`;

    const { data, error } = await supabaseAdmin
      .from('certificates')
      .insert([{
        cert_id: certId,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        achievement_level: achievementLevel,
        user_id: userId || null
      }])
      .select()
      .single();

    if (error) throw error;

    // Send email with certificate link
    if (resend) {
      try {
        await resend.emails.send({
          from: 'security@sleepsomno.com',
          to: recipientEmail,
          subject: 'Your Security Recognition Certificate - SomnoAI Digital Sleep Lab',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h1 style="color: #4f46e5;">Congratulations!</h1>
              <p>Hi ${recipientName},</p>
              <p>Your contribution to the security of <strong>SomnoAI Digital Sleep Lab</strong> has been officially recognized.</p>
              <p>Achievement: <strong>${achievementLevel}</strong></p>
              <p>Certificate ID: <strong>${certId}</strong></p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${process.env.APP_URL}/security/verify?id=${certId}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">View & Verify Certificate</a>
              </div>
              <p>Thank you for helping us build a more secure AI ecosystem.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #666;">SomnoAI Digital Sleep Lab Security Team</p>
            </div>
          `
        });
      } catch (emailErr) {
        console.error('Failed to send certificate email:', emailErr);
      }
    }

    res.json({ success: true, certId, data });
  }));
  // -------------------------------------------
  const rpName = 'SomnoAI Digital Sleep Lab';
  let rpID = 'localhost';
  let origin = 'http://localhost:3000';
  
  try {
    if (process.env.APP_URL) {
      const url = new URL(process.env.APP_URL);
      rpID = url.hostname;
      origin = process.env.APP_URL.replace(/\/$/, '');
    }
  } catch (err) {
    console.error('[WebAuthn] Invalid APP_URL:', process.env.APP_URL);
  }

  // Store challenges in Supabase (auth_challenges table)

  // TOTP 2FA Endpoints
  app.post('/api/2fa/setup', safeHandler(async (req: any, res: any) => {
    console.log('[2FA Setup] Received request');
    const user = await requireUserFromRequest(req);
    console.log('[2FA Setup] User ID:', user.id);
    if (!supabase) {
      console.error('[2FA Setup] Supabase client is null.');
      return res.status(400).json({ error: "Database not configured" });
    }

    const appName = rpName;
    console.log('[2FA Setup] Generating secret...');
    
    // Ensure otp is available
    if (!otp) {
      throw new Error('Authenticator service not available');
    }

    const secret = otp.generateSecret();
    console.log('[2FA Setup] Generating keyuri...');
    const otpauth = otp.keyuri(user.email || user.id, appName, secret);
    console.log('[2FA Setup] Generating QR code...');
    
    if (!QRCode) {
      throw new Error('QR Code service not available');
    }

    const qrCodeDataURL = await QRCode.toDataURL(otpauth);
    console.log('[2FA Setup] QR code generated.');

    // Generate 10 recovery codes
    const recoveryCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase() + '-' + 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Store unconfirmed secret and recovery codes in database (ENCRYPTED)
    const encryptedSecret = encrypt(secret);
    const encryptedRecoveryCodes = recoveryCodes.map(code => encrypt(code));

    console.log('[2FA Setup] Updating profile...');
    const { error } = await Promise.race([
      supabase.from('profiles').update({
        two_fa_secret: encryptedSecret,
        recovery_codes: encryptedRecoveryCodes,
        two_fa_enabled: false
      }).eq('id', user.id),
      new Promise((_, reject) => setTimeout(() => reject(new Error('profiles update timeout')), 3000))
    ]) as any;
    
    if (error) {
      console.error('[2FA Setup] Supabase update error:', error);
      throw error;
    }

    console.log('[2FA Setup] Success');
    res.json({
      qrCodeDataURL,
      secret,
      recoveryCodes
    });
  }));

  app.post('/api/2fa/confirm', safeHandler(async (req: any, res: any) => {
    const user = await requireUserFromRequest(req);
    const { token } = req.body;
    if (!supabase) return res.status(400).json({ error: "Database not configured" });

    console.log('[2FA Confirm] Fetching profile...');
    const { data: profile } = await Promise.race([
      supabase.from('profiles').select('two_fa_secret').eq('id', user.id).single(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('profiles fetch timeout')), 3000))
    ]) as any;
    
    if (!profile || !profile.two_fa_secret) {
      return res.status(404).json({ error: '2FA setup not found' });
    }

    // Decrypt secret before verification
    let decryptedSecret;
    try {
      decryptedSecret = decrypt(profile.two_fa_secret);
    } catch (e) {
      console.error('[2FA Confirm] Decryption error:', e);
      // Fallback for legacy unencrypted secrets (if any)
      decryptedSecret = profile.two_fa_secret;
    }

    const isValid = otp.verify({
      token,
      secret: decryptedSecret,
    });

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid authenticator code' });
    }

    console.log('[2FA Confirm] Updating profile...');
    await Promise.race([
      supabase.from('profiles').update({
        two_fa_enabled: true,
        two_fa_confirmed_at: new Date().toISOString()
      }).eq('id', user.id),
      new Promise((_, reject) => setTimeout(() => reject(new Error('profiles update timeout')), 5000))
    ]);

    console.log('[2FA Confirm] Success');
    res.json({ success: true, message: '2FA enabled successfully' });
  }));

  app.post('/api/2fa/disable', safeHandler(async (req: any, res: any) => {
    const user = await requireUserFromRequest(req);
    const { token } = req.body;
    if (!supabase) return res.status(400).json({ error: "Database not configured" });

    console.log('[2FA Disable] Fetching profile...');
    const { data: profile } = await Promise.race([
      supabase.from('profiles').select('two_fa_secret, two_fa_enabled').eq('id', user.id).single(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('profiles fetch timeout')), 5000))
    ]) as any;
    
    if (!profile || !profile.two_fa_enabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    // Decrypt secret before verification
    let decryptedSecret;
    try {
      decryptedSecret = decrypt(profile.two_fa_secret);
    } catch (e) {
      console.error('[2FA Disable] Decryption error:', e);
      decryptedSecret = profile.two_fa_secret;
    }

    const isValid = otp.verify({
      token,
      secret: decryptedSecret,
    });

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid authenticator code' });
    }

    console.log('[2FA Disable] Updating profile...');
    await Promise.race([
      supabase.from('profiles').update({
        two_fa_enabled: false,
        two_fa_secret: null,
        two_fa_confirmed_at: null
      }).eq('id', user.id),
      new Promise((_, reject) => setTimeout(() => reject(new Error('profiles update timeout')), 5000))
    ]);

    console.log('[2FA Disable] Success');
    res.json({ success: true, message: '2FA disabled successfully' });
  }));

  app.post('/api/2fa/verify', requireUserMiddleware, safeHandler(async (req: any, res: any) => {
    const { token } = req.body;
    const userId = req.user.id;
    if (!supabase) return res.status(400).json({ error: "Database not configured" });

    console.log('[2FA Verify] Fetching profile...');
    const { data: profile } = await Promise.race([
      supabase.from('profiles').select('two_fa_secret, two_fa_enabled').eq('id', userId).single(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('profiles fetch timeout')), 5000))
    ]) as any;
    
    if (!profile || !profile.two_fa_enabled) {
      return res.status(404).json({ error: '2FA is not enabled' });
    }

    // Decrypt secret before verification
    let decryptedSecret;
    try {
      decryptedSecret = decrypt(profile.two_fa_secret);
    } catch (e) {
      console.error('[2FA Verify] Decryption error:', e);
      decryptedSecret = profile.two_fa_secret;
    }

    const isValid = otp.verify({
      token,
      secret: decryptedSecret,
    });

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid code' });
    }

    console.log('[2FA Verify] Success');
    res.json({ success: true, message: '2FA verification passed' });
  }));

  app.post('/api/2fa/verify-recovery', requireUserMiddleware, safeHandler(async (req: any, res: any) => {
    const { code } = req.body;
    const userId = req.user.id;
    if (!supabase) return res.status(400).json({ error: "Database not configured" });

    console.log('[2FA Verify Recovery] Fetching profile...');
    const { data: profile } = await Promise.race([
      supabase.from('profiles').select('recovery_codes, two_fa_enabled').eq('id', userId).single(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('profiles fetch timeout')), 5000))
    ]) as any;
    
    if (!profile || !profile.two_fa_enabled) {
      return res.status(404).json({ error: '2FA is not enabled' });
    }

    const recoveryCodes = profile.recovery_codes || [];
    let foundIndex = -1;
    
    for (let i = 0; i < recoveryCodes.length; i++) {
      try {
        const decryptedCode = decrypt(recoveryCodes[i]);
        if (decryptedCode === code.toUpperCase()) {
          foundIndex = i;
          break;
        }
      } catch (e) {
        console.error('[2FA Verify Recovery] Decryption error:', e);
      }
    }

    if (foundIndex === -1) {
      return res.status(401).json({ error: 'Invalid recovery code' });
    }

    // Remove the used recovery code
    const updatedCodes = [...recoveryCodes];
    updatedCodes.splice(foundIndex, 1);

    console.log('[2FA Verify Recovery] Updating profile...');
    await Promise.race([
      supabase.from('profiles').update({
        recovery_codes: updatedCodes
      }).eq('id', userId),
      new Promise((_, reject) => setTimeout(() => reject(new Error('profiles update timeout')), 5000))
    ]);

    console.log('[2FA Verify Recovery] Success');
    res.json({ success: true, message: 'Recovery code accepted' });
  }));

  app.post('/api/webauthn/generate-registration-options', safeHandler(async (req: any, res: any) => {
    console.log('[WebAuthn Generate] Received request');
    const user = await requireUserFromRequest(req);
    
    if (!supabase) {
      console.error('[WebAuthn Generate] Supabase client is null. Check SUPABASE_SERVICE_ROLE_KEY.');
      return res.status(400).json({ success: false, message: "Database not configured" });
    }

    console.log('[WebAuthn Generate] Fetching existing keys...');
    const { data: existingKeys } = await Promise.race([
      supabaseAdmin.from('user_passkeys').select('credential_id, transports').eq('user_id', user.id),
      new Promise((_, reject) => setTimeout(() => reject(new Error('user_passkeys fetch timeout')), 5000))
    ]) as any;

    console.log('[WebAuthn Generate] Generating options...');
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(user.id),
      userName: user.email || 'user',
      attestationType: 'none',
      excludeCredentials: (existingKeys || []).map((key: any) => ({
        id: key.credential_id,
        type: 'public-key' as const,
        transports: key.transports || ['internal'],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    console.log('[WebAuthn Generate] Inserting challenge...');
    const { data: challengeData, error: challengeError } = await Promise.race([
      supabaseAdmin.from('auth_challenges').insert({
        challenge: options.challenge,
        user_id: user.id,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      }).select().single(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('auth_challenges insert timeout')), 5000))
    ]) as any;

    if (challengeError) throw challengeError;
    const challengeId = challengeData.id;

    console.log('[WebAuthn Generate] Success');
    res.json({ success: true, options, challengeId });
  }));

  app.post('/api/webauthn/verify-registration', safeHandler(async (req: any, res: any) => {
    const user = await requireUserFromRequest(req);
    const { response, challengeId } = req.body;

    console.log('[WebAuthn Verify Reg] Fetching challenge...');
    const { data: challengeData, error: challengeFetchError } = await Promise.race([
      supabaseAdmin.from('auth_challenges').select('*').eq('id', challengeId).single(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('auth_challenges fetch timeout')), 5000))
    ]) as any;

    if (challengeFetchError || !challengeData || new Date(challengeData.expires_at) < new Date() || challengeData.user_id !== user.id) {
      return res.status(400).json({ success: false, message: 'Challenge expired or invalid' });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      console.log('[WebAuthn Verify Reg] Inserting passkey...');
      const { error } = await Promise.race([
        supabaseAdmin.from('user_passkeys').insert({
          user_id: user.id,
          credential_id: credentialID,
          public_key: Buffer.from(credentialPublicKey).toString('base64'),
          counter: counter,
          device_type: credentialDeviceType,
          backed_up: credentialBackedUp,
          transports: response.response.transports || [],
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('user_passkeys insert timeout')), 5000))
      ]) as any;

      if (error) throw error;
      
      console.log('[WebAuthn Verify Reg] Deleting challenge...');
      await Promise.race([
        supabaseAdmin.from('auth_challenges').delete().eq('id', challengeId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('auth_challenges delete timeout')), 5000))
      ]);
      
      console.log('[WebAuthn Verify Reg] Success');
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, message: 'Verification failed' });
    }
  }));

  app.post('/api/webauthn/generate-authentication-options', safeHandler(async (req: any, res: any) => {
    let { email } = req.body;
    let allowCredentials: any[] = [];

    if (email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }
      email = sanitizeEmail(email);
    }

    if (email && supabase) {
      console.log('[WebAuthn Generate Auth] Fetching profile...');
      const { data: profile } = await Promise.race([
        supabaseAdmin.from('profiles').select('id').eq('email', email).maybeSingle(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('profiles fetch timeout')), 5000))
      ]) as any;
      
      if (profile) {
        console.log('[WebAuthn Generate Auth] Fetching existing keys...');
        const { data: existingKeys } = await Promise.race([
          supabase.from('user_passkeys').select('credential_id, transports').eq('user_id', profile.id),
          new Promise((_, reject) => setTimeout(() => reject(new Error('user_passkeys fetch timeout')), 5000))
        ]) as any;

        if (existingKeys) {
          allowCredentials = existingKeys.map((key: any) => ({
            id: key.credential_id,
            type: 'public-key' as const,
            transports: key.transports || ['internal'],
          }));
        }
      }
    }

    console.log('[WebAuthn Generate Auth] Generating options...');
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    console.log('[WebAuthn Generate Auth] Inserting challenge...');
    const { data: challengeData, error: challengeError } = await Promise.race([
      supabaseAdmin.from('auth_challenges').insert({
        challenge: options.challenge,
        user_id: null, // Anonymous challenge for login
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      }).select().single(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('auth_challenges insert timeout')), 5000))
    ]) as any;

    if (challengeError) throw challengeError;
    const challengeId = challengeData.id;

    console.log('[WebAuthn Generate Auth] Success');
    res.json({ success: true, options, challengeId });
  }));

  app.post('/api/webauthn/verify-authentication', safeHandler(async (req: any, res: any) => {
    const { response, challengeId } = req.body;

    console.log('[WebAuthn Verify Auth] Fetching challenge...');
    const { data: challengeData, error: challengeFetchError } = await Promise.race([
      supabaseAdmin.from('auth_challenges').select('*').eq('id', challengeId).single(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('auth_challenges fetch timeout')), 5000))
    ]) as any;

    if (challengeFetchError || !challengeData || new Date(challengeData.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'Challenge expired or invalid' });
    }

    if (!supabase) return res.status(400).json({ success: false, message: "Database not configured" });

    console.log('[WebAuthn Verify Auth] Fetching passkey...');
    const { data: passkey } = await Promise.race([
      supabase.from('user_passkeys').select('*').eq('credential_id', response.id).maybeSingle(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('user_passkeys fetch timeout')), 5000))
    ]) as any;

    if (!passkey) {
      return res.status(404).json({ success: false, message: 'Passkey not found' });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: passkey.credential_id,
        credentialPublicKey: Buffer.from(passkey.public_key, 'base64'),
        counter: passkey.counter,
        transports: passkey.transports,
      },
    });

    if (verification.verified && verification.authenticationInfo) {
      console.log('[WebAuthn Verify Auth] Updating passkey...');
      await Promise.race([
        supabase.from('user_passkeys').update({ 
          counter: verification.authenticationInfo.newCounter,
          last_used_at: new Date().toISOString()
        }).eq('id', passkey.id),
        new Promise((_, reject) => setTimeout(() => reject(new Error('user_passkeys update timeout')), 5000))
      ]);

      console.log('[WebAuthn Verify Auth] Fetching user...');
      const { data: userData } = await Promise.race([
        supabase.auth.admin.getUserById(passkey.user_id),
        new Promise((_, reject) => setTimeout(() => reject(new Error('getUserById timeout')), 3000))
      ]) as any;
      
      if (!userData || !userData.user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      console.log('[WebAuthn Verify Auth] Generating magic link...');
      const { data: linkData, error: linkError } = await Promise.race([
        supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: userData.user.email!,
          options: { redirectTo: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard` }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('generateLink timeout')), 5000))
      ]) as any;

      if (linkError) throw linkError;

      console.log('[WebAuthn Verify Auth] Deleting challenge...');
      await Promise.race([
        supabase.from('auth_challenges').delete().eq('id', challengeId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('auth_challenges delete timeout')), 5000))
      ]);
      
      console.log('[WebAuthn Verify Auth] Success');
      res.json({ success: true, action_link: linkData.properties.action_link });
    } else {
      res.status(400).json({ success: false, message: 'Verification failed' });
    }
  }));

  // USB Key File Authentication Endpoints
  app.post('/api/auth/usb-key/generate', requireUserMiddleware, safeHandler(async (req: any, res: any) => {
    console.log('[USB Key Generate] Received request');
    const userId = req.user.id;
    console.log('[USB Key Generate] UserId:', userId);
    if (!supabase) {
      console.error('[USB Key Generate] Supabase client is null. Check SUPABASE_SERVICE_ROLE_KEY.');
      return res.status(400).json({ error: "Database not configured" });
    }
    const keyId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Store hash in DB
    console.log('[USB Key Generate] Updating profile...');
    const { error } = await Promise.race([
      supabase.from('profiles').update({ usb_key_token_hash: tokenHash, usb_key_id: keyId }).eq('id', userId),
      new Promise((_, reject) => setTimeout(() => reject(new Error('profiles update timeout')), 5000))
    ]) as any;

    if (error) {
      console.error('[USB Key Generate] Supabase update error:', error);
      throw error;
    }

    console.log('[USB Key Generate] Success');
    const keyFile = {
      version: '1.0',
      keyId,
      userId,
      token,
    };

    res.json({
      success: true,
      fileName: `usb-key-${userId}.json`,
      fileContent: keyFile
    });
  }));

  app.post('/api/auth/usb-key/verify', safeHandler(async (req: any, res: any) => {
    const { keyId, userId, token } = req.body;
    
    // Get user's stored hash
    console.log('[USB Key Verify] Fetching profile...');
    const { data: profile, error } = await Promise.race([
      supabaseAdmin.from('profiles').select('usb_key_token_hash, usb_key_id').eq('id', userId).single(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('profiles fetch timeout')), 5000))
    ]) as any;

    if (error || !profile) throw new Error('User not found');
    if (profile.usb_key_id !== keyId) throw new Error('Invalid key ID');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    if (profile.usb_key_token_hash !== tokenHash) throw new Error('Invalid token');

    // Verification successful - generate magic link for login
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!userData || !userData.user) {
      throw new Error('User not found');
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email!,
      options: { redirectTo: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard` }
    });

    if (linkError) throw linkError;

    res.json({ 
      success: true, 
      action_link: linkData.properties.action_link,
      userEmail: userData.user.email 
    });
  }));

  app.post('/api/notify-login', safeHandler(async (req: any, res: any) => {
    if (!resend) {
      console.warn('Resend is not configured. Skipping login notification.');
      return res.status(200).json({ success: true, message: 'Resend not configured' });
    }
    let { email, user_name, device, time, location } = req.body;

    if (email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      email = sanitizeEmail(email);
    }

    await resend.emails.send({
      from: 'SomnoAI <onboarding@resend.dev>',
      to: [email],
      subject: 'New Login Detected',
      html: `
        <h1>New Login Detected</h1>
        <p>Hello ${user_name},</p>
        <p>A new login was detected for your SomnoAI account.</p>
        <ul>
          <li><strong>Device:</strong> ${device}</li>
          <li><strong>Time:</strong> ${time}</li>
          <li><strong>Location:</strong> ${location}</li>
        </ul>
        <p>If this was not you, please contact support immediately.</p>
      `,
    });
    res.status(200).json({ success: true });
  }));

  app.post('/api/send-email', safeHandler(async (req: any, res: any) => {
    // Only authenticated users can send emails (or restrict to admins)
    const user = await requireUserFromRequest(req);
    
    if (!resend) {
      return res.status(400).json({ error: 'Resend is not configured' });
    }
    const { to, subject, html } = req.body;

    // Optional: restrict 'to' address or check if user is admin
    const userIsAdmin = await isAdmin(user.id);
    if (!userIsAdmin && to !== user.email) {
      // Non-admins can only send emails to themselves (e.g. for testing or specific features)
      // Or just block non-admins entirely if this is an admin-only tool
      return res.status(403).json({ error: 'Forbidden: Only admins can send arbitrary emails' });
    }

    const data = await resend.emails.send({
      from: 'SomnoAI <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: html,
    });

    res.status(200).json(data);
  }));

  app.post(['/api/audit/auth-signup', '/api/audit/auth-signup/'], async (req: any, res: any) => {
    const body = req.body;
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : (req.socket.remoteAddress || null);
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Validate and sanitize email
    if (body.email) {
      if (!validateEmail(body.email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      body.email = sanitizeEmail(body.email);
    }

    await auditLogger.logAuth({
      source: 'web',
      level: body.success ? 'info' : 'warning',
      action: 'signup',
      status: body.success ? 'success' : 'failed',
      actorUserId: body.userId ?? null,
      ipAddress: ip,
      userAgent,
      path: '/signup',
      method: 'POST',
      errorCode: body.errorCode ?? null,
      message: body.success ? 'User signup success' : 'User signup failed',
      metadata: {
        email: body.email ?? null,
        needsEmailConfirmation: body.needsEmailConfirmation ?? null,
      },
    });

    res.status(200).json({ ok: true });
  });

  // Debugging middleware for API routes
  app.use(['/api/chat', '/api/chat/', '/api/analyze-sleep', '/api/analyze-sleep/'], (_req: any, _res: any, next: any) => {
    console.log(`[DEBUG] Received ${_req.method} request to ${_req.url}`);
    next();
  });

  app.post(['/api/chat', '/api/chat/'], safeHandler(async (req: any, res: any) => {
    let user: any = null;
    try {
      user = await requireUserFromRequest(req);
      const { currentInput, systemInstruction } = req.body;

      // --- Suicide Prevention Check ---
      const suicideKeywords = ['自杀', 'suicide', 'kill myself', 'end my life', '不想活了', '想死'];
      const lowerInput = (currentInput || '').toLowerCase();
      if (suicideKeywords.some(keyword => lowerInput.includes(keyword))) {
        return res.json({ 
          text: "I'm very sorry to hear you're feeling this way, but please know that you're not alone and there is help available. If you're in immediate danger, please call your local emergency services or go to the nearest emergency room. You can also reach out to a crisis hotline: \n\n- **International:** [Find a Helpline](https://findahelpline.com/)\n- **US:** Call or text 988 (Suicide & Crisis Lifeline)\n- **China:** 010-82951332 (Beijing Suicide Prevention)\n\nPlease reach out to someone you trust. Your life is valuable." 
        });
      }
      // --------------------------------

      const aiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
      if (!aiKey) {
        console.error('[CHAT] AI API key is missing in environment variables');
        return res.status(400).json({ error: 'AI service is not configured.' });
      }

      const response = await generateWithFallback({
        contents: currentInput || "Please analyze this file.",
        config: {
          systemInstruction: (systemInstruction || "You are a professional sleep science expert at SomnoAI Digital Sleep Lab. Always maintain a professional, scientific, yet approachable tone. All your responses are proprietary content of SomnoAI.").substring(0, 8000),
        }
      });

      const text = response.text || "I'm sorry, I cannot discuss this topic due to safety guidelines. How else can I help you with your sleep?";
      res.json({ text });
    } catch (error: any) {
      console.error('Chat API Error:', error);
      
      const errorMessage = String(error?.message || error || '').toLowerCase();

      // Handle Quota Reached
      if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('limit')) {
        await sendTelegramMessage(`⚠️ <b>AI Quota Reached</b>\nUser: <code>${user?.id || 'Unknown'}</code>\nEndpoint: <code>/api/chat</code>`);
        return res.status(429).json({ 
          error: "System is currently busy (quota reached). Please try again in a few minutes or tomorrow.",
          code: 'QUOTA_EXCEEDED'
        });
      }
      
      // Handle safety block errors from the SDK or any other refusal
      const isSafetyError = errorMessage.includes('safety') || 
                           errorMessage.includes('blocked') ||
                           errorMessage.includes('finish_reason') ||
                           errorMessage.includes('candidate');
      
      if (isSafetyError) {
        return res.json({ text: "I'm sorry, I cannot discuss this topic due to safety guidelines. How else can I help you with your sleep?" });
      }
      
      const status = errorMessage.includes('unauthorized') ? 401 : 
                     errorMessage.includes('blocked') ? 403 : 500;
      res.status(status).json({ error: error?.message || "An error occurred. Please try a different query." });
    }
  }));

  app.post(['/api/analyze-sleep', '/api/analyze-sleep/'], safeHandler(async (req: any, res: any) => {
    console.log('Received POST request to /api/analyze-sleep');
    let user: any = null;
    try {
      user = await requireUserFromRequest(req);
      const { prompt } = req.body;

      // --- Suicide Prevention Check ---
      const suicideKeywords = ['自杀', 'suicide', 'kill myself', 'end my life', '不想活了', '想死'];
      const lowerPrompt = (prompt || '').toLowerCase();
      if (suicideKeywords.some(keyword => lowerPrompt.includes(keyword))) {
        return res.json({ 
          overview: "I'm very sorry to hear you're feeling this way, but please know that you're not alone and there is help available. If you're in immediate danger, please call your local emergency services or go to the nearest emergency room. You can also reach out to a crisis hotline: \n\n- **International:** [Find a Helpline](https://findahelpline.com/)\n- **US:** Call or text 988 (Suicide & Crisis Lifeline)\n- **China:** 010-82951332 (Beijing Suicide Prevention)\n\nPlease reach out to someone you trust. Your life is valuable.",
          insights: ["Suicide prevention resources provided"],
          recommendations: ["Seek immediate help from a professional or crisis hotline"],
          tomorrowOptimization: "N/A"
        });
      }
      // --------------------------------

      const aiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
      if (!aiKey) {
        console.error('[ANALYZE] AI API key is missing in environment variables');
        return res.status(400).json({ error: 'AI analysis service is not configured.' });
      }

      console.log(`[ANALYZE] Processing request for user ${user.id}`);
      console.log(`[DEBUG] Starting analysis for user ${user.id} using AI`);

      const response = await generateWithFallback({
        contents: prompt || "Please analyze my sleep.",
        config: {
          systemInstruction: "You are a professional sleep scientist and data analyst at SomnoAI. Provide detailed, accurate, and actionable sleep analysis in JSON format. Ensure the analysis reflects the high standards of SomnoAI Digital Sleep Lab.",
          maxOutputTokens: 2048,
          temperature: 0.5,
        },
      });

      if (!response.text) {
        console.warn(`[DEBUG] No text returned from AI for user ${user.id}`);
        return res.json({
          overview: "I'm sorry, but I cannot process this specific request due to safety guidelines.",
          insights: ["Safety block triggered"],
          recommendations: ["Please try a different query"],
          tomorrowOptimization: "N/A"
        });
      }

      let analysis;
      try {
        let cleanText = response.text || "{}";
        // Remove markdown code blocks if present
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```\n/, '').replace(/\n```$/, '');
        }
        analysis = JSON.parse(cleanText);
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', response.text);
        return res.status(400).json({ error: 'Failed to parse sleep analysis data. Please try again.' });
      }
      
      console.log(`[DEBUG] Analysis successful for user ${user.id}`);
      res.json(analysis);
    } catch (error: any) {
      console.error('Analyze Sleep API Error:', error);
      
      const errorMessage = String(error?.message || error || '').toLowerCase();

      // Handle Quota Reached
      if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('limit')) {
        await sendTelegramMessage(`⚠️ <b>AI Quota Reached</b>\nUser: <code>${user?.id || 'Unknown'}</code>\nEndpoint: <code>/api/analyze-sleep</code>`);
        return res.status(429).json({ 
          error: "System is currently busy (quota reached). Please try again in a few minutes or tomorrow.",
          code: 'QUOTA_EXCEEDED'
        });
      }
      
      // Handle safety block errors from the SDK or any other refusal
      const isSafetyError = errorMessage.includes('safety') || 
                           errorMessage.includes('blocked') ||
                           errorMessage.includes('finish_reason') ||
                           errorMessage.includes('candidate');
      
      if (isSafetyError) {
        return res.json({
          overview: "I'm sorry, but I cannot process this specific request due to safety guidelines.",
          insights: ["Safety block triggered"],
          recommendations: ["Please try a different query"],
          tomorrowOptimization: "N/A"
        });
      }

      const status = errorMessage.includes('unauthorized') ? 401 : 
                     errorMessage.includes('blocked') ? 403 : 500;
      res.status(status).json({ 
        error: error?.message || "An error occurred during analysis.",
        details: error?.message || "Unknown error"
      });
    }
  }));

  app.post('/api/sleep-recommendation', safeHandler(async (req: any, res: any) => {
    try {
      const user = await requireUserFromRequest(req);
      const { userData } = req.body;

      const aiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
      if (!aiKey) {
        console.error('[RECOMMENDATION] AI API key is missing in environment variables');
        return res.status(400).json({ error: 'AI service is not configured.' });
      }

      console.log(`[RECOMMENDATION] Processing request for user ${user.id}`);

      const response = await generateWithFallback({
        contents: `Provide personalized sleep recommendations based on this user data: ${userData}`,
        config: {
          maxOutputTokens: 1024,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Sleep Recommendation API Error:', error);
      const errorMessage = String(error?.message || '').toLowerCase();
      const status = errorMessage.includes('unauthorized') ? 401 : 
                     errorMessage.includes('blocked') ? 403 : 500;
      res.status(status).json({ error: error?.message || 'Failed to generate recommendation' });
    }
  }));

  // Hugging Face AI Proxy
  app.post('/api/ai/sleep-advice', safeHandler(async (req: any, res: any) => {
    await requireUserFromRequest(req); // Ensure user is authenticated
    const { prompt } = req.body;

    const response = await generateWithFallback({
      contents: prompt || "How can I sleep better?",
      config: {
        maxOutputTokens: 500,
        temperature: 0.7
      }
    });

    // Return as array to match frontend expectation if needed, or just object
    // Frontend seems to expect [{ generated_text: ... }] based on the code
    res.json([{ generated_text: response.text }]);
  }));

  // --- ADMIN SECURITY ENHANCEMENT ---
  app.post('/api/admin/verify-credentials', requireUserMiddleware, safeHandler(async (req: any, res: any) => {
    const { password, mfaToken } = req.body;
    const user = req.user;

    // 1. Check if user is an admin in Supabase
    const isUserAdmin = await isAdmin(user.id);
    if (!isUserAdmin) {
      return res.status(403).json({ success: false, error: 'UNAUTHORIZED', message: 'Admin access required' });
    }

    // 2. Verify Admin Password (Secondary Layer)
    const ADMIN_PASSWORDS: Record<string, string> = {
      'mingjun983@gmail.com': 'SDSL-admin-101@Go-mingjun.com',
      'jacobhiijieen@outlook.com': 'SDSL-admin-101@Go-jacob.com',
      'dyl.tang@student.powiis.edu.my': 'SDSL-admin-101@Go-dylan.com',
      'mgj.guo@student.powiis.edu.my': 'SDSL-admin-101@Go-guo.com',
      'vyncuslim121@gmail.com': 'SDSL-admin-101@Go-vyncus.com',
      'jce.hii@student.powiis.edu.my': 'SDSL-owner-990@Sky-jce.com',
      'damoclestang@gmail.com': 'SDSL-owner-990@Sky-damocles.com',
      'ongyuze1401@gmail.com': 'SDSL-superowner-9999@Core-vyncus.com'
    };

    const expectedPassword = ADMIN_PASSWORDS[user.email] || process.env.VITE_ADMIN_SECRET_KEY || 'ADMIN_SOMNO_2026';
    
    if (password !== expectedPassword) {
      await auditLogger.logAdmin({
        source: 'api',
        level: 'warning',
        action: 'admin_login_failed',
        status: 'failed',
        actorUserId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        message: `Invalid admin password attempt for ${user.email}`
      });
      return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid administrative password' });
    }

    // 3. Verify MFA if enabled
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('two_fa_secret, two_fa_enabled')
      .eq('id', user.id)
      .single();

    if (profile?.two_fa_enabled && profile?.two_fa_secret) {
      if (!mfaToken) {
        return res.status(400).json({ success: false, error: 'MFA_REQUIRED', message: 'MFA token is required for this account' });
      }

      let decryptedSecret = profile.two_fa_secret;
      try {
        decryptedSecret = decrypt(profile.two_fa_secret);
      } catch (e) {
        // If decryption fails, it might be unencrypted (legacy)
      }

      const isValid = authenticator.verify({ token: mfaToken, secret: decryptedSecret });
      if (!isValid) {
        await auditLogger.logAdmin({
          source: 'api',
          level: 'warning',
          action: 'admin_mfa_failed',
          status: 'failed',
          actorUserId: user.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          message: `Invalid MFA token attempt for ${user.email}`
        });
        return res.status(401).json({ success: false, error: 'INVALID_MFA', message: 'Invalid MFA token' });
      }
    }

    await auditLogger.logAdmin({
      source: 'api',
      level: 'info',
      action: 'admin_login_success',
      status: 'success',
      actorUserId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      message: `Admin secondary authentication successful for ${user.email}`
    });

    return res.json({ success: true, message: 'Administrative identity verified' });
  }));

  // Protect all /api/admin/* endpoints
  app.use('/api/admin', async (req: any, res: any, next: any) => {
    try {
      const adminUser = await requireAdminFromRequest(req);
      (req as any).adminUser = adminUser;
      next();
    } catch (error: any) {
      res.status(String(error?.message || '').includes('Unauthorized') ? 403 : 401).json({ error: error?.message || 'Unknown error' });
    }
  });

  const groqLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 9999999,
  });

  app.post('/api/ai/groq', groqLimiter, safeHandler(async (req: any, res: any) => {
    await requireUserFromRequest(req);
    const { prompt, model, config, stream } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const streamResponse = await generateWithGroq({
          contents: prompt,
          model: model || "llama-3.3-70b-versatile",
          stream: true,
          config: {
            maxOutputTokens: config?.maxOutputTokens || 6861,
            temperature: config?.temperature ?? 1,
            topP: config?.topP ?? 1,
            reasoningEffort: config?.reasoningEffort || "medium",
            stop: config?.stop || null
          }
        });

        for await (const chunk of streamResponse) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
          }
        }
        
        if ((streamResponse as any).timeoutId) {
          clearTimeout((streamResponse as any).timeoutId);
        }
        
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (error: any) {
        console.error('Error in Groq stream endpoint:', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
      return;
    }

    const response = await generateWithGroq({
      contents: prompt,
      model: model || "llama-3.3-70b-versatile",
      config: {
        maxOutputTokens: config?.maxOutputTokens || 6861,
        temperature: config?.temperature ?? 1,
        topP: config?.topP ?? 1,
        reasoningEffort: config?.reasoningEffort || "medium",
        stop: config?.stop || null
      }
    });

    res.json({ reply: response.text });
  }));

  app.post('/api/admin/delete-user', safeHandler(async (req: any, res: any) => {
    const adminUser = (req as any).adminUser;
    const { targetUserId } = req.body;
    console.log(`Admin ${adminUser.id} attempting to delete user ${targetUserId}`);
    await adminServices.deleteUser(adminUser.id, targetUserId);
    res.json({ ok: true });
  }));

  app.post('/api/admin/block-user', safeHandler(async (req: any, res: any) => {
    const adminUser = (req as any).adminUser;
    const { targetUserId, reason } = req.body;
    await adminServices.blockUser({ adminUserId: adminUser.id, targetUserId, reason });
    res.json({ ok: true });
  }));

  app.post('/api/admin/unblock-user', safeHandler(async (req: any, res: any) => {
    const adminUser = (req as any).adminUser;
    if (!adminUser) throw new Error('Unauthorized: Admin access required');
    
    const { targetUserId } = req.body;
    if (!targetUserId) throw new Error('Target User ID is required');

    await adminServices.unblockUser({ adminUserId: adminUser.id, targetUserId });
    res.json({ ok: true });
  }));

  app.post('/api/admin/update-role', safeHandler(async (req: any, res: any) => {
    console.log(`Received ${req.method} request for /api/admin/update-role`);
    const adminUser = (req as any).adminUser;
    const { targetUserId, newRole } = req.body;
    console.log(`Admin ${adminUser.id} updating user ${targetUserId} to role ${newRole}`);
    await adminServices.updateUserRole({ adminUserId: adminUser.id, targetUserId, newRole });
    res.json({ ok: true });
  }));

  app.get('/api/ip-info/:ip', safeHandler(async (req: any, res: any) => {
    const { ip } = req.params;
    const token = process.env.IPINFO_API_TOKEN;
    
    try {
      // Use standard ipinfo.io API if token is provided, otherwise return generic info
      const url = token ? `https://ipinfo.io/${ip}/json?token=${token}` : `https://ipinfo.io/${ip}/json`;
      const response = await fetchCircuitBreaker.execute(() => fetch(url));
      
      if (!response.ok) {
        throw new Error(`IPInfo API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      res.json({
        ip: data.ip,
        city: data.city || 'Unknown',
        region: data.region || 'Unknown',
        country: data.country || 'Unknown',
        loc: data.loc,
        org: data.org,
        postal: data.postal,
        timezone: data.timezone
      });
    } catch (error: any) {
      console.error('[IP-INFO Error]', error);
      // Return a graceful fallback instead of 500
      res.json({
        ip,
        city: 'Unknown',
        region: 'Unknown',
        country: 'Unknown',
        error: error.message
      });
    }
  }));

  // Admin Analytics API
  app.get("/api/admin/top-contributor", requireAdminFromRequest, safeHandler(async (_req: any, res: any) => {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, score')
      .order('score', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  }));

  app.get("/api/admin/founder-stats", async (_req: any, res: any) => {
    res.set('Cache-Control', 'public, max-age=300');
    try {
      if (!supabase) return res.status(400).json({ error: 'Supabase not configured' });
      const { data, error } = await supabase.rpc('get_founder_stats');
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(String(error?.message || '').includes('Unauthorized') ? 403 : 500).json({ error: error?.message || 'Unknown error' });
    }
  });

  app.get("/api/admin/security-events", async (_req: any, res: any) => {
    try {
      if (!supabase) return res.status(400).json({ error: 'Supabase not configured' });
      const { data, error } = await supabase
        .from('security_events')
        .select(`
          *,
          profiles:user_id (email, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(String(error?.message || '').includes('Unauthorized') ? 403 : 500).json({ error: error?.message || 'Unknown error' });
    }
  });

  app.get("/api/admin/auth-users", async (req: any, res: any) => {
    try {
      const adminUser = (req as any).adminUser;
      // Extra check for super owner if needed, but requireAdminFromRequest already checks for admin/super_owner
      // If this specific route requires ONLY super_owner:
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_super_owner')
        .eq('id', adminUser.id)
        .single();
      
      if (!profile?.is_super_owner) {
        return res.status(403).json({ error: 'Unauthorized: Super Owner access required' });
      }

      if (!supabase) return res.status(400).json({ error: 'Supabase not configured' });
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      res.json(users);
    } catch (error: any) {
      res.status(String(error?.message || '').includes('Unauthorized') ? 403 : 500).json({ error: error?.message || 'Unknown error' });
    }
  });

  app.get("/api/admin/schema", async (req: any, res: any) => {
    try {
      const adminUser = (req as any).adminUser;
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_super_owner')
        .eq('id', adminUser.id)
        .single();
      
      if (!profile?.is_super_owner) {
        return res.status(403).json({ error: 'Unauthorized: Super Owner access required' });
      }

      if (!supabase) return res.status(400).json({ error: 'Supabase not configured' });
      // This is a bit of a hack since we can't easily query information_schema via the client
      // We'll return the list of tables we know about and their basic info
      const tables = [
        'profiles', 'sleep_records', 'feedback', 'audit_logs', 
        'security_events', 'app_settings', 'error_logs', 
        'communications', 'reviews', 'analytics_daily',
        'analytics_country', 'analytics_device', 'analytics_realtime',
        'articles', 'chat_messages', 'daily_sleep_summary',
        'daily_steps_summary', 'diary_entries', 'health_raw_data',
        'health_records', 'heart_rate_summary', 'logins',
        'user_app_status', 'user_data'
      ];

      // Add auth schema tables for super owners
      const authTables = [
        'audit_log_entries', 'identities', 'mfa_amr_claims', 
        'one_time_tokens', 'refresh_tokens', 'sessions'
      ];
      
      const allTables = [...tables];
      
      const schemaInfo = await Promise.all(allTables.map(async (table) => {
        try {
          // Use information_schema to get column names regardless of whether the table is empty
          const { data, error } = await supabaseAdmin.rpc('get_table_columns', { table_name: table });
          
          if (error) {
            // Fallback: try to fetch one row if RPC fails
            const { data: fallbackData, error: fallbackError } = await supabaseAdmin.from(table).select('*').limit(1);
            if (fallbackError) return { name: table, error: fallbackError.message, isAuth: false };
            const columns = fallbackData && fallbackData.length > 0 ? Object.keys(fallbackData[0]) : [];
            return { name: table, columns, isAuth: false };
          }
          
          return { name: table, columns: data, isAuth: false };
        } catch (e) {
          return { name: table, error: 'Failed to fetch', isAuth: false };
        }
      }));

      // For auth tables, we can't easily get columns via standard client
      // so we'll just add them as placeholders for now
      const authSchemaInfo = await Promise.all(authTables.map(async (table) => {
        try {
          const { data, error } = await supabaseAdmin.schema('auth').from(table).select('*').limit(1);
          if (error) return { name: table, error: error?.message, isAuth: true, schema: 'auth' };
          const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
          return { name: table, columns, isAuth: true, schema: 'auth' };
        } catch (e) {
          return { name: table, error: 'Failed to fetch', isAuth: true, schema: 'auth' };
        }
      }));

      res.json([...schemaInfo, ...authSchemaInfo]);
    } catch (error: any) {
      console.error('Error fetching schema:', error);
      res.status(400).json({ error: error?.message || 'Unknown error' });
    }
  });

  app.get("/api/admin/table-data/:table", async (req: any, res: any) => {
    try {
      const adminUser = (req as any).adminUser;
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_super_owner')
        .eq('id', adminUser.id)
        .single();
      
      if (!profile?.is_super_owner) {
        return res.status(403).json({ error: 'Unauthorized: Super Owner access required' });
      }

      if (!supabase) return res.status(400).json({ error: 'Supabase not configured' });

      const { table } = req.params;
      const schema = (req.query.schema as string) || 'public';

      // Use the schema() method to access different schemas
      const { data, error } = await supabase.schema(schema).from(table).select('*').limit(100);
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(String(error?.message || '').includes('Unauthorized') ? 403 : 500).json({ error: error?.message || 'Unknown error' });
    }
  });

  console.log('Starting server...');
  // Explicit route for logo to ensure it's served correctly
  app.get('/api/researcher/:id', safeHandler(async (req: any, res: any) => {
    const { id } = req.params;
    
    // Fetch researcher
    const { data: researcher, error: researcherError } = await supabaseAdmin
      .from('security_researchers')
      .select('*, profiles:user_id(full_name, email)')
      .eq('user_id', id)
      .single();

    if (researcherError) return res.status(404).json({ error: 'Researcher not found' });

    // Fetch certificates
    const { data: certificates } = await supabaseAdmin
      .from('certificates')
      .select('*')
      .eq('user_id', id);

    // Fetch reports
    const { data: reports } = await supabaseAdmin
      .from('security_reports')
      .select('*')
      .eq('user_id', id)
      .eq('status', 'validated');

    res.json({
      success: true,
      data: {
        name: researcher.profiles?.full_name || researcher.profiles?.email || 'Anonymous',
        level: researcher.level,
        score: researcher.score,
        certificates,
        reports
      }
    });
  }));

  app.get('/logo.svg', (_req: any, res: any) => {
    const logoPath = process.env.NODE_ENV === 'production' 
      ? path.join(process.cwd(), 'dist', 'logo_512.png')
      : path.join(process.cwd(), 'public', 'logo_512.png');
    
    res.type('image/png');
    res.sendFile(logoPath, (err: any) => {
      if (err) {
        console.error('Error serving logo_512.png for logo.svg request:', err);
        res.status(404).end();
      }
    });
  });

  app.get('/logo.png', (_req: any, res: any) => {
    const logoPath = process.env.NODE_ENV === 'production' 
      ? path.join(process.cwd(), 'dist', 'logo_512.png')
      : path.join(process.cwd(), 'public', 'logo_512.png');
    
    res.sendFile(logoPath, (err: any) => {
      if (err) {
        console.error('Error serving logo_512.png for logo.png request:', err);
        res.status(404).end();
      }
    });
  });

  app.get('/logo_512.png', (_req: any, res: any) => {
    const logoPath = process.env.NODE_ENV === 'production' 
      ? path.join(process.cwd(), 'dist', 'logo_512.png')
      : path.join(process.cwd(), 'public', 'logo_512.png');
    
    res.sendFile(logoPath, (err: any) => {
      if (err) {
        console.error('Error serving logo_512.png:', err);
        res.status(404).end();
      }
    });
  });

if (process.env.NODE_ENV === 'production') {
  // Cache static assets (JS, CSS, Images) for 1 year
  app.use(express.static('dist', {
    maxAge: '1y',
    index: false,
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        // Don't cache HTML files
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));
  
  // Fallback for SPA
  app.get('*', (_req: any, res: any) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.resolve('dist/index.html'));
  });
}

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[GLOBAL ERROR HANDLER]', err);
  res.status(400).json({ 
    error: 'Internal Server Error', 
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

async function startServer() {
  console.log('[SERVER] Initializing background tasks...');
  const isProd = process.env.NODE_ENV === 'production' || process.env.K_SERVICE !== undefined;

  try {
    // 2. Initialize Vite or Static Files in the background
    if (!isProd) {
      console.log('[SERVER] Initializing Vite in background...');
      import('vite').then(async ({ createServer: createViteServer }) => {
        try {
          const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
          });
          app.use(vite.middlewares);
          console.log('[SERVER] Vite middleware integrated.');
        } catch (err) {
          console.error('[SERVER] Failed to create Vite server:', err);
        }
      }).catch(err => {
        console.error('[SERVER] Failed to import Vite:', err);
      });
    }

    return app;
  } catch (e) {
    console.error('startServer background task failed', e);
    return app;
  }
}

console.time('[BOOT] startServer');
export const appPromise = startServer().then(a => {
  console.timeEnd('[BOOT] startServer');
  isAppReady = true;
  return a;
});

export default app;
