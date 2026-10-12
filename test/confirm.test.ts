import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { confirmAsked, confirmKey, confirmable, recordAsked, wasConfirmed } from '../src/confirm.js';
import { defaultPolicy } from '../src/policy.js';
import type { HookInput } from '../src/types.js';

function policy() {
  const p = defaultPolicy();
  p.ledger.dir = mkdtempSync(join(tmpdir(), 'tg-confirm-'));
  return p;
}
const call = (command: string, extra: Partial<HookInput> = {}): HookInput => ({
  session_id: 'sess-1',
  tool_use_id: 'tu-1',
  tool_name: 'Bash',
  tool_input: { command },
  permission_mode: 'acceptEdits',
  ...extra,
});

describe('confirmation memory', () => {
  it('the key is the tool plus the whitespace-normalized redacted input', () => {
    expect(confirmKey(call('rm -r  src/__preview &&\nnpx vite build'))).toBe(confirmKey(call('rm -r src/__preview && npx vite build')));
    expect(confirmKey(call('rm -r src/__preview'))).not.toBe(confirmKey(call('rm -rf src/__preview')));
    expect(confirmKey(call('x'))).not.toBe(confirmKey({ ...call('x'), tool_name: 'Write' }));
    // a secret in the input never reaches the store, even hashed: both spellings redact to the same text
    expect(confirmKey(call('TOKEN=abc123 deploy'))).toBe(confirmKey(call('TOKEN=zzz999 deploy')));
  });

  it('asked, then PostToolUse for the same tool_use_id, then the identical call is confirmed', () => {
    const p = policy();
    const first = call('rm -r src/__preview && npx vite build');
    expect(wasConfirmed(p, first)).toBe(false);
    recordAsked(p, first);
    expect(wasConfirmed(p, first)).toBe(false); // asked is not confirmed
    expect(confirmAsked(p, 'sess-1', 'tu-1')).toBe(true);
    expect(wasConfirmed(p, { ...first, tool_use_id: 'tu-2' })).toBe(true);
    expect(wasConfirmed(p, call('rm -r src/__preview && npx vite build && git push'))).toBe(false); // not identical
    expect(wasConfirmed(p, { ...first, session_id: 'sess-2' })).toBe(false); // other session
  });

  it('a PostToolUse with no matching ask confirms nothing', () => {
    const p = policy();
    expect(confirmAsked(p, 'sess-1', 'tu-9')).toBe(false);
  });

  it('is not recorded where no person could have answered: auto mode and the unattended modes', () => {
    const p = policy();
    for (const mode of ['auto', 'bypassPermissions', 'dontAsk']) {
      const c = call('rm -r x', { permission_mode: mode, tool_use_id: `tu-${mode}` });
      expect(confirmable(p, c)).toBe(false);
      recordAsked(p, c);
      expect(confirmAsked(p, 'sess-1', `tu-${mode}`)).toBe(false);
    }
    expect(confirmable(p, call('x', { permission_mode: 'acceptEdits' }))).toBe(true);
    expect(confirmable(p, call('x', { permission_mode: 'default' }))).toBe(true);
    expect(confirmable(p, call('x', { permission_mode: undefined }))).toBe(true);
  });

  it('is off when the policy says so, or without a session', () => {
    const p = policy();
    p.confirmation_memory = false;
    recordAsked(p, call('x'));
    expect(confirmAsked(p, 'sess-1', 'tu-1')).toBe(false);
    const q = policy();
    recordAsked(q, call('x', { session_id: undefined }));
    expect(wasConfirmed(q, call('x', { session_id: undefined }))).toBe(false);
  });
});
