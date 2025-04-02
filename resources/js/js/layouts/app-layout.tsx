"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/Sidebar" // Ensure the path is correct

export default function AppLayout({ children }) {
  const [isOpen, setIsOpen] = useState(true) // Manage sidebar state

  // Handle dark mode based on local storage
  useEffect(() => {
    document.documentElement.classList.toggle("dark", localStorage.getItem("theme") === "dark")
  }, [])

  // Handle session expiration
  useEffect(() => {
    const handleSessionExpired = (e) => {
      if (e.detail?.response?.status === 401 || e.detail?.response?.status === 419) {
        localStorage.removeItem("sidebarState")
        window.location.href = "/login?timeout=true"
      }
    }
    document.addEventListener("inertia:error", handleSessionExpired)
    return () => document.removeEventListener("inertia:error", handleSessionExpired)
  }, [])

  return (
    <div className="flex h-screen w-full">
      {/* Sidebar */}
      <Sidebar isOpen={isOpen} toggleSidebar={() => setIsOpen(!isOpen)} />

      {/* Main content with dynamic margin based on sidebar state */}
      <main
        className={`flex-1 p-6 transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        }`} // Adjust the margin based on sidebar state
      >
        {children}
      </main>
    </div>
  )
}
