import type { Answers, DecisionBackend, JSONObject, Questions } from '../types.js';
/**
 * Jev via OpenRouter's Decisions API (openrouter.ai/api/alpha/decisions). Same question
 * language as TypeSafe's own API (boolean = "noul"), but criteria are sent structured
 * rather than folded into the instructions. Auth: OPENROUTER_API_KEY — the key never
 * reaches TypeSafe. One attempt, hard wall-clock budget: this sits on the agent's hot path.
 */
export declare class OpenRouterBackend implements DecisionBackend {
    private readonly model;
    private readonly apiKey;
    private readonly endpoint;
    readonly name: string;
    constructor(model?: string, apiKey?: string | undefined, endpoint?: string);
    evaluate(state: JSONObject, questions: Questions, opts?: {
        timeoutMs?: number;
    }): Promise<Answers>;
}
/** Boolean questions -> OpenRouter noul questions, criteria kept structured when present. */
export declare function toNoulStructured(questions: Questions): Record<string, {
    type: 'noul';
    instructions: string;
    criteria?: {
        true: string;
        false: string;
    };
}>;
