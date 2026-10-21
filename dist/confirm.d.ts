import type { HookInput, Policy } from './types.js';
/** Modes in which an ask is answered by something other than the person. */
export declare const UNCONFIRMABLE_MODES: Set<string>;
export declare function confirmKey(input: HookInput): string;
/** Could a person have confirmed this call? */
export declare function confirmable(policy: Policy, input: HookInput): boolean;
/** True when the identical call was asked and then confirmed earlier in this session. */
export declare function wasConfirmed(policy: Policy, input: HookInput): boolean;
/** Record that this call was asked, so a later PostToolUse for the same tool_use_id can confirm it. Best-effort. */
export declare function recordAsked(policy: Policy, input: HookInput): void;
/** PostToolUse arrived for a call that was asked: the person said yes. Best-effort. */
export declare function confirmAsked(policy: Policy, sessionId: string, toolUseId: string): boolean;
