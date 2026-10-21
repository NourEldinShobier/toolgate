import { experimental_evaluate as evaluate } from 'ai';
/**
 * Jev (or any evaluation-capable model) via Vercel AI Gateway, using the
 * AI SDK 7 evaluation modality. Auth: AI_GATEWAY_API_KEY (or OIDC on Vercel).
 * One attempt, hard wall-clock budget — this sits on the agent's hot path.
 */
export class GatewayBackend {
    model;
    name;
    constructor(model = 'typesafe-ai/jev') {
        this.model = model;
        this.name = `gateway:${model}`;
    }
    async evaluate(state, questions, opts) {
        const timeoutMs = opts?.timeoutMs ?? 5000;
        const controller = new AbortController();
        let timer;
        const deadline = new Promise((_, reject) => {
            timer = setTimeout(() => {
                controller.abort();
                reject(new Error(`timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        });
        try {
            const result = await Promise.race([
                evaluate({ model: this.model, state, questions, maxRetries: 0, abortSignal: controller.signal }),
                deadline,
            ]);
            return result.answers;
        }
        finally {
            clearTimeout(timer);
        }
    }
}
