"use client"

import type React from "react"

import { Head, router, usePage } from "@inertiajs/react"
import { useState, useEffect, useMemo } from "react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowDownUp,
  Calendar,
  FileText,
  Printer,
  Wallet,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileSpreadsheet,
  Mail,
  Check,
  X,
  Clock,
  DollarSign,
  Pencil
} from "lucide-react"
import AddPayrollModal from "./AddPayrollModal"
import UpdatePayrollModal from "./UpdatePayrollModal"
import PayrollPeriodsTab from "./PayrollPeriodsTab"
import { toast } from "sonner"
import PrintPayslip from "./PrintPayslip"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Import the export utility
import { exportToCSV } from "../../utils/export-utils"

interface PayrollEntry {
  id: number
  employee_number: string
  full_name: string // This comes from the join with employees table
  department_name?: string // Add this field
  week_id: number
  daily_rates: string | number
  gross_pay: string
  sss_deduction: string
  philhealth_deduction: string
  pagibig_deduction: string
  tax_deduction: string
  cash_advance: string
  loan: string
  vat: string
  other_deductions: string
  total_deductions: string
  net_pay: string
  ytd_earnings: string
  thirteenth_month_pay: string
  status: string
  created_at: string | null
  updated_at: string | null
}

interface PayrollPeriod {
  id: number
  week_id: number
  period_start: string
  period_end: string
  payment_date: string
  status: string
  created_at: string | null
  updated_at: string | null
}

interface PayrollSummary {
  totalGrossPay: number
  totalNetPay: number
  totalDeductions: number
  completedCount: number
  pendingCount: number
  totalCount: number
}

interface PayrollIndexProps {
  payrollEntries?: {
    data: PayrollEntry[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number
    to: number
  }
  payrollSummary?: PayrollSummary
  payrollPeriods?: PayrollPeriod[]
  employees?: any[]
  attendances?: any[]
  departments?: string[] // Add this line
}

interface PeriodSelectProps {
  periodData: PayrollPeriod[]
  periodFilter: number | null
  handlePeriodFilterChange: (value: number | null) => void
}

// Define status columns for drag and drop
const statusColumns = [
  { id: "pending", title: "Pending", icon: <Clock className="h-4 w-4" /> },
  { id: "generated", title: "Generated", icon: <FileText className="h-4 w-4" /> },
  { id: "approved", title: "Approved", icon: <Check className="h-4 w-4" /> },
  { id: "paid", title: "Paid", icon: <DollarSign className="h-4 w-4" /> },
  { id: "rejected", title: "Rejected", icon: <X className="h-4 w-4" /> },
]

// Update the status badge color function to use black/white
const getStatusBadgeColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "approved":
    case "paid":
      return "bg-white text-black border-gray-200 dark:bg-black dark:text-white dark:border-gray-800"
    case "pending":
    case "generated":
      return "bg-white text-black border-gray-200 dark:bg-black dark:text-white dark:border-gray-800"
    case "rejected":
      return "bg-white text-black border-gray-200 dark:bg-black dark:text-white dark:border-gray-800"
    default:
      return "bg-white text-black border-gray-200 dark:bg-black dark:text-white dark:border-gray-800"
  }
}

