export function ElectronRequired() {
  return (
    <div className="screen screen-chrome">
      <div className="screen-body center">
        <div className="electron-required">
          <h1>Algo Client</h1>
          <p>Desktop app only — the browser cannot access Electron APIs.</p>
          <p className="muted">
            Close this tab and run <code>npm run dev</code> to launch the Electron window.
          </p>
        </div>
      </div>
    </div>
  )
}
