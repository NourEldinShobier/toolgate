import type { Policy, Questions, StaticRule } from './types.js';
export declare const DEFAULT_QUESTIONS: Questions;
/** Questions that need task context; skipped when the transcript yields none. */
export declare const CONTEXT_QUESTIONS: Set<string>;
/** Tools whose call writes a file; the ledger records them and asks the capability questions. */
export declare const WRITE_TOOLS: Set<string>;
/**
 * Capability questions, asked ONLY on write tools and ONLY as metadata: they never touch the
 * write's own verdict (content is not harm). Their answers ride on the ledger event, so a later
 * call that executes the file is judged as what the file does. Same "if it were later executed"
 * framing throughout, so an inert fixture that merely contains `curl` still scores as capable —
 * which is correct: the capability is real, and activation is where it becomes harm.
 */
export declare const CAPABILITY_QUESTIONS: Questions;
export declare const CAPABILITY_KEYS: Set<string>;
/**
 * Risks that authorization never softens: a task asking for an action does not make leaking
 * a secret fine, and "the task authorizes it" cannot coexist with "the task forbids it".
 */
export declare const UNSOFTENABLE: Set<string>;
/**
 * Axes whose strongest verdict is `ask`: an unresolved choice needs a human, not a block, and so
 * does being off-task. On the 1,369-decision 0.9.1 window every one of the 12 `off_task` denies
 * was a false positive (sync checks, greps, a security audit the agent was doing) in a long
 * session with terse prompts. Off-task alone is never harm; the capability axes catch harm.
 */
export declare const ASK_CEILING: Set<string>;
export declare const DEFAULT_RULES: StaticRule[];
export declare function defaultPolicy(): Policy;
/**
 * Load API keys from ~/.toolgate/env (KEY=value lines, mode 0600) when they are not
 * already in the environment. Hooks spawned by a GUI-launched Claude Code never
 * source .zshrc, so a shell export alone is not enough.
 */
export declare function loadEnvFile(path?: string): void;
/**
 * Policy lives in ONE trusted place: an explicit path, $TOOLGATE_POLICY, or
 * ~/.toolgate/toolgate.yaml. Deliberately no per-project discovery — a cloned
 * repo must never be able to reconfigure the firewall.
 */
export declare function policyPath(explicit?: string): string;
export declare function loadPolicy(explicit?: string): Policy;
export declare function validatePolicy(p: Policy): void;
/** Claude Code-style tool matcher: exact name, pipe/comma list, or regex. Always anchored to the whole name. */
export declare function toolMatcherToRegex(matcher: string): RegExp;
export declare function expandTilde(p: string): string;
