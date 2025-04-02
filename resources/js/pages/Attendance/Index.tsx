"use client"

import { DialogFooter } from "@/components/ui/dialog"

import React from "react"

import { Head, router, usePage } from "@inertiajs/react"
import { useState, useEffect, useMemo, useCallback } from "react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowDownUp,
  Calendar,
  Filter,
  Plus,
  Search,
  Users,
  RefreshCw,
  FileSpreadsheet,
  Check,
  X,
  AlertCircle,
  Clock,
  Trash2,
} from "lucide-react"
import AddAttendanceModal from "./AddAttendanceModal"
import UpdateAttendanceModal from "./UpdateAttendanceModal"
import BulkAddAttendanceModal from "./BulkAddAttendanceModal"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { format, parseISO, isValid, addDays, subDays } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { debounce } from "lodash"

interface Attendance {
  id: number
  employee_id?: number
  employee_number: string
  full_name?: string
  date?: string
  work_date: string
  status: string
  daily_rate: number
  adjustment: number
  created_at: string | null
  updated_at: string | null
  time_in?: string
  time_out?: string
  notes?: string
}

interface Employee {
  id: number
  employee_number: string
  full_name: string
  daily_rate: number
  department?: string
  position?: string
}

interface PayrollPeriod {
  id: number
  period_start: string
  period_end: string
  payment_date: string
  status: string
  week_id?: number
}

interface AttendanceIndexProps {
  attendances?: {
    data: Attendance[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
    links: {
      url: string | null
      label: string
      active: boolean
    }[]
  }
  allAttendances?: Attendance[]
  employees?: Employee[]
  payrollPeriods?: PayrollPeriod[]
}

// Simple chart component using canvas
const SimpleChart = ({ data, labels, color = "#4f46e5" }) => {
  const canvasRef = React.useRef(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    const width = canvas.width
    const height = canvas.height
    const maxValue = Math.max(...data, 1) // Ensure we don't divide by zero
    const padding = 20

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw chart
    ctx.beginPath()
    ctx.moveTo(padding, height - padding - (data[0] / maxValue) * (height - 2 * padding))

    for (let i = 1; i < data.length; i++) {
      const x = padding + (i / (data.length - 1)) * (width - 2 * padding)
      const y = height - padding - (data[i] / maxValue) * (height - 2 * padding)
      ctx.lineTo(x, y)
    }

    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.stroke()

    // Fill area under the line
    ctx.lineTo(width - padding, height - padding)
    ctx.lineTo(padding, height - padding)
    ctx.closePath()
    ctx.fillStyle = `${color}20`
    ctx.fill()

    // Draw dots at data points
    for (let i = 0; i < data.length; i++) {
      const x = padding + (i / (labels.length - 1)) * (width - 2 * padding)
      const y = height - padding - (data[i] / maxValue) * (height - 2 * padding)

      ctx.beginPath()
      ctx.arc(x, y, 4, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.fill()
    }

    // Add labels if provided
    if (labels && labels.length === data.length) {
      ctx.textAlign = "center"
      ctx.fillStyle = "#6b7280"
      ctx.font = "10px sans-serif"

      for (let i = 0; i < labels.length; i++) {
        const x = padding + (i / (labels.length - 1)) * (width - 2 * padding)
        ctx.fillText(labels[i], x, height - 5)
      }
    }
  }, [data, labels, color])

  return <canvas ref={canvasRef} width={300} height={150} className="w-full h-auto" />
}

const AttendanceIndex = ({
  attendances = { data: [], current_page: 1, last_page: 1, per_page: 10, total: 0, from: null, to: null, links: [] },
  allAttendances = [],
  employees = [],
  payrollPeriods = [],
}: AttendanceIndexProps) => {
  // At the top of the component, add:
  const { filters } = usePage().props

  // Then in your useState initializations:
  const [searchTerm, setSearchTerm] = useState(filters?.search || "")
  const [statusFilter, setStatusFilter] = useState(filters?.status || null)
  const [dateFilter, setDateFilter] = useState(filters?.date || null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false)
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null)
  const [activeTab, setActiveTab] = useState<"all" | "daily" | "summary" | "analytics" | "period">("all")
  const [sortField, setSortField] = useState<string>("work_date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showGeneratePayrollDialog, setShowGeneratePayrollDialog] = useState(false)
  const [selectedPayrollPeriod, setSelectedPayrollPeriod] = useState<string>("")
  const [isGeneratingPayroll, setIsGeneratingPayroll] = useState(false)
  const [weeklyAttendanceData, setWeeklyAttendanceData] = useState([])
  const [weeklyLabels, setWeeklyLabels] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [draggedAttendance, setDraggedAttendance] = useState(null)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [overwriteExisting, setOverwriteExisting] = useState(false)
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)

  // New state for period view
  const [selectedPeriodForView, setSelectedPeriodForView] = useState<string>("")
  const [selectedEmployeeForView, setSelectedEmployeeForView] = useState<string>("all")
  const [periodAttendanceRecords, setPeriodAttendanceRecords] = useState<Attendance[]>([])
  const [isPeriodLoading, setIsPeriodLoading] = useState(false)

