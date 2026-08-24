// Zod schemas for the control-plane wire contract. The Node-side
// HarnessV1SandboxProvider in backend-v2 must serialize request bodies to match
// these exactly (see t002).

import { z } from 'zod';

const envRecord = z.record(z.string(), z.string().optional());

export const execRequestSchema = z.object({
  command: z.string().min(1),
  cwd: z.string().optional(),
  env: envRecord.optional(),
  timeout: z.number().int().positive().optional(),
});

export const spawnRequestSchema = z.object({
  command: z.string().min(1),
  cwd: z.string().optional(),
  env: envRecord.optional(),
});

export const killRequestSchema = z.object({
  signal: z.string().optional(),
});

export const writeFileRequestSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  encoding: z.string().optional(),
});

export const readFileRequestSchema = z.object({
  path: z.string().min(1),
  encoding: z.string().optional(),
});

export const exposePortRequestSchema = z.object({
  port: z.number().int().min(1024).max(65535),
  hostname: z.string().min(1),
  name: z.string().optional(),
  token: z.string().optional(),
});

export const unexposePortRequestSchema = z.object({
  port: z.number().int().min(1024).max(65535),
});
