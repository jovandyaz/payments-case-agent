import { once } from 'node:events';
import { createServer, type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';

import { generateText } from 'ai';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { inOrder, objectResponse } from '../../../test/mock-model.js';
import { langfuseTelemetry } from './langfuse.js';
import { telemetryOf } from './telemetry.js';

const CLABE = '002180700000000019';

interface Received {
  path: string | undefined;
  headers: IncomingHttpHeaders;
  body: string;
}

// A stand-in for Langfuse's OTLP endpoint on loopback: it records what the
// exporter sends, so the test reads the bytes that would leave the process.
const received: Received[] = [];
const server = createServer((request, response) => {
  const chunks: Buffer[] = [];
  request.on('data', (chunk: Buffer) => chunks.push(chunk));
  request.on('end', () => {
    received.push({
      path: request.url,
      headers: request.headers,
      body: Buffer.concat(chunks).toString('utf8'),
    });
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end('{}');
  });
});
let baseUrl = '';

beforeAll(async () => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

describe('langfuseTelemetry over OTLP HTTP (02 G6, Traces)', () => {
  it('sends AI SDK spans to the traces path, authenticated and masked', async () => {
    const langfuse = langfuseTelemetry(
      { publicKey: 'pk-lf-test', secretKey: 'sk-lf-test', baseUrl },
      () => undefined,
    );

    // Content forced on so a full CLABE reaches the span: only the masker
    // can keep it out of the request.
    await generateText({
      model: inOrder(() => objectResponse({ echo: `CLABE ${CLABE}` })),
      prompt: `mi CLABE es ${CLABE}`,
      telemetry: {
        ...telemetryOf(langfuse.telemetry),
        recordInputs: true,
        recordOutputs: true,
      },
    });
    await langfuse.shutdown();

    expect(received.length).toBeGreaterThan(0);
    const [first] = received;
    expect(first?.path).toBe('/api/public/otel/v1/traces');
    expect(first?.headers.authorization).toBe(
      `Basic ${Buffer.from('pk-lf-test:sk-lf-test').toString('base64')}`,
    );
    expect(first?.headers['x-langfuse-ingestion-version']).toBe('4');
    const bodies = received.map(({ body }) => body).join('\n');
    expect(bodies).toContain('gen_ai');
    expect(bodies).not.toContain(CLABE);
    expect(bodies).toContain('••••0019');
  });

  it('reports a refused export on shutdown instead of throwing', async () => {
    // Langfuse answering 401 (a wrong key): losing spans costs observability,
    // never the shutdown of the worker or the eval run.
    const refusing = createServer((request, response) => {
      request.resume();
      request.on('end', () => {
        response.writeHead(401, { 'content-type': 'application/json' });
        response.end('{"message":"Invalid credentials"}');
      });
    });
    refusing.listen(0, '127.0.0.1');
    await once(refusing, 'listening');
    const failures: string[] = [];
    const langfuse = langfuseTelemetry(
      {
        publicKey: 'pk-lf-test',
        secretKey: 'sk-lf-test',
        baseUrl: `http://127.0.0.1:${(refusing.address() as AddressInfo).port}`,
      },
      (reason) => failures.push(reason),
    );
    await generateText({
      model: inOrder(() => objectResponse({ ok: true })),
      prompt: 'hola',
      telemetry: telemetryOf(langfuse.telemetry),
    });

    await expect(langfuse.shutdown()).resolves.toBeUndefined();
    refusing.close();
    expect(failures).toHaveLength(1);
    expect(failures.join()).not.toContain('sk-lf-test');
  });
});
