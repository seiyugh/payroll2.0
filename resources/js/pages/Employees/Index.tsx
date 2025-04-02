"use client"

import { Label } from "@/components/ui/label"

import { Head, router, usePage } from "@inertiajs/react"
import { useState, useEffect, useMemo } from "react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowDownUp,
  Filter,
  Plus,
  Search,
  Users,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  Clock,
  CalendarDays,
  ListFilter,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import AddEmployeeModal from "./AddEmployeeModal"
import UpdateEmployeeModal from "./UpdateEmployeeModal"
import ViewEmployeeModal from "./ViewEmployeeModal"
import Modal from "./Modal"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"

// Import the export utility
import { exportToCSV } from "@/utils/export-utils"

interface Employee {
  id?: number
  employee_number: string
  full_name: string
  last_name: string
  first_name: string
  middle_name: string | null
  address: string
  position: string
  department: string
  assigned_area: string | null
  date_hired: string
  years_of_service: number
  employment_status: string
  date_of_regularization: string | null
  status_201: string | null
  resignation_termination_date: string | null
  daily_rate: number
  civil_status: string
  gender: string
  birthdate: string
  birthplace: string
  age: number
  contacts: string
  id_status: string
  sss_no: string | null
  tin_no: string | null
  philhealth_no: string | null
  pagibig_no: string | null
  emergency_contact_name: string
  emergency_contact_mobile: string
  created_at?: string | null
  updated_at?: string | null
  email?: string | null
  // New fields from migration
  id_no: string | null
  ub_account: string | null
  resume: string | null
  government_id: boolean
  type_of_id: "PhilID" | "DL" | "Phi-health" | "SSS" | "UMID" | "POSTAL" | "Passport" | "Voters" | "TIN" | "D1" | null
  clearance: string | null
  id_number: string | null
  staff_house: boolean
  birth_certificate: boolean
  marriage_certificate: boolean
  tor: boolean
  diploma_hs_college: boolean
  contract: "SIGNED" | "NOT YET" | "REVIEW"
  performance_evaluation: boolean
  medical_cert: boolean
  remarks: string | null
}

interface PaginationData {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
  links: {
    url: string | null
    label: string
    active: boolean
  }[]
}

interface DocumentCompletionStats {
  contractSigned: number
  contractSignedPercent: number
  medicalComplete: number
  medicalCompletePercent: number
  governmentIdComplete: number
  governmentIdCompletePercent: number
  allDocsComplete: number
  allDocsCompletePercent: number
}

interface YearsOfServiceStats {
  lessThanOneYear: number
  oneToTwoYears: number
  threeToFiveYears: number
  moreThanFiveYears: number
}

interface DepartmentDistribution {
  [department: string]: {
    count: number
    percentage: number
  }
}

interface PositionDistribution {
  [position: string]: {
    count: number
    percentage: number
  }
}

interface EmployeesIndexProps {
  employees: {
    data: Employee[]
    meta?: PaginationData
    links?: any
    from?: number
    to?: number
    total?: number
    current_page?: number
    last_page?: number
    per_page?: number
  }
  stats?: {
    totalEmployees: number
    regularCount: number
    probationaryCount: number
    departmentCount: number
    maleCount: number
    femaleCount: number
    averageAge: number
    averageYearsOfService: number
    totalDailyRate: number
    documentCompletion?: DocumentCompletionStats
    yearsOfService?: YearsOfServiceStats
    departmentDistribution?: DepartmentDistribution
    positionDistribution?: PositionDistribution
  }
  departments?: string[]
  positions?: string[]
  filters?: {
    search?: string
    position?: string
    department?: string
    status?: string
  }
}

