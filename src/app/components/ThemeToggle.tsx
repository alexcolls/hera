"use client"

import * as React from "react"
import { Laptop, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Avoid hydration mismatch: resolvedTheme is only reliable on client.
  const currentTheme = mounted ? resolvedTheme : undefined
  const currentSetting = mounted ? (theme ?? "system") : "system"

  const nextSetting =
    currentSetting === "system"
      ? "light"
      : currentSetting === "light"
        ? "dark"
        : "system"

  const ariaLabel = mounted
    ? `Theme: ${currentSetting}${
        currentSetting === "system" && currentTheme
          ? ` (${currentTheme})`
          : ""
      }. Click to switch to ${nextSetting}.`
    : "Toggle theme"

  return (
    <button
      onClick={() => setTheme(nextSetting)}
      className="relative rounded-md p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-900"
      aria-label={ariaLabel}
    >
      {/* Icon shows the *setting* (system/light/dark), not just resolved theme */}
      <Laptop
        className={`h-[1.2rem] w-[1.2rem] transition-all ${
          currentSetting === "system" ? "scale-100 opacity-100" : "scale-0 opacity-0"
        }`}
      />
      <Sun
        className={`absolute top-2 left-2 h-[1.2rem] w-[1.2rem] transition-all ${
          currentSetting === "light" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        }`}
      />
      <Moon
        className={`absolute top-2 left-2 h-[1.2rem] w-[1.2rem] transition-all ${
          currentSetting === "dark" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"
        }`}
      />
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
