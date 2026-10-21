import type { Decision, DecisionBackend, Policy } from './types.js';
/** The Jev version every published number was measured on. Moved deliberately, after a frozen-set run. */
export declare const DEFAULT_JEV_MODEL = "jev-1.13.0";
/** Which real backend `auto` resolves to, from the environment. */
export type Provider = 'typesafe' | 'openrouter' | 'gateway' | 'mock';
/** Key precedence for `auto`: TypeSafe direct, then OpenRouter, then Vercel AI Gateway. */
export declare const KEY_ENV_VARS: readonly ["TYPESAFE_API_KEY", "OPENROUTER_API_KEY", "AI_GATEWAY_API_KEY"];
export declare function resolveProvider(provider: string): Provider;
export declare function makeBackend(policy: Policy, override?: string): DecisionBackend;
/**
 * Claude Code PreToolUse JSON. Silence (undefined) means "no opinion": the normal
 * permission flow applies. Asks and denies always carry a user-visible systemMessage;
 * allows are quiet unless `show_allows` is on — the hook runs on every gated call, and
 * a line per allowed `ls` is noise.
 */
export declare function toHookOutput(decision: Decision, opts?: {
    showAllows?: boolean;
}): Record<string, unknown> | undefined;
/**
 * Run as a Claude Code PreToolUse hook: JSON in on stdin, decision JSON on stdout.
 * Always exits 0; the decision travels in the JSON. An internal failure (bad
 * stdin, bad policy, bug) becomes a visible `ask`, never a silent allow.
 */
export declare function runHook(opts?: {
    policyPath?: string;
    backend?: string;
}): Promise<void>;
/**
 * `toolgate decide`: the same input and side effects as `hook` (audit line, ledger proposal), but
 * the whole Decision as JSON on stdout, always — allow included. For hosts that act on the
 * verdict themselves (the Claude Code mod, other harnesses) rather than reading PreToolUse output.
 * An internal failure is a visible `ask` with `source: fail-mode`, never a silent allow.
 */
export declare function runDecide(opts?: {
    policyPath?: string;
    backend?: string;
}): Promise<void>;
/**
 * Run as a Claude Code PostToolUse / PostToolUseFailure / PermissionDenied hook: settle the
 * ledger event for this tool_use_id. No model call, no output, always exit 0, never throws —
 * a failure here must not affect the agent, and the ledger is best-effort by design (an
 * unsettled write only ever makes a later execution stricter, never looser).
 */
export declare function runPost(opts?: {
    policyPath?: string;
}): Promise<void>;
