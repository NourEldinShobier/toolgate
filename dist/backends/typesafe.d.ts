import type { Answers, DecisionBackend, JSONObject, Questions } from '../types.js';
/**
 * TypeSafe's direct API (api.typesafe.ai/v1/systemone). No SDK, plain fetch.
 * Boolean questions are "noul" there and take instructions only, so the
 * true/false criteria are folded into the instructions text.
 * Auth: TYPESAFE_API_KEY. One attempt, hard wall-clock budget.
 */
export declare class TypeSafeBackend implements DecisionBackend {
    private readonly model;
    private readonly apiKey;
    private readonly endpoint;
    readonly name: string;
    constructor(model?: string, apiKey?: string | undefined, endpoint?: string);
    evaluate(state: JSONObject, questions: Questions, opts?: {
        timeoutMs?: number;
    }): Promise<Answers>;
}
/** AI-SDK-style boolean questions -> TypeSafe noul questions (criteria folded into instructions). */
export declare function toNoul(questions: Questions): Record<string, {
    type: 'noul';
    instructions: string;
}>;
