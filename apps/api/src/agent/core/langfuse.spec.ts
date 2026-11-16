import { SpanStatusCode } from '@opentelemetry/api';
import { InMemorySpanExporter, TracerProvider } from '@opentelemetry/sdk-trace';
import { describe, expect, it } from 'vitest';

import {
  langfuseExporterOptions,
  langfuseSettings,
  langfuseSpanProcessor,
} from './langfuse.js';

const SETTINGS = {
  publicKey: 'pk-lf-test',
  secretKey: 'sk-lf-test',
  baseUrl: 'https://cloud.langfuse.com',
};
const CLABE = '002180700000000019';

describe('langfuseSettings', () => {
  it('is null without keys, so nothing is exported', () => {
    expect(
      langfuseSettings({
        LANGFUSE_PUBLIC_KEY: '',
        LANGFUSE_SECRET_KEY: '',
        LANGFUSE_BASE_URL: 'https://cloud.langfuse.com',
      }),
    ).toBeNull();
  });

  it('carries both keys and the base URL when set', () => {
    expect(
      langfuseSettings({
        LANGFUSE_PUBLIC_KEY: SETTINGS.publicKey,
        LANGFUSE_SECRET_KEY: SETTINGS.secretKey,
        LANGFUSE_BASE_URL: SETTINGS.baseUrl,
      }),
    ).toEqual(SETTINGS);
  });
});

describe('langfuseExporterOptions', () => {
  it('targets the OTLP traces path with Basic auth and real-time ingestion', () => {
    expect(langfuseExporterOptions(SETTINGS)).toEqual({
      url: 'https://cloud.langfuse.com/api/public/otel/v1/traces',
      headers: {
        Authorization: `Basic ${Buffer.from('pk-lf-test:sk-lf-test').toString('base64')}`,
        'x-langfuse-ingestion-version': '4',
      },
    });
  });

  it('tolerates a trailing slash on the base URL', () => {
    expect(
      langfuseExporterOptions({
        ...SETTINGS,
        baseUrl: 'http://localhost:3000/',
      }).url,
    ).toBe('http://localhost:3000/api/public/otel/v1/traces');
  });
});

describe('langfuseSpanProcessor (02 G6, Traces)', () => {
  it('hands the exporter only masked spans', async () => {
    const exporter = new InMemorySpanExporter();
    const processor = langfuseSpanProcessor(exporter);
    const tracer = new TracerProvider({
      spanProcessors: [processor],
    }).getTracer('test');
    const span = tracer.startSpan(`chat ${CLABE}`);
    span.setAttribute('ai.prompt', `mi CLABE ${CLABE}`);
    span.addEvent(`exception ${CLABE}`, { message: CLABE });
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: `failed for ${CLABE}`,
    });
    span.end();
    await processor.forceFlush();

    const [exported] = exporter.getFinishedSpans();
    const sent = JSON.stringify({
      name: exported?.name,
      attributes: exported?.attributes,
      events: exported?.events.map(({ name, attributes }) => ({
        name,
        attributes,
      })),
      status: exported?.status,
    });
    expect(sent).not.toContain(CLABE);
    expect(sent).toContain('••••0019');
  });
});
