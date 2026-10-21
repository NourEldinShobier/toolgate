/**
 * Installing the hook into Claude Code, and checking that it is really there.
 *
 * Claude Code runs hook commands through `sh -c` with whatever environment it was
 * launched with. From the Dock that means no `.zshrc`, no npm global bin on PATH,
 * sometimes no `node` on PATH. So the command we install names the node binary and
 * this package's cli.js by absolute path, and `doctor` runs the installed command
 * under a deliberately minimal environment to prove it answers.
 */
export declare const SETTINGS_PATH: string;
type Settings = Record<string, unknown>;
interface HookEntry {
    type: 'command';
    command: string;
    timeout: number;
    statusMessage: string;
}
/** `<abs node> <abs cli.js> hook` — no PATH lookup anywhere. */
export declare function hookCommand(): string;
export declare function hookEntry(): HookEntry;
/** `<abs node> <abs cli.js> post` — settles the ledger after a tool call; silent, fast, never fails. */
export declare function postCommand(): string;
export declare function postEntry(): HookEntry;
/** The lifecycle events the ledger listens to, beyond PreToolUse. */
export declare const POST_EVENTS: readonly ["PostToolUse", "PostToolUseFailure", "PermissionDenied"];
/** The settings.json fragment, for people who prefer to merge it by hand. */
export declare function settingsSnippet(): string;
/** Every toolgate PreToolUse command found in a settings object. */
export declare function installedHookCommands(settings: unknown): string[];
/** Add or refresh the hooks in a settings object. Idempotent; leaves everything else untouched. */
export declare function installHook(settings: Settings): 'added' | 'updated' | 'unchanged';
/** Which of the ledger's post events have a toolgate hook installed. */
export declare function installedPostEvents(settings: unknown): string[];
export declare function readSettings(path?: string): Settings;
/** Writes settings; returns the backup path when a previous file existed. */
export declare function writeSettings(settings: Settings, path?: string): string | undefined;
/**
 * Run an installed hook command the way Claude Code does — `sh -c`, JSON on stdin — but
 * under a minimal environment (system PATH only, no shell exports, no API keys), with a
 * throwaway policy on the mock backend so nothing is sent anywhere or logged. A built-in
 * static rule (`curl … | sh` → ask) must come back; that proves the command resolves,
 * node starts, stdin is parsed, and a decision is emitted.
 */
export declare function hookSelfTest(command: string): {
    ok: boolean;
    detail: string;
};
export {};
