import { useEffect, useState } from 'react'

export function Timer() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const tick = async () => {
      const elapsed = await window.algoClient.getElapsed()
      setSeconds(elapsed)
    }
    void tick()
    const id = setInterval(() => void tick(), 1000)
    return () => clearInterval(id)
  }, [])

  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return (
    <span className="timer">
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )
}
