import { useEffect, useState } from 'react'
import type { AppSettings } from '../shared/types'

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
      <p className="section-label">Preferences</p>

      <form className="reminder-form" onSubmit={(e) => e.preventDefault()} style={{ maxWidth: 480 }}>
        <label>
          Overlay screen edge
          <select
            value={settings.screenEdge}
            onChange={(e) => apply({ screenEdge: e.target.value as AppSettings['screenEdge'] })}
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="bottom">Bottom</option>
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

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => apply({ soundEnabled: e.target.checked })}
          />
          Sound enabled
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={settings.launchOnStartup}
            onChange={(e) => apply({ launchOnStartup: e.target.checked })}
          />
          Launch on startup
        </label>

        <p className="section-label" style={{ marginTop: 'var(--space-4)' }}>
          Clock widget
        </p>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={settings.clockWidget.enabled}
            onChange={(e) => apply({ clockWidget: { ...settings.clockWidget, enabled: e.target.checked } })}
          />
          Show clock widget
        </label>

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

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={settings.clockWidget.alwaysOnTop}
                onChange={(e) =>
                  apply({ clockWidget: { ...settings.clockWidget, alwaysOnTop: e.target.checked } })
                }
              />
              Always on top
            </label>
          </>
        )}
      </form>
    </div>
  )
}
