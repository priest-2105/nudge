# Nudge

A cross-platform desktop reminder app (Electron + React + TypeScript). When a reminder fires, an animated avatar slides in from the edge of the screen, sits on top of every other window, delivers the message, and slides back out.

See [requirement.md](./requirement.md) for the full spec.

## Prerequisites

- Node.js 18+ and npm

## Getting started

```bash
npm install
npm run dev
```

This starts the Vite dev server and launches the app. Two windows open:

- **Settings** — normal window, currently just has a "Trigger Test Overlay" button (reminder CRUD isn't built yet)
- **Overlay** — hidden by default; click "Trigger Test Overlay" in Settings to see the avatar placeholder slide in from the bottom-right corner, then auto-dismiss after ~15s (or click Dismiss)

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the app in development mode with hot reload |
| `npm run build` | Build the app for production |
| `npm run start` | Preview a production build |
| `npm run typecheck` | Type-check the main/preload and renderer code |

## Project status

Currently implemented: **Milestone 1** (scaffold) and **Milestone 2** (overlay window mechanics — transparent/frameless/always-on-top/click-through, manually triggerable for testing).

Not yet implemented: reminder CRUD + persistence, scheduler, Rive avatar animation, system tray, packaging. See section 10 of [requirement.md](./requirement.md) for the full milestone list.

## Project structure

```
electron/           # main process: window management, IPC handlers, scheduler/db/tray stubs
src/settings-window/  # React app — reminder CRUD UI (WIP)
src/overlay-window/   # React app — the avatar overlay
src/shared/            # types.ts and ipc.ts shared between main and renderers
assets/avatars/         # .riv avatar files (not yet added)
```
# nudge
