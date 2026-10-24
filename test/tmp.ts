import { mkdtempSync as mk, rmSync } from 'node:fs';
import { afterAll } from 'vitest';

// Drop-in for fs.mkdtempSync that removes every dir it made once the test file finishes.
const dirs: string[] = [];
export function mkdtempSync(prefix: string): string {
  const d = mk(prefix);
  dirs.push(d);
  return d;
}
afterAll(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true, maxRetries: 3 });
});
