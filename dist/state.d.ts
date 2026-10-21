import type { HookInput, JSONObject, JSONValue, Policy } from './types.js';
export type Limits = Policy['limits'];
export declare const DEFAULT_LIMITS: Limits;
export declare function isCompactionSummary(text: string): boolean;
/** A pasted log or table is material the person attached, not what they asked for: keep the typed part. */
export declare function withoutPastedContent(text: string): string;
/** Scrub obvious secrets in free text. Applied to everything that leaves the machine and to the audit log. */
export declare function redact(text: string): string;
/**
 * Scrub a JSON value: any scalar under a sensitive key is replaced outright; every string is
 * additionally run through the text patterns. ONE redaction path: the model state and the audit
 * log both use this, so there is a single transformation to reason about.
 */
export declare function redactInput(v: JSONValue, key?: string): JSONValue;
/** The tool input as redacted text, for the audit log: the same redaction the model state gets, then flattened. */
export declare function redactedInputText(toolInput: unknown): string;
/**
 * The state the decision model evaluates: JSON-clean, secrets redacted, oversized input
 * truncated (head + tail, flagged so the engine can't `allow` on it). `current_task` is the
 * latest user prompt; `earlier_prompts` (oldest first) are the ones before it, because in a
 * working session the latest prompt is often "yes" or "continue".
 */
export declare function buildState(input: HookInput, includeTaskContext: boolean, limits?: Limits, trustedHosts?: string[], trustedTool?: boolean): JSONObject;
/**
 * The first substantive user prompt of a transcript (≥ GOAL_MIN_CHARS), read forward from the
 * file's head. Best-effort: any failure means no goal, never a failed gate.
 */
export declare function sessionGoal(transcriptPath: string): string | undefined;
/**
 * True when the tool input was cut — the model did not see what it is authorizing. A cut prompt
 * (`current_task_truncated`) is flagged in the state and the audit row but does not floor the
 * verdict: 6,000 characters show the whole instruction in practice (p90 of prompt length in the
 * 0.16.0 window was 885), and what was being cut was compaction summaries, not instructions.
 */
export declare function isTruncated(state: JSONObject): boolean;
/**
 * Text the static rules match against: the tool input's values, with quotes
 * and backslashes stripped so rules are written for raw commands, not JSON.
 */
export declare function matchText(toolInput: unknown): string;
/** Most recent real user prompt from a Claude Code transcript (JSONL). */
export declare function lastUserPrompt(transcriptPath: string): string | undefined;
/**
 * The last `count` real user prompts, newest first. Reads the file backwards in chunks
 * and stops as soon as it has enough, so a transcript full of large tool results still
 * yields the prompts. Best-effort: any failure means no task context, never a failed gate.
 */
export declare function recentUserPrompts(transcriptPath: string, count: number): string[];
