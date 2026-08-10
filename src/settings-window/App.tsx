function TestOverlayButton(): JSX.Element {
  function handleClick(): void {
    window.api.triggerTestOverlay({
      title: 'Test Reminder',
      message: 'This is a manually triggered overlay for Milestone 2 testing.'
    })
  }

  return <button onClick={handleClick}>Trigger Test Overlay</button>
}

export default function App(): JSX.Element {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>Nudge</h1>
      <p>Reminder CRUD lands in Milestone 3. For now, use this to test the overlay mechanics:</p>
      <TestOverlayButton />
    </div>
  )
}
