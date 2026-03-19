# remote-codex

remote-codex is a remote web UI for local AI coding agents. It lets you read threads, send follow-up prompts, switch models, and watch live agent activity from another device while the agent keeps running on your machine.

Website: [remote.ailin.uk](https://remote.ailin.uk/)

Supports [Codex](https://openai.com/codex) and [OpenCode](https://opencode.ai).

This is an independent project and is not affiliated with, endorsed by, or sponsored by OpenAI or the OpenCode team.

## Why use it

- Browse conversations by project
- Continue chats from your phone or another laptop
- Switch model and reasoning settings
- Monitor live agent state and interrupt runs
- Inspect debug and IPC history when something goes wrong

## How it works

- `@farfield/server` runs beside your local agent and serves HTTP + SSE on port `4311`
- `@farfield/web` is a static frontend you can use from [remote.ailin.uk](https://remote.ailin.uk/) or self-host
- Your browser connects directly to your server; there is no hosted relay for agent traffic

## Quick start

1. Start the server on the machine where Codex or OpenCode is running:

```bash
npx -y @farfield/server@latest
```

Or with Bun:

```bash
bunx @farfield/server@latest
```

Choose providers if needed:

```bash
npx -y @farfield/server@latest -- --agents=opencode
npx -y @farfield/server@latest -- --agents=codex,opencode
npx -y @farfield/server@latest -- --agents=all
```

2. Make `4311` reachable over HTTPS.

Recommended with Tailscale:

```bash
tailscale serve --https=443 http://127.0.0.1:4311
```

3. Open [remote.ailin.uk](https://remote.ailin.uk/), open **Settings**, and enter your server URL.

Example:

```text
https://<machine>.<tailnet>.ts.net
```

If you did not set `FARFIELD_API_PASSWORD`, the default password is `zxczxc`.

## Run from source

Install dependencies:

```bash
bun install
```

Run the backend only:

```bash
bun run server
```

This runs the server on `0.0.0.0:4311`.

Run frontend and backend for local development:

```bash
bun run dev
```

This opens the frontend on `http://localhost:4312`.

Useful variants:

```bash
bun run dev -- --agents=opencode
bun run dev -- --agents=codex,opencode
bun run dev:remote
```

Build and run production preview locally:

```bash
bun run build
bun run start
```

## Self-hosting the frontend

You can keep the backend on your machine and host only the static frontend somewhere else.

Build the frontend with a default server URL:

```bash
VITE_FARFIELD_SERVER_URL=https://your-server.example.com bun run --filter @farfield/web build
```

The browser can still override that value in **Settings**.

## Important env vars

- `FARFIELD_API_PASSWORD`: password required by the backend; change this before exposing your server
- `FARFIELD_API_ORIGIN`: custom backend origin for local production preview
- `VITE_FARFIELD_SERVER_URL`: default backend URL baked into a frontend build

## Tech stack

- Bun workspaces and TypeScript
- React 19, Vite 7, Tailwind CSS 4
- Node.js backend with `tsx`, `esbuild`, `pino`, and `zod`
- Shared protocol and adapter packages for Codex and OpenCode

## Requirements

- Node.js 20+
- Bun 1.3+
- Codex or OpenCode installed locally

## Security notes

- Keep the backend local unless you intentionally expose it
- If you expose it, use HTTPS and preferably a private VPN such as Tailscale
- Change `FARFIELD_API_PASSWORD` before using `dev:remote` or any public-facing setup

## License

MIT
