'use client'

import { useEffect, useRef, useState } from 'react'

export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

/** RAF-based animated counter. Starts immediately on mount. */
export function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (started.current || target === 0) return
    started.current = true
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      // quartic ease-out
      const ease = 1 - Math.pow(1 - t, 4)
      setValue(Math.round(ease * target))
      if (t < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [target, duration])

  return value
}
