import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { HookInput, Policy } from './types.js';
import { redactedInputText } from './state.js';

/**
 * Confirmation memory: an ask the person answered yes to is not asked again for the identical
 * call in the same session.
 *
 * From the 0.16.0 measurement window: one cleanup command (remove a preview page the agent itself
 * wrote, rebuild, push) ran 78 times; 46 were allowed and 32 asked, and the split was whether the
 * `authorized` probability landed above or below 0.80 on that run. The person had confirmed the
 * same command dozens of times. The model's view of an action does not change because it was
 * confirmed; the person's does, and that is what this records.
 *
 * Scope, deliberately narrow:
 *   - exact match only: same tool, same (redacted, whitespace-normalized) input;
 *   - lifts a threshold `ask` to `allow`, never a deny, never a static rule, never a floor
 *     (truncated input, unconfirmed write, unreadable ledger);
 *   - counts a confirmation only when a person could have given it: not in auto mode (the
 *     classifier answered) and not in the unattended modes;
 *   - per session, in the ledger directory, identifiers and hashes only.
 */

interface ConfirmEvent {
  ts: string;
  tool_use_id: string;
  key: string;
  status: 'asked' | 'confirmed';
}

const SESSION_ID_RE = /^[A-Za-z0-9._-]{1,128}$/;
/** Modes in which an ask is answered by something other than the person. */
export const UNCONFIRMABLE_MODES = new Set(['auto']);

export function confirmKey(input: HookInput): string {
  const text = redactedInputText(input.tool_input).replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(`${input.tool_name}\n${text}`).digest('hex').slice(0, 32);
}

function filePath(policy: Policy, sessionId: string | undefined): string | undefined {
  if (!policy.confirmation_memory || !policy.ledger.enabled || !sessionId || !SESSION_ID_RE.test(sessionId)) return undefined;
  return join(policy.ledger.dir, `${sessionId}.confirm.jsonl`);
}

function read(file: string): ConfirmEvent[] {
  if (!existsSync(file)) return [];
  const out: ConfirmEvent[] = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as ConfirmEvent;
      if (e && typeof e.key === 'string' && typeof e.tool_use_id === 'string') out.push(e);
    } catch {
      // torn line
    }
  }
  return out;
}

function append(file: string, e: ConfirmEvent): void {
  const dir = join(file, '..');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  appendFileSync(file, JSON.stringify(e) + '\n', { mode: 0o600 });
}

/** Could a person have confirmed this call? */
export function confirmable(policy: Policy, input: HookInput): boolean {
  const mode = input.permission_mode;
  if (mode === undefined) return true;
  return !UNCONFIRMABLE_MODES.has(mode) && !policy.unattended.modes.includes(mode);
}

/** True when the identical call was asked and then confirmed earlier in this session. */
export function wasConfirmed(policy: Policy, input: HookInput): boolean {
  try {
    const file = filePath(policy, input.session_id);
    if (!file) return false;
    const key = confirmKey(input);
    return read(file).some((e) => e.status === 'confirmed' && e.key === key);
  } catch {
    return false;
  }
}

/** Record that this call was asked, so a later PostToolUse for the same tool_use_id can confirm it. Best-effort. */
export function recordAsked(policy: Policy, input: HookInput): void {
  try {
    if (!input.tool_use_id || !confirmable(policy, input)) return;
    const file = filePath(policy, input.session_id);
    if (!file) return;
    append(file, { ts: new Date().toISOString(), tool_use_id: input.tool_use_id, key: confirmKey(input), status: 'asked' });
  } catch {
    // memory is a convenience; never fail the gate over it
  }
}

/** PostToolUse arrived for a call that was asked: the person said yes. Best-effort. */
export function confirmAsked(policy: Policy, sessionId: string, toolUseId: string): boolean {
  try {
    const file = filePath(policy, sessionId);
    if (!file) return false;
    const asked = read(file).find((e) => e.status === 'asked' && e.tool_use_id === toolUseId);
    if (!asked) return false;
    append(file, { ts: new Date().toISOString(), tool_use_id: toolUseId, key: asked.key, status: 'confirmed' });
    return true;
  } catch {
    return false;
  }
}
