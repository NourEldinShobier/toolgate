import type { Answers, DecisionBackend, JSONObject, Questions } from '../types.js';
/**
 * Deterministic heuristic backend: no network, no key, no cost. For
 * `toolgate check --backend mock`, offline dev, and tests. Intentionally
 * crude — the whole point of toolgate is that a calibrated decision model
 * does this job better than regexes ever will.
 */
export declare class MockBackend implements DecisionBackend {
    readonly name = "mock";
    evaluate(state: JSONObject, questions: Questions): Promise<Answers>;
}
