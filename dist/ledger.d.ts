import type { ArtifactCapabilities, CompositionFacts, HookInput, LedgerEvent, Policy } from './types.js';
export declare function ledgerPath(policy: Policy, sessionId: string): string | undefined;
/** Absolute paths a write tool call targets, resolved against cwd. Empty for anything else. */
export declare function writtenPaths(input: HookInput): string[];
export declare function normalizePath(p: string, cwd?: string): string;
/** Append the PROPOSED event for a write tool call. Best-effort; never throws into the gate. */
export declare function recordProposed(policy: Policy, input: HookInput, capabilities?: ArtifactCapabilities, probs?: Record<string, number>): void;
/** Settle a proposed event by tool_use_id (from PostToolUse / PostToolUseFailure / PermissionDenied). */
export declare function settle(policy: Policy, sessionId: string, toolUseId: string, status: 'confirmed' | 'failed' | 'denied'): boolean;
export declare function readEvents(policy: Policy, sessionId: string): LedgerEvent[];
/** Current state per written path: the latest status per tool_use_id, most recent write wins per path. */
export interface Artifact {
    path: string;
    status: LedgerEvent['status'];
    capabilities: ArtifactCapabilities;
    seq: number;
}
export declare function artifacts(events: LedgerEvent[]): Map<string, Artifact>;
/**
 * How a Bash command touches a written path: 'execute' (interpreter, ./x, command position,
 * stdin of an interpreter via `<` / `<<<` / a pipe, inside `$(…)` or backticks or an
 * interpreter's -e/-c blob, an npm script when package.json was written, or `make` when the
 * Makefile was written), 'reference'
 * (named as an argument to something else, e.g. `cat helper.sh`), or undefined.
 * An extensionless basename counts as the written file only when it is fed to an
 * interpreter, never at command position (a bare word there resolves through PATH).
 */
export declare function usage(command: string, artifactPath: string, cwd?: string): 'execute' | 'reference' | undefined;
/** Would this command run some file (any path fed to an interpreter, or ./x)? Used when the ledger cannot be read. */
export declare function executeShaped(command: string): boolean;
/**
 * True when the ledger is enabled but cannot be read for this session: the directory exists
 * and is not a readable directory, or the session file exists and is unreadable. A ledger that
 * simply has no events yet is available. Best-effort gating must not silently become one-shot
 * scoring, so the engine floors execute-shaped Bash at ask while this is true.
 */
export declare function ledgerUnavailable(policy: Policy, sessionId: string | undefined): boolean;
/** The facts for a Bash call, from this session's ledger. Undefined when nothing applies. */
export declare function compositionFacts(policy: Policy, input: HookInput): CompositionFacts | undefined;
