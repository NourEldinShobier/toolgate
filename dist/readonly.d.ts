/**
 * Read-only calls: the ones on which being off-task is not, by itself, a reason to interrupt.
 *
 * From the 0.16.0 measurement window: 93 `off_task` asks, half of them Bash and half of those a
 * `grep`, `ls`, `ffprobe` or `git status`; most of the rest were web searches and browser page reads
 * during a research request. Off-task is a reason for a human when the agent is about to change
 * something. On a read it is noise. Only `off_task` is affected: a read that exposes a secret or
 * sends data somewhere is still judged on those axes, and a user rule still applies.
 *
 * The Bash classifier is deliberately narrow: every segment of the command must start with a word
 * from a short list, with no output redirection, no substitution, no interpreter, no network tool.
 * Anything it does not recognize is not read-only. The direction of the error is safe.
 */
/** Whole-name matcher for tools that only read (see policy.ts `read_only_tools`). */
export declare const DEFAULT_READ_ONLY_TOOLS = "Read|Glob|Grep|LS|NotebookRead|TodoRead|WebSearch|WebFetch|mcp__.*__(?:[a-z0-9]+_)*(?:navigate|find|search|read|get|list|fetch|view|show|describe|query|lookup|screenshot|screenshots|context|preview_start|resize_window)(?:_[a-z0-9]+)*";
/** True when every part of this Bash command only reads. */
export declare function isReadOnlyBash(command: string): boolean;
