"use client"

import { useCallback, useEffect, useState } from "react"

export type Appearance = "light" | "dark" | "system"

const prefersDark = () => {
  if (typeof window === "undefined") {
    return false
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

const setCookie = (name: string, value: string, days = 365) => {
  if (typeof document === "undefined") {
    return
  }

  const maxAge = days * 24 * 60 * 60
  document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`
}

const applyTheme = (appearance: Appearance) => {
  if (typeof document === "undefined") {
    return
  }

  const isDark = appearance === "dark" || (appearance === "system" && prefersDark())

  if (isDark) {
    document.documentElement.classList.add("dark")
  } else {
    document.documentElement.classList.remove("dark")
  }
}

const mediaQuery = () => {
  if (typeof window === "undefined") {
    return null
  }

  return window.matchMedia("(prefers-color-scheme: dark)")
}

const handleSystemThemeChange = () => {
  const currentAppearance = localStorage.getItem("appearance") as Appearance
  applyTheme(currentAppearance || "system")
}

export function initializeTheme() {
  // Get the saved appearance from localStorage or cookie
  let savedAppearance: Appearance | null = null

  // Try to get from localStorage first
  if (typeof window !== "undefined" && window.localStorage) {
    savedAppearance = localStorage.getItem("appearance") as Appearance
  }

  // If not in localStorage, try to get from cookie
  if (!savedAppearance && typeof document !== "undefined") {
    const cookies = document.cookie.split(";")
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=")
      if (name === "appearance") {
        savedAppearance = value as Appearance
        break
      }
    }
  }

  // Default to system if no saved preference
  const appearance = savedAppearance || "system"

  // Apply the theme immediately
  applyTheme(appearance)

  // Store in localStorage for future use
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem("appearance", appearance)
  }

  // Add the event listener for system theme changes
  const mq = mediaQuery()
  if (mq) {
    mq.addEventListener("change", handleSystemThemeChange)
  }

  return appearance
}

export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>("system")
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize theme on first render
  useEffect(() => {
    if (!isInitialized) {
      const savedAppearance = initializeTheme()
      setAppearance(savedAppearance as Appearance)
      setIsInitialized(true)
    }
  }, [isInitialized])

  const updateAppearance = useCallback((mode: Appearance) => {
    setAppearance(mode)

    // Store in localStorage for client-side persistence
    localStorage.setItem("appearance", mode)

    // Store in cookie for SSR
    setCookie("appearance", mode)

    applyTheme(mode)
  }, [])

  // Listen for system theme changes
  useEffect(() => {
    const mq = mediaQuery()

    if (mq) {
      mq.addEventListener("change", handleSystemThemeChange)
    }

    return () => {
      if (mq) {
        mq.removeEventListener("change", handleSystemThemeChange)
      }
    }
  }, [])

  return { appearance, updateAppearance } as const
}