const PayrollIndex = ({
  payrollEntries = {
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0,
  },
  payrollSummary = {
    totalGrossPay: 0,
    totalNetPay: 0,
    totalDeductions: 0,
    completedCount: 0,
    pendingCount: 0,
    totalCount: 0,
  },
  payrollPeriods = [],
  employees = [],
  attendances = [],
  departments = [], // Add this line
}: PayrollIndexProps) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [periodFilter, setPeriodFilter] = useState<number | null>(null)
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null) // Add department filter
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollEntry | null>(null)
  const [activeTab, setActiveTab] = useState<"entries" | "periods" | "kanban">("entries")
  const [sortField, setSortField] = useState<string>("id")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [isLoading, setIsLoading] = useState(true)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isNewPeriodModalOpen, setIsNewPeriodModalOpen] = useState(false)
  const [newPeriodData, setNewPeriodData] = useState({
    week_id: 1,
    period_start: "",
    period_end: "",
    payment_date: "",
    status: "pending",
  })
  const [editingPeriodId, setEditingPeriodId] = useState<number | null>(null)
  const [attendanceData, setAttendanceData] = useState([])
  const [summaryDateFilter, setSummaryDateFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<string | null>(null)
  const [dailyViewDateFilter, setDailyViewDateFilter] = useState<string>("")
  const [filters, setFilters] = useState<{ search?: string; status?: string; date?: string }>({})
  const [draggedPayroll, setDraggedPayroll] = useState<PayrollEntry | null>(null)

  const { route } = usePage().props

  // Prevent scrolling back to top once loaded
  useEffect(() => {
    // Store the current scroll position
    const scrollPosition = window.scrollY

    // Function to restore scroll position
    const restoreScroll = () => {
      window.scrollTo(0, scrollPosition)
    }

    // Add event listener for when content is loaded
    window.addEventListener("load", restoreScroll)

    // Cleanup
    return () => {
      window.removeEventListener("load", restoreScroll)
    }
  }, [])

  // Update the useEffect for data loading and add proper Inertia data handling
  useEffect(() => {
    // If we have data from Inertia, we're not loading
    if (payrollEntries?.data?.length > 0 || (Array.isArray(payrollPeriods) && payrollPeriods.length > 0)) {
      setIsLoading(false)
    } else {
      // Short timeout to prevent flash of loading state if data loads quickly
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [payrollEntries, payrollPeriods])

  // Update the useEffect for initializing state from URL parameters
  useEffect(() => {
    // Initialize state from URL parameters on first load
    const params = new URLSearchParams(window.location.search)
    const searchParam = params.get("search")
    const statusParam = params.get("status")
    const periodParam = params.get("period")
    const departmentParam = params.get("department")

    if (searchParam) setSearchTerm(searchParam)
    if (statusParam) setStatusFilter(statusParam)
    if (periodParam) setPeriodFilter(Number(periodParam))
    if (departmentParam) setDepartmentFilter(departmentParam)
  }, [])

  // Handle session expiration
  useEffect(() => {
    const handleUnauthorized = (e) => {
      if (e.detail?.status === 401 || e.detail?.status === 419) {
        toast.error("Your session has expired. Please log in again.")
        setTimeout(() => {
          window.location.href = "/login"
        }, 2000)
      }
    }

    document.addEventListener("inertia:error", handleUnauthorized)

    return () => {
      document.removeEventListener("inertia:error", handleUnauthorized)
    }
  }, [])

  // Replace the checkExistingPayroll function with Inertia
  const checkExistingPayroll = async (employeeNumber, periodId) => {
    try {
      const response = await router.get(
        `/payroll/entries/check-existing?employee_number=${employeeNumber}&week_id=${periodId}`,
        {
          preserveState: true,
          only: [],
        },
      )
      return response?.props?.exists || false
    } catch (error) {
      console.error("Error checking existing payroll:", error)
      return false
    }
  }


  
  // Update the openAddModal function to include validation
  const openAddModal = () => {
    // Check if there are any payroll periods before opening the modal
    if (!Array.isArray(payrollPeriods) || payrollPeriods.length === 0) {
      toast.error("No payroll periods available. Please create a new period first.")
      return
    }

    setIsAddModalOpen(true)
  }
  const closeAddModal = () => setIsAddModalOpen(false)

  const openUpdateModal = (payroll: PayrollEntry) => {
    setIsUpdateModalOpen(true);
    setSelectedPayroll(payroll);
  };
  const closeUpdateModal = () => {
    setSelectedPayroll(null)
    setIsUpdateModalOpen(false)
  }

  // Calculate period end and payment date based on start date
  const handlePeriodStartChange = (e) => {
    const startDate = new Date(e.target.value)

    // Calculate end date (7 days after start date)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)

    // Calculate payment date (4 days after end date)
    const paymentDate = new Date(endDate)
    paymentDate.setDate(endDate.getDate() + 4)

    // Calculate week_id (YEARWEEK format: YYYYWW)
    const year = startDate.getFullYear()
    const weekNumber = getWeekNumber(startDate)
    const weekId = Number.parseInt(`${year}${weekNumber.toString().padStart(2, "0")}`)

    setNewPeriodData({
      ...newPeriodData,
      week_id: weekId,
      period_start: e.target.value,
      period_end: endDate.toISOString().split("T")[0],
      payment_date: paymentDate.toISOString().split("T")[0],
    })
  }

  // Helper function to get week number
  const getWeekNumber = (date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  }

  const handleAddPayroll = (data: PayrollEntry) => {
    router.post("/payroll/entries", data, {
      onSuccess: () => {
        toast.success("Payroll added successfully!")
        closeAddModal()
      },
      onError: (errors) => {
        Object.values(errors).forEach((message) => {
          toast.error(`Error: ${message}`)
        })
      },
    })
  }

  // Update the handleDeletePayroll function to use Inertia properly
  const handleDeletePayroll = (id: number) => {
    if (confirm("Are you sure you want to delete this payroll entry?")) {
      router.delete(`/payroll/${id}`, {
        onSuccess: () => {
          toast.success("Payroll deleted successfully!")
        },
        onError: (errors) => {
          Object.entries(errors).forEach(([field, message]) => {
            toast.error(`${field}: ${message}`)
          })
        },
        preserveState: false,
      })
    }
  }

  const formatCurrency = (value: string | null) => {
    return value ? `₱${Number.parseFloat(value).toFixed(2)}` : "₱0.00"
  }

  const getPayrollPeriodName = (periodId: number) => {
    // First check if payrollPeriods is an array
    if (!Array.isArray(payrollPeriods)) {
      return "Loading period details..."
    }

    // First try to find by id
    const period = payrollPeriods.find((p) => p.id === periodId)

    if (!period) {
      // If not found by id, try to find by week_id as a fallback
      const periodByWeekId = payrollPeriods.find((p) => p.week_id === periodId)
      if (periodByWeekId) {
        return `${periodByWeekId.week_id} (${formatDate(periodByWeekId.period_start)} - ${formatDate(periodByWeekId.period_end)})`
      }

      // If still not found, make an Inertia request to get the period details
      router.get(`/payroll/periods/${periodId}`, {
        preserveState: true,
        only: ["period"],
        onSuccess: (page) => {
          if (page.props.period) {
            return `${page.props.period.week_id} (${formatDate(page.props.period.period_start)} - ${formatDate(page.props.period.period_end)})`
          }
        },
      })

      // Return a placeholder while waiting for the data
      return "Loading period details..."
    }

    return `${period.week_id} (${formatDate(period.period_start)} - ${formatDate(period.period_end)})`

    function formatDate(dateString: string) {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    }
  }

  // Improved sort toggle with type safety
  const toggleSort = (field: string) => {
    setSortField(field)
    setSortDirection((prev) => (sortField === field ? (prev === "asc" ? "desc" : "asc") : "asc"))
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter(null)
    setPeriodFilter(null)
    setDepartmentFilter(null)
  }

  // Print payroll - using actual data
  const printPayroll = (payroll: PayrollEntry, overwrite = false) => {
    // Show loading state
    toast.loading("Preparing payslip...")

    // Use Inertia to visit the print route directly
    router.post(
      `/payroll/${payroll.id}/print`,
      { overwrite: overwrite },
      {
        onSuccess: (page) => {
          toast.dismiss()
          // Get the attendance records from the response
          const attendanceRecords = page.props.attendances || []

          // Create a payroll object with all the necessary data
          const payrollWithData = {
            ...payroll,
            attendanceRecords: attendanceRecords,
            // Include the period data if we have it
            payroll_period:
              page.props.period ||
              (Array.isArray(payrollPeriods)
                ? payrollPeriods.find((p) => p.id === payroll.week_id || p.week_id === payroll.week_id)
                : undefined),
            overwrite: page.props.overwrite || false,
          }

          // Open the print modal with the enhanced payroll data
          setSelectedPayroll(payrollWithData)
          setIsPrintModalOpen(true)
        },
        onError: (errors) => {
          toast.dismiss()
          console.error("Error fetching payroll data for printing:", errors)
          toast.error("Failed to fetch payroll data for printing")
        },
        preserveState: true,
      },
    )
  }

  // Send email
  const sendEmail = (payroll: PayrollEntry) => {
    router.post(
      `/payroll/entries/${payroll.id}/send-email`,
      {},
      {
        onSuccess: () => {
          toast.success(`Payslip email sent to employee: ${payroll.full_name}`)
        },
        onError: (errors) => {
          Object.values(errors).forEach((message) => {
            toast.error(`Error: ${message}`)
          })
        },
      },
    )
  }

  // Update the refreshData function to preserve the active tab
  const refreshData = () => {
    setIsRefreshing(true)

    // Construct the query parameters to preserve filters
    const params = {}
    if (searchTerm) params.search = searchTerm
    if (statusFilter) params.status = statusFilter
    if (dateFilter) params.date = dateFilter
    if (departmentFilter) params.department = departmentFilter

    router.visit(`/payroll?${new URLSearchParams(params).toString()}`, {
      preserveScroll: true,
      preserveState: true,
      onSuccess: () => {
        setIsRefreshing(false)
        toast.success("Data refreshed successfully")

        // If we're in daily view and have a date filter, make sure the daily view filter is set
        if (activeTab === "daily" && dateFilter) {
          setDailyViewDateFilter(dateFilter)
        }
      },
      onError: () => {
        setIsRefreshing(false)
        toast.error("Failed to refresh data")
      },
    })
  }

  // Update the handleCreatePeriod function to use Inertia properly
  const handleCreatePeriod = (e) => {
    e.preventDefault()

    if (editingPeriodId) {
      // Update existing period
      router.put(`/payroll/periods/${editingPeriodId}`, newPeriodData, {
        onSuccess: () => {
          toast.success("Payroll period updated successfully!")
          setIsNewPeriodModalOpen(false)
          setEditingPeriodId(null)
          refreshData()
        },
        onError: (errors) => {
          Object.entries(errors).forEach(([field, message]) => {
            toast.error(`${field}: ${message}`)
          })
        },
        preserveState: true,
      })
    } else {
      // Create new period
      router.post("/payroll/periods", newPeriodData, {
        onSuccess: () => {
          toast.success("Payroll period created successfully!")
          setIsNewPeriodModalOpen(false)
          refreshData()
        },
        onError: (errors) => {
          Object.entries(errors).forEach(([field, message]) => {
            toast.error(`${field}: ${message}`)
          })
        },
        preserveState: true,
      })
    }
  }

  // Export to CSV
  const exportToExcel = () => {
    toast.success("Exporting payroll data...")

    try {
      // Prepare data for export
      const exportData = payrollEntries.data.map((payroll) => {
        // Format the period name
        const periodName = getPayrollPeriodName(payroll.week_id)

        // Format currency values
        const grossPay = Number.parseFloat(payroll.gross_pay).toFixed(2)
        const netPay = Number.parseFloat(payroll.net_pay).toFixed(2)
        const sssDeduction = Number.parseFloat(payroll.sss_deduction).toFixed(2)
        const philhealthDeduction = Number.parseFloat(payroll.philhealth_deduction).toFixed(2)
        const pagibigDeduction = Number.parseFloat(payroll.pagibig_deduction).toFixed(2)
        const taxDeduction = Number.parseFloat(payroll.tax_deduction).toFixed(2)
        const cashAdvance = Number.parseFloat(payroll.cash_advance).toFixed(2)
        const loan = Number.parseFloat(payroll.loan).toFixed(2)
        const vat = Number.parseFloat(payroll.vat).toFixed(2)
        const otherDeductions = Number.parseFloat(payroll.other_deductions).toFixed(2)
        const totalDeductions = Number.parseFloat(payroll.total_deductions).toFixed(2)

        // Return formatted data
        return {
          ID: payroll.id,
          EmployeeNumber: payroll.employee_number,
          EmployeeName: payroll.full_name,
          Department: payroll.department_name || "",
          WeekID: payroll.week_id,
          PayrollPeriod: periodName,
          GrossPay: grossPay,
          SSS: sssDeduction,
          PhilHealth: philhealthDeduction,
          PagIBIG: pagibigDeduction,
          Tax: taxDeduction,
          CashAdvance: cashAdvance,
          Loan: loan,
          VAT: vat,
          OtherDeductions: otherDeductions,
          TotalDeductions: totalDeductions,
          NetPay: netPay,
          Status: payroll.status,
          CreatedAt: payroll.created_at ? new Date(payroll.created_at).toLocaleDateString() : "",
        }
      })

      // Generate filename with date
      const date = new Date().toISOString().split("T")[0]
      const filename = `payroll_export_${date}.csv`

      // Export to CSV
      exportToCSV(exportData, filename)

      toast.success("Export completed successfully!")
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export data. Please try again.")
    }
  }

  // Handle department filter change
  const handleDepartmentFilterChange = (newValue: string | null) => {
    setDepartmentFilter(newValue)

    const params = new URLSearchParams(window.location.search)
    if (newValue) {
      params.set("department", newValue)
    } else {
      params.delete("department")
    }

    router.visit(`/payroll?${params.toString()}`, {
      preserveState: true,
      preserveScroll: true,
      only: ["payrollEntries", "payrollPeriods", "payrollSummary"],
    })
  }

  // Update the filter handling to use Inertia
  const applyFilters = (resetPage = true) => {
    setIsLoading(true)

    const params = new URLSearchParams(window.location.search)
    if (searchTerm) params.set("search", searchTerm)
    else params.delete("search")

    if (statusFilter) params.set("status", statusFilter)
    else params.delete("status")

    if (periodFilter) params.set("period", periodFilter.toString())
    else params.delete("period")

    if (departmentFilter) params.set("department", departmentFilter)
    else params.delete("department")

    if (resetPage) params.set("page", "1") // Reset to first page when filters change

    router.visit(`/payroll?${params.toString()}`, {
      preserveState: true,
      preserveScroll: true,
      only: ["payrollEntries", "payrollPeriods", "payrollSummary"],
      onSuccess: () => setIsLoading(false),
      onError: () => {
        setIsLoading(false)
        toast.error("Failed to apply filters")
      },
    })
  }

  // Update the calculatePayAmount function to ensure it correctly applies the attendance status logic
  // Replace the existing calculatePayAmount function with this updated version:

  const calculatePayAmount = (attendance) => {
    const dailyRate = Number.parseFloat(attendance.daily_rate?.toString() || "0") || 0

    switch (attendance.status) {
      case "Present":
        return dailyRate * 1 // Present * 1
      case "Absent":
        return dailyRate * 0 // Absent * 0
      case "Day Off":
        return dailyRate * 0 // Day Off * 0
      case "Half Day":
        return dailyRate / 2 // Half Day / 2
      case "Holiday":
        return dailyRate * 2 // Holiday * 2 (using the special holiday rate)
      case "Leave":
        return dailyRate * 0 // Leave * 0
      case "WFH":
        return dailyRate * 1 // WFH (Work From Home) * 1
      case "SP":
        return dailyRate * 1 // SP (Special Project) * 1
      default:
        return 0
    }
  }

  // Update the filter handling for status filter
  const handleStatusFilterChange = (newValue: string | null) => {
    setStatusFilter(newValue)

    const params = new URLSearchParams(window.location.search)
    if (newValue) {
      params.set("status", newValue)
    } else {
      params.delete("status")
    }

    router.visit(`/payroll?${params.toString()}`, {
      preserveState: true,
      preserveScroll: true,
      only: ["payrollEntries", "payrollPeriods", "payrollSummary"],
    })
  }

  // Replace the existing useEffect for setting the latest period with this improved version
  // that only sets it on initial load and respects user selections

  // Add this state to track if the initial load has happened
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  // Update the useEffect to set the latest period only on initial load
  useEffect(() => {
    // Only set the default period if:
    // 1. Initial load hasn't been completed yet
    // 2. No period is already selected
    // 3. payrollPeriods is available
    if (!initialLoadComplete && !periodFilter && Array.isArray(payrollPeriods) && payrollPeriods.length > 0) {
      // Find the latest period by comparing period_end dates
      const latestPeriod = payrollPeriods.reduce((latest, current) => {
        const latestDate = new Date(latest.period_end)
        const currentDate = new Date(current.period_end)
        return currentDate > latestDate ? current : latest
      }, payrollPeriods[0])

      // Set the latest period as the filter
      setPeriodFilter(latestPeriod.week_id)

      // Update URL to reflect the selected period
      const params = new URLSearchParams(window.location.search)
      params.set("period", latestPeriod.week_id.toString())

      router.visit(`/payroll?${params.toString()}`, {
        preserveState: true,
        preserveScroll: true,
        only: ["payrollEntries", "payrollPeriods", "payrollSummary"],
        replace: true, // Use replace to avoid adding to browser history
      })

      // Mark initial load as complete
      setInitialLoadComplete(true)
    }
  }, [payrollPeriods, periodFilter, initialLoadComplete])

  // Update the handlePeriodFilterChange function to properly handle "All Periods" selection
  const handlePeriodFilterChange = (newValue: number | null) => {
    // Mark initial load as complete whenever the user makes an explicit selection
    setInitialLoadComplete(true)

    if (!newValue) {
      setPeriodFilter(null)

      const params = new URLSearchParams(window.location.search)
      params.delete("period")

      router.visit(`/payroll?${params.toString()}`, {
        preserveState: true,
        preserveScroll: true,
        only: ["payrollEntries", "payrollPeriods", "payrollSummary"],
      })
      return
    }

    // Check if payrollPeriods is an array before using find
    if (!Array.isArray(payrollPeriods)) {
      setPeriodFilter(newValue)

      const params = new URLSearchParams(window.location.search)
      params.set("period", newValue.toString())

      router.visit(`/payroll?${params.toString()}`, {
        preserveState: true,
        preserveScroll: true,
        only: ["payrollEntries", "payrollPeriods", "payrollSummary"],
      })
      return
    }

    const selectedPeriod = payrollPeriods.find((period) => period.week_id === newValue || period.id === newValue)

    if (selectedPeriod) {
      setPeriodFilter(selectedPeriod.week_id)

      const params = new URLSearchParams(window.location.search)
      params.set("period", selectedPeriod.week_id.toString())

      router.visit(`/payroll?${params.toString()}`, {
        preserveState: true,
        preserveScroll: true,
        only: ["payrollEntries", "payrollPeriods", "payrollSummary"],
      })
    }
  }

  // Update handleClearFilters to properly clear the period filter
  const handleClearFilters = () => {
    setSearchTerm("")
    setStatusFilter(null)
    setPeriodFilter(null)
    setDepartmentFilter(null)
    setInitialLoadComplete(true) // Mark initial load as complete when filters are cleared

    // Clear URL parameters and reload data
    router.visit("/payroll", {
      preserveState: true,
      preserveScroll: true,
      only: ["payrollEntries", "payrollPeriods", "payrollSummary"],
    })
  }

  // Declare handleSearchChange
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }

  const PeriodSelect: React.FC<PeriodSelectProps> = ({ periodData, periodFilter, handlePeriodFilterChange }) => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    }

    // Pagination handler
    const handlePageChange = (page: number) => {
      const params = new URLSearchParams(window.location.search)
      params.set("page", page.toString())

      router.get(`/payroll?${params.toString()}`, {
        preserveState: true,
        preserveScroll: true,
        only: ["payrollEntries"],
        onSuccess: () => window.scrollTo(0, 0), // Scroll to top on page change
      })
    }

    return (
      <select
        className="p-2 border rounded-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
        value={periodFilter?.toString() ?? ""}
        onChange={(e) => {
          const value = e.target.value
          handlePeriodFilterChange(value ? Number.parseInt(value, 10) : null)
        }}
      >
        <option value="">All Periods</option>
        {periodData.map((period) => (
          <option key={period.id} value={period.week_id.toString()}>
            Week ID: {period.week_id} ({formatDate(period.period_start)} - {formatDate(period.period_end)})
          </option>
        ))}
      </select>
    )
  }

  // Add these functions to handle period operations
  const handleEditPeriod = (period) => {
    setNewPeriodData({
      week_id: period.week_id,
      period_start: period.period_start.split("T")[0],
      period_end: period.period_end.split("T")[0],
      payment_date: period.payment_date.split("T")[0],
      status: period.status,
    })
    setEditingPeriodId(period.id)
    setIsNewPeriodModalOpen(true)
  }

  const handleDeletePeriod = (periodId) => {
    if (
      confirm(
        "Are you sure you want to delete this payroll period? This will also delete all associated payroll entries.",
      )
    ) {
      router.delete(`/payroll/periods/${periodId}`, {
        onSuccess: () => {
          toast.success("Payroll period deleted successfully!")
          refreshData()
        },
        onError: (errors) => {
          Object.entries(errors).forEach(([field, message]) => {
            toast.error(`${field}: ${message}`)
          })
        },
        preserveState: false,
      })
    }
  }

  // Make sure this function is used when generating payroll by adding the attendance_rules to the handleGeneratePayroll function:

  const handleGeneratePayroll = (weekId) => {
    router.post(
      "/payroll/generate",
      {
        week_id: weekId,
        attendance_rules: {
          Present: 1.0, // Daily rate * 1
          Absent: 0.0, // Daily rate * 0
          "Day Off": 0.0, // Daily rate * 0
          "Half Day": 0.5, // Daily rate / 2
          Holiday: 2.0, // Daily rate * 2
          Leave: 0.0, // Daily rate * 0
          WFH: 1.0, // Daily rate * 1
          SP: 1.0, // Daily rate * 1
        },
      },
      {
        onSuccess: () => {
          toast.success("Payroll generated successfully for this period!")
          refreshData()
        },
        onError: (errors) => {
          if (errors.response && errors.response.status === 405) {
            toast.error("Method not allowed. Please check the route configuration.")
          } else {
            Object.entries(errors).forEach(([field, message]) => {
              toast.error(`${field}: ${message}`)
            })
          }
        },
      },
    )
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set("page", page.toString())

    router.get(`/payroll?${params.toString()}`, {
      preserveState: true,
      preserveScroll: true,
      only: ["payrollEntries"],
    })
  }

  // Update the handleStatusChange function to make changes instant without confirmation
  const handleStatusChange = (payroll: PayrollEntry, newStatus: string) => {
    if (payroll.status === newStatus) return

    // Apply the change immediately without confirmation
    router.put(
      `/payroll/${payroll.id}`,
      {
        ...payroll,
        status: newStatus,
      },
      {
        onSuccess: () => {
          toast.success(`Status updated to ${newStatus}!`)
          refreshData()
        },
        onError: (errors) => {
          Object.entries(errors).forEach(([field, message]) => {
            toast.error(`${field}: ${message}`)
          })
        },
        preserveState: true,
        preserveScroll: true,
      },
    )
  }

  // Update the handleDrop function to make changes instant
  const handleDrop = (e, status: string) => {
    e.preventDefault()

    if (!draggedPayroll) return

    // Only update if status is different
    if (draggedPayroll.status.toLowerCase() !== status.toLowerCase()) {
      // Apply the change immediately
      router.put(
        `/payroll/${draggedPayroll.id}`,
        {
          ...draggedPayroll,
          status: status,
        },
        {
          onSuccess: () => {
            toast.success(`Status updated to ${status}!`)
            refreshData()
          },
          onError: (errors) => {
            Object.entries(errors).forEach(([field, message]) => {
              toast.error(`${field}: ${message}`)
            })
          },
          preserveState: true,
          preserveScroll: true,
        },
      )
    }

    setDraggedPayroll(null)
  }

  // Remove the confirmStatusChange function since we're no longer using it
  // Delete the entire confirmStatusChange function

  // Drag and drop handlers
  const handleDragStart = (e, payroll: PayrollEntry) => {
    setDraggedPayroll(payroll)
    e.dataTransfer.setData("text/plain", JSON.stringify(payroll))
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e, status: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const payrollData = payrollEntries?.data || []

  const filteredPayrolls = useMemo(() => {
    if (!Array.isArray(payrollData)) return [] // Handle undefined/null data

    return payrollData
      .filter((payroll) => {
        const searchTermLower = searchTerm.toLowerCase()
        return (
          payroll.full_name.toLowerCase().includes(searchTermLower) ||
          payroll.employee_number.toLowerCase().includes(searchTermLower)
        )
      })
      .filter((payroll) => (statusFilter ? payroll.status === statusFilter : true))
      .filter((payroll) => (periodFilter ? payroll.week_id === periodFilter : true))
      .filter((payroll) => (departmentFilter ? payroll.department_name === departmentFilter : true))
      .sort((a, b) => {
        const sortFactor = sortDirection === "asc" ? 1 : -1

        if (sortField === "full_name") {
          return a.full_name.localeCompare(b.full_name) * sortFactor
        } else if (sortField === "gross_pay") {
          return (Number(a.gross_pay) - Number(b.gross_pay)) * sortFactor
        } else if (sortField === "net_pay") {
          return (Number(a.net_pay) - Number(b.net_pay)) * sortFactor
        } else if (sortField === "total_deductions") {
          return (Number(a.total_deductions) - Number(b.total_deductions)) * sortFactor
        } else {
          // Default to sorting by ID in descending order
          return (a.id - b.id) * sortFactor
        }
      })
  }, [payrollData, searchTerm, statusFilter, periodFilter, departmentFilter, sortField, sortDirection])

  // Group payrolls by status for kanban view
  const payrollsByStatus = useMemo(() => {
    const result = {}

    // Initialize all status columns
    statusColumns.forEach((column) => {
      result[column.id] = []
    })

    // Populate with filtered payrolls
    filteredPayrolls.forEach((payroll) => {
      const status = payroll.status.toLowerCase()
      if (result[status]) {
        result[status].push(payroll)
      } else {
        // If status doesn't match our predefined columns, add to pending
        result["pending"].push(payroll)
      }
    })

    return result
  }, [filteredPayrolls])

  useEffect(() => {
    // Set up a timer to delay the search
    const timer = setTimeout(() => {
      if (searchTerm !== "") {
        applyFilters()
      }
    }, 500) // 500ms delay

    // Clear the timer on each change
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Add this useEffect to ensure today's date is set as default when no date filter is applied
  useEffect(() => {
    // If no date filter is set and we're loading for the first time, set today's date
    if (!dateFilter && !filters?.date && activeTab === "daily") {
      const today = new Date().toISOString().split("T")[0]
      setDailyViewDateFilter(today)

      // Only apply the filter if we have data but none for today
      const attendanceByDate = {}
      if (
        Array.isArray(attendanceData) &&
        attendanceData.length > 0 &&
        !Object.keys(attendanceByDate).includes(today)
      ) {
        handleDateFilter(today)
      }
    }
  }, [attendanceData, dateFilter, filters, activeTab])

  // Modify the handleDateFilter function to ensure it properly updates the URL and fetches data
  const handleDateFilter = (value) => {
    setDateFilter(value || null)

    // If we're in daily view, also update the daily view filter
    if (activeTab === "daily") {
      setDailyViewDateFilter(value || "")
    }

    // Use router.get to update the URL and fetch data
    router.get(
      "/attendance",
      { search: searchTerm, status: statusFilter, date: value || null },
      { preserveScroll: true },
    )
  }

  // Add this function to specifically load today's data
  const loadTodayData = () => {
    const today = new Date().toISOString().split("T")[0]
    setDateFilter(today)
    setDailyViewDateFilter(today)

    router.get(
      "/attendance",
      { search: searchTerm, status: statusFilter, date: today },
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success("Loaded today's attendance data")
        },
      },
    )
  }

  // Add this useEffect to set the latest period as default on initial load

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Payroll", href: "/payroll" },
      ]}
    >
      <div className="flex-1 p-6 bg-white text-black dark:bg-black dark:text-white transition-colors duration-300">
        <Head title="Payroll" />

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Payroll Management</h1>
            <p className="text-slate-600 dark:text-slate-400">Manage employee payroll and payment periods</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
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
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Payrolls</p>
                <p className="text-2xl font-bold mt-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {payrollSummary.totalCount}
                </p>
              </div>
              <div className="p-2 rounded-full bg-gray-100 text-black dark:bg-gray-900 dark:text-white group-hover:bg-gray-200 dark:group-hover:bg-gray-800 transition-colors">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {Array.isArray(payrollEntries.data)
                  ? payrollEntries.data.filter(
                      (p) => p.created_at && new Date(p.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    ).length
                  : 0}{" "}
                new in last 7 days
              </p>
            </div>
          </Card>

          <Card className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Gross Pay</p>
                <p className="text-2xl font-bold mt-1 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                  ₱
                  {payrollSummary.totalGrossPay.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="p-2 rounded-full bg-gray-100 text-black dark:bg-gray-900 dark:text-white group-hover:bg-gray-200 dark:group-hover:bg-gray-800 transition-colors">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Per employee avg:</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  ₱
                  {payrollSummary.totalCount > 0
                    ? (payrollSummary.totalGrossPay / payrollSummary.totalCount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "0.00"}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Net Pay</p>
                <p className="text-2xl font-bold mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  ₱
                  {payrollSummary.totalNetPay.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="p-2 rounded-full bg-gray-100 text-black dark:bg-gray-900 dark:text-white group-hover:bg-gray-200 dark:group-hover:bg-gray-800 transition-colors">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>Deductions</span>
                <span>
                  {payrollSummary.totalGrossPay
                    ? ((payrollSummary.totalDeductions / payrollSummary.totalGrossPay) * 100).toFixed(1)
                    : "0"}
                  % of gross
                </span>
              </div>
              <Progress
                value={
                  payrollSummary.totalGrossPay
                    ? (payrollSummary.totalDeductions / payrollSummary.totalGrossPay) * 100
                    : 0
                }
                className="h-1.5 bg-slate-100 dark:bg-slate-700"
              />
            </div>
          </Card>

          <Card className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Approved/Paid</p>
                <p className="text-2xl font-bold mt-1 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                  {payrollSummary.completedCount}
                </p>
                <p className="text-xs text-green-500 mt-1">
                  {payrollSummary.totalCount > 0
                    ? Math.round((payrollSummary.completedCount / payrollSummary.totalCount) * 100)
                    : 0}
                  % of total
                </p>
              </div>
              <div className="p-2 rounded-full bg-gray-100 text-black dark:bg-gray-900 dark:text-white group-hover:bg-gray-200 dark:group-hover:bg-gray-800 transition-colors">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Progress
                value={
                  payrollSummary.totalCount > 0 ? (payrollSummary.completedCount / payrollSummary.totalCount) * 100 : 0
                }
                className="h-1.5 bg-slate-100 dark:bg-slate-700"
              />
            </div>
          </Card>

          <Card className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Pending</p>
                <p className="text-2xl font-bold mt-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {payrollSummary.pendingCount}
                </p>
                <p className="text-xs text-amber-500 mt-1">
                  {payrollSummary.totalCount > 0
                    ? Math.round((payrollSummary.pendingCount / payrollSummary.totalCount) * 100)
                    : 0}
                  % of total
                </p>
              </div>
              <div className="p-2 rounded-full bg-gray-100 text-black dark:bg-gray-900 dark:text-white group-hover:bg-gray-200 dark:group-hover:bg-gray-800 transition-colors">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Progress
                value={
                  payrollSummary.totalCount > 0 ? (payrollSummary.pendingCount / payrollSummary.totalCount) * 100 : 0
                }
                className="h-1.5 bg-slate-100 dark:bg-slate-700"
              />
            </div>
          </Card>
        </div>

        {/* Tabs Navigation - Moved above search */}
        <Tabs
          defaultValue="entries"
          className="mb-6"
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as "entries" | "periods" | "kanban")
          }}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="entries">Payroll Entries</TabsTrigger>
            <TabsTrigger value="periods">Payroll Periods</TabsTrigger>
            <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          </TabsList>

          {/* Search & Filter Section - Conditionally rendered based on active tab */}
          {(activeTab === "entries" || activeTab === "kanban") && (
            <Card className="p-4 mb-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="mb-4 flex flex-col md:flex-row gap-2 items-center">
                <div className="relative flex-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="currentColor"
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-600"
                    viewBox="0 0 1792 1792"
                  >
                    <path d="M1216 832q0-52-38-90t-90-38q-54 0-90 38t-36 90q0 52 36 90t90 38q52 0 90-38t38-90zm640 896q0 52-38 90t-90 38h-1408q-52 0-90-38t-38-90v-704q0-52 38-90t90-38h352q0-54-19-90t-53-56q-34-27-53-56t-19-90h-384q-52 0-90-38t-38-90v-64q0-52 38-90t90-38h1408q52 0 90 38t38 90v64q0 52-38 90t-90 38h-384q0 54 19 90t53 56q34 27 53 56t19 90h352q52 0 90 38t38 90v704zm-1344-160q0 80-56 136t-136 56q-80 0-136-56t-56-136q0-80 56-136t136-56q80 0 136 56t56 136z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by employee name or number..."
                    className="pl-10 p-2 w-full border rounded-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                </div>

                <select
                  className="p-2 border rounded-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
                  value={statusFilter ?? ""}
                  onChange={(e) => handleStatusFilterChange(e.target.value || null)}
                >
                  <option value="">All Statuses</option>
                  <option value="generated">Generated</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  className="p-2 border rounded-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
                  value={periodFilter?.toString() ?? ""}
                  onChange={(e) => handlePeriodFilterChange(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">All Periods</option>
                  {Array.isArray(payrollPeriods) &&
                    payrollPeriods.map((period) => (
                      <option key={period.id} value={period.week_id.toString()}>
                        Week ID: {period.week_id} (
                        {new Date(period.period_start).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        -{" "}
                        {new Date(period.period_end).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                        )
                      </option>
                    ))}
                </select>

                {/* Department filter dropdown */}
                <select
                  className="p-2 border rounded-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
                  value={departmentFilter ?? ""}
                  onChange={(e) => handleDepartmentFilterChange(e.target.value || null)}
                >
                  <option value="">All Departments</option>
                  {/* Use the departments array from props instead of extracting from payroll entries */}
                  {Array.isArray(departments) &&
                    departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                </select>

                <Button variant="outline" onClick={handleClearFilters} className="whitespace-nowrap">
                  Clear Filters
                </Button>
              </div>
            </Card>
          )}

          <TabsContent value="entries" className="mt-0">
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
                          className="py-3 px-2 text-left font-semibold cursor-pointer w-16"
                          onClick={() => toggleSort("id")}
                        >
                          <div className="flex items-center">
                            ID
                            {sortField === "id" && (
                              <ArrowDownUp className={`ml-1 h-3 w-3 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                            )}
                          </div>
                        </th>
                        <th className="py-3 px-2 text-left font-semibold w-24">Emp #</th>
                        <th
                          className="py-3 px-2 text-left font-semibold cursor-pointer"
                          onClick={() => toggleSort("full_name")}
                        >
                          <div className="flex items-center">
                            Full Name
                            {sortField === "full_name" && (
                              <ArrowDownUp className={`ml-1 h-3 w-3 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                            )}
                          </div>
                        </th>
                        <th className="py-3 px-2 text-left font-semibold w-28">Department</th>
                        <th className="py-3 px-2 text-left font-semibold w-20">Week ID</th>
                        <th className="py-3 px-2 text-left font-semibold">Payroll Period</th>
                        <th
                          className="py-3 px-2 text-left font-semibold cursor-pointer w-24"
                          onClick={() => toggleSort("gross_pay")}
                        >
                          <div className="flex items-center">
                            Gross Pay
                            {sortField === "gross_pay" && (
                              <ArrowDownUp className={`ml-1 h-3 w-3 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                            )}
                          </div>
                        </th>
                        <th
                          className="py-3 px-2 text-left font-semibold cursor-pointer w-24"
                          onClick={() => toggleSort("total_deductions")}
                        >
                          <div className="flex items-center">
                            Deductions
                            {sortField === "total_deductions" && (
                              <ArrowDownUp className={`ml-1 h-3 w-3 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                            )}
                          </div>
                        </th>
                        <th
                          className="py-3 px-2 text-left font-semibold cursor-pointer w-24"
                          onClick={() => toggleSort("net_pay")}
                        >
                          <div className="flex items-center">
                            Net Pay
                            {sortField === "net_pay" && (
                              <ArrowDownUp className={`ml-1 h-3 w-3 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                            )}
                          </div>
                        </th>
                        <th className="py-3 px-2 text-left font-semibold w-24">Status</th>
                        <th className="py-3 px-2 text-left font-semibold w-32">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollEntries.data.length > 0 ? (
                        payrollEntries.data.map((payroll) => (
                          <tr
                            key={payroll.id}
                            className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            draggable
                            onDragStart={(e) => handleDragStart(e, payroll)}
                          >
                            <td className="py-3 px-2 font-medium">#{payroll.id}</td>
                            <td className="py-3 px-2">{payroll.employee_number}</td>
                            <td className="py-3 px-2">{payroll.full_name}</td>
                            <td className="py-3 px-2">{payroll.department_name || ""}</td>
                            <td className="py-3 px-2">{payroll.week_id}</td>
                            <td className="py-3 px-2">
                              {getPayrollPeriodName(payroll.week_id)
                                .replace(/^[0-9]+ \(/, "")
                                .replace(/\)$/, "")}
                            </td>
                            <td className="py-3 px-2">{formatCurrency(payroll.gross_pay)}</td>
                            <td className="py-3 px-2">{formatCurrency(payroll.total_deductions)}</td>
                            <td className="py-3 px-2">{formatCurrency(payroll.net_pay)}</td>
                            <td className="py-3 px-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Badge className={`${getStatusBadgeColor(payroll.status)} cursor-pointer`}>
                                    {payroll.status}
                                  </Badge>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  {statusColumns.map((column) => (
                                    <DropdownMenuItem
                                      key={column.id}
                                      onClick={() => handleStatusChange(payroll, column.id)}
                                      className={
                                        payroll.status.toLowerCase() === column.id
                                          ? "bg-slate-100 dark:bg-slate-800"
                                          : ""
                                      }
                                    >
                                      <div className="flex items-center">
                                        {column.icon}
                                        <span className="ml-2">{column.title}</span>
                                      </div>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                            <td className="py-3 px-2 flex space-x-1 flex-row">
                            <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7 border-orange-200 text-orange-600 hover:border-orange-300 dark:border-orange-800 dark:text-orange-400 dark:hover:border-orange-700"
                                      onClick={() => openUpdateModal(payroll)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Update Payslip</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="relative">
                                   
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7 border-blue-200 text-blue-600 hover:border-blue-300 dark:border-blue-800 dark:text-blue-400 dark:hover:border-blue-700"
                                        onClick={() => printPayroll(payroll)}
                                      >
                                        <Printer className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs">
                                      Print Payslip
                                     
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7 border-green-200 text-green-600 hover:border-green-300 dark:border-green-800 dark:text-green-400 dark:hover:border-green-700"
                                      onClick={() => sendEmail(payroll)}
                                    >
                                      <Mail className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Email Payslip</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7 border-red-200 text-red-600 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:border-red-700"
                                      onClick={() => handleDeletePayroll(payroll.id)}
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
                                  <TooltipContent>Delete Payroll</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-slate-500 dark:text-slate-400">
                            No payroll records found matching your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {payrollEntries.total > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Showing {payrollEntries.from} to {payrollEntries.to} of {payrollEntries.total} entries
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(payrollEntries.current_page - 1)}
                        disabled={payrollEntries.current_page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      {Array.from({ length: Math.min(5, payrollEntries.last_page) }, (_, i) => {
                        // Show pages around current page
                        let pageNum = payrollEntries.current_page
                        if (payrollEntries.last_page <= 5) {
                          pageNum = i + 1
                        } else if (payrollEntries.current_page <= 3) {
                          pageNum = i + 1
                        } else if (payrollEntries.current_page >= payrollEntries.last_page - 2) {
                          pageNum = payrollEntries.last_page - 4 + i
                        } else {
                          pageNum = payrollEntries.current_page - 2 + i
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={payrollEntries.current_page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(payrollEntries.current_page + 1)}
                        disabled={payrollEntries.current_page === payrollEntries.last_page}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="periods" className="mt-0">
            <PayrollPeriodsTab
              periods={payrollPeriods}
              onPeriodSelect={handlePeriodFilterChange}
              onTabChange={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="kanban" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {statusColumns.map((column) => (
                  <div
                    key={column.id}
                    className="flex flex-col h-full"
                    onDragOver={(e) => handleDragOver(e, column.id)}
                    onDrop={(e) => handleDrop(e, column.id)}
                  >
                    <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded-t-lg flex items-center justify-between">
                      <div className="flex items-center">
                        {column.icon}
                        <h3 className="font-medium ml-2">{column.title}</h3>
                      </div>
                      <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {payrollsByStatus[column.id]?.length || 0}
                      </Badge>
                    </div>
                    <div className="bg-white dark:bg-black p-2 rounded-b-lg flex-1 min-h-[300px] overflow-y-auto">
                      {payrollsByStatus[column.id]?.length > 0 ? (
                        payrollsByStatus[column.id].map((payroll) => (
                          <div
                            key={payroll.id}
                            className="bg-white dark:bg-black p-3 rounded-lg mb-2 shadow-sm border border-gray-200 dark:border-gray-800 cursor-move"
                            draggable
                            onDragStart={(e) => handleDragStart(e, payroll)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium">{payroll.full_name}</span>
                              <Badge className={getStatusBadgeColor(payroll.status)}>{payroll.status}</Badge>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                              ID: #{payroll.id} | Emp #: {payroll.employee_number}
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Gross: {formatCurrency(payroll.gross_pay)}</span>
                              <span>Net: {formatCurrency(payroll.net_pay)}</span>
                            </div>
                            <div className="flex mt-2 space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0 border-blue-200 text-blue-600 hover:border-blue-300 dark:border-blue-800 dark:text-blue-400 dark:hover:border-blue-700"
                                onClick={() => printPayroll(payroll)}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0 border-green-200 text-green-600 hover:border-green-300 dark:border-green-800 dark:text-green-400 dark:hover:border-green-700"
                                onClick={() => sendEmail(payroll)}
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-600 text-sm">
                          No payrolls in this status
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Status Change Confirmation Modal */}

        {/* Modals */}
        {isAddModalOpen && (
          <AddPayrollModal
            onClose={closeAddModal}
            employees={employees}
            payrollPeriods={payrollPeriods}
            attendances={attendances}
          />
        )}
        {isUpdateModalOpen && selectedPayroll && (
          <UpdatePayrollModal
            payroll={selectedPayroll}
            onClose={closeUpdateModal}
            employees={employees}
            payrollPeriods={payrollPeriods}
            attendances={attendances}
          />
        )}
        {isPrintModalOpen && selectedPayroll && (
          <PrintPayslip
            payroll={selectedPayroll}
            onClose={() => {
              setIsPrintModalOpen(false)
              setSelectedPayroll(null)
            }}
          />
        )}
      </div>
    </AppLayout>
  )
}

export default PayrollIndex

