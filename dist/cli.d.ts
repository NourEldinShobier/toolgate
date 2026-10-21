#!/usr/bin/env node
/** `--since 7d`, `--since 24h`, `--since 2026-10-03`, `--since 2026-10-03T00:00:00-04:00`; `--host mod`. Rows without a host match only when no host filter is given. */
export declare function filterAudit(lines: string[], since?: string, host?: string): string[];
