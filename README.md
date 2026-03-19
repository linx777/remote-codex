# remote-codex

remote-codex is a remote control surface for local AI coding agents. It gives you a fast web UI for reading conversations, sending follow-up prompts, switching models, and monitoring live agent activity from another device while the real agent keeps running on your machine.

Website: [remote.ailin.uk](https://remote.ailin.uk/)

remote-codex currently supports [Codex](https://openai.com/codex) and [OpenCode](https://opencode.ai).

Under the hood, remote-codex is a TypeScript-first monorepo with a static React frontend and a lightweight local adapter server. The browser talks directly to your remote-codex server over HTTP and Server-Sent Events, and the server translates that traffic into provider-specific calls for Codex and OpenCode.

Built by [@anshuchimala](https://x.com/anshuchimala).

This is an independent project and is not affiliated with, endorsed by, or sponsored by OpenAI or the OpenCode team.

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=000000)](https://buymeacoffee.com/achimalap)

<img src="./screenshot.png" alt="remote-codex screenshot" width="500" />

## Architecture

1. `@farfield/server` runs next to your local agent runtime and exposes a small HTTP API plus a live event stream on port `4311`.
2. `@farfield/web` is a static frontend that can run locally or be hosted separately, and it connects straight from the browser to that server.
3. Provider adapters normalize Codex IPC/CLI behavior and OpenCode SDK behavior into one shared UI surface.
4. Shared protocol packages keep events, commands, and validation types aligned across the frontend and backend.

## Tech stack

- Monorepo and tooling: Bun workspaces, TypeScript 5.9, Node.js 20+, Vitest
- Frontend (`apps/web`): React 19, Vite 7, Tailwind CSS 4, Radix UI primitives, Framer Motion, React Markdown, `react-syntax-highlighter`
- Frontend platform features: Vite PWA plugin, Workbox-powered service worker support, build-time React Compiler toggle, optional production profiling builds
- Backend (`apps/server`): TypeScript on Node.js, `tsx` for local development, `esbuild` for the published CLI bundle, `pino` logging, `zod` validation
- Provider integrations: Codex desktop IPC/CLI integration and OpenCode support via `@opencode-ai/sdk`
- Shared packages: `@farfield/unified-surface` for provider-agnostic models, `@farfield/protocol` for protocol types and generated bindings, `@farfield/api` and `@farfield/opencode-api` for provider-specific adapters
- Deployment model: static frontend can be self-hosted or deployed to Vercel, while the local agent-facing server can be exposed securely over Tailscale or another HTTPS/VPN path

## Repository layout

- `apps/web`: browser UI, local dev server, production build, PWA setup
- `apps/server`: local bridge server that exposes API routes, SSE updates, tracing, and provider adapters
- `packages/unified-surface`: common command and event contracts used by the UI and server
- `packages/codex-protocol`: Codex protocol schemas, generated types, and fixtures
- `packages/codex-api`: Codex-specific translation layer
- `packages/opencode-api`: OpenCode-specific translation layer

## Features

- Thread browser grouped by project
- Chat view with model/reasoning controls
- Plan mode toggle
- Live agent monitoring and interrupts
- Debug tab with full IPC history

## Quick start (recommended)

Start the remote-codex server:

```bash
npx -y @farfield/server@latest
```

or:

```bash
bunx @farfield/server@latest
```

This runs the backend on `127.0.0.1:4311` by default.

You can pass server flags too to customize the agents (default is only Codex):

```bash
npx -y @farfield/server@latest -- --agents=opencode
npx -y @farfield/server@latest -- --agents=codex,opencode
npx -y @farfield/server@latest -- --agents=all
```

You can access the web app at [remote.ailin.uk](https://remote.ailin.uk/). Tap the bottom left status dot to pull up settings.

You will need to make port 4311 remotely accessible via HTTPS and give the public URL to it to the remote-codex frontend. None of this routes through an external server. The app runs entirely in your browser and tunnels directly to the remote-codex server you started above, and all of it is open-source for you to audit yourself. However, if you are ultra paranoid, you can run and host the remote-codex frontend too; read on!

The securest way to open the port for remote access is by putting all devices involved in a private VPN. Tailscale is a free option that works.

Doing this with Tailscale is as simple as installing Tailscale on your phone, computer, etc., and running this command on the device hosting the remote-codex server:
```bash
tailscale serve --https=443 http://127.0.0.1:4311
```

We are working on easier options. Stay tuned!

## Running from source

Clone the repo and do this:

```bash
bun install
bun run server
```

`bun run server` runs only the backend on `0.0.0.0:4311`.

If you need to pick agent providers:

```bash
bun run server -- --agents=opencode
bun run server -- --agents=codex,opencode
bun run server -- --agents=all
```

> **Warning:** This exposes the remote-codex server on your network. Only use on trusted networks. See below for how to configure Tailscale as a VPN for secure remote access.

## Local development and self-hosted frontend

Use this if you are working on remote-codex itself, or if you want to run both frontend and backend locally.

```bash
bun install
bun run dev
```

Opens local frontend at `http://localhost:4312`. By default `dev` does not expose the port, it's only accessible on your device.

More local dev options:

```bash
bun run dev -- --agents=opencode             # OpenCode only
bun run dev -- --agents=codex,opencode       # both
bun run dev -- --agents=all                  # expands to codex,opencode
bun run dev:remote                           # exposes frontend + backend on your network
bun run dev:remote -- --agents=opencode      # remote mode with OpenCode only
```

> **Warning:** `dev:remote` uses API password authentication by default (`zxczxc`). Change it via `FARFIELD_API_PASSWORD` before exposing your server.

## Production Mode (No Extra Proxy)

Build once and run in production mode with two commands:

```bash
bun run build
bun run start
```

Open `http://127.0.0.1:4312`.

By default, this is local-only:
- backend on `127.0.0.1:4311`
- frontend preview on `127.0.0.1:4312`

If you need a custom backend origin for API proxying:

```bash
FARFIELD_API_ORIGIN=http://127.0.0.1:4311 bun run start
```

Set a custom API password for every API request (default is `zxczxc` if unset):

```bash
FARFIELD_API_PASSWORD=your-strong-password bun run start
```

## Deploying the frontend to Vercel

You can deploy only the frontend and keep the remote-codex backend running elsewhere.

This repo now supports a build-time default backend URL for hosted frontends:

```bash
VITE_FARFIELD_SERVER_URL=https://your-server.example.com bun run --filter @farfield/web build
```

The deployed app still lets each browser override this in **Settings**. The saved setting in browser storage wins over the build-time default.

### Recommended Vercel setup

Use the repo root as the Vercel project root. `vercel.json` is included with the correct install/build/output settings.

In Vercel, set:

- Framework preset: `Other`
- Root directory: repo root
- Build command: taken from `vercel.json`
- Output directory: taken from `vercel.json`
- Install command: taken from `vercel.json`

Add this environment variable in Vercel if your backend lives on another origin:

- `VITE_FARFIELD_SERVER_URL=https://your-server.example.com`

After deploy:

1. Open your Vercel URL.
2. If needed, open **Settings** in the app and change the server URL.
3. Make sure the browser can actually reach the backend URL you configured.

### Important networking note

If your backend is only reachable over a private VPN such as Tailscale, the device opening the Vercel-hosted frontend must also be on that VPN. Vercel is only hosting the static frontend; your browser still talks directly to the remote-codex backend.

### React Compiler and production profiling

Frontend build supports two optional flags:

- `REACT_COMPILER=0` disables React Compiler transform (compiler is enabled by default for `vite build`).
- `REACT_PROFILING=1` uses React profiling build so React DevTools Profiler works in production preview.

Example A/B commands:

```bash
# default production build (compiler enabled)
bun run --filter @farfield/web build

# baseline production build (compiler disabled)
REACT_COMPILER=0 bun run --filter @farfield/web build

# production profiling build (compiler enabled)
REACT_PROFILING=1 bun run --filter @farfield/web build

# production profiling build (compiler disabled)
REACT_PROFILING=1 REACT_COMPILER=0 bun run --filter @farfield/web build
```

Run two UIs side-by-side against one backend:

```bash
# backend (terminal 1)
bun run --filter @farfield/server start

# baseline UI (terminal 2, compiler disabled)
REACT_PROFILING=1 REACT_COMPILER=0 bun run --filter @farfield/web build -- --outDir dist-baseline
bun run --filter @farfield/web preview -- --host 127.0.0.1 --port 4312 --strictPort --outDir dist-baseline

# compiler UI (terminal 3, compiler enabled by default)
REACT_PROFILING=1 bun run --filter @farfield/web build -- --outDir dist-compiler
bun run --filter @farfield/web preview -- --host 127.0.0.1 --port 4313 --strictPort --outDir dist-compiler
```

## Requirements

- Node.js 20+
- Bun 1.2+ (needed for source checkout workflow)
- Codex or OpenCode installed locally

## More details on Tailscale setup

This is the detailed setup for the recommended model:

- Hosted frontend (`https://remote.ailin.uk/`)
- Local remote-codex server running on your machine
- Secure VPN path using Tailscale

You still need to run the server locally so it can talk to your coding agent.

### 1) Start the remote-codex server on your machine

```bash
HOST=0.0.0.0 PORT=4311 bun run --filter @farfield/server dev
```

Quick local check:

```bash
curl http://127.0.0.1:4311/api/health
```

### 2) Put Tailscale HTTPS in front of port 4311

On the same machine:

```bash
tailscale serve --https=443 http://127.0.0.1:4311
tailscale serve status
```

This gives you a URL like:

```text
https://<machine>.<tailnet>.ts.net
```

Check it from a device on your tailnet:

```bash
curl https://<machine>.<tailnet>.ts.net/api/health
```

### 3) Pair remote.ailin.uk to your server

1. Visit `https://remote.ailin.uk/` on your other device
2. Click the status pill in the lower-left corner (green/red dot + commit hash) to open **Settings**.
3. In **Server**, enter your Tailscale HTTPS URL, for example:

```text
https://<machine>.<tailnet>.ts.net
(note: no port)
```

4. Click **Save**.

If you did not set `FARFIELD_API_PASSWORD`, use the default **Server API password**: `zxczxc`.

remote-codex stores this in browser storage and uses it for API calls and live event stream.

### Notes

- Do not use raw tailnet IPs with `https://` (for example `https://100.x.x.x:4311`) in the browser; this won't work.
- If you use `tailscale serve --https=443`, do not include `:4311` in the URL you enter in Settings.
- **Use automatic** in Settings clears both the saved server URL and API password.

## License

MIT
