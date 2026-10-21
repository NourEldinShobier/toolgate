import type { Decision, HookInput, Policy } from './types.js';
/** toolgate's own version, stamped on every audit line so a "single-version log" is verifiable from the log itself. */
export declare const TOOLGATE_VERSION: string;
/** Append one JSONL line per decision. Owner-only file; secrets redacted; never throws. */
export declare function writeAudit(policy: Policy, input: HookInput, decision: Decision, backend: string, extra?: Record<string, unknown>): void;
