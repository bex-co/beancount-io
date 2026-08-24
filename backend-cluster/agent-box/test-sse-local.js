#!/usr/bin/env node

/**
 * Local SSE Stream Test
 *
 * Tests the beancount-stream endpoint locally to reproduce the timeout issue.
 * This script monitors:
 * - Total stream duration
 * - Time between events
 * - Event types and progression
 * - Stream closure reason
 */

import http from 'http';

const ENDPOINT = 'http://localhost:8790/beancount-stream';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-secret-admin-token';

// Test payload - simplified for local testing
const payload = {
  repo: 'git@github.com:puncsky/ledger-example.git',
  task: 'hi, based on my investment, what insights can you get?',
  baseBranch: 'main',
  githubToken: process.env.GIT_TOKEN || 'git-user:git-token',
  mode: 'ASK',
  sandboxId: `local-test-${Date.now()}`
};

console.log('='.repeat(80));
console.log('LOCAL SSE STREAM TEST');
console.log('='.repeat(80));
console.log('');
console.log('Configuration:');
console.log('  Endpoint:', ENDPOINT);
console.log('  Sandbox ID:', payload.sandboxId);
console.log('  Mode:', payload.mode);
console.log('  Task:', payload.task);
console.log('');
console.log('Starting test at:', new Date().toISOString());
console.log('='.repeat(80));
console.log('');

const startTime = Date.now();
let lastEventTime = startTime;
let eventCount = 0;
let lastEventType = null;

const postData = JSON.stringify(payload);

const options = {
  hostname: 'localhost',
  port: 8790,
  path: '/beancount-stream',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Accept': 'text/event-stream',
    'x-admin-token': ADMIN_TOKEN
  }
};

const req = http.request(options, (res) => {
  console.log(`[STATUS] ${res.statusCode}`);
  console.log(`[HEADERS] ${JSON.stringify(res.headers, null, 2)}`);
  console.log('');

  let buffer = '';

  res.on('data', (chunk) => {
    const now = Date.now();
    const timeSinceStart = ((now - startTime) / 1000).toFixed(1);
    const timeSinceLast = ((now - lastEventTime) / 1000).toFixed(1);

    buffer += chunk.toString();

    // Process complete SSE messages
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || ''; // Keep incomplete message in buffer

    lines.forEach(message => {
      if (!message.trim()) return;

      // Check for keepalive comments
      if (message.startsWith(':')) {
        console.log(`[T+${timeSinceStart}s] [Δ${timeSinceLast}s] 💓 KEEPALIVE`);
        lastEventTime = now;
        return;
      }

      // Parse SSE event
      const eventMatch = message.match(/^event:\s*(.+)/m);
      const dataMatch = message.match(/^data:\s*(.+)/m);

      if (eventMatch && dataMatch) {
        eventCount++;
        const eventType = eventMatch[1];
        let eventData;

        try {
          eventData = JSON.parse(dataMatch[1]);
        } catch (e) {
          eventData = dataMatch[1];
        }

        const progress = eventData.progress || eventData.data?.progress || '?';
        const msg = eventData.message || eventData.data?.message || '';

        console.log(`[T+${timeSinceStart}s] [Δ${timeSinceLast}s] [${eventType.toUpperCase()}] (${progress}%) ${msg}`);

        if (eventData.logs) {
          console.log(`  📝 Logs: ${eventData.logs.substring(0, 100)}${eventData.logs.length > 100 ? '...' : ''}`);
        }

        if (eventData.error || eventData.data?.error) {
          console.log(`  ❌ Error: ${eventData.error || eventData.data?.error}`);
        }

        lastEventType = eventType;
        lastEventTime = now;
      }
    });
  });

  res.on('end', () => {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('');
    console.log('='.repeat(80));
    console.log(`[STREAM ENDED] Duration: ${duration}s`);
    console.log(`  Total Events: ${eventCount}`);
    console.log(`  Last Event Type: ${lastEventType}`);
    console.log(`  End Time: ${new Date().toISOString()}`);
    console.log('='.repeat(80));

    if (duration < 30 && lastEventType !== 'completed') {
      console.log('');
      console.log('⚠️  WARNING: Stream closed prematurely!');
      console.log(`   Expected: 'completed' event`);
      console.log(`   Got: '${lastEventType}' event`);
      console.log(`   Duration: ${duration}s (likely timeout at ~22-30s)`);
      console.log('');
    }
  });

  res.on('error', (err) => {
    console.error('');
    console.error('='.repeat(80));
    console.error('[STREAM ERROR]', err);
    console.error('='.repeat(80));
  });
});

req.on('error', (err) => {
  console.error('');
  console.error('='.repeat(80));
  console.error('[REQUEST ERROR]', err);
  console.error('='.repeat(80));
});

// Send request
req.write(postData);
req.end();

// Timeout watchdog
setTimeout(() => {
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  if (lastEventType !== 'completed') {
    console.log('');
    console.log('='.repeat(80));
    console.log('⏱️  WATCHDOG: 2 minute timeout reached');
    console.log(`   Duration: ${duration}s`);
    console.log(`   Last Event: ${lastEventType}`);
    console.log(`   This test is taking longer than expected.`);
    console.log('='.repeat(80));
    console.log('');
  }
}, 120000); // 2 minutes
