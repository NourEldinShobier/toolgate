import type { Decision } from './types.js';
/**
 * MCP proxy mode. toolgate sits between an MCP client (the agent) and one downstream
 * MCP server, launched as:  toolgate mcp [opts] -- <server-cmd> [args...]
 *
 * It speaks the stdio transport: newline-delimited JSON-RPC 2.0 messages. Every message is
 * forwarded untouched EXCEPT a `tools/call` request, which is gated through the same engine the
 * Claude Code hook uses. Allow → forwarded. Deny (and, by default, ask) → not forwarded; the
 * client gets a normal tool result marked `isError` with the reason, so the agent can relay it
 * to the user instead of the client crashing on a protocol error.
 *
 * MCP carries tool calls, not the conversation, so there is usually no task context. The four
 * context questions are then skipped and the `authorized` mitigator can't fire — the gate is
 * stricter, never more permissive. Supply a task with TOOLGATE_TASK or ~/.toolgate/task to get
 * it back.
 */
export interface McpOptions {
    policyPath?: string;
    backend?: string;
    /** Tool-name matcher for which tools/call go to the model. Default: all of them. */
    gate?: string;
    /** What an `ask` verdict does when no human is at the call: 'block' (default) or 'allow'. */
    onAsk?: 'block' | 'allow';
    /**
     * Trust every tool this downstream server advertises, as if each were in `trusted_tools`:
     * "I launched this server and accept its destinations." Bound to this child process, so it
     * never leaks to other servers. Only relaxes the exfiltration axis; everything else is gated as usual.
     */
    trusted?: boolean;
}
interface JsonRpcMessage {
    jsonrpc?: string;
    id?: string | number | null;
    method?: string;
    params?: {
        name?: string;
        arguments?: unknown;
        [k: string]: unknown;
    };
    [k: string]: unknown;
}
/** Parse one stdio line. Returns undefined for blanks and unparseable lines (forwarded as-is). */
export declare function parseMessage(line: string): JsonRpcMessage | undefined;
/** A client→server message we must gate: a JSON-RPC request (has id) calling method "tools/call". */
/**
 * A line that mentions tools/call but is not a gateable call: a notification-shaped call
 * (no id), a JSON-RPC batch, or a call without a string name. A spec-compliant server would
 * ignore or reject these; a lenient one might execute them. They are never forwarded.
 */
export declare function isUngateableToolCall(line: string, m: JsonRpcMessage | undefined): boolean;
export declare function isToolCall(m: JsonRpcMessage | undefined): m is JsonRpcMessage & {
    id: string | number;
    params: {
        name: string;
        arguments?: unknown;
    };
};
/** The JSON-RPC result sent back to the client when a tool call is blocked (a normal tool error). */
export declare function blockedResult(id: string | number, decision: Decision): JsonRpcMessage;
/**
 * Given a gate decision, say whether to forward the call or block it with a response.
 * `--on-ask allow` answers "the model said ask and no human is here"; it never answers
 * "the model did not answer". A fail-mode ask (backend down, timeout, missing key) is
 * blocked whatever onAsk says — otherwise an outage would forward every call.
 */
export declare function actOnDecision(id: string | number, decision: Decision, onAsk: 'block' | 'allow'): {
    forward: true;
} | {
    forward: false;
    response: JsonRpcMessage;
};
/**
 * The tool names the downstream server actually advertised in its `tools/list` responses.
 * Trust (`trusted_tools` or `--trusted`) is only ever applied to these: a `tools/call` that merely
 * claims a trusted name, without the server having declared it, gets no relaxation.
 */
export declare class AdvertisedTools {
    private readonly pending;
    private readonly names;
    private waiters;
    /** Client → server: remember a tools/list request id so its response can be recognized. */
    noteRequest(m: JsonRpcMessage | undefined): void;
    /** Server → client: harvest tool names from a tools/list response (an error reply just settles it). */
    noteResponse(m: JsonRpcMessage | undefined): void;
    /**
     * Resolves once no tools/list request is in flight, so a tools/call pipelined right behind the
     * list is judged against the answered list rather than an empty one. Bounded: a server that
     * never answers just gets no trust, which is the safe direction.
     */
    settled(timeoutMs?: number): Promise<void>;
    has(name: string): boolean;
    get size(): number;
}
/**
 * Whether to tell the model this tool is the user's own service. Requires BOTH a claim (the
 * policy's `trusted_tools` matcher or `--trusted`) AND the server having advertised the name.
 */
export declare function trustDecision(name: string, claimed: boolean, advertised: AdvertisedTools): {
    trusted: boolean;
    reason?: string;
};
/** Split newline-delimited messages, keeping any partial trailing line in a buffer. */
export declare function createFramer(onMessage: (line: string) => void): (chunk: Buffer) => void;
export declare function runMcp(opts: McpOptions, command: string[]): Promise<void>;
export {};
