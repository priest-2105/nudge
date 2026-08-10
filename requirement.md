# Desktop Reminder Avatar App — Requirements & Handover

## 1. One-line summary
A cross-platform desktop app (Windows/Mac/Linux) that lets users create reminders. When a reminder fires, an animated avatar slides in from the edge of the screen, sits **on top of every other window/app**, delivers the reminder message, and slides back out.

## 2. Tech Stack (decided)

| Layer | Choice | Notes |
|---|---|---|
| App shell | **Electron** | Gives native OS window control (transparent, frameless, always-on-top, multi-display) |
| UI | **React** (+ TypeScript recommended) | For both the settings window and the overlay window |
| Bundler | **Vite** (via `electron-vite` or `vite-plugin-electron`) | Fast dev loop, standard pairing with Electron + React |
| Avatar animation | **Rive** (`@rive-app/react-canvas`) | Small file size, code-driven state machine (idle/enter/talk/exit) |
| Local storage | **SQLite** via `better-sqlite3`, or `electron-store` for simpler key-value needs | Reminders persist across restarts |
| Scheduling | **node-cron** or manual interval-check against stored timestamps | Runs in Electron main process |
| Notifications fallback | Electron's native `Notification` API | Backup for when overlay can't render (e.g. fullscreen exclusive apps/games) |
| Packaging | **electron-builder** | Produces `.exe` (Win), `.dmg`/`.pkg` (Mac), `.AppImage`/`.deb` (Linux) |
| Tray | Electron `Tray` API | Quick-access menu, toggle app, open settings |

## 3. App Architecture

Three logical windows/processes:

1. **Main process (Node/Electron backend)**
   - Owns the reminder database
   - Runs the scheduler/timer loop
   - Decides when to trigger the overlay, and on which display
   - Manages tray icon, app lifecycle, auto-launch on startup

2. **Overlay window** (the avatar)
   - Frameless, transparent, `alwaysOnTop: true`, no taskbar icon
   - Positioned at a screen edge, normally hidden/off-canvas
   - Click-through on transparent areas (`setIgnoreMouseEvents`) so it never blocks work underneath except on the avatar itself
   - Plays Rive animation states: `idle → enter → talk/point → exit`
   - Displays reminder text + optional actions (Dismiss / Snooze)

3. **Main app window** (Settings/CRUD UI)
   - Normal window with title bar
   - List, create, edit, delete reminders
   - App-level preferences (avatar choice, sound on/off, snooze default, launch on startup, which screen edge avatar enters from)

## 4. MVP Feature List

- [ ] Create a reminder: title, message, date/time (one-off)
- [ ] Recurring reminders: daily / weekly / custom interval
- [ ] Edit / delete existing reminders
- [ ] List view of all upcoming reminders in the settings window
- [ ] Overlay avatar triggers at the correct time, animates in, shows message, animates out after N seconds or on dismiss
- [ ] Snooze button (e.g. +10 min)
- [ ] Dismiss button
- [ ] System tray icon with quick menu (Open Settings / Pause Reminders / Quit)
- [ ] Persist reminders locally (survive app restart)
- [ ] Works across Windows, macOS, Linux builds

## 5. Stretch Features (post-MVP)

- [ ] Multiple avatar characters to choose from
- [ ] Avatar has idle "ambient" behavior (occasionally peeks in even without a reminder, purely for charm)
- [ ] Sound effects / voice lines on reminder trigger
- [ ] Choose which monitor the avatar appears on (multi-display setups)
- [ ] Light/dark theme for settings UI
- [ ] Import/export reminders (JSON)
- [ ] Optional cloud sync (out of scope for MVP — local-only first)

## 6. Overlay Window — Detailed Behavior Spec

This is the trickiest part technically — spell it out clearly for whoever builds it:

