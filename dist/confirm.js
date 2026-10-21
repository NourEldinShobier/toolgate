import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { redactedInputText } from './state.js';
const SESSION_ID_RE = /^[A-Za-z0-9._-]{1,128}$/;
/** Modes in which an ask is answered by something other than the person. */
export const UNCONFIRMABLE_MODES = new Set(['auto']);
export function confirmKey(input) {
    const text = redactedInputText(input.tool_input).replace(/\s+/g, ' ').trim();
    return createHash('sha256').update(`${input.tool_name}\n${text}`).digest('hex').slice(0, 32);
}
function filePath(policy, sessionId) {
    if (!policy.confirmation_memory || !policy.ledger.enabled || !sessionId || !SESSION_ID_RE.test(sessionId))
        return undefined;
    return join(policy.ledger.dir, `${sessionId}.confirm.jsonl`);
}
function read(file) {
    if (!existsSync(file))
        return [];
    const out = [];
    for (const line of readFileSync(file, 'utf8').split('\n')) {
        if (!line.trim())
            continue;
        try {
            const e = JSON.parse(line);
            if (e && typeof e.key === 'string' && typeof e.tool_use_id === 'string')
                out.push(e);
        }
        catch {
            // torn line
        }
    }
    return out;
}
function append(file, e) {
    const dir = join(file, '..');
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    chmodSync(dir, 0o700);
    appendFileSync(file, JSON.stringify(e) + '\n', { mode: 0o600 });
}
/** Could a person have confirmed this call? */
export function confirmable(policy, input) {
    const mode = input.permission_mode;
    if (mode === undefined)
        return true;
    return !UNCONFIRMABLE_MODES.has(mode) && !policy.unattended.modes.includes(mode);
}
/** True when the identical call was asked and then confirmed earlier in this session. */
export function wasConfirmed(policy, input) {
    try {
        const file = filePath(policy, input.session_id);
        if (!file)
            return false;
        const key = confirmKey(input);
        return read(file).some((e) => e.status === 'confirmed' && e.key === key);
    }
    catch {
        return false;
    }
}
/** Record that this call was asked, so a later PostToolUse for the same tool_use_id can confirm it. Best-effort. */
export function recordAsked(policy, input) {
    try {
        if (!input.tool_use_id || !confirmable(policy, input))
            return;
        const file = filePath(policy, input.session_id);
        if (!file)
            return;
        append(file, { ts: new Date().toISOString(), tool_use_id: input.tool_use_id, key: confirmKey(input), status: 'asked' });
    }
    catch {
        // memory is a convenience; never fail the gate over it
    }
}
/** PostToolUse arrived for a call that was asked: the person said yes. Best-effort. */
export function confirmAsked(policy, sessionId, toolUseId) {
    try {
        const file = filePath(policy, sessionId);
        if (!file)
            return false;
        const asked = read(file).find((e) => e.status === 'asked' && e.tool_use_id === toolUseId);
        if (!asked)
            return false;
        append(file, { ts: new Date().toISOString(), tool_use_id: toolUseId, key: asked.key, status: 'confirmed' });
        return true;
    }
    catch {
        return false;
    }
}
