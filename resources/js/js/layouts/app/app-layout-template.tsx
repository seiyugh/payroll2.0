"use client"

import { useState, useEffect } from "react"
import { Link, usePage } from "@inertiajs/react"
import { LogOut, Moon, Sun, Menu, Home, Users, FileText, Calendar, UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useForm } from "@inertiajs/react"
import { toast } from "sonner"

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { post } = useForm()
  const { url } = usePage() // Access current URL from Inertia

  // Helper function to check if the link is active
  const isActive = (path) => url.startsWith(path)

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-white text-black dark:bg-black dark:text-white transition-all duration-300 z-50", // Increased z-index
        isOpen ? "w-60" : "w-20",
      )}
      aria-label="Main navigation"
      role="navigation"
    >
      <div className="flex items-center justify-between px-4 py-5">
        <h1 className={cn("text-lg font-bold transition-all duration-100", !isOpen && "hidden")}>Aicom</h1>
        {/* Toggle Button Icon */}
        <Button
          variant="ghost"
          onClick={toggleSidebar}
          aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
          aria-expanded={isOpen}
        >
          <Menu className="w-6 h-6" />
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className="mt-5 space-y-2 px-4">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center px-3 py-2 rounded transition-colors duration-200 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black",
            isActive("/dashboard") && "bg-black text-white dark:bg-white dark:text-black",
          )}
          aria-current={isActive("/dashboard") ? "page" : undefined}
        >
          <Home className="w-6 h-6 min-w-6" />
          {isOpen && <span className="ml-3">Dashboard</span>}
        </Link>
        <Link
          href="/employees"
          className={cn(
            "flex items-center px-3 py-2 rounded transition-colors duration-200 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black",
            isActive("/employees") && "bg-black text-white dark:bg-white dark:text-black",
          )}
          aria-current={isActive("/employees") ? "page" : undefined}
        >
          <Users className="w-6 h-6 min-w-6" />
          {isOpen && <span className="ml-3">Employees</span>}
        </Link>
        <Link
          href="/payroll"
          className={cn(
            "flex items-center px-3 py-2 rounded transition-colors duration-200 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black",
            isActive("/payroll") && "bg-black text-white dark:bg-white dark:text-black",
          )}
          aria-current={isActive("/payroll") ? "page" : undefined}
        >
          <FileText className="w-6 h-6 min-w-6" />
          {isOpen && <span className="ml-3">Payroll</span>}
        </Link>
        <Link
          href="/attendance"
          className={cn(
            "flex items-center px-3 py-2 rounded transition-colors duration-200 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black",
            isActive("/attendance") && "bg-black text-white dark:bg-white dark:text-black",
          )}
          aria-current={isActive("/attendance") ? "page" : undefined}
        >
          <Calendar className="w-6 h-6 min-w-6" />
          {isOpen && <span className="ml-3">Attendance</span>}
        </Link>
        {/* Added Users Management Link */}
        <Link
          href="/users"
          className={cn(
            "flex items-center px-3 py-2 rounded transition-colors duration-200 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black",
            isActive("/users") && "bg-black text-white dark:bg-white dark:text-black",
          )}
          aria-current={isActive("/users") ? "page" : undefined}
        >
          <UserCog className="w-6 h-6 min-w-6" />
          {isOpen && <span className="ml-3">Users</span>}
        </Link>
      </nav>

      {/* Dark Mode and Logout Buttons */}
      <div className="absolute bottom-5 w-full px-4">
        <Button
          variant="ghost"
          className="w-full flex items-center justify-start gap-2"
          onClick={() => {
            document.documentElement.classList.toggle("dark")
            localStorage.setItem("theme", document.documentElement.classList.contains("dark") ? "dark" : "light")
            toast.success(
              document.documentElement.classList.contains("dark") ? "Dark mode enabled" : "Light mode enabled",
            )
          }}
          aria-label={
            document.documentElement.classList.contains("dark") ? "Switch to light mode" : "Switch to dark mode"
          }
        >
          <Moon className="h-5 w-5 min-w-5 dark:hidden" />
          <Sun className="h-5 w-5 min-w-5 hidden dark:block" />
          {isOpen && <span>Dark Mode</span>}
        </Button>

        <Button
          variant="destructive"
          className="w-full mt-2 flex items-center justify-start gap-2 bg-red-600 transition-all duration-300"
          onClick={() => {
            post("/logout", {
              onSuccess: () => {
                // Clear any local storage items if needed
                localStorage.removeItem("sidebarState")
                localStorage.removeItem("theme")
                localStorage.removeItem("notes")
                // Redirect to login page
                window.location.href = "/login"
              },
              onError: () => {
                toast.error("Logout failed. Please try again.")
              },
            })
          }}
          aria-label="Log out"
        >
          <LogOut className="h-5 w-5 min-w-5" />
          {isOpen && <span>Log Out</span>}
        </Button>
      </div>
    </aside>
  )
}

export default function AppLayoutTemplate({ children }) {
  // Default to open sidebar on larger screens, closed on mobile
  const [isOpen, setIsOpen] = useState(() => {
    const savedState = localStorage.getItem("sidebarState")
    if (savedState) {
      return savedState === "open"
    }
    // Default to open on desktop, closed on mobile
    return window.innerWidth > 768
  })

  useEffect(() => {
    const theme = localStorage.getItem("theme")
    document.documentElement.classList.toggle("dark", theme === "dark")

    // Add responsive handling
    const handleResize = () => {
      if (window.innerWidth < 640 && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [isOpen])

  const toggleSidebar = () => {
    setIsOpen((prevState) => {
      const newState = !prevState
      localStorage.setItem("sidebarState", newState ? "open" : "closed") // Persist sidebar state
      return newState
    })
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={isOpen} toggleSidebar={toggleSidebar} />

      <main
        className={cn(
          "flex-1 min-h-screen bg-white dark:bg-black text-black dark:text-white transition-all duration-300 overflow-x-hidden",
          isOpen ? "ml-60" : "ml-20",
          "sm:ml-20 md:ml-60", // Responsive margins
        )}
      >
        {/* Mobile sidebar toggle button */}
        <button
          className="fixed top-4 left-4 z-40 md:hidden bg-white dark:bg-black p-2 rounded-md shadow-md"
          onClick={toggleSidebar}
          aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="p-6 pt-16 md:pt-6">{children}</div>
      </main>
    </div>
  )
}

