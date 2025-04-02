"use client"

import { useState, useEffect } from "react"
import { Link, usePage } from "@inertiajs/react"
import { LogOut, Moon, Sun, Menu, Home, Users, FileText, Calendar } from "lucide-react" // Import new icons
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useForm } from "@inertiajs/react"
import { toast } from "sonner" // Add this import

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { post } = useForm()
  const { url } = usePage() // Access current URL from Inertia

  // Helper function to check if the link is active
  const isActive = (path) => url === path

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-white text-black dark:bg-black dark:text-white transition-all duration-300",
        isOpen ? "w-60" : "w-20",
        isOpen ? "" : "", // Adjust width when collapsed
      )}
    >
      <div className="flex items-center justify-between px-4 py-5">
        <h1 className={cn("text-lg font-bold transition-all duration-100", !isOpen && "hidden")}>Aicom</h1>
        {/* Toggle Button Icon */}
        <Button variant="ghost" onClick={toggleSidebar}>
          <Menu className="w-6 h-6" />
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className="mt-5 space-y-2 px-4">
        <Link
          href="/dashboard"
          // Close the sidebar on link click
          className={cn(
            "block px-3 py-2 rounded transition-colors duration-200 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black",
            isActive("/dashboard") && "bg-black text-white dark:bg-white dark:text-black",
          )}
        >
          {isOpen ? "Dashboard" : <Home className="w-6 h-6" />} {/* Dashboard Icon */}
        </Link>
        <Link
          href="/employees"
          // Close the sidebar on link click
          className={cn(
            "block px-3 py-2 rounded transition-colors duration-200 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black",
            isActive("/employees") && "bg-black text-white dark:bg-white dark:text-black",
          )}
        >
          {isOpen ? "Employees" : <Users className="w-6 h-6" />} {/* Employees Icon */}
        </Link>
        <Link
          href="/payroll"
          // Close the sidebar on link click
          className={cn(
            "block px-3 py-2 rounded transition-colors duration-200 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black",
            isActive("/payroll") && "bg-black text-white dark:bg-white dark:text-black",
          )}
        >
          {isOpen ? "Payroll" : <FileText className="w-6 h-6" />} {/* Payroll Icon */}
        </Link>
        <Link
          href="/attendance"
          // Close the sidebar on link click
          className={cn(
            "block px-3 py-2 rounded transition-colors duration-200 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black",
            isActive("/attendance") && "bg-black text-white dark:bg-white dark:text-black",
          )}
        >
          {isOpen ? "Attendance" : <Calendar className="w-6 h-6" />} {/* Attendance Icon */}
        </Link>
      </nav>

      {/* Dark Mode and Logout Buttons */}
      <div className="absolute bottom-5 w-full px-4">
        <Button
          variant="ghost"
          className="w-full flex justify-between"
          onClick={() => {
            document.documentElement.classList.toggle("dark")
            localStorage.setItem("theme", document.documentElement.classList.contains("dark") ? "dark" : "light")
          }}
        >
          <span>{isOpen ? "Dark Mode" : ""}</span> {/* Removed hamburger icon */}
          <Moon className="h-5 w-5 dark:hidden" />
          <Sun className="h-5 w-5 hidden dark:block" />
        </Button>

        <Button
          variant="destructive"
          className="w-full mt-2 flex items-center justify-center gap-2 bg-red-600 transition-all duration-300"
          onClick={() => {
            post("/logout", {
              onSuccess: () => {
                // Clear any local storage items if needed
                localStorage.removeItem("sidebarState")
                localStorage.removeItem("theme")
                // Redirect to login page
                window.location.href = "/login"
              },
              onError: () => {
                toast.error("Logout failed. Please try again.")
              },
            })
          }}
          
        >
          <LogOut className="h-5 w-5" />
          {isOpen ? "Log Out" : ""} {/* Removed hamburger icon */}
        </Button>
      </div>
    </aside>
  )
}

export default function AppLayoutTemplate({ children }) {
  const [isOpen, setIsOpen] = useState(localStorage.getItem("sidebarState") === "open" ? true : false) // Persist state

  useEffect(() => {
    const theme = localStorage.getItem("theme")
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [])

  const toggleSidebar = () => {
    setIsOpen((prevState) => {
      const newState = !prevState
      localStorage.setItem("sidebarState", newState ? "open" : "closed") // Persist sidebar state
      return newState
    })
  }

  return (
    <div className="flex">
      {/* Sidebar Toggle Button (Always Visible) */}

      <Sidebar isOpen={isOpen} toggleSidebar={toggleSidebar} />

      <main
        className={cn(
          "flex-1 min-h-screen bg-white dark:bg-black text-black dark:text-white transition-all duration-300",
          isOpen ? "ml-64" : "ml-20",
        )}
      >
        {children}
      </main>
    </div>
  )
}

