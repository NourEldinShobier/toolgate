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
export const DEFAULT_READ_ONLY_TOOLS = 'Read|Glob|Grep|LS|NotebookRead|TodoRead|WebSearch|WebFetch|mcp__.*__(?:[a-z0-9]+_)*(?:navigate|find|search|read|get|list|fetch|view|show|describe|query|lookup|screenshot|screenshots|context|preview_start|resize_window)(?:_[a-z0-9]+)*';
const READ_ONLY_WORDS = new Set([
    'ls', 'cat', 'head', 'tail', 'wc', 'grep', 'egrep', 'fgrep', 'rg', 'ag', 'find', 'fd', 'mdfind', 'locate', 'stat', 'file', 'which', 'type', 'whereis',
    'echo', 'printf', 'pwd', 'du', 'df', 'tree', 'sort', 'uniq', 'cut', 'tr', 'jq', 'yq', 'diff', 'cmp', 'comm', 'column', 'nl', 'less', 'more', 'strings', 'od', 'xxd', 'hexdump',
    'md5', 'md5sum', 'shasum', 'sha256sum', 'sha1sum', 'cksum', 'basename', 'dirname', 'realpath', 'readlink', 'date', 'whoami', 'id', 'hostname', 'uname', 'arch', 'printenv',
    'test', '[', '[[', 'true', 'false', 'ffprobe', 'identify', 'exiftool', 'mediainfo', 'pdfinfo', 'tsc', 'sed', 'git', 'npm', 'node',
]);
const WRAPPERS = new Set(['env', 'command', 'time', 'nice', 'builtin']);
const GIT_READ = new Set(['status', 'log', 'diff', 'show', 'rev-parse', 'ls-files', 'ls-tree', 'blame', 'describe', 'cat-file', 'shortlog', 'count-objects', 'remote', 'branch', 'tag', 'stash']);
const NPM_READ = new Set(['ls', 'list', 'view', 'info', 'show', 'outdated', 'root', 'prefix', 'whoami', 'ping', 'config']);
/** Redirections that are harmless: silencing or merging stderr. Anything else with `>` writes a file. */
const HARMLESS_REDIRECT = /(?:^|[^<>])(?:\d?>>?\s*\/dev\/null|\d>&\d|&>\s*\/dev\/null)/g;
/** True when every part of this Bash command only reads. */
export function isReadOnlyBash(command) {
    const trimmed = command.trim();
    if (!trimmed)
        return false;
    // Substitution and process substitution run something we are not classifying.
    if (/\$\(|`|<\(|>\(/.test(trimmed))
        return false;
    // Operators and redirections are only operators outside quotes: `grep "a|b" f | head` is two
    // segments, not three (0.17.1; the 0.17.0 classifier split inside the quoted regex and missed
    // about one in nine of the window's read-only greps).
    const unquoted = blankQuotes(trimmed);
    // Any output redirection other than silencing/merging stderr writes a file.
    if (/[<>]/.test(unquoted.replace(HARMLESS_REDIRECT, ' ').replace(/<<</g, ' ')))
        return false;
    const segments = splitUnquoted(trimmed, unquoted);
    if (segments.length === 0)
        return false;
    return segments.every(readOnlySegment);
}
/** The command with the inside of every quoted string replaced by spaces (same length, so offsets line up). */
function blankQuotes(command) {
    let out = '';
    let quote;
    for (let i = 0; i < command.length; i++) {
        const c = command[i];
        if (quote) {
            if (c === quote) {
                quote = undefined;
                out += c;
            }
            else if (c === '\\' && quote === '"' && i + 1 < command.length) {
                out += '  ';
                i++;
            }
            else
                out += c === '\n' ? '\n' : ' ';
        }
        else if (c === '"' || c === "'") {
            quote = c;
            out += c;
        }
        else if (c === '\\' && i + 1 < command.length) {
            out += '  ';
            i++;
        }
        else
            out += c;
    }
    return out;
}
/** Split on newlines, `&&`, `||`, `;` and `|` found in the blanked copy; return the real text of each segment. */
function splitUnquoted(command, unquoted) {
    const out = [];
    let start = 0;
    const re = /\n|&&|\|\||;|\|/g;
    let m;
    while ((m = re.exec(unquoted)) !== null) {
        out.push(command.slice(start, m.index));
        start = m.index + m[0].length;
    }
    out.push(command.slice(start));
    return out.map((s) => s.trim()).filter(Boolean);
}
function readOnlySegment(segment) {
    const words = tokenize(segment);
    let i = 0;
    // Leading assignments (`S=/tmp/x FOO=bar cmd`) and wrappers.
    while (i < words.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i]) || WRAPPERS.has(words[i])))
        i++;
    if (i >= words.length)
        return /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0] ?? ''); // a bare assignment segment
    const cmd = words[i];
    const args = words.slice(i + 1);
    if (cmd === 'cd' || cmd === 'pushd' || cmd === 'popd' || cmd === 'export')
        return true; // shell state only
    if (!READ_ONLY_WORDS.has(cmd))
        return false;
    switch (cmd) {
        case 'sed':
            return !args.some((a) => /^-[a-zA-Z]*i/.test(a) || a === '--in-place' || a.startsWith('--in-place='));
        case 'find':
        case 'fd':
            return !args.some((a) => a === '-delete' || a === '-exec' || a === '-execdir' || a === '-ok' || a === '-x' || a === '--exec' || a === '-X' || a === '--exec-batch');
        case 'git':
            return GIT_READ.has(args[0] ?? '') && !gitWrites(args);
        case 'npm':
            return NPM_READ.has(args[0] ?? '') && !(args[0] === 'config' && args[1] !== 'get' && args[1] !== 'list');
        case 'node':
            return args.some((a) => a === '--check' || a === '-c') && !args.some((a) => a === '-e' || a === '--eval' || a === '-p');
        case 'tsc':
            return args.includes('--noEmit');
        case 'echo':
        case 'printf':
            return true;
        default:
            return true;
    }
}
function gitWrites(args) {
    const sub = args[0];
    const rest = args.slice(1);
    const positional = rest.filter((a) => !a.startsWith('-'));
    if (sub === 'branch') {
        const listing = rest.some((a) => a === '--list' || a === '--show-current' || a === '--contains' || a === '--merged' || a === '--no-merged');
        return rest.some((a) => /^-[dDmMcCu]/.test(a) || /^--(?:delete|move|copy|set-upstream|unset-upstream|edit-description|force)/.test(a)) || (positional.length > 0 && !listing);
    }
    if (sub === 'tag')
        return rest.some((a) => /^-[adfs]/.test(a) || /^--(?:delete|force|annotate|sign)/.test(a)) || (positional.length > 0 && !rest.includes('-l') && !rest.includes('--list'));
    if (sub === 'remote')
        return rest.length > 0 && !(rest[0] === '-v' || rest[0] === '--verbose' || rest[0] === 'show' || rest[0] === 'get-url');
    if (sub === 'stash')
        return rest.length === 0 || (rest[0] !== 'list' && rest[0] !== 'show'); // bare `git stash` pushes
    return false;
}
function tokenize(segment) {
    const out = [];
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let m;
    while ((m = re.exec(segment)) !== null)
        out.push(m[1] ?? m[2] ?? m[3] ?? '');
    return out;
}
