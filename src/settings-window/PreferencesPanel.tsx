import { useEffect, useState } from 'react'
import type { AppSettings } from '../shared/types'
import { Toggle } from './Toggle'

export function PreferencesPanel(): JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  async function refresh(): Promise<void> {
    setSettings(await window.api.getSettings())
  }

  useEffect(() => {
    refresh()
    const off = window.api.onDataChanged((entity) => {
      if (entity === 'settings') refresh()
    })
    return off
  }, [])

  async function apply(patch: Partial<AppSettings>): Promise<void> {
    setSettings(await window.api.updateSettings(patch))
  }

  if (!settings) return <p className="reminder-body">Loading preferences…</p>

  return (
    <div>
      <form className="reminder-form" onSubmit={(e) => e.preventDefault()} style={{ maxWidth: 480 }}>
        <label>
          Overlay corner
          <select
            value={settings.overlayPosition}
            onChange={(e) => apply({ overlayPosition: e.target.value as AppSettings['overlayPosition'] })}
          >
            <option value="top-left">Top left</option>
            <option value="top-right">Top right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="bottom-right">Bottom right</option>
          </select>
        </label>

        <label>
          Default snooze (minutes)
          <input
            type="number"
            min={1}
            value={settings.defaultSnoozeMinutes}
            onChange={(e) => apply({ defaultSnoozeMinutes: Number(e.target.value) || 10 })}
          />
        </label>

        <label>
          Celebration type
          <select
            value={settings.celebrationType}
            onChange={(e) => apply({ celebrationType: e.target.value as AppSettings['celebrationType'] })}
          >
            <option value="confetti">Confetti (more coming soon)</option>
          </select>
        </label>

        <Toggle
          label="Sound enabled"
          checked={settings.soundEnabled}
          onChange={(checked) => apply({ soundEnabled: checked })}
        />

        <Toggle
          label="Launch on startup"
          checked={settings.launchOnStartup}
          onChange={(checked) => apply({ launchOnStartup: checked })}
        />

        <p className="section-label" style={{ marginTop: 'var(--space-4)' }}>
          Clock widget
        </p>

        <Toggle
          label="Show clock widget"
          checked={settings.clockWidget.enabled}
          onChange={(checked) => apply({ clockWidget: { ...settings.clockWidget, enabled: checked } })}
        />

        {settings.clockWidget.enabled && (
          <>
            <label>
              Style
              <select
                value={settings.clockWidget.style}
                onChange={(e) =>
                  apply({
                    clockWidget: {
                      ...settings.clockWidget,
                      style: e.target.value as AppSettings['clockWidget']['style']
                    }
                  })
                }
              >
                <option value="digital">Digital</option>
                <option value="analog">Analog</option>
              </select>
            </label>

            <Toggle
              label="Always on top"
              checked={settings.clockWidget.alwaysOnTop}
              onChange={(checked) =>
                apply({ clockWidget: { ...settings.clockWidget, alwaysOnTop: checked } })
              }
            />
          </>
        )}

        <p className="section-label" style={{ marginTop: 'var(--space-4)' }}>
          Peek preview
        </p>
        <p className="reminder-body" style={{ marginTop: 0 }}>
          A small blinking face peeks in from the overlay corner shortly before the real alert.
        </p>

        <label>
          Peek lead time (minutes)
          <input
            type="number"
            min={1}
            value={settings.peekPreview.leadMinutes}
            onChange={(e) =>
              apply({ peekPreview: { ...settings.peekPreview, leadMinutes: Number(e.target.value) || 5 } })
            }
          />
        </label>

        <Toggle
          label="Peek before reminders"
          checked={settings.peekPreview.remindersEnabled}
          onChange={(checked) =>
            apply({ peekPreview: { ...settings.peekPreview, remindersEnabled: checked } })
          }
        />

        <Toggle
          label="Peek before task check-ins"
          checked={settings.peekPreview.tasksEnabled}
          onChange={(checked) => apply({ peekPreview: { ...settings.peekPreview, tasksEnabled: checked } })}
        />

        <Toggle
          label="Peek before alarms"
          checked={settings.peekPreview.alarmsEnabled}
          onChange={(checked) =>
            apply({ peekPreview: { ...settings.peekPreview, alarmsEnabled: checked } })
          }
        />
      </form>
    </div>
  )
}
