import { execFile } from 'node:child_process';

/** Optional: a command whose first stdout line is the TypeSafe key, for keys kept in a password manager. */
export const KEY_COMMAND_ENV = 'TYPESAFE_API_KEY_COMMAND';

const OK_TTL_MS = 10 * 60_000;
const FAIL_TTL_MS = 30_000;
const MAX_KEY_CHARS = 4096;

/** Whitespace-separated argv; single and double quotes group words. No escapes, no shell. */
export function splitCommand(command: string): string[] {
  const argv: string[] = [];
  let cur = '';
  let quote: string | undefined;
  let started = false;
  for (const ch of command) {
    if (quote) {
      if (ch === quote) quote = undefined;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
    } else if (/\s/.test(ch)) {
      if (started) argv.push(cur);
      cur = '';
      started = false;
    } else {
      cur += ch;
      started = true;
    }
  }
  if (started) argv.push(cur);
  return argv;
}

/** Run the command once. Every failure is `undefined`; stdout, stderr and the key are never put in a message. */
function runKeyCommand(command: string, timeoutMs: number): Promise<string | undefined> {
  const [file, ...args] = splitCommand(command);
  if (!file) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    try {
      const child = execFile(file, args, { windowsHide: true, timeout: timeoutMs, maxBuffer: 65536, encoding: 'utf8' }, (err, stdout) => {
        const key = err ? '' : (stdout.trim().split('\n')[0] ?? '').trim();
        resolve(key.length > 0 && key.length <= MAX_KEY_CHARS ? key : undefined);
      });
      child.stdin?.end();
    } catch {
      resolve(undefined);
    }
  });
}

/**
 * A resolver that caches a success for 10 minutes and a failure for 30 seconds, and lets
 * concurrent callers share one in-flight run. The clock is injectable for tests.
 */
export function createKeyCommandResolver(opts: { now?: () => number; timeoutMs?: number } = {}): (command: string) => Promise<string | undefined> {
  const now = opts.now ?? Date.now;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const cache = new Map<string, { until: number; key: string | undefined }>();
  const inflight = new Map<string, Promise<string | undefined>>();
  return (command) => {
    const hit = cache.get(command);
    if (hit && now() < hit.until) return Promise.resolve(hit.key);
    let run = inflight.get(command);
    if (!run) {
      run = runKeyCommand(command, timeoutMs)
        .then((key) => {
          cache.set(command, { until: now() + (key ? OK_TTL_MS : FAIL_TTL_MS), key });
          return key;
        })
        .finally(() => inflight.delete(command));
      inflight.set(command, run);
    }
    return run;
  };
}

export const keyFromCommand = createKeyCommandResolver();
