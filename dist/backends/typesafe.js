import { KEY_COMMAND_ENV, keyFromCommand } from '../keycommand.js';
/**
 * TypeSafe's direct API (api.typesafe.ai/v1/systemone). No SDK, plain fetch.
 * Boolean questions are "noul" there and take instructions only, so the
 * true/false criteria are folded into the instructions text.
 * Auth: TYPESAFE_API_KEY, or when it is unset the first line printed by TYPESAFE_API_KEY_COMMAND
 * (keys kept in a password manager; see keycommand.ts). One attempt, hard wall-clock budget.
 */
export class TypeSafeBackend {
    model;
    apiKey;
    endpoint;
    keyCommand;
    name;
    constructor(model = 'jev-latest', apiKey = process.env.TYPESAFE_API_KEY, endpoint = 'https://api.typesafe.ai/v1/systemone', keyCommand = process.env[KEY_COMMAND_ENV]) {
        this.model = model;
        this.apiKey = apiKey;
        this.endpoint = endpoint;
        this.keyCommand = keyCommand;
        this.name = `typesafe:${model}`;
    }
    async evaluate(state, questions, opts) {
        const apiKey = this.apiKey || (this.keyCommand ? await keyFromCommand(this.keyCommand) : undefined);
        if (!apiKey)
            throw new Error(this.keyCommand ? 'TYPESAFE_API_KEY is not set and TYPESAFE_API_KEY_COMMAND returned no key' : 'TYPESAFE_API_KEY is not set');
        const timeoutMs = opts?.timeoutMs ?? 5000;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(this.endpoint, {
                method: 'POST',
                headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
                body: JSON.stringify({ model: this.model, state, questions: toNoul(questions) }),
                signal: controller.signal,
            });
            if (!res.ok)
                throw new Error(`TypeSafe API ${res.status}: ${(await res.text()).split('\n')[0]?.slice(0, 160)}`);
            const body = (await res.json());
            const answers = {};
            for (const key of Object.keys(questions)) {
                const a = body.answers?.[key];
                if (typeof a?.noul === 'number')
                    answers[key] = { type: 'boolean', probability: a.noul };
            }
            return answers;
        }
        catch (err) {
            if (controller.signal.aborted)
                throw new Error(`timed out after ${timeoutMs}ms`);
            throw err;
        }
        finally {
            clearTimeout(timer);
        }
    }
}
/** AI-SDK-style boolean questions -> TypeSafe noul questions (criteria folded into instructions). */
export function toNoul(questions) {
    const out = {};
    for (const [key, q] of Object.entries(questions)) {
        const c = q.criteria;
        const instructions = c ? `${q.instructions} True when: ${c.true}. False when: ${c.false}.` : q.instructions;
        out[key] = { type: 'noul', instructions };
    }
    return out;
}
