'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from '@wrksz/themes/client'

export function ThemeSync() {
  const pathname = usePathname()
  const { resolvedTheme } = useTheme()

  React.useEffect(() => {
    if (!resolvedTheme) return
    const root = document.documentElement
    
    // In React 19 + Next 15, route changes can wipe out the html class added by next-themes.
    // We manually enforce the class on route change to keep it in sync with resolvedTheme.
    if (resolvedTheme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
    }
  }, [resolvedTheme, pathname])

  return null
}
