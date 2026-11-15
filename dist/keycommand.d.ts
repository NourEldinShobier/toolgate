/** Optional: a command whose first stdout line is the TypeSafe key, for keys kept in a password manager. */
export declare const KEY_COMMAND_ENV = "TYPESAFE_API_KEY_COMMAND";
/** Whitespace-separated argv; single and double quotes group words. No escapes, no shell. */
export declare function splitCommand(command: string): string[];
/**
 * A resolver that caches a success for 10 minutes and a failure for 30 seconds, and lets
 * concurrent callers share one in-flight run. The clock is injectable for tests.
 */
export declare function createKeyCommandResolver(opts?: {
    now?: () => number;
    timeoutMs?: number;
}): (command: string) => Promise<string | undefined>;
export declare const keyFromCommand: (command: string) => Promise<string | undefined>;
