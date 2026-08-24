// Health check endpoint

import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';
import type { Context } from 'hono';

export class HealthEndpoint extends OpenAPIRoute {
  schema = {
    summary: 'Health Check',
    description: 'Check if the worker is running and healthy. No authentication required.',
    tags: ['System'],
    responses: {
      '200': {
        description: 'Service is healthy and operational',
        content: {
          'text/plain': {
            schema: z.string()
          }
        }
      }
    }
  };

  async handle(_c: Context) {
    return new Response('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
