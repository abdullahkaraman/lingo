import { useEffect } from 'react'

interface TimerProps {
  tick: () => void
  isActive: boolean
  intervalMs?: number
}

/**
 * Custom hook to manage the game timer lifecycle.
 * Removes the need for manual setInterval in components.
 */
export function useGameTimer({ tick, isActive, intervalMs = 1000 }: TimerProps) {
  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      tick()
    }, intervalMs)

    return () => clearInterval(interval)
  }, [tick, isActive, intervalMs])
}