  // Edit attendance dialog
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editRecord, setEditRecord] = useState<Attendance | null>(null)

  // Bulk update dialog
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<string>("Present")
  const [bulkDate, setBulkDate] = useState<string>(new Date().toISOString().split("T")[0])

  // Date filters for different tabs
  const [summaryDateFilter, setSummaryDateFilter] = useState<string>(new Date().toISOString().split("T")[0])
  const [dailyViewDateFilter, setDailyViewDateFilter] = useState<string>("")
  const [analyticsDateRange, setAnalyticsDateRange] = useState<{
    startDate: string
    endDate: string
  }>(() => {
    const today = new Date()
    const oneWeekAgo = subDays(today, 6)
    return {
      startDate: oneWeekAgo.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
    }
  })
  const [periodDateFilter, setPeriodDateFilter] = useState<string>("")

  // Add these state variables near the top of the component with other state declarations
  const [staticWeeklyCompletion, setStaticWeeklyCompletion] = useState<number | null>(null)
  const [staticNextPayrollDate, setStaticNextPayrollDate] = useState<string | null>(null)

  // Add a new state variable for the current week date range
  const [currentWeekDateRange, setCurrentWeekDateRange] = useState<string>("")

  // Add this useEffect at the beginning of the component, right after the state declarations
  // This will ensure the weekly progress is calculated immediately when the component mounts
  useEffect(() => {
    // Calculate the current week date range
    const today = new Date()
    const newStartOfWeek = new Date(today)
    const newDay = newStartOfWeek.getDay()
    const newDiff = newStartOfWeek.getDate() - newDay + (newDay === 0 ? -6 : 1)
    newStartOfWeek.setDate(newDiff)
    newStartOfWeek.setHours(0, 0, 0, 0)

    // Calculate the end of the week (Sunday)
    const endOfWeek = new Date(newStartOfWeek)
    endOfWeek.setDate(newStartOfWeek.getDate() + 6)

    // Format the date range for display
    const startDateFormatted = format(newStartOfWeek, "MMM d")
    const endDateFormatted = format(endOfWeek, "MMM d, yyyy")
    const weekRangeText = `${startDateFormatted} - ${endDateFormatted}`

    // Set the week date range immediately
    setCurrentWeekDateRange(weekRangeText)

    // Calculate weekly completion immediately
    const completion = calculateWeeklyCompletionImmediate()
    if (staticWeeklyCompletion === null) {
      setStaticWeeklyCompletion(completion)
    }

    // Calculate next payroll date immediately
    if (staticNextPayrollDate === null) {
      setStaticNextPayrollDate(getNextPayrollDate())
    }
  }, [])

  // Add this function to calculate weekly completion immediately without depending on attendanceByDate
  const calculateWeeklyCompletionImmediate = () => {
    // Get current date
    const today = new Date()

    // Calculate the start of the current week (Monday)
    const newStartOfWeek = new Date(today)
    const newDay = newStartOfWeek.getDay()
    const newDiff = newStartOfWeek.getDate() - newDay + (newDay === 0 ? -6 : 1)
    newStartOfWeek.setDate(newDiff)
    newStartOfWeek.setHours(0, 0, 0, 0)

    // Calculate the end of the week (Sunday)
    const endOfWeek = new Date(newStartOfWeek)
    endOfWeek.setDate(newStartOfWeek.getDate() + 6)

    // Count days with attendance records
    let daysWithRecords = 0
    const currentDay = new Date(newStartOfWeek)

    // Use allAttendances instead of attendanceData to get all records across all pages
    const dataToUse = allAttendances.length > 0 ? allAttendances : attendanceData

    while (currentDay <= endOfWeek) {
      const dateString = currentDay.toISOString().split("T")[0]
      // Check if there are any attendance records for this date
      const hasRecordsForDate = dataToUse.some((a) => a.work_date === dateString || a.date === dateString)
      if (hasRecordsForDate) {
        daysWithRecords++
      }
      currentDay.setDate(currentDay.getDate() + 1)
    }

    // Calculate percentage (out of 7 days)
    return Math.round((daysWithRecords / 7) * 100)
  }

  // Use the date from URL params if available, otherwise use today's date
  useEffect(() => {
    // Get date from URL if it exists
    const urlParams = new URLSearchParams(window.location.search)
    const dateParam = urlParams.get("summaryDate")

    if (dateParam) {
      setSummaryDateFilter(dateParam)
    }
  }, [])

  // Add this effect to initialize the static values from URL parameters
  useEffect(() => {
    // Get date and weekly completion from URL if they exist
    const urlParams = new URLSearchParams(window.location.search)
    const dateParam = urlParams.get("summaryDate")
    const weeklyCompletionParam = urlParams.get("weeklyCompletion")
    const nextPayrollDateParam = urlParams.get("nextPayrollDate")
    const weekDateRangeParam = urlParams.get("weekDateRange")

    if (dateParam) {
      setSummaryDateFilter(dateParam)
    }

    // Calculate the weekly completion if not in URL or if it's 0
    const calculatedCompletion = calculateWeeklyCompletion()

    if (weeklyCompletionParam && Number.parseInt(weeklyCompletionParam) > 0) {
      setStaticWeeklyCompletion(Number.parseInt(weeklyCompletionParam))
    } else {
      // Initialize with current calculation if not in URL or if it's 0
      setStaticWeeklyCompletion(calculatedCompletion > 0 ? calculatedCompletion : null)
    }

    if (nextPayrollDateParam) {
      setStaticNextPayrollDate(decodeURIComponent(nextPayrollDateParam))
    } else {
      // Initialize with current calculation if not in URL
      setStaticNextPayrollDate(getNextPayrollDate())
    }

    if (weekDateRangeParam) {
      setCurrentWeekDateRange(decodeURIComponent(weekDateRangeParam))
    }
  }, [])

  // Use actual data
  const attendanceData = attendances.data || []

  // Debug function to check data
 

  // Generate weekly attendance data for analytics
  useEffect(() => {
    if (attendanceData.length > 0) {
      // Use the analytics date range for filtering
      const startDate = new Date(analyticsDateRange.startDate)
      const endDate = new Date(analyticsDateRange.endDate)

      // Calculate the number of days in the range
      const dayDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const numDays = Math.min(dayDiff, 14) // Limit to 14 days to avoid too many data points

      // Generate labels and data for the selected date range
      const labels = []
      const data = []

      for (let i = 0; i < numDays; i++) {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + i)

        // Format date as "Mon, DD"
        const dayLabel = format(date, "EEE, dd")
        labels.push(dayLabel)

        // Count present employees for this day
        const dateString = date.toISOString().split("T")[0]
        const presentCount = attendanceData.filter((a) => {
          const attendanceDate = a.work_date || a.date
          return attendanceDate === dateString && a.status === "Present"
        }).length

        // Calculate percentage if we have employees
        const percentage = employees.length > 0 ? (presentCount / employees.length) * 100 : 0

        data.push(percentage)
      }

      setWeeklyLabels(labels)
      setWeeklyAttendanceData(data)
    }
  }, [attendanceData, employees, analyticsDateRange])

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [attendanceData])

  const openAddModal = () => setIsAddModalOpen(true)
  const closeAddModal = () => setIsAddModalOpen(false)

  const openUpdateModal = (attendance: Attendance) => {
    setSelectedAttendance(attendance)
    setIsUpdateModalOpen(true)
  }
  const closeUpdateModal = () => {
    setSelectedAttendance(null)
    setIsUpdateModalOpen(false)
  }

  const openBulkAddModal = () => setIsBulkAddModalOpen(true)
  const closeBulkAddModal = () => setIsBulkAddModalOpen(false)
  const openBulkDeleteModal = () => setIsBulkDeleteModalOpen(true)
  const closeBulkDeleteModal = () => setIsBulkDeleteModalOpen(false)

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    try {
      const date = parseISO(dateString)
      if (!isValid(date)) return dateString
      return format(date, "EEE, MMM d, yyyy")
    } catch (e) {
      return dateString
    }
  }

  // Format time for display
  const formatTime = (timeString: string) => {
    if (!timeString) return ""
    try {
      // If it's a full ISO string, extract just the time part
      if (timeString.includes("T")) {
        const date = parseISO(timeString)
        if (!isValid(date)) return timeString
        return format(date, "h:mm a")
      }

      // If it's just a time string (HH:MM:SS)
      const [hours, minutes] = timeString.split(":").map(Number)
      const date = new Date()
      date.setHours(hours, minutes)
      return format(date, "h:mm a")
    } catch (e) {
      return timeString
    }
  }

  // Load attendance records for period view
  const loadPeriodAttendanceRecords = () => {
    if (!selectedPeriodForView) {
      setPeriodAttendanceRecords([])
      return
    }

    setIsPeriodLoading(true)

    const params: Record<string, string> = { period_id: selectedPeriodForView }
    if (selectedEmployeeForView && selectedEmployeeForView !== "all") {
      params.employee_id = selectedEmployeeForView
    }

    // Use the existing attendance data if it matches the criteria
    // In a real app, you would make an API call here
    const selectedPeriod = payrollPeriods.find((p) => p.id.toString() === selectedPeriodForView)

    if (selectedPeriod) {
      const periodStart = new Date(selectedPeriod.period_start)
      const periodEnd = new Date(selectedPeriod.period_end)

      const filteredRecords = attendanceData.filter((record) => {
        const recordDate = new Date(record.work_date || record.date)
        const matchesDate = recordDate >= periodStart && recordDate <= periodEnd

        // Apply additional date filter if set
        const matchesPeriodDateFilter = periodDateFilter
          ? record.work_date === periodDateFilter || record.date === periodDateFilter
          : true

        const matchesEmployee =
          selectedEmployeeForView === "all" ||
          record.employee_id?.toString() === selectedEmployeeForView ||
          employees.find((e) => e.employee_number === record.employee_number)?.id.toString() === selectedEmployeeForView

        return matchesDate && matchesEmployee && matchesPeriodDateFilter
      })

      setPeriodAttendanceRecords(filteredRecords)
      setIsPeriodLoading(false)
    } else {
      setPeriodAttendanceRecords([])
      setIsPeriodLoading(false)
    }
  }

  // Effect to load period records when selection changes
  useEffect(() => {
    if (activeTab === "period") {
      loadPeriodAttendanceRecords()
    }
  }, [selectedPeriodForView, selectedEmployeeForView, periodDateFilter, activeTab])

  const handleAddAttendance = (data: any) => {
    // Ensure we're using work_date instead of date
    const formattedData = {
      ...data,
      work_date: data.work_date || data.date,
    }

    // Remove date if it exists to avoid confusion
    if (formattedData.date) {
      delete formattedData.date
    }

    router.post("/attendance", formattedData, {
      preserveScroll: true, // Add this to prevent scrolling to top
      onSuccess: () => {
        toast.success("Attendance added successfully!")
        closeAddModal()
        refreshData()
      },
      onError: (errors) => {
        console.error("Add attendance errors:", errors)
        Object.values(errors).forEach((message) => {
          toast.error(`Error: ${message}`)
        })
      },
    })
  }

  const handleUpdateAttendance = (data: any) => {
    // Ensure we're using work_date instead of date
    const formattedData = {
      ...data,
      work_date: data.work_date || data.date,
    }

    // Remove date if it exists to avoid confusion
    if (formattedData.date) {
      delete formattedData.date
    }

    router.put(`/attendance/${data.id}`, formattedData, {
      preserveScroll: true, // Add this to prevent scrolling to top
      onSuccess: () => {
        toast.success("Attendance updated successfully!")
        closeUpdateModal()
        refreshData()
      },
      onError: (errors) => {
        console.error("Update attendance errors:", errors)
        Object.values(errors).forEach((message) => {
          toast.error(`Error: ${message}`)
        })
      },
    })
  }

  const handleDeleteAttendance = (id: number) => {
    if (confirm("Are you sure you want to delete this attendance record?")) {
      router.delete(`/attendance/${id}`, {
        preserveScroll: true, // Add this to prevent scrolling to top
        onSuccess: () => {
          toast.success("Attendance deleted successfully!")
          refreshData()
        },
        onError: (errors) => {
          console.error("Delete attendance errors:", errors)
          Object.values(errors).forEach((message) => {
            toast.error(`Error: ${message}`)
          })
        },
      })
    }
  }

  const handleBulkAddFile = (file: File) => {
    const formData = new FormData()
    formData.append("file", file)

    router.post("/attendance/bulk-upload", formData, {
      preserveScroll: true, // Add this to prevent scrolling to top
      onSuccess: () => {
        toast.success("Attendance records uploaded successfully!")
        closeBulkAddModal()
        refreshData()
      },
      onError: (errors) => {
        console.error("Bulk upload errors:", errors)
        Object.values(errors).forEach((message) => {
          toast.error(`Error: ${message}`)
        })
      },
    })
  }

  const handleBulkAddManual = (date: string, employeeNumbers: string[], status: string) => {
    router.post(
      "/attendance/bulk",
      { work_date: date, employee_numbers: employeeNumbers, status },
      {
        preserveScroll: true, // Add this to prevent scrolling to top
        onSuccess: () => {
          toast.success("Attendance records added successfully!")
          closeBulkAddModal()
          refreshData()
        },
        onError: (errors) => {
          console.error("Bulk add errors:", errors)
          Object.values(errors).forEach((message) => {
            toast.error(`Error: ${message}`)
          })
        },
      },
    )
  }

  // Handle edit record
  const handleEditRecord = (record: Attendance) => {
    setEditRecord({ ...record })
    setShowEditDialog(true)
  }

  // Save edited record
  const saveEditedRecord = () => {
    if (!editRecord) return

    handleUpdateAttendance(editRecord)
    setShowEditDialog(false)
  }

  // Handle bulk update with validation
  const handleBulkUpdate = () => {
    // Validate date
    if (!bulkDate) {
      toast.error("Please select a date")
      return
    }

    // Validate date is not in the future
    const selectedDate = new Date(bulkDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate > today) {
      toast.error("Cannot set attendance for future dates")
      return
    }

    // Validate status
    if (!bulkStatus) {
      toast.error("Please select a status")
      return
    }

    // Confirm before updating
    const employeeText = selectedEmployeeForView !== "all" ? "the selected employee" : "all employees"

    if (
      !confirm(
        `Are you sure you want to update attendance status to "${bulkStatus}" for ${employeeText} on ${bulkDate}?`,
      )
    ) {
      return
    }

    router.post(
      "/attendance/bulk-update",
      {
        date: bulkDate,
        status: bulkStatus,
        employee_id: selectedEmployeeForView !== "all" ? selectedEmployeeForView : undefined,
      },
      {
        preserveScroll: true, // Add this to prevent scrolling to top
        onSuccess: () => {
          toast.success("Attendance records updated successfully!")
          setShowBulkDialog(false)
          refreshData()
        },
        onError: (errors) => {
          if (typeof errors === "object" && errors !== null) {
            Object.values(errors).forEach((message) => {
              toast.error(`Error: ${message}`)
            })
          } else {
            toast.error("Failed to update attendance records")
          }
          console.error(errors)
        },
      },
    )
  }

  // Generate payroll from attendance
  const handleGeneratePayroll = () => {
    if (!selectedPayrollPeriod) {
      // Auto-select the first period if none is selected but periods exist
      if (payrollPeriods.length > 0) {
        setSelectedPayrollPeriod(payrollPeriods[0].id.toString())
      } else {
        toast.error("Please select a payroll period")
        return
      }
    }

    setIsGeneratingPayroll(true)

    // Use the existing payroll period data
    const selectedPeriodData = payrollPeriods.find((p) => p.id.toString() === selectedPayrollPeriod)

    // Debug the payload being sent
    const payload = {
      payroll_period_id: selectedPayrollPeriod,
      week_id: selectedPeriodData?.week_id,
      include_daily_rates: true,
      respect_attendance_status: true,
      overwrite_existing: overwriteExisting,
    }

    console.log("Generating payroll with payload:", payload)

    // Use Inertia.js post instead of axios
    router.post("/payroll/generate-from-attendance", payload, {
      preserveScroll: true,
      onSuccess: (page) => {
        console.log("Payroll generation successful", page)
        toast.success("Payroll generated successfully!")
        setShowGeneratePayrollDialog(false)
        setSelectedPayrollPeriod("")
        setOverwriteExisting(false)

        // Redirect to payroll page to see the generated entries
        router.visit(`/payroll?period=${selectedPayrollPeriod}`)
      },
      onError: (errors) => {
        console.error("Generate payroll error:", errors)

        // Handle validation errors
        if (errors.message) {
          toast.error(`Error: ${errors.message}`)
        } else {
          Object.values(errors).forEach((message) => {
            toast.error(`Error: ${message}`)
          })
        }

        setIsGeneratingPayroll(false)
      },
    })
  }

  // Handle drag start for attendance status
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, attendance: any) => {
    setIsDragging(true)
    setDraggedAttendance(attendance)
    e.dataTransfer.setData("text/plain", JSON.stringify(attendance))
    e.dataTransfer.effectAllowed = "move"
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  // Handle drop for changing attendance status
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: string) => {
    e.preventDefault()
    setIsDragging(false)

    if (draggedAttendance) {
      const updatedAttendance = {
        ...draggedAttendance,
        status: newStatus,
      }

      handleUpdateAttendance(updatedAttendance)
      setDraggedAttendance(null)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Present":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
      case "Absent":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
      case "Day Off":
        return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800"
      case "Holiday":
        return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800"
      case "Half Day":
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
      case "Leave":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800"
      case "WFH":
        return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
      case "SP":
        return "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-400 dark:border-yellow-800"
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Present":
        return <Check className="h-4 w-4 text-green-500" />
      case "Absent":
        return <X className="h-4 w-4 text-red-500" />
      case "Half Day":
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      case "Day Off":
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  // Export to CSV - Fixed to use the correct endpoint
  const exportToExcel = () => {
    toast.success("Preparing attendance data export...")

    // Use a direct download approach with the correct URL
    window.location.href = "/attendance/export"
  }

  // Replace the existing calculatePayAmount function with this updated version
  // that implements the specified calculations for different attendance statuses

  // Calculate pay amount based on status and daily rate
  const calculatePayAmount = (record: Attendance) => {
    const dailyRate = Number.parseFloat(record.daily_rate?.toString() || "0") || 0

    switch (record.status) {
      case "Present":
        return dailyRate * 1 // Present * 1
      case "Absent":
        return dailyRate * 0 // Absent * 0
      case "Day Off":
        return dailyRate * 0 // Day Off * 0
      case "Half Day":
        return dailyRate / 2 // Half Day / 2
      case "Holiday":
        // For simplicity, we'll use the higher rate (special holiday)
        // In a real implementation, you might want to add a field to distinguish between regular and special holidays
        return dailyRate * 2 // Special holiday * 2
      // Uncomment the following for regular holiday calculation
      // return dailyRate * 1.3
      case "Leave":
        return dailyRate * 0 // Leave * 0
      case "WFH":
        return dailyRate * 1 // WFH * 1
      case "SP":
        return dailyRate * 1 // SP * 1
      default:
        return 0
    }
  }

  // Filter and sort attendances
  const filteredAttendances = useMemo(() => {
    return (attendances.data || [])
      .filter((attendance) => {
        const matchesSearch =
          attendance.employee_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (attendance.full_name && attendance.full_name.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesStatus = statusFilter ? attendance.status === statusFilter : true

        // Make sure we're using work_date consistently
        const attendanceDate = attendance.work_date
        const matchesDate = dateFilter ? attendanceDate === dateFilter : true

        return matchesSearch && matchesStatus && matchesDate
      })
      .sort((a, b) => {
        let aValue = a[sortField]
        let bValue = b[sortField]

        // Handle numeric fields
        if (["daily_rate", "adjustment"].includes(sortField)) {
          aValue = Number.parseFloat(aValue)
          bValue = Number.parseFloat(bValue)
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
        return 0
      })
  }, [attendances.data, searchTerm, statusFilter, dateFilter, sortField, sortDirection])

  // Toggle sort
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Handle search and filter
  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    debouncedSearch(e.target.value)
  }

  const debouncedSearch = useCallback(
    debounce((value) => {
      router.get("/attendance", { search: value, status: statusFilter, date: dateFilter }, { preserveScroll: true })
    }, 500),
    [statusFilter, dateFilter],
  )

  const handleStatusFilter = (value) => {
    setStatusFilter(value || null)
    router.get("/attendance", { search: searchTerm, status: value || null, date: dateFilter }, { preserveScroll: true })
  }

  const handleDateFilter = (value) => {
    setDateFilter(value || null)
    router.get(
      "/attendance",
      { search: searchTerm, status: statusFilter, date: value || null },
      { preserveScroll: true },
    )
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter(null)
    setDateFilter(null)
    router.get("/attendance", {}, { preserveScroll: true })
  }

  // Modify the refreshData function to preserve the static values
  const refreshData = () => {
    setIsRefreshing(true)

    // Save current values before refresh
    const calculatedCompletion = calculateWeeklyCompletion()
    const currentWeeklyCompletion = staticWeeklyCompletion || calculatedCompletion
    const currentNextPayrollDate = staticNextPayrollDate || getNextPayrollDate()
    const weekDateRange = currentWeekDateRange

    // Update URL with all static values
    const url = new URL(window.location)
    if (summaryDateFilter) {
      url.searchParams.set("summaryDate", summaryDateFilter)
    }
    url.searchParams.set("weeklyCompletion", currentWeeklyCompletion.toString())
    url.searchParams.set("nextPayrollDate", encodeURIComponent(currentNextPayrollDate))
    url.searchParams.set("weekDateRange", encodeURIComponent(weekDateRange))
    window.history.pushState({}, "", url)

    router.reload({
      preserveScroll: true,
      onSuccess: () => {
        setIsRefreshing(false)
        // Restore static values after refresh
        setStaticWeeklyCompletion(currentWeeklyCompletion)
        setStaticNextPayrollDate(currentNextPayrollDate)
        setCurrentWeekDateRange(weekDateRange)
      },
      onError: () => {
        setIsRefreshing(false)
        toast.error("Failed to refresh data")
      },
    })
  }

  // Update the calculateSummary function to include all status types
  const calculateSummary = () => {
    // Use allAttendances prop when available, otherwise fall back to the current page data
    const dataToUse = allAttendances.length > 0 ? allAttendances : attendanceData

    // Filter attendance records by the selected date if a date is selected
    const filteredByDate = summaryDateFilter ? dataToUse.filter((a) => a.work_date === summaryDateFilter) : dataToUse

    let totalDailyRate = 0
    let totalAdjustments = 0
    let totalPayAmount = 0

    // Ensure we're working with numbers
    filteredByDate.forEach((a) => {
      // Convert to number and default to 0 if NaN
      const dailyRate = Number.parseFloat(a.daily_rate?.toString() || "0") || 0
      const adjustment = Number.parseFloat(a.adjustment?.toString() || "0") || 0
      const payAmount = calculatePayAmount(a)

      totalDailyRate += dailyRate
      totalAdjustments += adjustment
      totalPayAmount += payAmount
    })

    // Calculate today's attendance counts
    const today = new Date().toISOString().split("T")[0]
    const todayRecords = dataToUse.filter((a) => a.work_date === today)
    const todayPresentCount = todayRecords.filter((a) => a.status === "Present").length
    const todayAbsentCount = todayRecords.filter((a) => a.status === "Absent").length
    const todayTotal = todayRecords.length

    return {
      totalRecords: filteredByDate.length,
      presentCount: filteredByDate.filter((a) => a.status === "Present").length,
      absentCount: filteredByDate.filter((a) => a.status === "Absent").length,
      dayOffCount: filteredByDate.filter((a) => a.status === "Day Off").length,
      halfDayCount: filteredByDate.filter((a) => a.status === "Half Day").length,
      wfhCount: filteredByDate.filter((a) => a.status === "WFH").length,
      leaveCount: filteredByDate.filter((a) => a.status === "Leave").length,
      holidayCount: filteredByDate.filter((a) => a.status === "Holiday").length,
      spCount: filteredByDate.filter((a) => a.status === "SP").length,
      totalDailyRate: totalDailyRate,
      totalAdjustments: totalAdjustments,
      totalPayAmount: totalPayAmount,
      todayPresentCount: todayPresentCount,
      todayAbsentCount,
      todayTotal: todayTotal,
    }
  }

  // Get the attendance summary
  const attendanceSummary = calculateSummary()

  // Group attendance by date for daily view
  const attendanceByDate = useMemo(() => {
    const grouped = {}
    attendanceData.forEach((attendance) => {
      const dateKey = attendance.work_date
      if (!dateKey) return

      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(attendance)
    })
    return grouped
  }, [attendanceData])

  // Filter daily view by date
  const filteredAttendanceByDate = useMemo(() => {
    if (!dailyViewDateFilter) {
      return attendanceByDate
    }

    // If date filter is set, only return that specific date
    const filtered = {}
    if (attendanceByDate[dailyViewDateFilter]) {
      filtered[dailyViewDateFilter] = attendanceByDate[dailyViewDateFilter]
    }
    return filtered
  }, [attendanceByDate, dailyViewDateFilter])

  // Modify the calculateWeeklyCompletion function to also set the current week date range
  const calculateWeeklyCompletion = () => {
    // Get current date
    const today = new Date()

    // Calculate the start of the current week (Monday)
    const startOfWeek = new Date(today)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    // Calculate the start of the current week (Monday)
    const newStartOfWeek = new Date(today)
    const newDay = newStartOfWeek.getDay()
    const newDiff = newStartOfWeek.getDate() - newDay + (newDay === 0 ? -6 : 1)
    newStartOfWeek.setDate(newDiff)
    newStartOfWeek.setHours(0, 0, 0, 0)

    // Calculate the end of the week (Sunday)
    const endOfWeek = new Date(newStartOfWeek)
    endOfWeek.setDate(newStartOfWeek.getDate() + 6)

    // Format the date range for display
    const startDateFormatted = format(newStartOfWeek, "MMM d")
    const endDateFormatted = format(endOfWeek, "MMM d, yyyy")
    const weekRangeText = `${startDateFormatted} - ${endDateFormatted}`

    // Remove or comment out this line in the calculateWeeklyCompletion function
    // setCurrentWeekDateRange(weekRangeText)

    // Use allAttendances instead of attendanceByDate to get all records across all pages
    const dataToUse = allAttendances.length > 0 ? allAttendances : attendanceData

    // Count days with attendance records
    let daysWithRecords = 0
    const currentDay = new Date(newStartOfWeek)

    while (currentDay <= endOfWeek) {
      const dateString = currentDay.toISOString().split("T")[0]
      // Check if there are any attendance records for this date
      const hasRecordsForDate = dataToUse.some((a) => a.work_date === dateString || a.date === dateString)
      if (hasRecordsForDate) {
        daysWithRecords++
      }
      currentDay.setDate(currentDay.getDate() + 1)
    }

    // Calculate percentage (out of 7 days)
    return Math.round((daysWithRecords / 7) * 100)
  }

  // Add this useEffect after the other useEffect hooks

  // Get next payroll date
  const getNextPayrollDate = () => {
    // Find the next upcoming payroll period
    const today = new Date()
    const upcomingPeriods = payrollPeriods
      .filter((period) => new Date(period.payment_date) > today)
      .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())

    if (upcomingPeriods.length > 0) {
      return new Date(upcomingPeriods[0].payment_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    }

    return "No upcoming payroll dates"
  }

  // Set analytics date range to previous week
  const setPreviousWeek = () => {
    const startDate = new Date(analyticsDateRange.startDate)
    const endDate = new Date(analyticsDateRange.endDate)

    const newStartDate = subDays(startDate, 7)
    const newEndDate = subDays(endDate, 7)

    setAnalyticsDateRange({
      startDate: newStartDate.toISOString().split("T")[0],
      endDate: newEndDate.toISOString().split("T")[0],
    })
  }

  // Set analytics date range to next week
  const setNextWeek = () => {
    const startDate = new Date(analyticsDateRange.startDate)
    const endDate = new Date(analyticsDateRange.endDate)

    const newStartDate = addDays(startDate, 7)
    const newEndDate = addDays(endDate, 7)

    // Don't allow future dates beyond today
    const today = new Date()
    if (newEndDate > today) {
      return
    }

    setAnalyticsDateRange({
      startDate: newStartDate.toISOString().split("T")[0],
      endDate: newEndDate.toISOString().split("T")[0],
    })
  }

  // Set analytics date range to current week
  const setCurrentWeek = () => {
    const today = new Date()
    const oneWeekAgo = subDays(today, 6)

    setAnalyticsDateRange({
      startDate: oneWeekAgo.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
    })
  }

  // Function to add sample attendance data for testing
  const addSampleData = () => {
    if (employees.length === 0) {
      toast.error("No employees found. Please add employees first.")
      return
    }

    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    const todayStr = today.toISOString().split("T")[0]
    const yesterdayStr = yesterday.toISOString().split("T")[0]

    const sampleData = employees.slice(0, 3).map((employee) => ({
      employee_number: employee.employee_number,
      work_date: todayStr,
      daily_rate: employee.daily_rate,
      adjustment: 0,
      status: "Present",
    }))

    // Add some data for yesterday too
    const yesterdayData = employees.slice(0, 3).map((employee) => ({
      employee_number: employee.employee_number,
      work_date: yesterdayStr,
      daily_rate: employee.daily_rate,
      adjustment: 0,
      status: Math.random() > 0.3 ? "Present" : "Absent",
    }))

    // Combine the data
    const allSampleData = [...sampleData, ...yesterdayData]

    // Add each record individually
    let successCount = 0
    let errorCount = 0

    const addRecord = (index) => {
      if (index >= allSampleData.length) {
        toast.success(`Added ${successCount} sample attendance records with ${errorCount} errors.`)
        refreshData()
        return
      }

      router.post("/attendance", allSampleData[index], {
        onSuccess: () => {
          successCount++
          addRecord(index + 1)
        },
        onError: (errors) => {
          console.error("Error adding sample data:", errors)
          errorCount++
          addRecord(index + 1)
        },
      })
    }

    addRecord(0)
  }

  // Modify the setSummaryDateFilter function to update URL when date changes
  const updateSummaryDateFilter = (date) => {
    setSummaryDateFilter(date)

    // Update URL with the new date parameter without reloading the page
    const url = new URL(window.location)
    if (date) {
      url.searchParams.set("summaryDate", date)
    } else {
      url.searchParams.delete("summaryDate")
    }

    // Preserve weekly completion and next payroll date
    const calculatedCompletion = calculateWeeklyCompletion()
    const currentWeeklyCompletion = staticWeeklyCompletion || calculatedCompletion
    const currentNextPayrollDate = staticNextPayrollDate || getNextPayrollDate()

    url.searchParams.set("weeklyCompletion", currentWeeklyCompletion.toString())
    url.searchParams.set("nextPayrollDate", encodeURIComponent(currentNextPayrollDate))
    url.searchParams.set("weekDateRange", encodeURIComponent(currentWeekDateRange))

    window.history.pushState({}, "", url)
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Attendance", href: "/attendance" },
      ]}
    >
      <div className="flex-1 p-6 bg-white text-black dark:bg-black dark:text-white transition-colors duration-300">
        <Head title="Attendance" />

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Attendance Management</h1>
            <p className="text-slate-600 dark:text-slate-400">Track and manage employee attendance records</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <Button
              variant="outline"
              onClick={openAddModal}
              className="border-indigo-200 text-indigo-600 hover:border-indigo-300 dark:border-indigo-800 dark:text-indigo-400 dark:hover:border-indigo-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Record
            </Button>
            <Button onClick={openBulkAddModal} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Users className="h-4 w-4 mr-1" />
              Bulk Add
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowBulkDialog(true)}
              className="border-amber-200 text-amber-600 hover:border-amber-300 dark:border-amber-800 dark:text-amber-400 dark:hover:border-amber-700"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Bulk Update
            </Button>
            {/* Generate Payroll button removed */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                    onClick={exportToExcel}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export to Excel</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                    onClick={refreshData}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh Data</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="outline"
              onClick={openBulkDeleteModal}
              className="border-red-200 text-red-600 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:border-red-700"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Bulk Delete
            </Button>
          </div>
        </div>

        {/* Weekly Attendance Progress */}
        <Card className="p-5 border border-slate-200 dark:border-slate-700 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-1">Weekly Attendance Progress</h2>
              <p className="text-slate-600 dark:text-slate-400">
                {staticWeeklyCompletion !== null ? staticWeeklyCompletion : calculateWeeklyCompletion()}% complete for
                current week
                {currentWeekDateRange && <span className="ml-1">({currentWeekDateRange})</span>}
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Next payroll date:{" "}
                <span className="font-medium text-indigo-600 dark:text-indigo-400">
                  {staticNextPayrollDate || getNextPayrollDate()}
                </span>
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Progress
              value={staticWeeklyCompletion !== null ? staticWeeklyCompletion : calculateWeeklyCompletion()}
              className="h-2 bg-slate-100 dark:bg-slate-700"
              indicatorClassName="bg-indigo-500"
            />
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Present */}
          <Card className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Present</p>
                <p className="text-2xl font-bold mt-1 text-black dark:text-white transition-colors group-hover:text-green-600 dark:group-hover:text-green-500">
                  {attendanceSummary.presentCount}
                </p>
                <p className="text-xs text-green-500 mt-1 transition-colors group-hover:text-green-600 dark:group-hover:text-green-400">
                  {attendanceSummary.totalRecords > 0
                    ? Math.round((attendanceSummary.presentCount / attendanceSummary.totalRecords) * 100)
                    : 0}
                  % of total
                </p>
              </div>
              <div
                className="p-2 rounded-full bg-green-50 text-green-500 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 
                  group-hover:bg-green-100 dark:group-hover:bg-green-800/30 transition-colors"
              >
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </Card>

          {/* Absent */}
          <Card className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Absent</p>
                <p className="text-2xl font-bold mt-1 group-hover:text-red-600 dark:group-hover:text-red-500">
                  {attendanceSummary.absentCount}
                </p>
                <p className="text-xs text-red-500 mt-1 transition-colors group-hover:text-red-600 dark:group-hover:text-red-400">
                  {attendanceSummary.totalRecords > 0
                    ? Math.round((attendanceSummary.absentCount / attendanceSummary.totalRecords) * 100)
                    : 0}
                  % of total
                </p>
              </div>
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/20 text-red-500 group-hover:bg-red-200 dark:group-hover:bg-red-800/30 transition-colors">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </Card>

          {/* Day Off */}
          <Card className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Day Off</p>
                <p className="text-2xl font-bold mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-500">
                  {attendanceSummary.dayOffCount}
                </p>
                <p className="text-xs text-blue-500 mt-1 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {attendanceSummary.totalRecords > 0
                    ? Math.round((attendanceSummary.dayOffCount / attendanceSummary.totalRecords) * 100)
                    : 0}
                  % of total
                </p>
              </div>
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-500 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/30 transition-colors">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </Card>

          {/* Half Day */}
          <Card className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Half Day</p>
                <p className="text-2xl font-bold mt-1 group-hover:text-orange-600 dark:group-hover:text-orange-500">
                  {attendanceSummary.halfDayCount}
                </p>
                <p className="text-xs text-orange-500 mt-1 transition-colors group-hover:text-orange-600 dark:group-hover:text-orange-400">
                  {attendanceSummary.totalRecords > 0
                    ? Math.round((attendanceSummary.halfDayCount / attendanceSummary.totalRecords) * 100)
                    : 0}
                  % of total
                </p>
              </div>
              <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-500 group-hover:bg-orange-200 dark:group-hover:bg-orange-800/30 transition-colors">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </Card>

          {/* Work From Home (WFH) */}
          <Card className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Work From Home</p>
                <p className="text-2xl font-bold mt-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-500">
                  {attendanceSummary.wfhCount}
                </p>
                <p className="text-xs text-indigo-500 mt-1 transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {attendanceSummary.totalRecords > 0
                    ? Math.round((attendanceSummary.wfhCount / attendanceSummary.totalRecords) * 100)
                    : 0}
                  % of total
                </p>
              </div>
              <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/20 text-indigo-500 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/30 transition-colors">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </Card>
          {/* Holiday */}
          <Card className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Holiday</p>
                <p className="text-2xl font-bold mt-1 group-hover:text-purple-600 dark:group-hover:text-purple-500">
                  {attendanceSummary.holidayCount}
                </p>
                <p className="text-xs text-purple-500 mt-1 transition-colors group-hover:text-purple-600 dark:group-hover:text-purple-400">
                  {attendanceSummary.totalRecords > 0
                    ? Math.round((attendanceSummary.holidayCount / attendanceSummary.totalRecords) * 100)
                    : 0}
                  % of total
                </p>
              </div>
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-500 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/30 transition-colors">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </Card>

          {/* Leave */}
          <Card className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Leave</p>
                <p className="text-2xl font-bold mt-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-500">
                  {attendanceSummary.leaveCount}
                </p>
                <p className="text-xs text-cyan-500 mt-1 transition-colors group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                  {attendanceSummary.totalRecords > 0
                    ? Math.round((attendanceSummary.leaveCount / attendanceSummary.totalRecords) * 100)
                    : 0}
                  % of total
                </p>
              </div>
              <div className="p-2 rounded-full bg-cyan-100 dark:bg-cyan-900/20 text-cyan-500 group-hover:bg-cyan-200 dark:group-hover:bg-cyan-800/30 transition-colors">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </Card>

          {/* Special Project (SP) */}
          <Card className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Special Project</p>
                <p className="text-2xl font-bold mt-1 group-hover:text-pink-600 dark:group-hover:text-pink-500">
                  {attendanceSummary.spCount}
                </p>
                <p className="text-xs text-pink-500 mt-1 transition-colors group-hover:text-pink-600 dark:group-hover:text-pink-400">
                  {attendanceSummary.totalRecords > 0
                    ? Math.round((attendanceSummary.spCount / attendanceSummary.totalRecords) * 100)
                    : 0}
                  % of total
                </p>
              </div>
              <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/20 text-pink-500 group-hover:bg-pink-200 dark:group-hover:bg-pink-800/30 transition-colors">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Search & Filter Section */}
        <Card className="p-4 mb-6 border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by employee name or number..."
                className="pl-10 p-2 w-full border rounded bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="p-2 border rounded bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                value={statusFilter ?? ""}
                onChange={(e) => handleStatusFilter(e.target.value)}
              >
                <option value="">Status</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Day Off">Day Off</option>
                <option value="Holiday">Holiday</option>
                <option value="Half Day">Half Day</option>
                <option value="Leave">Leave</option>
              </select>
              <input
                type="date"
                className="p-2 border rounded bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                value={dateFilter ?? ""}
                onChange={(e) => handleDateFilter(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={clearFilters}
                className="border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
              >
                <Filter className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>

        {/* Drag and Drop Status Zones */}
        <div className="grid grid-cols-1 md:grid-cols-8 gap-4 mb-6">
          {/* Present */}
          <div
            className={`p-4 rounded-lg border-2 border-dashed ${
              isDragging
                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                : "border-slate-200 dark:border-slate-700"
            }`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "Present")}
          >
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
              <h3 className="font-medium text-green-600 dark:text-green-400">Present</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag and drop attendance records here to mark as Present
            </p>
          </div>

          {/* Absent */}
          <div
            className={`p-4 rounded-lg border-2 border-dashed ${
              isDragging ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "border-slate-200 dark:border-slate-700"
            }`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "Absent")}
          >
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
              <h3 className="font-medium text-red-600 dark:text-red-400">Absent</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag and drop attendance records here to mark as Absent
            </p>
          </div>

          {/* Day Off */}
          <div
            className={`p-4 rounded-lg border-2 border-dashed ${
              isDragging ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20" : "border-slate-200 dark:border-slate-700"
            }`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "Day Off")}
          >
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 rounded-full bg-sky-500 mr-2"></div>
              <h3 className="font-medium text-sky-600 dark:text-sky-400">Day Off</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag and drop attendance records here to mark as Day Off
            </p>
          </div>

          {/* Half Day */}
          <div
            className={`p-4 rounded-lg border-2 border-dashed ${
              isDragging
                ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                : "border-slate-200 dark:border-slate-700"
            }`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "Half Day")}
          >
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
              <h3 className="font-medium text-orange-600 dark:text-orange-400">Half Day</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag and drop attendance records here to mark as Half Day
            </p>
          </div>

          {/* Holiday */}
          <div
            className={`p-4 rounded-lg border-2 border-dashed ${
              isDragging
                ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                : "border-slate-200 dark:border-slate-700"
            }`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "Holiday")}
          >
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 rounded-full bg-violet-500 mr-2"></div>
              <h3 className="font-medium text-violet-600 dark:text-violet-400">Holiday</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag and drop attendance records here to mark as Holiday
            </p>
          </div>

          {/* Vacation Leave */}
          <div
            className={`p-4 rounded-lg border-2 border-dashed ${
              isDragging ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20" : "border-slate-200 dark:border-slate-700"
            }`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "Leave")}
          >
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500 mr-2"></div>
              <h3 className="font-medium text-cyan-600 dark:text-cyan-400">Leave</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag and drop attendance records here to mark as Leave
            </p>
          </div>

          {/* Work From Home */}
          <div
            className={`p-4 rounded-lg border-2 border-dashed ${
              isDragging
                ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                : "border-slate-200 dark:border-slate-700"
            }`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "WFH")}
          >
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
              <h3 className="font-medium text-yellow-600 dark:text-yellow-400">WFH</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag and drop attendance records here to mark as Work From Home
            </p>
          </div>
          {/* Special Project */}
          <div
            className={`p-4 rounded-lg border-2 border-dashed ${
              isDragging ? "border-pink-500 bg-pink-50 dark:bg-pink-900/20" : "border-slate-200 dark:border-slate-700"
            }`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "SP")}
          >
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 rounded-full bg-pink-500 mr-2"></div>
              <h3 className="font-medium text-pink-600 dark:text-pink-400">SP</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag and drop attendance records here to mark as Special Project
            </p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs defaultValue="all" className="mb-6" value={activeTab} onValueChange={setActiveTab as any}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Records</TabsTrigger>
            <TabsTrigger value="daily">Daily View</TabsTrigger>
            <TabsTrigger value="period">Period View</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-auto rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <tr>
                        <th
                          className="py-3 px-4 text-left font-semibold cursor-pointer"
                          onClick={() => toggleSort("id")}
                        >
                          <div className="flex items-center">
                            ID
                            {sortField === "id" && (
                              <ArrowDownUp className={`ml-1 h-3 w-3 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                            )}
                          </div>
                        </th>
                        <th className="py-3 px-4 text-left font-semibold">Emp #</th>
                        <th
                          className="py-3 px-4 text-left font-semibold cursor-pointer"
                          onClick={() => toggleSort("full_name")}
                        >
                          <div className="flex items-center">
                            Full Name
                            {sortField === "full_name" && (
                              <ArrowDownUp className={`ml-1 h-3 w-3 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                            )}
                          </div>
                        </th>
                        <th
                          className="py-3 px-4 text-left font-semibold cursor-pointer"
                          onClick={() => toggleSort("work_date")}
                        >
                          <div className="flex items-center">
                            Date
                            {sortField === "work_date" && (
                              <ArrowDownUp className={`ml-1 h-3 w-3 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                            )}
                          </div>
                        </th>
                        <th className="py-3 px-4 text-left font-semibold">Status</th>
                        <th
                          className="py-3 px-4 text-left font-semibold cursor-pointer"
                          onClick={() => toggleSort("daily_rate")}
                        >
                          <div className="flex items-center">
                            Daily Rate
                            {sortField === "daily_rate" && (
                              <ArrowDownUp className={`ml-1 h-3 w-3 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                            )}
                          </div>
                        </th>
                        <th className="py-3 px-4 text-left font-semibold">Pay Amount</th>
                        <th
                          className="py-3 px-4 text-left font-semibold cursor-pointer"
                          onClick={() => toggleSort("adjustment")}
                        >
                          <div className="flex items-center">
                            Adjustment
                            {sortField === "adjustment" && (
                              <ArrowDownUp className={`ml-1 h-3 w-3 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                            )}
                          </div>
                        </th>
                        <th className="py-3 px-4 text-left font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendances.data.length > 0 ? (
                        attendances.data.map((attendance) => {
                          const payAmount = calculatePayAmount(attendance)

                          return (
                            <tr
                              key={attendance.id}
                              className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              draggable
                              onDragStart={(e) => handleDragStart(e, attendance)}
                            >
                              <td className="py-3 px-4 font-medium">#{attendance.id}</td>
                              <td className="py-3 px-4">{attendance.employee_number}</td>
                              <td className="py-3 px-4">{attendance.full_name || "N/A"}</td>
                              <td className="py-3 px-4">{formatDate(attendance.work_date || attendance.date)}</td>
                              <td className="py-3 px-4">
                                <Badge className={getStatusBadgeColor(attendance.status)}>{attendance.status}</Badge>
                              </td>
                              <td className="py-3 px-4">
                                ₱{Number.parseFloat(attendance.daily_rate?.toString() || "0").toFixed(2)}
                              </td>
                              <td className="py-3 px-4">₱{payAmount.toFixed(2)}</td>
                              <td className="py-3 px-4">
                                ₱{Number.parseFloat(attendance.adjustment?.toString() || "0").toFixed(2)}
                              </td>
                              <td className="py-3 px-4 space-x-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                                        onClick={() => openUpdateModal(attendance)}
                                      >
                                        Edit
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit Attendance</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 border-red-200 text-red-600 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:border-red-700"
                                        onClick={() => handleDeleteAttendance(attendance.id)}
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="h-3.5 w-3.5"
                                        >
                                          <path d="M3 6h18"></path>
                                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                        </svg>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete Attendance</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-500 dark:text-slate-400">
                            No attendance records found matching your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredAttendances.length > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Showing {attendances.from || 0} to {attendances.to || 0} of {attendances.total} entries
                    </div>
                    <div className="flex items-center space-x-2">
                      {attendances.links.map((link, i) => {
                        // Create a new URL with the current parameters
                        const url = link.url ? new URL(link.url, window.location.origin) : null

                        // If we have a URL, add all our static parameters
                        if (url) {
                          if (summaryDateFilter) {
                            url.searchParams.set("summaryDate", summaryDateFilter)
                          }

                          const calculatedCompletion = calculateWeeklyCompletion()
                          const currentWeeklyCompletion = staticWeeklyCompletion || calculatedCompletion
                          const currentNextPayrollDate = staticNextPayrollDate || getNextPayrollDate()

                          url.searchParams.set("weeklyCompletion", currentWeeklyCompletion.toString())
                          url.searchParams.set("nextPayrollDate", encodeURIComponent(currentNextPayrollDate))
                          url.searchParams.set("weekDateRange", encodeURIComponent(currentWeekDateRange))
                        }

                        return (
                          <Button
                            key={i}
                            variant={link.active ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              if (url) {
                                router.get(url.toString(), {}, { preserveScroll: true })
                              }
                            }}
                            disabled={!url}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                          />
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="daily" className="mt-0">
            {/* Daily View Date Filter */}
            <Card className="p-4 mb-6 border border-slate-200 dark:border-slate-700">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <h3 className="text-lg font-semibold">Daily Attendance View</h3>
                <div className="flex items-center gap-2">
                  <Label htmlFor="daily-date" className="whitespace-nowrap">
                    Filter by Date:
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="daily-date"
                      type="date"
                      value={dailyViewDateFilter}
                      onChange={(e) => setDailyViewDateFilter(e.target.value)}
                      className="w-auto"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDailyViewDateFilter(new Date().toISOString().split("T")[0])}
                      className="whitespace-nowrap"
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDailyViewDateFilter("")}
                      className="whitespace-nowrap"
                    >
                      <Filter className="h-4 w-4 mr-1" />
                      All Dates
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : Object.keys(filteredAttendanceByDate).length > 0 ? (
              <div className="space-y-6">
                {Object.keys(filteredAttendanceByDate)
                  .sort((a, b) => (new Date(b) as any) - (new Date(a) as any))
                  .map((date) => (
                    <Card key={date} className="p-4 border border-slate-200 dark:border-slate-700">
                      <h3 className="text-lg font-semibold mb-3">{formatDate(date)}</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                              <th className="py-2 px-4 text-left font-medium text-slate-600 dark:text-slate-300">
                                Employee
                              </th>
                              <th className="py-2 px-4 text-left font-medium text-slate-600 dark:text-slate-300">
                                Status
                              </th>
                              <th className="py-2 px-4 text-left font-medium text-slate-600 dark:text-slate-300">
                                Daily Rate
                              </th>
                              <th className="py-2 px-4 text-left font-medium text-slate-600 dark:text-slate-300">
                                Pay Amount
                              </th>
                              <th className="py-2 px-4 text-left font-medium text-slate-600 dark:text-slate-300">
                                Adjustment
                              </th>
                              <th className="py-2 px-4 text-left font-medium text-slate-600 dark:text-slate-300">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAttendanceByDate[date].map((attendance) => {
                              const payAmount = calculatePayAmount(attendance)

                              return (
                                <tr
                                  key={attendance.id}
                                  className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, attendance)}
                                >
                                  <td className="py-2 px-4">
                                    <div>
                                      <p className="font-medium">{attendance.full_name || "N/A"}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {attendance.employee_number}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="py-2 px-4">
                                    <Badge className={getStatusBadgeColor(attendance.status)}>
                                      {attendance.status}
                                    </Badge>
                                  </td>
                                  <td className="py-2 px-4">
                                    ₱{Number.parseFloat(attendance.daily_rate?.toString() || "0").toFixed(2)}
                                  </td>
                                  <td className="py-2 px-4">₱{payAmount.toFixed(2)}</td>
                                  <td className="py-2 px-4">
                                    ₱{Number.parseFloat(attendance.adjustment?.toString() || "0").toFixed(2)}
                                  </td>
                                  <td className="py-2 px-4 space-x-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                                      onClick={() => openUpdateModal(attendance)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-red-200 text-red-600 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:border-red-700"
                                      onClick={() => handleDeleteAttendance(attendance.id)}
                                    >
                                      Delete
                                    </Button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">
                  {dailyViewDateFilter
                    ? `No attendance records found for ${formatDate(dailyViewDateFilter)}.`
                    : "No attendance records found."}
                </p>
                <Button
                  variant="outline"
                  onClick={openAddModal}
                  className="mt-4 border-indigo-200 text-indigo-600 hover:border-indigo-300 dark:border-indigo-800 dark:text-indigo-400 dark:hover:border-indigo-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Attendance Record
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Period View Tab - New */}
          <TabsContent value="period" className="mt-0">
            <Card className="p-4 mb-6 border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="periodSelect">Payroll Period</Label>
                  <Select value={selectedPeriodForView} onValueChange={setSelectedPeriodForView}>
                    <SelectTrigger id="periodSelect" className="mt-1">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      {payrollPeriods.map((period) => (
                        <SelectItem key={period.id} value={period.id.toString()}>
                          {formatDate(period.period_start)} to {formatDate(period.period_end)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="employeeSelect">Employee (Optional)</Label>
                  <Select value={selectedEmployeeForView} onValueChange={setSelectedEmployeeForView}>
                    <SelectTrigger id="employeeSelect" className="mt-1">
                      <SelectValue placeholder="All employees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All employees</SelectItem>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id.toString()}>
                          {employee.full_name} ({employee.employee_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="periodDateFilter">Date Filter (Optional)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="periodDateFilter"
                      type="date"
                      value={periodDateFilter}
                      onChange={(e) => setPeriodDateFilter(e.target.value)}
                      className="flex-1"
                    />
                    {periodDateFilter && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPeriodDateFilter("")}
                        className="h-10 w-10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={loadPeriodAttendanceRecords}
                    disabled={!selectedPeriodForView || isPeriodLoading}
                    className="w-full"
                  >
                    {isPeriodLoading ? "Loading..." : "Load Records"}
                  </Button>
                </div>
              </div>
            </Card>

            {isPeriodLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : selectedPeriodForView ? (
              <>
                {periodAttendanceRecords.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full border-collapse text-sm">
                      <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <tr>
                          <th className="py-3 px-4 text-left font-semibold">Date</th>
                          <th className="py-3 px-4 text-left font-semibold">Employee</th>
                          <th className="py-3 px-4 text-left font-semibold">Status</th>
                          <th className="py-3 px-4 text-left font-semibold">Time In</th>
                          <th className="py-3 px-4 text-left font-semibold">Time Out</th>
                          <th className="py-3 px-4 text-left font-semibold">Daily Rate</th>
                          <th className="py-3 px-4 text-left font-semibold">Pay Amount</th>
                          <th className="py-3 px-4 text-left font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periodAttendanceRecords.map((record) => {
                          const employee = employees.find(
                            (e) => e.id === record.employee_id || e.employee_number === record.employee_number,
                          )
                          const payAmount = calculatePayAmount(record)

                          return (
                            <tr
                              key={record.id || `${record.employee_id}-${record.work_date}`}
                              className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            >
                              <td className="py-3 px-4">{formatDate(record.work_date || record.date)}</td>
                              <td className="py-3 px-4">
                                {record.full_name ||
                                  employee?.full_name ||
                                  `Employee #${record.employee_id || record.employee_number}`}
                              </td>
                              <td className="py-3 px-4">
                                <div
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(record.status)}`}
                                >
                                  {getStatusIcon(record.status)}
                                  <span className="ml-1">{record.status}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">{record.time_in ? formatTime(record.time_in) : "-"}</td>
                              <td className="py-3 px-4">{record.time_out ? formatTime(record.time_out) : "-"}</td>
                              <td className="py-3 px-4">
                                ₱{Number.parseFloat(record.daily_rate?.toString() || "0").toFixed(2)}
                              </td>
                              <td className="py-3 px-4">₱{payAmount.toFixed(2)}</td>
                              <td className="py-3 px-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditRecord(record)}
                                  className="h-8 px-2"
                                >
                                  Edit
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-slate-500 dark:text-slate-400">
                      {periodDateFilter
                        ? `No attendance records found for the selected period and date (${formatDate(periodDateFilter)}).`
                        : "No attendance records found for the selected period."}
                    </p>
                    <Button
                      variant="outline"
                      onClick={openAddModal}
                      className="mt-4 border-indigo-200 text-indigo-600 hover:border-indigo-300 dark:border-indigo-800 dark:text-indigo-400 dark:hover:border-indigo-700"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Attendance Record
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">
                  Please select a payroll period to view attendance records.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="summary" className="mt-0">
            <Card className="p-4 mb-6 border border-slate-200 dark:border-slate-700">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <h3 className="text-lg font-semibold">Attendance Summary</h3>
                <div className="flex items-center gap-2">
                  <Label htmlFor="summary-date" className="whitespace-nowrap">
                    Filter by Date:
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="summary-date"
                      type="date"
                      value={summaryDateFilter}
                      onChange={(e) => updateSummaryDateFilter(e.target.value)}
                      className="w-auto"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateSummaryDateFilter(new Date().toISOString().split("T")[0])}
                      className="whitespace-nowrap"
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateSummaryDateFilter("")}
                      className="whitespace-nowrap"
                    >
                      <Filter className="h-4 w-4 mr-1" />
                      All Dates
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-5 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold mb-4">
                  Attendance by Status
                  {summaryDateFilter && (
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">
                      for {formatDate(summaryDateFilter)}
                    </span>
                  )}
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Present</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {attendanceSummary.presentCount} records (
                        {attendanceSummary.totalRecords > 0
                          ? Math.round((attendanceSummary.presentCount / attendanceSummary.totalRecords) * 100)
                          : 0}
                        %)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                      <div
                        className="bg-green-500 h-2.5 rounded-full"
                        style={{
                          width: `${
                            attendanceSummary.totalRecords > 0
                              ? Math.round((attendanceSummary.presentCount / attendanceSummary.totalRecords) * 100)
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Absent</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {attendanceSummary.absentCount} records (
                        {attendanceSummary.totalRecords > 0
                          ? Math.round((attendanceSummary.absentCount / attendanceSummary.totalRecords) * 100)
                          : 0}
                        %)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                      <div
                        className="bg-red-500 h-2.5 rounded-full"
                        style={{
                          width: `${
                            attendanceSummary.totalRecords > 0
                              ? Math.round((attendanceSummary.absentCount / attendanceSummary.totalRecords) * 100)
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Day Off</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {attendanceSummary.dayOffCount} records (
                        {attendanceSummary.totalRecords > 0
                          ? Math.round((attendanceSummary.dayOffCount / attendanceSummary.totalRecords) * 100)
                          : 0}
                        %)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                      <div
                        className="bg-blue-500 h-2.5 rounded-full"
                        style={{
                          width: `${
                            attendanceSummary.totalRecords > 0
                              ? Math.round((attendanceSummary.dayOffCount / attendanceSummary.totalRecords) * 100)
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Holiday</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {attendanceSummary.holidayCount} records (
                        {attendanceSummary.totalRecords > 0
                          ? Math.round((attendanceSummary.holidayCount / attendanceSummary.totalRecords) * 100)
                          : 0}
                        %)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                      <div
                        className="bg-purple-500 h-2.5 rounded-full"
                        style={{
                          width: `${
                            attendanceSummary.totalRecords > 0
                              ? Math.round((attendanceSummary.holidayCount / attendanceSummary.totalRecords) * 100)
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Half Day</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {attendanceSummary.halfDayCount} records (
                        {attendanceSummary.totalRecords > 0
                          ? Math.round((attendanceSummary.halfDayCount / attendanceSummary.totalRecords) * 100)
                          : 0}
                        %)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                      <div
                        className="bg-amber-500 h-2.5 rounded-full"
                        style={{
                          width: `${
                            attendanceSummary.totalRecords > 0
                              ? Math.round((attendanceSummary.halfDayCount / attendanceSummary.totalRecords) * 100)
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Leave</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {attendanceSummary.leaveCount} records (
                        {attendanceSummary.totalRecords > 0
                          ? Math.round((attendanceSummary.leaveCount / attendanceSummary.totalRecords) * 100)
                          : 0}
                        %)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                      <div
                        className="bg-indigo-500 h-2.5 rounded-full"
                        style={{
                          width: `${
                            attendanceSummary.totalRecords > 0
                              ? Math.round((attendanceSummary.leaveCount / attendanceSummary.totalRecords) * 100)
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-5 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold mb-4">
                  Financial Summary
                  {summaryDateFilter && (
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">
                      for {formatDate(summaryDateFilter)}
                    </span>
                  )}
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Daily Rates</span>
                    <span className="text-lg font-semibold">
                      ₱
                      {typeof attendanceSummary.totalDailyRate === "number"
                        ? attendanceSummary.totalDailyRate.toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Pay Amount</span>
                    <span className="text-lg font-semibold">
                      ₱
                      {typeof attendanceSummary.totalPayAmount === "number"
                        ? attendanceSummary.totalPayAmount.toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Adjustments</span>
                    <span className="text-lg font-semibold">
                      ₱
                      {typeof attendanceSummary.totalAdjustments === "number"
                        ? attendanceSummary.totalAdjustments.toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                  <div className="border-t pt-3 mt-3 flex justify-between items-center">
                    <span className="text-sm font-medium">Grand Total</span>
                    <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                      ₱
                      {(
                        (typeof attendanceSummary.totalPayAmount === "number" ? attendanceSummary.totalPayAmount : 0) +
                        (typeof attendanceSummary.totalAdjustments === "number"
                          ? attendanceSummary.totalAdjustments
                          : 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>

                {attendanceSummary.totalRecords === 0 && (
                  <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-md text-center text-slate-500 dark:text-slate-400">
                    {summaryDateFilter ? (
                      <p>No attendance records found for {formatDate(summaryDateFilter)}</p>
                    ) : (
                      <p>No attendance records found</p>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            {/* Analytics Date Range Filter */}
            <Card className="p-4 mb-6 border border-slate-200 dark:border-slate-700">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <h3 className="text-lg font-semibold">Attendance Analytics</h3>
                <div className="flex flex-col md:flex-row items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="analytics-start-date" className="whitespace-nowrap">
                      Date Range:
                    </Label>
                    <Input
                      id="analytics-start-date"
                      type="date"
                      value={analyticsDateRange.startDate}
                      onChange={(e) => setAnalyticsDateRange({ ...analyticsDateRange, startDate: e.target.value })}
                      className="w-auto"
                    />
                    <span>to</span>
                    <Input
                      id="analytics-end-date"
                      type="date"
                      value={analyticsDateRange.endDate}
                      onChange={(e) => setAnalyticsDateRange({ ...analyticsDateRange, endDate: e.target.value })}
                      className="w-auto"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={setPreviousWeek} className="whitespace-nowrap">
                      Previous Week
                    </Button>
                    <Button variant="outline" size="sm" onClick={setCurrentWeek} className="whitespace-nowrap">
                      Current Week
                    </Button>
                    <Button variant="outline" size="sm" onClick={setNextWeek} className="whitespace-nowrap">
                      Next Week
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-5 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold mb-4">
                  Attendance Trends
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">
                    {formatDate(analyticsDateRange.startDate)} to {formatDate(analyticsDateRange.endDate)}
                  </span>
                </h3>
                <div className="mt-2">
                  <SimpleChart data={weeklyAttendanceData} labels={weeklyLabels} color="#22c55e" />
                </div>
                <div className="mt-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Average Attendance Rate</span>
                    <span className="text-sm font-medium">
                      {weeklyAttendanceData.length > 0
                        ? Math.round(weeklyAttendanceData.reduce((a, b) => a + b, 0) / weeklyAttendanceData.length)
                        : 0}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      weeklyAttendanceData.length > 0
                        ? Math.round(weeklyAttendanceData.reduce((a, b) => a + b, 0) / weeklyAttendanceData.length)
                        : 0
                    }
                    className="h-2 bg-slate-100 dark:bg-slate-700"
                    indicatorClassName="bg-green-500"
                  />
                </div>
              </Card>

              <Card className="p-5 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold mb-4">Payroll Projection</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Current Week Projection</span>
                    <span className="text-lg font-semibold">
                      ₱
                      {typeof attendanceSummary.totalPayAmount === "number"
                        ? attendanceSummary.totalPayAmount.toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Next Payout Date</span>
                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      {getNextPayrollDate()}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Weekly Completion</span>
                      <span className="text-sm font-medium">
                        {staticWeeklyCompletion !== null ? staticWeeklyCompletion : calculateWeeklyCompletion()}%
                      </span>
                    </div>
                    <Progress
                      value={staticWeeklyCompletion !== null ? staticWeeklyCompletion : calculateWeeklyCompletion()}
                      className="h-2 bg-slate-100 dark:bg-slate-700"
                      indicatorClassName="bg-indigo-500"
                    />
                  </div>
                  {/* Generate Payroll button removed */}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        {isAddModalOpen && (
          <AddAttendanceModal onClose={closeAddModal} onSubmit={handleAddAttendance} employees={employees} />
        )}
        {isUpdateModalOpen && selectedAttendance && (
          <UpdateAttendanceModal
            attendance={selectedAttendance}
            onClose={closeUpdateModal}
            onSubmit={handleUpdateAttendance}
            employees={employees}
          />
        )}
        {isBulkAddModalOpen && (
          <BulkAddAttendanceModal
            onClose={closeBulkAddModal}
            onSubmitFile={handleBulkAddFile}
            onSubmitManual={handleBulkAddManual}
            employees={employees}
          />
        )}

        {/* Generate Payroll Dialog */}

        {/* Edit Attendance Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Attendance Record</DialogTitle>
              <DialogDescription>Update the attendance details for this record</DialogDescription>
            </DialogHeader>

            {editRecord && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-date">Date</Label>
                    <Input
                      id="edit-date"
                      type="date"
                      value={editRecord.work_date || editRecord.date || ""}
                      onChange={(e) => setEditRecord({ ...editRecord, work_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-status">Status</Label>
                    <Select
                      value={editRecord.status}
                      onValueChange={(value) => setEditRecord({ ...editRecord, status: value })}
                    >
                      <SelectTrigger id="edit-status" className="mt-1">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Present">Present</SelectItem>
                        <SelectItem value="Absent">Absent</SelectItem>
                        <SelectItem value="Half Day">Half Day</SelectItem>
                        <SelectItem value="Day Off">Day Off</SelectItem>
                        <SelectItem value="Leave">Leave</SelectItem>
                        <SelectItem value="Holiday">Holiday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-time-in">Time In</Label>
                    <Input
                      id="edit-time-in"
                      type="time"
                      value={editRecord.time_in || ""}
                      onChange={(e) => setEditRecord({ ...editRecord, time_in: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-time-out">Time Out</Label>
                    <Input
                      id="edit-time-out"
                      type="time"
                      value={editRecord.time_out || ""}
                      onChange={(e) => setEditRecord({ ...editRecord, time_out: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-daily-rate">Daily Rate</Label>
                    <Input
                      id="edit-daily-rate"
                      type="number"
                      value={editRecord.daily_rate || 0}
                      onChange={(e) => setEditRecord({ ...editRecord, daily_rate: Number.parseFloat(e.target.value) })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-adjustment">Adjustment</Label>
                    <Input
                      id="edit-adjustment"
                      type="number"
                      value={editRecord.adjustment || 0}
                      onChange={(e) => setEditRecord({ ...editRecord, adjustment: Number.parseFloat(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Input
                    id="edit-notes"
                    value={editRecord.notes || ""}
                    onChange={(e) => setEditRecord({ ...editRecord, notes: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveEditedRecord}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Update Dialog */}
        <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Bulk Update Attendance</DialogTitle>
              <DialogDescription>Update attendance status for multiple employees at once</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="bulk-date">Date</Label>
                <Input
                  id="bulk-date"
                  type="date"
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="bulk-status">Status</Label>
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger id="bulk-status" className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Present">Present</SelectItem>
                    <SelectItem value="Absent">Absent</SelectItem>
                    <SelectItem value="Half Day">Half Day</SelectItem>
                    <SelectItem value="Day Off">Day Off</SelectItem>
                    <SelectItem value="Leave">Leave</SelectItem>
                    <SelectItem value="Holiday">Holiday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkUpdate}>Update Attendance</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Dialog */}
        <Dialog open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Bulk Delete Attendance Records</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete all attendance records? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <p className="text-red-500">
                <AlertCircle className="inline-block h-5 w-5 mr-2 align-middle" />
                Warning: This will permanently delete all attendance records.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeBulkDeleteModal}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => {}}>
                Delete All Records
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

       
      </div>
    </AppLayout>
  )
}

export default AttendanceIndex

