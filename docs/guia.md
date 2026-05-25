# virtual-fs-node

> Executable documentation for AI agents — Markdown files that run code when read.

Virtual FS Node mounts a folder as a FUSE filesystem. When an AI agent (or any process) reads a `.md` file from the mount point, the system intercepts the syscall, executes embedded code blocks against the real project state, and returns live diagnostics — turning static checklists into self-correcting agent loops.

---

## Table of Contents

- [How it works](#how-it-works)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Writing checklist files](#writing-checklist-files)
  - [run-node blocks](#run-node-blocks)
  - [run blocks](#run-blocks)
  - [script blocks](#script-blocks)
- [Architecture](#architecture)
  - [index.js](#indexjs)
  - [processor.js](#processorjs)
- [The agent loop](#the-agent-loop)
- [Example walkthrough](#example-walkthrough)

---

## How it works

```
Agent reads mnt/api-checklist.md
         │
         ▼
  FUSE intercepts the read() syscall
         │
         ▼
  processor.js finds and executes
  embedded code blocks in WORKING_DIR
         │
         ▼
  Output replaces the block inline
  before bytes reach the caller
         │
         ▼
  Agent receives live [x] / [ ] diagnostics
         │
         ▼
  Agent writes fixes, re-reads to verify
```

The key insight: **the file itself is the interface**. The agent never needs a special API or tool — it just reads a file. FUSE handles everything else transparently.

---

## Installation

```bash
npm install
```

Dependencies:
- [`fuse-native`](https://github.com/fuse-friends/fuse-native) — FUSE bindings for Node.js
- Node.js ≥ 14
- A working FUSE installation on your OS (`libfuse` on Linux, `macFUSE` on macOS)

---

## Usage

```bash
node index.js <index> <config_path>
```

| Argument      | Description                                                    |
|---------------|----------------------------------------------------------------|
| `<index>`     | Name for this mount. The filesystem mounts at `mnt/<index>`.  |
| `<config_path>` | Path to a JSON config file (see [Configuration](#configuration)). |

**Example:**

```bash
node index.js myproject config.json
```

This mounts the virtual filesystem at `mnt/myproject`. An agent can then run:

```bash
cat mnt/myproject/api-checklist.md
```

To unmount, press `Ctrl+C`. The process handles `SIGINT` and `SIGTERM` and unmounts cleanly.

---

## Configuration

The config file is a JSON object. All paths can be absolute or relative to the config file's directory.

```json
{
  "SOURCE_DIR":  "./textos",
  "MOUNT_POINT": "./mnt/myproject",
  "SCRIPTS_DIR": "./scripts",
  "WORKING_DIR": "./myproject"
}
```

| Key           | Default                     | Description                                                              |
|---------------|-----------------------------|--------------------------------------------------------------------------|
| `SOURCE_DIR`  | `<root>/textos`             | Directory containing your `.md` checklist files (the source of truth).  |
| `MOUNT_POINT` | `<root>/mnt/<index>`        | Where the virtual filesystem is exposed to agents and tools.             |
| `SCRIPTS_DIR` | `<root>/scripts`            | Working directory for `script` blocks.                                   |
| `WORKING_DIR` | `<root>/scripts`            | Working directory for `run-node` and `run` blocks.                       |

If no config file is found at `<config_path>`, the system starts with the defaults and logs a warning.

---

## Writing checklist files

Checklist files are plain Markdown stored in `SOURCE_DIR`. They support three types of executable blocks. All other Markdown content passes through unchanged.

### run-node blocks

Executes inline JavaScript via Node.js stdin. The code runs with `WORKING_DIR` as its current working directory.

````markdown
```run-node
const fs = require('fs')

const hasMigration = fs.existsSync('migrations/001_create_users.sql')
const hasTests     = fs.existsSync('tests/auth.test.js')

console.log(hasMigration ? '[x] users table migration' : '[ ] users table migration ⚠')
if (!hasMigration) console.log('    Missing: migrations/001_create_users.sql')

console.log(hasTests ? '[x] Auth unit tests' : '[ ] Auth unit tests ⚠')
if (!hasTests) console.log('    Missing: tests/auth.test.js')
```
````

**Output when files are missing:**

```
[ ] users table migration ⚠
    Missing: migrations/001_create_users.sql
[ ] Auth unit tests ⚠
    Missing: tests/auth.test.js
```

**Output after the agent creates the files:**

```
[x] users table migration
[x] Auth unit tests
```

The block output replaces the entire `` ```run-node ``` `` block in the content returned to the reader.

### run blocks

Executes a shell command in `WORKING_DIR`.

````markdown
```run
npm test --silent 2>&1 | tail -5
```
````

Useful for running existing scripts, build checks, or any shell command whose output you want to surface inline.

### script blocks

Like `run`, but executes in `SCRIPTS_DIR` instead of `WORKING_DIR`. Useful for separating helper scripts from the project being checked.

````markdown
```script
node check-env.js
```
````

---

## Architecture

### index.js

The entry point. Responsibilities:

1. **Parses CLI arguments** — `<index>` and `<config_path>`.
2. **Loads config** — reads and merges user config over defaults; resolves all paths relative to the config file's directory.
3. **Creates directories** — ensures `SOURCE_DIR`, `MOUNT_POINT`, `SCRIPTS_DIR`, and `WORKING_DIR` all exist.
4. **Mounts FUSE** — registers three filesystem operations:

| Operation  | Behaviour                                                                                    |
|------------|----------------------------------------------------------------------------------------------|
| `readdir`  | Lists files in `SOURCE_DIR` when an agent reads the root of the mount point.                 |
| `getattr`  | Returns file metadata. For `.md` files, runs `processContent` to compute the real byte size. |
| `read`     | Runs `processContent` on the source file and returns the result buffer to the caller.        |

5. **Handles shutdown** — unmounts cleanly on `SIGINT`/`SIGTERM`.

> **Note:** `getattr` and `read` both call `processContent`. This means every stat and every read re-executes the blocks. For expensive checks, consider caching results inside your Node.js block.

### processor.js

`processContent(filePath, config)` — the core transformation function.

It reads the source file from disk, then applies three sequential regex replacements:

| Pattern       | Regex trigger          | Execution                                   |
|---------------|------------------------|---------------------------------------------|
| `run-node`    | `` ```run-node\n…\n``` `` | `execSync('node', { input: code, cwd: WORKING_DIR })` |
| `run`         | `` ```run\n…\n``` ``      | `execSync(command, { cwd: WORKING_DIR })`             |
| `script`      | `` ```script\n…\n``` ``   | `execSync(command, { cwd: SCRIPTS_DIR })`             |

All blocks have a **5 second timeout**. On error, the block is replaced with an `[Error: …]` message instead of crashing the filesystem.

The function returns the fully transformed string, which `index.js` then encodes into a buffer and hands to the FUSE read handler.

---

## The agent loop

This is the core pattern virtual-fs-node is designed to enable:

```
1. Agent reads mnt/<index>/checklist.md
2. Receives [x] / [ ] output with exact file paths
3. Agent creates missing files / fixes failing checks
4. Agent reads the same file again
5. Repeat until all constraints show [x]
```

Because the file re-executes on every read, the agent gets an accurate picture of the current state each time — no stale cache, no polling, no custom tool. The filesystem is the feedback loop.

---

## Example walkthrough

**Source file** — `textos/api-checklist.md`:

````markdown
// AUTH — Routes & middleware
```run-node
const fs = require('fs')
const src = fs.readFileSync('src/index.js', 'utf8')
console.log(src.includes('POST') && src.includes('/auth/register')
  ? '[x] POST /auth/register handler exists'
  : '[ ] POST /auth/register handler exists ⚠')
console.log(process.env.JWT_SECRET
  ? '[x] JWT secret loaded from env'
  : '[ ] JWT secret loaded from env ⚠')
```

// DATABASE — Schema & migrations
```run-node
const fs = require('fs')
const ok = fs.existsSync('migrations/001_create_users.sql')
console.log(ok ? '[x] users table migration' : '[ ] users table migration ⚠')
if (!ok) console.log('    Missing: migrations/001_create_users.sql')
```

// TESTS — Coverage
```run-node
const fs = require('fs')
const ok = fs.existsSync('tests/auth.test.js')
console.log(ok ? '[x] Auth unit tests' : '[ ] Auth unit tests ⚠')
if (!ok) console.log('    Missing: tests/auth.test.js')
```
````

**Step 1 — Agent reads the file (first time):**

```
// AUTH — Routes & middleware
[x] POST /auth/register handler exists
[x] JWT secret loaded from env

// DATABASE — Schema & migrations
[ ] users table migration ⚠
    Missing: migrations/001_create_users.sql

// TESTS — Coverage
[ ] Auth unit tests ⚠
    Missing: tests/auth.test.js
```

**Step 2 — Agent creates the missing files:**

```bash
# Agent writes migrations/001_create_users.sql
# Agent writes tests/auth.test.js
```

**Step 3 — Agent re-reads the same file:**

```
// AUTH — Routes & middleware
[x] POST /auth/register handler exists
[x] JWT secret loaded from env

// DATABASE — Schema & migrations
[x] users table migration

// TESTS — Coverage
[x] Auth unit tests
```

All constraints satisfied. Loop complete.