const EmployeesIndex = ({
  employees,
  stats = {},
  departments = [],
  positions = [],
  filters = {},
}: EmployeesIndexProps) => {
  const [searchTerm, setSearchTerm] = useState(filters.search || "")
  const [positionFilter, setPositionFilter] = useState(filters.position || "")
  const [departmentFilter, setDepartmentFilter] = useState(filters.department || "")
  const [statusFilter, setStatusFilter] = useState(filters.status || "")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [activeView, setActiveView] = useState("all-records")
  const [sortField, setSortField] = useState<string>("employee_number")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split("T")[0])
  const [periodStart, setPeriodStart] = useState<string>(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
  )
  const [periodEnd, setPeriodEnd] = useState<string>(new Date().toISOString().split("T")[0])
  const [showFilters, setShowFilters] = useState(false)

  // Get pagination data
  const paginationData = {
    current_page: employees.current_page || employees.meta?.current_page || 1,
    last_page: employees.last_page || employees.meta?.last_page || 1,
    per_page: employees.per_page || employees.meta?.per_page || 10,
    total: employees.total || employees.meta?.total || 0,
    from: employees.from || employees.meta?.from || 0,
    to: employees.to || employees.meta?.to || 0,
    links: employees.links || employees.meta?.links || [],
  }

  // Get employee data from props
  const employeeData = employees.data || []

  // Debug function to check data
  useEffect(() => {
    console.log("Employee Data:", employeeData)
    if (employeeData.length > 0) {
      console.log("Sample employee record:", employeeData[0])
      console.log("Fields available:", Object.keys(employeeData[0]))
    }
    console.log("Stats:", stats)
  }, [employeeData, stats])

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [employeeData])

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

  // Open & Close Add Employee Modal
  const openAddModal = () => setIsAddModalOpen(true)
  const closeAddModal = () => setIsAddModalOpen(false)

  // Open & Close View Employee Modal
  const openViewModal = (employee: Employee) => {
    setSelectedEmployee(employee)
    setIsViewModalOpen(true)
  }
  const closeViewModal = () => {
    setSelectedEmployee(null)
    setIsViewModalOpen(false)
  }

  // Open & Close Update Employee Modal
  const openUpdateModal = (employee: Employee) => {
    setSelectedEmployee(employee)
    setIsUpdateModalOpen(true)
  }
  const closeUpdateModal = () => {
    setSelectedEmployee(null)
    setIsUpdateModalOpen(false)
  }

  // Handle adding new employee
  const handleAddEmployee = (data: Employee) => {
    router.post(route("employees.store"), data, {
      onSuccess: () => {
        toast.success("Employee added successfully!")
        closeAddModal()
        refreshData()
      },
      onError: (errors) => {
        Object.values(errors).forEach((message) => {
          toast.error(`Error: ${message}`)
        })
      },
    })
  }

  // Handle updating an employee
  const handleUpdateEmployee = (data: Employee) => {
    if (selectedEmployee?.id) {
      router.put(`/employees/${selectedEmployee.id}`, data, {
        onSuccess: () => {
          toast.success("Employee updated successfully!")
          closeUpdateModal()
          refreshData()
        },
        onError: (errors) => {
          Object.values(errors).forEach((message) => {
            toast.error(`Error: ${message}`)
          })
        },
      })
    }
  }

  const handleDeleteEmployee = (employeeId: number) => {
    console.log("Starting employee delete process...")
    console.log("Employee ID being deleted:", employeeId)
    console.log("Delete URL:", `/employees/${employeeId}`)

    router.delete(`/employees/${employeeId}`, {
      onSuccess: () => {
        console.log("Employee deleted successfully!")
        toast.success("Employee deleted successfully!")
        setIsDeleteModalOpen(false)
        refreshData()
      },
      onError: (errors) => {
        console.error("Error deleting employee:", errors)
        Object.values(errors).forEach((message) => {
          toast.error(`Error: ${message}`)
        })
      },
    })
  }

  // Handle bulk add employees
  const handleBulkAddEmployees = (file: File) => {
    const formData = new FormData()
    formData.append("file", file)

    router.post("/employees/bulk-store", formData, {
      preserveScroll: true,
      onSuccess: () => {
        toast.success("Employees added successfully from bulk upload!")
        setIsBulkAddModalOpen(false)
        refreshData()
      },
      onError: (errors) => {
        Object.values(errors).forEach((message) => {
          toast.error(`Error: ${message}`)
        })
      },
    })
  }

  // Clear all filters
  const clearFilters = () => {
    // Store current scroll position
    const scrollPosition = window.scrollY

    setSearchTerm("")
    setPositionFilter("")
    setDepartmentFilter("")
    setStatusFilter("")

    setIsLoading(true)
    router.get(
      (window as any).route("employees.index"),
      {
        page: 1,
        perPage: paginationData.per_page,
        sort: sortField,
        direction: sortDirection,
        search: "",
        position: "",
        department: "",
        status: "",
      },
      {
        preserveState: true,
        preserveScroll: true, // Add this to preserve scroll position
        replace: true,
        only: ["employees", "stats"],
        onSuccess: () => {
          setIsLoading(false)
          // Restore scroll position
          window.scrollTo(0, scrollPosition)
        },
        onError: () => {
          setIsLoading(false)
          // Restore scroll position even on error
          window.scrollTo(0, scrollPosition)
        },
      },
    )
  }

  // Toggle sort
  const toggleSort = (field: string) => {
    const newDirection = sortField === field && sortDirection === "asc" ? "desc" : "asc"
    setSortField(field)
    setSortDirection(newDirection)

    router.get(
      (window as any).route("employees.index"),
      {
        page: paginationData.current_page,
        perPage: paginationData.per_page,
        sort: field,
        direction: newDirection,
        search: searchTerm,
        position: positionFilter,
        department: departmentFilter,
        status: statusFilter,
      },
      {
        preserveState: true,
        replace: true,
        only: ["employees", "stats"],
      },
    )
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setIsLoading(true)

    router.get(
      (window as any).route("employees.index"),
      {
        page,
        perPage: paginationData.per_page,
        sort: sortField,
        direction: sortDirection,
        search: searchTerm,
        position: positionFilter,
        department: departmentFilter,
        status: statusFilter,
      },
      {
        preserveState: true,
        preserveScroll: true,
        replace: true,
        only: ["employees", "stats"],
        onSuccess: () => setIsLoading(false),
      },
    )
  }

  // Handle per page change
  const handlePerPageChange = (newPerPage: number) => {
    setIsLoading(true)

    router.get(
      window.route("employees.index"),
      {
        page: 1,
        perPage: newPerPage,
        sort: sortField,
        direction: sortDirection,
        search: searchTerm,
        position: positionFilter,
        department: departmentFilter,
        status: statusFilter,
      },
      {
        preserveState: true,
        replace: true,
        only: ["employees", "stats"],
        onSuccess: () => setIsLoading(false),
      },
    )
  }

  // Handle individual filter changes
  const handleFilterChange = (filterType: string, value: string) => {
    setIsLoading(true)

    // Store current scroll position
    const scrollPosition = window.scrollY

    // Update the state first
    if (filterType === "search") setSearchTerm(value)
    if (filterType === "position") setPositionFilter(value)
    if (filterType === "department") setDepartmentFilter(value)
    if (filterType === "status") setStatusFilter(value)

    const params = {
      page: 1, // Reset to first page when filter changes
      perPage: paginationData.per_page,
      sort: sortField,
      direction: sortDirection,
      search: filterType === "search" ? value : searchTerm,
      position: filterType === "position" ? value : positionFilter,
      department: filterType === "department" ? value : departmentFilter,
      status: filterType === "status" ? value : statusFilter,
    }

    // Use router.get directly with the path instead of route function
    router.get(
      "/employees", // Direct path instead of route("employees.index")
      params,
      {
        preserveState: true,
        preserveScroll: true, // Add this to preserve scroll position
        replace: true,
        only: ["employees", "stats"],
        onSuccess: () => {
          setIsLoading(false)
          // Restore scroll position
          window.scrollTo(0, scrollPosition)
        },
        onError: () => {
          setIsLoading(false)
          // Restore scroll position even on error
          window.scrollTo(0, scrollPosition)
        },
      },
    )
  }

  // Refresh data
  const refreshData = () => {
    setIsRefreshing(true)
    router.reload({
      preserveScroll: true,
      onSuccess: () => {
        setIsRefreshing(false)
      },
      onError: () => {
        setIsRefreshing(false)
        toast.error("Failed to refresh data")
      },
    })
  }

  // Get unique positions and departments for filters
  const uniquePositions = useMemo(() => {
    return positions.length > 0 ? positions : Array.from(new Set(employeeData.map((emp) => emp.position)))
  }, [employeeData, positions])

  const uniqueDepartments = useMemo(() => {
    return departments.length > 0 ? departments : Array.from(new Set(employeeData.map((emp) => emp.department)))
  }, [employeeData, departments])

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(employeeData.map((emp) => emp.employment_status)))
  }, [employeeData])

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "regular":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
      case "probationary":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
      case "resigned":
      case "terminated":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
    }
  }

  const { route } = usePage().props

  // Export to CSV
  const handleExportToCSV = () => {
    toast.success("Exporting employee data...")

    try {
      // Prepare data for export
      const exportData = employeeData.map((employee) => {
        return {
          EmployeeNumber: employee.employee_number,
          FullName: employee.full_name,
          Position: employee.position,
          Department: employee.department,
          DateHired: new Date(employee.date_hired).toLocaleDateString(),
          EmploymentStatus: employee.employment_status,
          DailyRate: employee.daily_rate,
          Email: employee.email || "",
          Address: employee.address,
          Gender: employee.gender,
          CivilStatus: employee.civil_status,
          Birthdate: employee.birthdate ? new Date(employee.birthdate).toLocaleDateString() : "",
          ContactNumber: employee.contacts,
          SSS: employee.sss_no || "",
          TIN: employee.tin_no || "",
          PhilHealth: employee.philhealth_no || "",
          PagIBIG: employee.pagibig_no || "",
        }
      })

      // Generate filename with date
      const date = new Date().toISOString().split("T")[0]
      const filename = `employees_export_${date}.csv`

      // Export to CSV
      exportToCSV(exportData, filename)

      toast.success("Export completed successfully!")
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export data. Please try again.")
    }
  }

  // Calculate completion percentage for onboarding
  const calculateOnboardingCompletion = () => {
    if (stats.totalEmployees === 0) return 0

    // Use the backend-provided stats if available
    if (stats.documentCompletion) {
      return stats.documentCompletion.allDocsCompletePercent
    }

    // Fallback to calculating from current page data
    const completedCount = employeeData.filter(
      (emp) => emp.sss_no && emp.tin_no && emp.philhealth_no && emp.pagibig_no,
    ).length
    return Math.round((completedCount / employeeData.length) * 100)
  }

  // Get document completion stats from backend or calculate from current page
  const getDocumentStats = () => {
    // Use the backend-provided stats if available
    if (stats.documentCompletion) {
      return stats.documentCompletion
    }

    // Fallback to calculating from current page data
    const totalEmployees = employeeData.length
    if (totalEmployees === 0) {
      return {
        contractSigned: 0,
        contractSignedPercent: 0,
        medicalComplete: 0,
        medicalCompletePercent: 0,
        governmentIdComplete: 0,
        governmentIdCompletePercent: 0,
        allDocsComplete: 0,
        allDocsCompletePercent: 0,
      }
    }

    const contractSigned = employeeData.filter((e) => e.contract === "SIGNED").length
    const medicalComplete = employeeData.filter((e) => e.medical_cert).length
    const governmentIdComplete = employeeData.filter((e) => e.government_id).length
    const allDocsComplete = employeeData.filter(
      (e) =>
        e.contract === "SIGNED" &&
        e.medical_cert &&
        e.government_id &&
        e.birth_certificate &&
        e.sss_no &&
        e.tin_no &&
        e.philhealth_no &&
        e.pagibig_no,
    ).length

    return {
      contractSigned,
      contractSignedPercent: Math.round((contractSigned / totalEmployees) * 100),
      medicalComplete,
      medicalCompletePercent: Math.round((medicalComplete / totalEmployees) * 100),
      governmentIdComplete,
      governmentIdCompletePercent: Math.round((governmentIdComplete / totalEmployees) * 100),
      allDocsComplete,
      allDocsCompletePercent: Math.round((allDocsComplete / totalEmployees) * 100),
    }
  }

  // Calculate gender distribution
  const calculateGenderDistribution = () => {
    // Use the backend stats if available
    if (stats.maleCount !== undefined && stats.femaleCount !== undefined) {
      const totalEmployees = stats.totalEmployees || 0
      const maleCount = stats.maleCount || 0
      const femaleCount = stats.femaleCount || 0

      return {
        male: maleCount,
        female: femaleCount,
        malePercentage: totalEmployees > 0 ? Math.round((maleCount / totalEmployees) * 100) : 0,
        femalePercentage: totalEmployees > 0 ? Math.round((femaleCount / totalEmployees) * 100) : 0,
      }
    }

    // Fallback to calculating from current page data
    const totalEmployees = employeeData.length
    if (totalEmployees === 0) return { male: 0, female: 0, malePercentage: 0, femalePercentage: 0 }

    const maleCount = employeeData.filter((emp) => emp.gender === "Male").length
    const femaleCount = employeeData.filter((emp) => emp.gender === "Female").length

    return {
      male: maleCount,
      female: femaleCount,
      malePercentage: Math.round((maleCount / totalEmployees) * 100),
      femalePercentage: Math.round((femaleCount / totalEmployees) * 100),
    }
  }

  // Get years of service stats
  const getYearsOfServiceStats = () => {
    // Use the backend-provided stats if available
    if (stats.yearsOfService) {
      return stats.yearsOfService
    }

    // Fallback to calculating from current page data
    return {
      lessThanOneYear: employeeData.filter((e) => e.years_of_service < 1).length,
      oneToTwoYears: employeeData.filter((e) => e.years_of_service >= 1 && e.years_of_service < 3).length,
      threeToFiveYears: employeeData.filter((e) => e.years_of_service >= 3 && e.years_of_service <= 5).length,
      moreThanFiveYears: employeeData.filter((e) => e.years_of_service > 5).length,
    }
  }

  // Get department distribution
  const getDepartmentDistribution = () => {
    // Use the backend-provided stats if available
    if (stats.departmentDistribution) {
      return Object.entries(stats.departmentDistribution).map(([department, data]) => ({
        department,
        count: data.count,
        percentage: data.percentage,
      }))
    }

    // Fallback to calculating from current page data
    const distribution: Record<string, number> = {}
    employeeData.forEach((emp) => {
      if (distribution[emp.department]) {
        distribution[emp.department]++
      } else {
        distribution[emp.department] = 1
      }
    })

    return Object.entries(distribution).map(([department, count]) => ({
      department,
      count,
      percentage: Math.round((count / employeeData.length) * 100),
    }))
  }

  // Get position distribution
  const getPositionDistribution = () => {
    // Use the backend-provided stats if available
    if (stats.positionDistribution) {
      return Object.entries(stats.positionDistribution).map(([position, data]) => ({
        position,
        count: data.count,
        percentage: data.percentage,
      }))
    }

    // Fallback to calculating from current page data
    const distribution: Record<string, number> = {}
    employeeData.forEach((emp) => {
      if (distribution[emp.position]) {
        distribution[emp.position]++
      } else {
        distribution[emp.position] = 1
      }
    })

    return Object.entries(distribution).map(([position, count]) => ({
      position,
      count,
      percentage: Math.round((count / employeeData.length) * 100),
    }))
  }

  // Get total employees count from stats
  const totalEmployees = stats.totalEmployees || 0
  const regularEmployees = stats.regularCount || 0
  const probationaryEmployees = stats.probationaryCount || 0
  const departmentCount = stats.departmentCount || 0
  const regularPercentage = totalEmployees > 0 ? Math.round((regularEmployees / totalEmployees) * 100) : 0
  const probationaryPercentage = totalEmployees > 0 ? Math.round((probationaryEmployees / totalEmployees) * 100) : 0
  const genderDistribution = calculateGenderDistribution()
  const onboardingCompletion = calculateOnboardingCompletion()
  const documentStats = getDocumentStats()
  const yearsOfServiceStats = getYearsOfServiceStats()
  const departmentDistribution = getDepartmentDistribution()
  const positionDistribution = getPositionDistribution()

  // Filter employees by date for daily view
  const dailyEmployees = useMemo(() => {
    return employeeData.filter((emp) => {
      const empDate = new Date(emp.date_hired).toISOString().split("T")[0]
      return empDate === dateFilter
    })
  }, [employeeData, dateFilter])

  // Filter employees by period for period view
  const periodEmployees = useMemo(() => {
    return employeeData.filter((emp) => {
      const empDate = new Date(emp.date_hired).toISOString().split("T")[0]
      return empDate >= periodStart && empDate <= periodEnd
    })
  }, [employeeData, periodStart, periodEnd])

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Employees", href: "/employees" },
      ]}
    >
      <div className="flex-1 p-6 bg-white text-black dark:bg-black dark:text-white transition-colors duration-300">
        <Head title="Employees" />

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Employee Directory</h1>
            <p className="text-slate-600 dark:text-slate-400">Manage your employee records and information</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <Button
              variant="outline"
              onClick={openAddModal}
              className="border-indigo-200 text-indigo-600 hover:border-indigo-300 dark:border-indigo-800 dark:text-indigo-400 dark:hover:border-indigo-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Employee
            </Button>
            <Button
              onClick={() => setIsBulkAddModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Bulk Add
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                    onClick={handleExportToCSV}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export to CSV</TooltipContent>
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <ListFilter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle Filters</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Employees</p>
                <p className="text-2xl font-bold mt-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-500">
                  {totalEmployees}
                </p>
                <p className="text-xs text-indigo-500 mt-1">
                  {paginationData.from} to {paginationData.to} shown
                </p>
              </div>
              <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/20 text-indigo-500 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/30 transition-colors">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Regular Employees</p>
                <p className="text-2xl font-bold mt-1 group-hover:text-green-600 dark:group-hover:text-green-500">
                  {regularEmployees}
                </p>
                <p className="text-xs text-green-500 mt-1 transition-colors group-hover:text-green-600 dark:group-hover:text-green-400">
                  {regularPercentage}% of total
                </p>
              </div>
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20 text-green-500 group-hover:bg-green-200 dark:group-hover:bg-green-800/30 transition-colors">
                <Briefcase className="h-5 w-5" />
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Probationary</p>
                <p className="text-2xl font-bold mt-1 group-hover:text-amber-600 dark:group-hover:text-amber-500">
                  {probationaryEmployees}
                </p>
                <p className="text-xs text-amber-500 mt-1 transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
                  {probationaryPercentage}% of total
                </p>
              </div>
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-500 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/30 transition-colors">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Daily Rate</p>
                <p className="text-2xl font-bold mt-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-500">
                  ₱
                  {stats.totalDailyRate
                    ? stats.totalDailyRate.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "0.00"}
                </p>
                <p className="text-xs text-emerald-500 mt-1 transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  Daily payroll estimate
                </p>
              </div>
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/20 text-emerald-500 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/30 transition-colors">
                <Briefcase className="h-5 w-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Search & Filter Section - Conditionally rendered */}
        {showFilters && (
          <Card className="p-4 mb-6 border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or employee number..."
                  className="pl-10 p-2 w-full border rounded bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    handleFilterChange("search", e.target.value)
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="p-2 border rounded bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  value={positionFilter}
                  onChange={(e) => {
                    setPositionFilter(e.target.value)
                    handleFilterChange("position", e.target.value)
                  }}
                >
                  <option value="">All Positions</option>
                  {uniquePositions.map((position, index) => (
                    <option key={index} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
                <select
                  className="p-2 border rounded bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  value={departmentFilter}
                  onChange={(e) => {
                    setDepartmentFilter(e.target.value)
                    handleFilterChange("department", e.target.value)
                  }}
                >
                  <option value="">All Departments</option>
                  {uniqueDepartments.map((department, index) => (
                    <option key={index} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
                <select
                  className="p-2 border rounded bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    handleFilterChange("status", e.target.value)
                  }}
                >
                  <option value="">All Statuses</option>
                  {uniqueStatuses.map((status, index) => (
                    <option key={index} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
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
        )}

        {/* New Tab Navigation - Styled like the image */}
        <div className="mb-6">
          <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
            <TabsList className="border-b border-gray-200 dark:border-gray-700 pt-4 pb-4 h-10">
              <TabsTrigger
                value="all-records"
                className="h-full px-4  border-transparent data-[state=active]:border-black data-[state=active]:text-black dark:data-[state=active]:border-white dark:data-[state=active]:text-white p-4"
              >
                All Records ({stats.totalEmployees || 0})
              </TabsTrigger>
              <TabsTrigger
                value="daily-view"
                className="h-full px-4  border-transparent data-[state=active]:border-black data-[state=active]:text-black dark:data-[state=active]:border-white dark:data-[state=active]:text-white p-4 "
              >
                Daily View
              </TabsTrigger>
              <TabsTrigger
                value="period-view"
                className="h-full px-4  border-transparent data-[state=active]:border-black data-[state=active]:text-black dark:data-[state=active]:border-white dark:data-[state=active]:text-white p-4"
              >
                Period View
              </TabsTrigger>
              <TabsTrigger
                value="summary"
                className="h-full px-4  border-transparent data-[state=active]:border-black data-[state=active]:text-black dark:data-[state=active]:border-white dark:data-[state=active]:text-white p-4"
              >
                Summary ({stats.totalEmployees || 0})
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="h-full px-4  border-transparent data-[state=active]:border-black data-[state=active]:text-black dark:data-[state=active]:border-white dark:data-[state=active]:text-white p-4"
              >
                Analytics ({stats.totalEmployees || 0})
              </TabsTrigger>
            </TabsList>

            {/* All Records Tab Content */}
            <TabsContent value="all-records" className="mt-6">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2  border-indigo-500"></div>
                </div>
              ) : (
                <div className="border rounded-lg shadow-sm border-slate-200 dark:border-slate-700">
                  <div className="overflow-auto max-h-[500px]">
                    <table className="min-w-full border-collapse text-sm">
                      <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <tr>
                          <th
                            className="py-3 px-4 text-left font-semibold cursor-pointer"
                            onClick={() => toggleSort("employee_number")}
                          >
                            <div className="flex items-center">
                              Emp #
                              {sortField === "employee_number" && (
                                <ArrowDownUp
                                  className={`ml-1 h-3 w-3 ${sortDirection === "desc" ? "rotate-180" : ""}`}
                                />
                              )}
                            </div>
                          </th>
                          <th
                            className="py-3 px-4 text-left font-semibold cursor-pointer"
                            onClick={() => toggleSort("full_name")}
                          >
                            <div className="flex items-center">
                              Full Name
                              {sortField === "full_name" && (
                                <ArrowDownUp
                                  className={`ml-1 h-3 w-3 ${sortDirection === "desc" ? "rotate-180" : ""}`}
                                />
                              )}
                            </div>
                          </th>
                          <th
                            className="py-3 px-4 text-left font-semibold cursor-pointer"
                            onClick={() => toggleSort("position")}
                          >
                            <div className="flex items-center">
                              Position
                              {sortField === "position" && (
                                <ArrowDownUp
                                  className={`ml-1 h-3 w-3 ${sortDirection === "desc" ? "rotate-180" : ""}`}
                                />
                              )}
                            </div>
                          </th>
                          <th
                            className="py-3 px-4 text-left font-semibold cursor-pointer"
                            onClick={() => toggleSort("department")}
                          >
                            <div className="flex items-center">
                              Department
                              {sortField === "department" && (
                                <ArrowDownUp
                                  className={`ml-1 h-3 w-3 ${sortDirection === "desc" ? "rotate-180" : ""}`}
                                />
                              )}
                            </div>
                          </th>
                          <th
                            className="py-3 px-4 text-left font-semibold cursor-pointer"
                            onClick={() => toggleSort("date_hired")}
                          >
                            <div className="flex items-center">
                              Date Hired
                              {sortField === "date_hired" && (
                                <ArrowDownUp
                                  className={`ml-1 h-3 w-3 ${sortDirection === "desc" ? "rotate-180" : ""}`}
                                />
                              )}
                            </div>
                          </th>
                          <th className="py-3 px-4 text-left font-semibold">Status</th>
                          <th className="py-3 px-4 text-left font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeData.length > 0 ? (
                          employeeData.map((employee) => (
                            <tr
                              key={employee.id}
                              className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            >
                              <td className="py-3 px-4 font-medium">{employee.employee_number}</td>
                              <td className="py-3 px-4">{employee.full_name}</td>
                              <td className="py-3 px-4">{employee.position}</td>
                              <td className="py-3 px-4">{employee.department}</td>
                              <td className="py-3 px-4">{new Date(employee.date_hired).toLocaleDateString()}</td>
                              <td className="py-3 px-4">
                                <Badge className={getStatusBadgeColor(employee.employment_status)}>
                                  {employee.employment_status}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                                    onClick={() => openViewModal(employee)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                                    onClick={() => openUpdateModal(employee)}
                                  >
                                    <Pencil className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 border-red-200 text-red-600 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:border-red-700"
                                    onClick={() => {
                                      setSelectedEmployee(employee)
                                      setIsDeleteModalOpen(true)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                              No employees found matching your filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 px-4 py-3">
                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                      <span>
                        Showing {paginationData.from} to {paginationData.to} of {paginationData.total} employees
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(paginationData.current_page - 1)}
                        disabled={paginationData.current_page === 1}
                        className="border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Previous</span>
                      </Button>

                      {/* Page Numbers */}
                      <div className="flex items-center space-x-1">
                        {paginationData.links &&
                          paginationData.links
                            .filter((link) => !["&laquo; Previous", "Next &raquo;"].includes(link.label))
                            .map((link, i) => (
                              <Button
                                key={i}
                                variant={link.active ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  if (link.url) {
                                    const url = new URL(link.url)
                                    const page = url.searchParams.get("page")
                                    if (page) handlePageChange(Number.parseInt(page))
                                  }
                                }}
                                disabled={!link.url}
                                className={
                                  link.active
                                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                    : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                                }
                                dangerouslySetInnerHTML={{ __html: link.label }}
                              />
                            ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(paginationData.current_page + 1)}
                        disabled={paginationData.current_page === paginationData.last_page}
                        className="border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                      >
                        <ChevronRight className="h-4 w-4" />
                        <span className="sr-only">Next</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Daily View Tab Content */}
            <TabsContent value="daily-view" className="mt-6">
              <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="date-filter" className="whitespace-nowrap">
                    Select Date:
                  </Label>
                  <Input
                    id="date-filter"
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                    <Clock className="h-3 w-3 mr-1" />
                    {dailyEmployees.length} employees hired on this date
                  </Badge>
                </div>
              </div>

              {dailyEmployees.length > 0 ? (
                <div className="border rounded-lg shadow-sm border-slate-200 dark:border-slate-700">
                  <div className="overflow-auto max-h-[500px]">
                    <table className="min-w-full border-collapse text-sm">
                      <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <tr>
                          <th className="py-3 px-4 text-left font-semibold">Emp #</th>
                          <th className="py-3 px-4 text-left font-semibold">Full Name</th>
                          <th className="py-3 px-4 text-left font-semibold">Position</th>
                          <th className="py-3 px-4 text-left font-semibold">Department</th>
                          <th className="py-3 px-4 text-left font-semibold">Date Hired</th>
                          <th className="py-3 px-4 text-left font-semibold">Status</th>
                          <th className="py-3 px-4 text-left font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyEmployees.map((employee) => (
                          <tr
                            key={employee.id}
                            className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            <td className="py-3 px-4 font-medium">{employee.employee_number}</td>
                            <td className="py-3 px-4">{employee.full_name}</td>
                            <td className="py-3 px-4">{employee.position}</td>
                            <td className="py-3 px-4">{employee.department}</td>
                            <td className="py-3 px-4">{new Date(employee.date_hired).toLocaleDateString()}</td>
                            <td className="py-3 px-4">
                              <Badge className={getStatusBadgeColor(employee.employment_status)}>
                                {employee.employment_status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                                onClick={() => openViewModal(employee)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                                onClick={() => openUpdateModal(employee)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-200 text-red-600 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:border-red-700"
                                onClick={() => {
                                  setSelectedEmployee(employee)
                                  setIsDeleteModalOpen(true)
                                }}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Calendar className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No employees found</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    There are no employees hired on {new Date(dateFilter).toLocaleDateString()} in the system.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Period View Tab Content */}
            <TabsContent value="period-view" className="mt-6">
              <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="period-start" className="whitespace-nowrap">
                    From:
                  </Label>
                  <Input
                    id="period-start"
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="period-end" className="whitespace-nowrap">
                    To:
                  </Label>
                  <Input
                    id="period-end"
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                    <CalendarDays className="h-3 w-3 mr-1" />
                    {periodEmployees.length} employees hired in this period
                  </Badge>
                </div>
              </div>

              {periodEmployees.length > 0 ? (
                <div className="border rounded-lg shadow-sm border-slate-200 dark:border-slate-700">
                  <div className="overflow-auto max-h-[500px]">
                    <table className="min-w-full border-collapse text-sm">
                      <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <tr>
                          <th className="py-3 px-4 text-left font-semibold">Emp #</th>
                          <th className="py-3 px-4 text-left font-semibold">Full Name</th>
                          <th className="py-3 px-4 text-left font-semibold">Position</th>
                          <th className="py-3 px-4 text-left font-semibold">Department</th>
                          <th className="py-3 px-4 text-left font-semibold">Date Hired</th>
                          <th className="py-3 px-4 text-left font-semibold">Status</th>
                          <th className="py-3 px-4 text-left font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periodEmployees.map((employee) => (
                          <tr
                            key={employee.id}
                            className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            <td className="py-3 px-4 font-medium">{employee.employee_number}</td>
                            <td className="py-3 px-4">{employee.full_name}</td>
                            <td className="py-3 px-4">{employee.position}</td>
                            <td className="py-3 px-4">{employee.department}</td>
                            <td className="py-3 px-4">{new Date(employee.date_hired).toLocaleDateString()}</td>
                            <td className="py-3 px-4">
                              <Badge className={getStatusBadgeColor(employee.employment_status)}>
                                {employee.employment_status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                                onClick={() => openViewModal(employee)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                                onClick={() => openUpdateModal(employee)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-200 text-red-600 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:border-red-700"
                                onClick={() => {
                                  setSelectedEmployee(employee)
                                  setIsDeleteModalOpen(true)
                                }}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <CalendarDays className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No employees found</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    There are no employees hired between {new Date(periodStart).toLocaleDateString()} and{" "}
                    {new Date(periodEnd).toLocaleDateString()} in the system.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Summary Tab Content */}
            <TabsContent value="summary" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Employment Status</CardTitle>
                    <CardDescription>Distribution of employees by employment status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                          <span>Regular</span>
                        </div>
                        <span>
                          {regularEmployees} ({regularPercentage}%)
                        </span>
                      </div>
                      <Progress
                        value={regularPercentage}
                        className="h-2 bg-slate-100 dark:bg-slate-700"
                        indicatorClassName="bg-green-500"
                      />

                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                          <span>Probationary</span>
                        </div>
                        <span>
                          {probationaryEmployees} ({probationaryPercentage}%)
                        </span>
                      </div>
                      <Progress
                        value={probationaryPercentage}
                        className="h-2 bg-slate-100 dark:bg-slate-700"
                        indicatorClassName="bg-amber-500"
                      />

                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                          <span>Other</span>
                        </div>
                        <span>
                          {totalEmployees - regularEmployees - probationaryEmployees}(
                          {totalEmployees > 0
                            ? Math.round(
                                ((totalEmployees - regularEmployees - probationaryEmployees) / totalEmployees) * 100,
                              )
                            : 0}
                          %)
                        </span>
                      </div>
                      <Progress
                        value={
                          totalEmployees > 0
                            ? Math.round(
                                ((totalEmployees - regularEmployees - probationaryEmployees) / totalEmployees) * 100,
                              )
                            : 0
                        }
                        className="h-2 bg-slate-100 dark:bg-slate-700"
                        indicatorClassName="bg-red-500"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Gender Distribution</CardTitle>
                    <CardDescription>Distribution of employees by gender</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                          <span>Male</span>
                        </div>
                        <span>
                          {genderDistribution.male} ({genderDistribution.malePercentage}%)
                        </span>
                      </div>
                      <Progress
                        value={genderDistribution.malePercentage}
                        className="h-2 bg-slate-100 dark:bg-slate-700"
                        indicatorClassName="bg-blue-500"
                      />

                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-pink-500 mr-2"></div>
                          <span>Female</span>
                        </div>
                        <span>
                          {genderDistribution.female} ({genderDistribution.femalePercentage}%)
                        </span>
                      </div>
                      <Progress
                        value={genderDistribution.femalePercentage}
                        className="h-2 bg-slate-100 dark:bg-slate-700"
                        indicatorClassName="bg-pink-500"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Document Completion</CardTitle>
                    <CardDescription>Status of employee documentation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                          <span>Government IDs</span>
                        </div>
                        <span>
                          {documentStats.governmentIdComplete} ({documentStats.governmentIdCompletePercent}%)
                        </span>
                      </div>
                      <Progress
                        value={documentStats.governmentIdCompletePercent}
                        className="h-2 bg-slate-100 dark:bg-slate-700"
                        indicatorClassName="bg-green-500"
                      />

                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                          <span>Contracts Signed</span>
                        </div>
                        <span>
                          {documentStats.contractSigned} ({documentStats.contractSignedPercent}%)
                        </span>
                      </div>
                      <Progress
                        value={documentStats.contractSignedPercent}
                        className="h-2 bg-slate-100 dark:bg-slate-700"
                        indicatorClassName="bg-amber-500"
                      />

                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></div>
                          <span>Medical Certificates</span>
                        </div>
                        <span>
                          {documentStats.medicalComplete} ({documentStats.medicalCompletePercent}%)
                        </span>
                      </div>
                      <Progress
                        value={documentStats.medicalCompletePercent}
                        className="h-2 bg-slate-100 dark:bg-slate-700"
                        indicatorClassName="bg-indigo-500"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Years of Service</CardTitle>
                    <CardDescription>Employee tenure distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm">
                        Average:{" "}
                        <span className="font-medium">
                          {stats.averageYearsOfService ? stats.averageYearsOfService.toFixed(1) : 0} years
                        </span>
                      </p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                          <p className="text-xs text-slate-500">{"<"} 1 year</p>
                          <p className="font-medium">{yearsOfServiceStats.lessThanOneYear}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                          <p className="text-xs text-slate-500">1-2 years</p>
                          <p className="font-medium">{yearsOfServiceStats.oneToTwoYears}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                          <p className="text-xs text-slate-500">3-5 years</p>
                          <p className="font-medium">{yearsOfServiceStats.threeToFiveYears}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                          <p className="text-xs text-slate-500">{">"} 5 years</p>
                          <p className="font-medium">{yearsOfServiceStats.moreThanFiveYears}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Analytics Tab Content */}
            <TabsContent value="analytics" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Department Distribution</CardTitle>
                    <CardDescription>Employees by department</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {departmentDistribution.map((dept, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{dept.department}</span>
                            <span className="text-xs">
                              {dept.count} ({dept.percentage}%)
                            </span>
                          </div>
                          <Progress
                            value={dept.percentage}
                            className="h-2 bg-slate-100 dark:bg-slate-700"
                            indicatorClassName="bg-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Position Distribution</CardTitle>
                    <CardDescription>Employees by position</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {positionDistribution.map((pos, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{pos.position}</span>
                            <span className="text-xs">
                              {pos.count} ({pos.percentage}%)
                            </span>
                          </div>
                          <Progress
                            value={pos.percentage}
                            className="h-2 bg-slate-100 dark:bg-slate-700"
                            indicatorClassName="bg-emerald-500"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Documentation Completion</CardTitle>
                    <CardDescription>Overall documentation status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                      <div>
                        <h3 className="font-medium mb-1">Overall Documentation Completion</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {onboardingCompletion}% of all {totalEmployees} employees have completed documentation
                        </p>
                      </div>
                      <div className="mt-4 md:mt-0 flex items-center">
                        <span className="text-sm font-medium mr-2">
                          {documentStats.allDocsComplete} / {totalEmployees} Complete
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            documentStats.allDocsCompletePercent > 75
                              ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                              : documentStats.allDocsCompletePercent > 50
                                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                                : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                          }
                        >
                          {documentStats.allDocsCompletePercent}%
                        </Badge>
                      </div>
                    </div>

                    <Progress
                      value={onboardingCompletion}
                      className="h-2 bg-slate-100 dark:bg-slate-700"
                      indicatorClassName="bg-indigo-500"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Government IDs</p>
                              <p className="text-2xl font-bold mt-1">{documentStats.governmentIdCompletePercent}%</p>
                            </div>
                            <div
                              className={`p-2 rounded-full ${
                                documentStats.governmentIdCompletePercent > 75
                                  ? "bg-green-100 dark:bg-green-900/20 text-green-500"
                                  : documentStats.governmentIdCompletePercent > 50
                                    ? "bg-amber-100 dark:bg-amber-900/20 text-amber-500"
                                    : "bg-red-100 dark:bg-red-900/20 text-red-500"
                              }`}
                            >
                              <FileText className="h-5 w-5" />
                            </div>
                          </div>
                          <Progress
                            value={documentStats.governmentIdCompletePercent}
                            className="h-1 mt-2 bg-slate-200 dark:bg-slate-700"
                            indicatorClassName={
                              documentStats.governmentIdCompletePercent > 75
                                ? "bg-green-500"
                                : documentStats.governmentIdCompletePercent > 50
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }
                          />
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Contracts Signed</p>
                              <p className="text-2xl font-bold mt-1">{documentStats.contractSignedPercent}%</p>
                            </div>
                            <div
                              className={`p-2 rounded-full ${
                                documentStats.contractSignedPercent > 75
                                  ? "bg-green-100 dark:bg-green-900/20 text-green-500"
                                  : documentStats.contractSignedPercent > 50
                                    ? "bg-amber-100 dark:bg-amber-900/20 text-amber-500"
                                    : "bg-red-100 dark:bg-red-900/20 text-red-500"
                              }`}
                            >
                              <CheckCircle className="h-5 w-5" />
                            </div>
                          </div>
                          <Progress
                            value={documentStats.contractSignedPercent}
                            className="h-1 mt-2 bg-slate-200 dark:bg-slate-700"
                            indicatorClassName={
                              documentStats.contractSignedPercent > 75
                                ? "bg-green-500"
                                : documentStats.contractSignedPercent > 50
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }
                          />
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Medical Certificates</p>
                              <p className="text-2xl font-bold mt-1">{documentStats.medicalCompletePercent}%</p>
                            </div>
                            <div
                              className={`p-2 rounded-full ${
                                documentStats.medicalCompletePercent > 75
                                  ? "bg-green-100 dark:bg-green-900/20 text-green-500"
                                  : documentStats.medicalCompletePercent > 50
                                    ? "bg-amber-100 dark:bg-amber-900/20 text-amber-500"
                                    : "bg-red-100 dark:bg-red-900/20 text-red-500"
                              }`}
                            >
                              <AlertCircle className="h-5 w-5" />
                            </div>
                          </div>
                          <Progress
                            value={documentStats.medicalCompletePercent}
                            className="h-1 mt-2 bg-slate-200 dark:bg-slate-700"
                            indicatorClassName={
                              documentStats.medicalCompletePercent > 75
                                ? "bg-green-500"
                                : documentStats.medicalCompletePercent > 50
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Modals */}
        {isAddModalOpen && <AddEmployeeModal onClose={closeAddModal} onSubmit={handleAddEmployee} />}
        {isViewModalOpen && selectedEmployee && (
          <ViewEmployeeModal
            employee={selectedEmployee}
            onClose={closeViewModal}
            onUpdate={() => {
              closeViewModal()
              openUpdateModal(selectedEmployee)
            }}
          />
        )}
        {isUpdateModalOpen && selectedEmployee && (
          <UpdateEmployeeModal employee={selectedEmployee} onClose={closeUpdateModal} onSubmit={handleUpdateEmployee} />
        )}
        {isDeleteModalOpen && selectedEmployee && (
          <Modal
            employee={selectedEmployee}
            onClose={() => setIsDeleteModalOpen(false)}
            onDelete={() => handleDeleteEmployee(selectedEmployee.id!)}
          />
        )}
        {isBulkAddModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-lg w-[500px] max-h-[80vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold mb-4">Bulk Add Employees</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-4">Upload a CSV or Excel file with employee data.</p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="w-full p-2 border rounded bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 mb-4"
                onChange={(e) => e.target.files && handleBulkAddEmployees(e.target.files[0])}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsBulkAddModalOpen(false)}
                  className="border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                >
                  Cancel
                </Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Upload</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default EmployeesIndex

