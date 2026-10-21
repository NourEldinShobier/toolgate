import type { Answers, DecisionBackend, JSONObject, Questions } from '../types.js';
/**
 * Jev (or any evaluation-capable model) via Vercel AI Gateway, using the
 * AI SDK 7 evaluation modality. Auth: AI_GATEWAY_API_KEY (or OIDC on Vercel).
 * One attempt, hard wall-clock budget — this sits on the agent's hot path.
 */
export declare class GatewayBackend implements DecisionBackend {
    private readonly model;
    readonly name: string;
    constructor(model?: string);
    evaluate(state: JSONObject, questions: Questions, opts?: {
        timeoutMs?: number;
    }): Promise<Answers>;
}
