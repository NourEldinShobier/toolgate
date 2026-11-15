import { afterEach, describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { mkdtempSync } from './tmp.js';
import { TypeSafeBackend } from '../src/backends/typesafe.js';
import { createKeyCommandResolver, splitCommand } from '../src/keycommand.js';
import { resolveProvider } from '../src/hook.js';

const node = (code: string, ...args: string[]): string => [`"${process.execPath}"`, '-e', `"${code}"`, ...args.map((a) => `"${a}"`)].join(' ');
const ask = { x: { type: 'boolean' as const, instructions: 'x' } };

/** A command that appends one byte to a counter file per run, prints `body`, and exits with `exit`. */
function counted(body: string, exit = 0) {
  const counter = join(mkdtempSync(join(tmpdir(), 'tg-key-')), 'runs');
  const code = `require('fs').appendFileSync(process.argv[1],'x');console.log('${body}');process.exit(${exit})`;
  return { command: node(code, counter), runs: () => (existsSync(counter) ? readFileSync(counter, 'utf8').length : 0) };
}

const okFetch = () => vi.fn(async (_u: string, _init: RequestInit) => new Response(JSON.stringify({ answers: { x: { noul: 0.5 } } }), { status: 200 }));
const bearer = (f: ReturnType<typeof okFetch>) => (f.mock.calls[0]![1].headers as Record<string, string>).authorization;

describe('splitCommand', () => {
  it('splits on whitespace and keeps quoted words together', () => {
    expect(splitCommand('swm read TYPESAFE_API_KEY')).toEqual(['swm', 'read', 'TYPESAFE_API_KEY']);
    expect(splitCommand(`op read "op://my vault/item/field"  'a b' ''`)).toEqual(['op', 'read', 'op://my vault/item/field', 'a b', '']);
    expect(splitCommand('   ')).toEqual([]);
  });
});

describe('key from a command', () => {
  it('returns the first trimmed output line', async () => {
    expect(await createKeyCommandResolver()(counted('test-key').command)).toBe('test-key');
  });

  it('returns undefined for empty output, a failing command, a missing program and an over-long key', async () => {
    const resolve = createKeyCommandResolver();
    expect(await resolve(counted('').command)).toBeUndefined();
    expect(await resolve(counted('leaked-secret', 3).command)).toBeUndefined();
    expect(await resolve('definitely-not-a-program-tg')).toBeUndefined();
    expect(await resolve(counted('k'.repeat(4097)).command)).toBeUndefined();
  });

  it('times out with the injected timeout', async () => {
    const started = Date.now();
    expect(await createKeyCommandResolver({ timeoutMs: 300 })(node('setTimeout(()=>{},20000)'))).toBeUndefined();
    expect(Date.now() - started).toBeLessThan(10_000);
  });

  it('caches a success for 10 minutes, then runs again', async () => {
    let t = 1000;
    const resolve = createKeyCommandResolver({ now: () => t });
    const { command, runs } = counted('test-key');
    expect(await resolve(command)).toBe('test-key');
    t += 599_999;
    expect(await resolve(command)).toBe('test-key');
    expect(runs()).toBe(1);
    t += 1;
    expect(await resolve(command)).toBe('test-key');
    expect(runs()).toBe(2);
  });

  it('caches a failure for 30 seconds', async () => {
    let t = 0;
    const resolve = createKeyCommandResolver({ now: () => t });
    const { command, runs } = counted('nope', 1);
    expect(await resolve(command)).toBeUndefined();
    t += 29_999;
    expect(await resolve(command)).toBeUndefined();
    expect(runs()).toBe(1);
    t += 1;
    await resolve(command);
    expect(runs()).toBe(2);
  });

  it('shares one run between concurrent callers', async () => {
    const { command, runs } = counted('test-key');
    const resolve = createKeyCommandResolver();
    expect(await Promise.all([resolve(command), resolve(command), resolve(command)])).toEqual(['test-key', 'test-key', 'test-key']);
    expect(runs()).toBe(1);
  });
});

describe('TypeSafeBackend key resolution', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('throws the usual error with no key and no command', async () => {
    await expect(new TypeSafeBackend('m', '', undefined, undefined).evaluate({}, ask)).rejects.toThrow('TYPESAFE_API_KEY is not set');
  });

  it('uses the command when no key is set', async () => {
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    expect(await new TypeSafeBackend('m', '', undefined, counted('test-key').command).evaluate({}, ask)).toEqual({ x: { type: 'boolean', probability: 0.5 } });
    expect(bearer(fetchMock)).toBe('Bearer test-key');
  });

  it('keeps the existing key and does not run the command', async () => {
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    const { command, runs } = counted('from-command');
    await new TypeSafeBackend('m', 'from-env', undefined, command).evaluate({}, ask);
    expect(bearer(fetchMock)).toBe('Bearer from-env');
    expect(runs()).toBe(0);
  });

  it('fails when the command fails, without the command output in the error', async () => {
    const err = await new TypeSafeBackend('m', '', undefined, counted('leaked-secret', 2).command).evaluate({}, ask).catch((e: Error) => e);
    expect((err as Error).message).toMatch(/TYPESAFE_API_KEY_COMMAND returned no key/);
    expect(String(err)).not.toContain('leaked-secret');
  });

  it('keeps the key out of an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('bad request', { status: 400 })));
    const err = await new TypeSafeBackend('m', '', undefined, counted('test-key-in-error').command).evaluate({}, ask).catch((e: Error) => e);
    expect((err as Error).message).toMatch(/400/);
    expect(String(err)).not.toContain('test-key-in-error');
  });

  it('auto picks typesafe for a command only after the other keys', () => {
    const env = { ...process.env };
    for (const k of ['TYPESAFE_API_KEY', 'OPENROUTER_API_KEY', 'AI_GATEWAY_API_KEY']) delete process.env[k];
    process.env.TYPESAFE_API_KEY_COMMAND = 'swm read TYPESAFE_API_KEY';
    expect(resolveProvider('auto')).toBe('typesafe');
    process.env.OPENROUTER_API_KEY = 'o';
    expect(resolveProvider('auto')).toBe('openrouter');
    process.env = env;
  });
});
