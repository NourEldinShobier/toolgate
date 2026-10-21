import type { Decision, DecisionBackend, HookInput, Policy } from './types.js';
/**
 * Order: static rules (first match wins, free) -> gated-tools filter ->
 * decision model -> thresholds. Backend failure or malformed answers fall
 * back to policy.fail_mode.
 */
export interface DecideOptions {
    /**
     * Override the policy's `trusted_tools` matcher for this call. The MCP proxy uses it to bind
     * trust to what the downstream server actually advertised (and to `--trusted`), rather than
     * to a name a caller merely claims.
     */
    trustedTool?: boolean;
    /** The identical call was asked and confirmed by the person earlier this session (see confirm.ts). */
    confirmedEarlier?: boolean;
}
/** A call that only reads: `off_task` alone does not interrupt it. */
export declare function isReadOnlyCall(input: HookInput, policy: Policy): boolean;
export declare function decide(input: HookInput, policy: Policy, backend: DecisionBackend, opts?: DecideOptions): Promise<Decision>;
/** First line, bounded — this text lands in the user's terminal and the model's context. */
export declare function message(err: unknown): string;