- `BrowserWindow` options: `transparent: true`, `frame: false`, `alwaysOnTop: true`, `skipTaskbar: true`, `resizable: false`, `hasShadow: false`
- Window size: fixed, sized to fit avatar + reminder text (e.g. 320x400px), positioned using `screen.getPrimaryDisplay()` (or selected display) bounds
- Default state: window exists but is positioned just off-screen (or hidden) so it's invisible until triggered
- On trigger: animate window position (slide in) OR keep window fixed and animate avatar *within* the transparent canvas (simpler, recommended — avoids OS-level window-move jank)
- Mouse click-through: use `setIgnoreMouseEvents(true, { forward: true })` on transparent regions, disable it only over the avatar/button hit areas
- Auto-exit timer: if no user interaction within N seconds (configurable, default ~15s), auto-play exit animation and hide
- Must not steal focus from the user's current app (avoid `win.focus()`)

## 7. Data Model (draft)

```ts
interface Reminder {
  id: string;
  title: string;
  message: string;
  triggerAt: string;       // ISO datetime for next trigger
  recurrence: 'none' | 'daily' | 'weekly' | 'custom';
  recurrenceInterval?: number; // for custom, in minutes
  enabled: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
}

interface AppSettings {
  avatarId: string;
  screenEdge: 'left' | 'right' | 'bottom';
  soundEnabled: boolean;
  defaultSnoozeMinutes: number;
  launchOnStartup: boolean;
  displayId?: number; // which monitor to use
}
```

## 8. Non-Functional Requirements

- Cross-platform builds from a single codebase (Win/Mac/Linux)
- Low idle resource usage (this app mostly sits in the background/tray)
- Reminders must still fire reliably if the settings window is closed (main process handles scheduling independently of any open window)
- Should survive system sleep/wake (recheck due reminders on wake)
- No internet connection required for core functionality

## 9. Suggested Folder Structure

```
reminder-avatar-app/
├── electron/
│   ├── main.ts              # main process entry, window management, scheduler
│   ├── tray.ts
│   ├── db.ts                 # SQLite/electron-store setup
│   └── scheduler.ts
├── src/
│   ├── settings-window/       # React app for CRUD UI
│   │   ├── App.tsx
│   │   └── components/
│   ├── overlay-window/        # React app for the avatar overlay
│   │   ├── App.tsx
│   │   └── AvatarStage.tsx
│   └── shared/
│       ├── types.ts
│       └── ipc.ts             # typed IPC channel definitions
├── assets/
│   └── avatars/                # .riv files
├── electron-builder.json
├── package.json
└── vite.config.ts
```

## 10. Milestones (suggested build order)

1. **Scaffold**: Electron + React + Vite boilerplate, two windows (settings + overlay) launching correctly
2. **Overlay mechanics**: get transparent/frameless/always-on-top/click-through overlay working reliably on all 3 OSes — prove this early since it's the highest-risk part
3. **Reminder CRUD**: settings UI + SQLite persistence
4. **Scheduler**: main process checks due reminders, triggers overlay via IPC
5. **Avatar animation**: integrate Rive, wire up enter/idle/exit states
6. **Tray + lifecycle**: tray menu, launch on startup, pause/resume
7. **Packaging**: electron-builder configs for Win/Mac/Linux, test installers
8. **Polish**: snooze, sounds, settings for avatar/edge/display choice

## 11. Open Questions (resolve before/with Claude Code)

- Do we want one shared avatar character for v1, or avatar selection from day one?
- Should reminders support attachments/links, or just plain text for MVP?
- Any preference on light/dark UI theme for the settings window?
- Should the app request "launch on startup" permission on first run, or leave it opt-in in settings?

## 12. Handover Note (for Claude Code)

> Build this app per the spec above, starting with Milestone 1 (scaffold) and Milestone 2 (overlay window mechanics) since those de-risk the hardest technical part first. Use TypeScript throughout. Set up IPC types in `src/shared/ipc.ts` before wiring up windows so main/renderer communication stays type-safe. Ask before introducing additional dependencies beyond what's listed in the stack table above.