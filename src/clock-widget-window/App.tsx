import { useEffect, useState } from 'react'
import type { AppSettings } from '../shared/types'

function useNow(): Date {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

function DigitalClock({ now }: { now: Date }): JSX.Element {
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return (
    <div className="clock-digital">
      <div className="clock-time">{time}</div>
      <div className="clock-date">{date}</div>
    </div>
  )
}

function AnalogClock({ now }: { now: Date }): JSX.Element {
  const seconds = now.getSeconds()
  const minutes = now.getMinutes()
  const hours = now.getHours() % 12
  const secDeg = seconds * 6
  const minDeg = minutes * 6 + seconds * 0.1
  const hourDeg = hours * 30 + minutes * 0.5

  return (
    <svg className="clock-analog" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" />
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30 * Math.PI) / 180
        const x1 = 50 + 40 * Math.sin(angle)
        const y1 = 50 - 40 * Math.cos(angle)
        const x2 = 50 + 44 * Math.sin(angle)
        const y2 = 50 - 44 * Math.cos(angle)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="clock-tick" />
      })}
      <line
        x1="50"
        y1="50"
        x2={50 + 24 * Math.sin((hourDeg * Math.PI) / 180)}
        y2={50 - 24 * Math.cos((hourDeg * Math.PI) / 180)}
        className="clock-hand-hour"
      />
      <line
        x1="50"
        y1="50"
        x2={50 + 34 * Math.sin((minDeg * Math.PI) / 180)}
        y2={50 - 34 * Math.cos((minDeg * Math.PI) / 180)}
        className="clock-hand-minute"
      />
      <line
        x1="50"
        y1="50"
        x2={50 + 38 * Math.sin((secDeg * Math.PI) / 180)}
        y2={50 - 38 * Math.cos((secDeg * Math.PI) / 180)}
        className="clock-hand-second"
      />
      <circle cx="50" cy="50" r="2.5" className="clock-hub" />
    </svg>
  )
}

export default function App(): JSX.Element {
  const now = useNow()
  const [style, setStyle] = useState<AppSettings['clockWidget']['style']>('digital')

  useEffect(() => {
    window.api.getSettings().then((s) => setStyle(s.clockWidget.style))
    const off = window.api.onDataChanged((entity) => {
      if (entity === 'settings') window.api.getSettings().then((s) => setStyle(s.clockWidget.style))
    })
    return off
  }, [])

  return (
    <div className="clock-root">
      <div className="clock-drag-handle">{style === 'analog' ? <AnalogClock now={now} /> : <DigitalClock now={now} />}</div>
    </div>
  )
}
