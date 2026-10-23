import type { ActionType } from '@payments-case-agent/contracts';

import { HAIKU_MODEL, SONNET_MODEL } from '../agent/core/prices.js';
import type { AgentVariant } from '../config.js';

/** How one measure spread over the real runs: quartiles by upper nearest rank. */
export interface Spread {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

/** How long one field of the model answers ran, in characters. */
export interface Lengths {
  min: number;
  median: number;
  max: number;
}

/**
 * Input tokens a model call adds as a line over the characters it reads anew,
 * `base + perChar × chars`, and how the real calls' residuals spread.
 */
export interface TokenLine {
  base: number;
  perChar: number;
  residual: { min: number; q1: number; q3: number; max: number };
}

/** One variant's real runs: the envelope its canaries' scripted runs are calibrated against. */
export interface RealRuns {
  /** The agent model they ran on; `costUsd` holds at its prices only. */
  model: string;
  /** The redactor model they ran with, whose rates give each redaction call its cost. */
  redactorModel: string;
  runs: number;
  /** Run totals as `agent_runs` stores them, the redactor's call included. */
  inputTokens: Spread;
  outputTokens: Spread;
  latencyMs: Spread;
  costUsd: Spread;
  /** `run_steps` rows of every kind per run. */
  steps: Spread;
  /** MCP tool calls per run; `search_policies` is a retrieval step, not one. */
  toolCalls: Spread;
  /** Runs whose first answer failed validation and took the repair turn. */
  repairedRuns: number;
  /** The action each run proposed. */
  actions: Record<ActionType, number>;
  /** Over every model answer, the ones sent back for repair included. */
  textChars: {
    reasoningSummary: Lengths;
    justification: Lengths;
    draftReply: Lengths;
  };
  /** What each model call read anew against the input tokens it reported. */
  promptTokens: {
    /** The redactor's call, over the delimited case text. */
    redactor: TokenLine;
    /** The agent's first call, over the case message. */
    caseMessage: TokenLine;
    /** A call after a tool step, over the text the model reads of its results. */
    toolResults: TokenLine;
  };
}

/** The final full eval run, whose runs of each variant `REAL_RUNS` measures. */
export const REAL_RUNS_FILE = 'evals/results/2026-10-23-1bd4814-221208Z.json';

/** The steps of each run in `REAL_RUNS_FILE`, from `evals/export-steps.sql`. */
export const REAL_STEPS_FILE =
  'evals/results/2026-10-23-1bd4814-221208Z.steps.json';

/** What the repair prompt added in every real run that repaired for `UNGROUNDED_NUMBER` alone. */
export const UNGROUNDED_REPAIR_TOKENS = 46;

/**
 * Per agent variant, what its 52 runs in `REAL_RUNS_FILE` measured, so a
 * canary's trace reads like those of the variant the stack runs (02 G3);
 * `real-runs.spec.ts` derives every number again from the file.
 */
export const REAL_RUNS: Readonly<Record<AgentVariant, RealRuns>> = {
  A: {
    model: SONNET_MODEL,
    redactorModel: HAIKU_MODEL,
    runs: 52,
    inputTokens: {
      min: 9_938,
      q1: 15_663,
      median: 16_402,
      q3: 23_502,
      max: 31_353,
    },
    outputTokens: { min: 750, q1: 1_275, median: 1_583, q3: 2_275, max: 2_914 },
    latencyMs: {
      min: 7_460,
      q1: 11_905,
      median: 14_258,
      q3: 18_978,
      max: 36_995,
    },
    costUsd: {
      min: 0.026_443,
      q1: 0.043_434,
      median: 0.046_864,
      q3: 0.068_547,
      max: 0.084_036,
    },
    steps: { min: 7, q1: 10, median: 10, q3: 12, max: 14 },
    toolCalls: { min: 1, q1: 3, median: 3, q3: 3, max: 5 },
    repairedRuns: 23,
    actions: { open_dispute: 16, resend_cep: 7, escalate_fraud: 3, none: 26 },
    textChars: {
      reasoningSummary: { min: 201, median: 287, max: 465 },
      justification: { min: 142, median: 236, max: 411 },
      draftReply: { min: 319, median: 578, max: 797 },
    },
    promptTokens: {
      redactor: {
        base: 437,
        perChar: 0.4421,
        residual: { min: -6, q1: -2, q3: 2, max: 7 },
      },
      caseMessage: {
        base: 4_388,
        perChar: 0.4421,
        residual: { min: -6, q1: -2, q3: 2, max: 7 },
      },
      toolResults: {
        base: 33,
        perChar: 0.4611,
        residual: { min: -117, q1: -24, q3: 25, max: 73 },
      },
    },
  },
  B: {
    model: HAIKU_MODEL,
    redactorModel: HAIKU_MODEL,
    runs: 52,
    inputTokens: {
      min: 4_933,
      q1: 15_496,
      median: 15_837,
      q3: 23_067,
      max: 32_110,
    },
    outputTokens: { min: 751, q1: 1_804, median: 2_244, q3: 3_211, max: 4_646 },
    latencyMs: {
      min: 5_173,
      q1: 11_528,
      median: 13_944,
      q3: 16_991,
      max: 25_738,
    },
    costUsd: {
      min: 0.000_869,
      q1: 0.002_466,
      median: 0.002_92,
      q3: 0.003_839,
      max: 0.005_534,
    },
    steps: { min: 4, q1: 10, median: 10, q3: 12, max: 15 },
    toolCalls: { min: 0, q1: 3, median: 3, q3: 3, max: 5 },
    repairedRuns: 8,
    actions: { open_dispute: 16, resend_cep: 7, escalate_fraud: 3, none: 26 },
    textChars: {
      reasoningSummary: { min: 238, median: 383, max: 547 },
      justification: { min: 166, median: 281, max: 480 },
      draftReply: { min: 361, median: 560, max: 848 },
    },
    promptTokens: {
      redactor: {
        base: 437,
        perChar: 0.4421,
        residual: { min: -6, q1: -2, q3: 2, max: 7 },
      },
      caseMessage: {
        base: 4_388,
        perChar: 0.4421,
        residual: { min: -6, q1: -2, q3: 2, max: 7 },
      },
      toolResults: {
        base: 65,
        perChar: 0.4266,
        residual: { min: -105, q1: -4, q3: 16, max: 95 },
      },
    },
  },
};
