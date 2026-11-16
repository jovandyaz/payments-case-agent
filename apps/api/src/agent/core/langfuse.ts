import { OpenTelemetry } from '@ai-sdk/otel';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  BatchSpanProcessor,
  TracerProvider,
  type SpanExporter,
  type SpanProcessor,
} from '@opentelemetry/sdk-trace';
import type { Telemetry } from 'ai';

import { reasonOf } from '../../common/errors/reason-of.js';
import type { ApiConfig } from '../../config.js';
import { maskingSpanProcessor } from './telemetry.js';

// https://langfuse.com/integrations/native/opentelemetry
const OTLP_TRACES_PATH = '/api/public/otel/v1/traces';
const INGESTION_VERSION = '4';

export interface LangfuseSettings {
  publicKey: string;
  secretKey: string;
  baseUrl: string;
}

/** Langfuse is on only when both keys are set; config refuses one without the other. */
export function langfuseSettings(
  env: Pick<
    ApiConfig,
    'LANGFUSE_PUBLIC_KEY' | 'LANGFUSE_SECRET_KEY' | 'LANGFUSE_BASE_URL'
  >,
): LangfuseSettings | null {
  if (env.LANGFUSE_PUBLIC_KEY === '' || env.LANGFUSE_SECRET_KEY === '') {
    return null;
  }
  return {
    publicKey: env.LANGFUSE_PUBLIC_KEY,
    secretKey: env.LANGFUSE_SECRET_KEY,
    baseUrl: env.LANGFUSE_BASE_URL,
  };
}

/** The OTLP HTTP target: Basic auth over `public:secret`, real-time ingestion. */
export function langfuseExporterOptions(settings: LangfuseSettings): {
  url: string;
  headers: Record<string, string>;
} {
  const credentials = Buffer.from(
    `${settings.publicKey}:${settings.secretKey}`,
  ).toString('base64');
  return {
    url: `${settings.baseUrl.replace(/\/+$/, '')}${OTLP_TRACES_PATH}`,
    headers: {
      Authorization: `Basic ${credentials}`,
      'x-langfuse-ingestion-version': INGESTION_VERSION,
    },
  };
}

/** The only path from a span to the exporter: batched, behind the masker (02 G6). */
export function langfuseSpanProcessor(exporter: SpanExporter): SpanProcessor {
  return maskingSpanProcessor(new BatchSpanProcessor({ exporter }));
}

export interface LangfuseTelemetry {
  telemetry: Telemetry;
  /** Flushes pending spans; call on shutdown. Never rejects: a failed flush goes to `onFlushError`. */
  shutdown: () => Promise<void>;
}

/**
 * The AI SDK integration that exports to Langfuse, on a tracer provider of
 * its own: nothing is registered globally, so no other span reaches it.
 * A refused or timed-out flush is reported by its reason only (the
 * exporter's error carries the response body), never thrown: lost spans
 * cost observability, not the shutdown of the worker or an eval run.
 */
export function langfuseTelemetry(
  settings: LangfuseSettings,
  onFlushError: (reason: string) => void,
): LangfuseTelemetry {
  const provider = new TracerProvider({
    spanProcessors: [
      langfuseSpanProcessor(
        new OTLPTraceExporter(langfuseExporterOptions(settings)),
      ),
    ],
  });
  return {
    telemetry: new OpenTelemetry({
      tracer: provider.getTracer('payments-case-agent'),
    }),
    shutdown: () =>
      provider.shutdown().catch((error: unknown) => {
        onFlushError(reasonOf(error));
      }),
  };
}
