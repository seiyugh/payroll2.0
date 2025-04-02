"use client"

import React, { useState, useEffect } from "react"
import { router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from "../../../components/ui/pagination"
import { toast } from "sonner"
import { Calendar, Edit, FileText, Filter, Plus, RefreshCw, Search, Trash2, Zap } from "lucide-react"

interface PayrollPeriod {
  id: number
  week_id: number
  period_start: string
  period_end: string
  payment_date: string
  status: string
  description?: string
  created_at: string | null
  updated_at: string | null
}

interface PayrollPeriodsTabProps {
  periods: PayrollPeriod[]
  onPeriodSelect: (weekId: number) => void
  onTabChange: (tab: string) => void
}

const PayrollPeriodsTab = ({ periods = [], onPeriodSelect, onTabChange }: PayrollPeriodsTabProps) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [isNewPeriodModalOpen, setIsNewPeriodModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<PayrollPeriod | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(9)
  const [sortField, setSortField] = useState<string>("week_id")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [periodFormData, setPeriodFormData] = useState({
    week_id: 1,
    period_start: "",
    period_end: "",
    payment_date: "",
    status: "pending",
    description: "",
  })
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [existingPeriodWarning, setExistingPeriodWarning] = useState(false)
  const [overwriteExisting, setOverwriteExisting] = useState(false)

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

    const newFormData = {
      ...periodFormData,
      week_id: weekId,
      period_start: e.target.value,
      period_end: endDate.toISOString().split("T")[0],
      payment_date: paymentDate.toISOString().split("T")[0],
    }

    setPeriodFormData(newFormData)

    // Check if a period with this week_id already exists
    checkExistingPeriod(weekId)
  }

  // Check if a period with the given week_id already exists
  const checkExistingPeriod = (weekId: number) => {
    const existingPeriod = periods.find(
      (period) => period.week_id === weekId && (!editingPeriod || period.id !== editingPeriod.id),
    )

    if (existingPeriod) {
      setExistingPeriodWarning(true)
    } else {
      setExistingPeriodWarning(false)
      setOverwriteExisting(false)
    }
  }

  // Helper function to get week number
  const getWeekNumber = (date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  }

  // Filter and sort periods
  const filteredPeriods = React.useMemo(() => {
    return periods
      .filter((period) => {
        const searchLower = searchTerm.toLowerCase()
        const weekIdMatch = period.week_id.toString().includes(searchLower)
        const descriptionMatch = period.description?.toLowerCase().includes(searchLower) || false
        const dateMatch =
          new Date(period.period_start).toLocaleDateString().includes(searchLower) ||
          new Date(period.period_end).toLocaleDateString().includes(searchLower)

        return (
          (weekIdMatch || descriptionMatch || dateMatch) &&
          (!statusFilter || period.status.toLowerCase() === statusFilter.toLowerCase())
        )
      })
      .sort((a, b) => {
        const sortFactor = sortDirection === "asc" ? 1 : -1

        if (sortField === "week_id") {
          return (a.week_id - b.week_id) * sortFactor
        } else if (sortField === "period_start") {
          return (new Date(a.period_start).getTime() - new Date(b.period_start).getTime()) * sortFactor
        } else if (sortField === "payment_date") {
          return (new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()) * sortFactor
        } else {
          return (a.id - b.id) * sortFactor
        }
      })
  }, [periods, searchTerm, statusFilter, sortField, sortDirection])

  // Paginate periods
  const paginatedPeriods = React.useMemo(() => {
    const startIndex = (currentPage - 1) * perPage
    const endIndex = startIndex + perPage
    return filteredPeriods.slice(startIndex, endIndex)
  }, [filteredPeriods, currentPage, perPage])

  // Total pages
  const totalPages = Math.ceil(filteredPeriods.length / perPage)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  // Handle week_id change to check for existing periods
  const handleWeekIdChange = (e) => {
    const weekId = Number.parseInt(e.target.value)
    setPeriodFormData({ ...periodFormData, week_id: weekId })
    checkExistingPeriod(weekId)
  }

  // Handle create/update period
  const handleSubmitPeriod = (e) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = {
      week_id: periodFormData.week_id,
      period_start: periodFormData.period_start,
      period_end: periodFormData.period_end,
      payment_date: periodFormData.payment_date,
      status: periodFormData.status,
      description: periodFormData.description || "",
      overwrite_existing: overwriteExisting,
    }

    console.log("Submitting period data:", formData)

    if (editingPeriod) {
      // Update existing period
      router.put(`/payroll/periods/${editingPeriod.id}`, formData, {
        onSuccess: () => {
          toast.success("Payroll period updated successfully!")
          setIsEditModalOpen(false)
          setEditingPeriod(null)
          setIsLoading(false)
          setExistingPeriodWarning(false)
          setOverwriteExisting(false)
          router.reload() // Use reload instead of custom refreshData
        },
        onError: (errors) => {
          console.error("Update period error:", errors)

          // Check if the error is about an existing period
          if (errors.week_id && typeof errors.week_id === "string" && errors.week_id.includes("already exists")) {
            setExistingPeriodWarning(true)
            toast.error("A period with this Week ID already exists. Check the overwrite option to replace it.")
          } else {
            Object.entries(errors).forEach(([field, message]) => {
              toast.error(`${field}: ${message}`)
            })
          }

          setIsLoading(false)
        },
      })
    } else {
      // Create new period
      router.post("/payroll/periods", formData, {
        onSuccess: () => {
          toast.success("Payroll period created successfully!")
          setIsNewPeriodModalOpen(false)
          setIsLoading(false)
          setExistingPeriodWarning(false)
          setOverwriteExisting(false)
          router.reload() // Use reload instead of custom refreshData
        },
        onError: (errors) => {
          console.error("Create period error:", errors)

          // Check if the error is about an existing period
          if (errors.week_id && typeof errors.week_id === "string" && errors.week_id.includes("already exists")) {
            setExistingPeriodWarning(true)
            toast.error("A period with this Week ID already exists. Check the overwrite option to replace it.")
          } else {
            Object.entries(errors).forEach(([field, message]) => {
              toast.error(`${field}: ${message}`)
            })
          }

          setIsLoading(false)
        },
      })
    }
  }

  // Handle edit period
  const handleEditPeriod = (period: PayrollPeriod) => {
    setEditingPeriod(period)
    setPeriodFormData({
      week_id: period.week_id,
      period_start: period.period_start.split("T")[0],
      period_end: period.period_end.split("T")[0],
      payment_date: period.payment_date.split("T")[0],
      status: period.status,
      description: period.description || "",
    })
    setIsEditModalOpen(true)
    setExistingPeriodWarning(false)
    setOverwriteExisting(false)
  }

  // Handle delete period
  const handleDeletePeriod = (id: number) => {
    setIsLoading(true)
    console.log("Deleting period ID:", id)

    router.delete(`/payroll/periods/${id}`, {
      data: { force_delete: true }, // Send as data payload
      onSuccess: () => {
        toast.success("Payroll period deleted successfully!")
        setConfirmDeleteId(null)
        setIsLoading(false)
        router.reload() // Use reload instead of custom refreshData
      },
      onError: (errors) => {
        console.error("Delete period error:", errors)
        Object.entries(errors).forEach(([field, message]) => {
          toast.error(`${field}: ${message}`)
        })
        setIsLoading(false)
      },
    })
  }

  // Handle generate payroll
  const handleGeneratePayroll = (weekId: number) => {
    setIsLoading(true)
    console.log("Starting payroll generation for week ID:", weekId)

    router.post(
      "/payroll/generate",
      {
        week_id: weekId,
        validate_attendance: true, // This flag enables attendance validation
        attendance_rules: {
          // Add the attendance calculation rules
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
        onSuccess: (page) => {
          console.log("Payroll generation successful:", page)

          // Check if we have a message about skipped employees
          if (page.props.skipped_employees && page.props.skipped_employees.length > 0) {
            toast.warning(
              `Payroll generated with exceptions: ${page.props.skipped_employees.length} employees skipped due to missing attendance records.`,
            )
          } else {
            toast.success("Payroll generated successfully for this period!")
          }

          setIsLoading(false)

          // Redirect to the payroll entries tab to show the generated entries
          onPeriodSelect(weekId)
          onTabChange("entries")

          // Reload the page to ensure fresh data
          setTimeout(() => {
            console.log("Reloading page after successful payroll generation")
            router.reload()
          }, 500)
        },
        onError: (errors) => {
          console.error("Generate payroll error:", errors)
          console.error("Error details:", JSON.stringify(errors))

          // Improved error handling
          if (errors && typeof errors === "object") {
            if (errors.message) {
              toast.error(`Error: ${errors.message}`)
              console.error("Error message:", errors.message)
            } else {
              Object.entries(errors).forEach(([field, message]) => {
                toast.error(`${field}: ${message}`)
                console.error(`Error field ${field}:`, message)
              })
            }
          } else {
            toast.error("Failed to generate payroll. Please try again.")
            console.error("Unstructured error:", errors)
          }

          setIsLoading(false)
        },
      },
    )
  }

  // Refresh data
  const refreshData = () => {
    setIsRefreshing(true)

    // Use visit instead of reload for better control
    router.visit("/payroll", {
      preserveScroll: true,
      onSuccess: () => {
        setIsRefreshing(false)
        toast.success("Data refreshed successfully")
      },
      onError: () => {
        setIsRefreshing(false)
        toast.error("Failed to refresh data")
      },
    })
  }

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
      case "paid":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
      case "pending":
      case "generated":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
      case "rejected":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-1 gap-2 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-600 h-4 w-4" />
            <Input
              placeholder="Search by week ID or date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <Select value={statusFilter || ""} onValueChange={(value) => setStatusFilter(value || null)}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                <span>{statusFilter || "All Statuses"}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={perPage.toString()} onValueChange={(value) => setPerPage(Number.parseInt(value))}>
            <SelectTrigger className="w-[110px]">
              <span>{perPage} per page</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">6 per page</SelectItem>
              <SelectItem value="9">9 per page</SelectItem>
              <SelectItem value="12">12 per page</SelectItem>
              <SelectItem value="24">24 per page</SelectItem>
            </SelectContent>
          </Select>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={refreshData}
                  disabled={isRefreshing}
                  className="h-10 w-10"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Data</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            onClick={() => setIsNewPeriodModalOpen(true)}
            className="bg-indigo-600 text-white hover:bg-indigo-800 text:white dark:text-black"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Period
          </Button>
        </div>
      </div>

      {/* Periods Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          {paginatedPeriods.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedPeriods.map((period) => (
                <Card
                  key={period.id}
                  className="overflow-hidden transition-all duration-200 hover:shadow-md border border-slate-200 dark:border-slate-700"
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
                          Week {period.week_id}
                        </CardTitle>
                        {period.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{period.description}</p>
                        )}
                      </div>
                      <Badge className={getStatusBadgeColor(period.status)}>{period.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Period:</span>
                        <span className="text-sm font-medium">
                          {formatDate(period.period_start)} - {formatDate(period.period_end)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Payment Date:</span>
                        <span className="text-sm font-medium">{formatDate(period.payment_date)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Created:</span>
                        <span className="text-sm">{period.created_at ? formatDate(period.created_at) : "N/A"}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2 pt-2">
                    <div className="flex gap-2 w-full">
                      <Button variant="outline" className="flex-1" onClick={() => handleEditPeriod(period)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => {
                          onPeriodSelect(period.week_id)
                          onTabChange("entries")
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        className="flex-1 border-red-200 text-red-600 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:border-red-700"
                        onClick={() => setConfirmDeleteId(period.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-green-200 text-green-600 hover:border-green-300 dark:border-green-800 dark:text-green-400 dark:hover:border-green-700"
                        onClick={() => handleGeneratePayroll(period.week_id)}
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Generate
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-1">No Payroll Periods Found</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mb-4">
                {searchTerm || statusFilter
                  ? "No periods match your search criteria. Try adjusting your filters."
                  : "You haven't created any payroll periods yet. Create your first period to get started."}
              </p>
              <Button onClick={() => setIsNewPeriodModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Period
              </Button>
            </div>
          )}

          {/* Pagination */}
          {filteredPeriods.length > perPage && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      if (currentPage > 1) setCurrentPage(currentPage - 1)
                    }}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show pages around current page
                  let pageNum = currentPage
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setCurrentPage(pageNum)
                        }}
                        isActive={currentPage === pageNum}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  )
                })}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                    }}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      {/* New Period Modal */}
      <Dialog open={isNewPeriodModalOpen} onOpenChange={setIsNewPeriodModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Payroll Period</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitPeriod}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="period_start">Period Start Date</Label>
                  <Input
                    id="period_start"
                    type="date"
                    required
                    value={periodFormData.period_start}
                    onChange={handlePeriodStartChange}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    End date and payment date will be calculated automatically
                  </p>
                </div>
                <div>
                  <Label htmlFor="period_end">Period End Date</Label>
                  <Input
                    id="period_end"
                    type="date"
                    required
                    value={periodFormData.period_end}
                    readOnly
                    className="bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <Label htmlFor="payment_date">Payment Date</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    required
                    value={periodFormData.payment_date}
                    readOnly
                    className="bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <Label htmlFor="week_id">Week ID</Label>
                  <Input
                    id="week_id"
                    type="number"
                    required
                    min="1"
                    value={periodFormData.week_id}
                    onChange={handleWeekIdChange}
                    className="bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={periodFormData.status}
                    onValueChange={(value) => setPeriodFormData({ ...periodFormData, status: value })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="e.g., First half of January 2024"
                    value={periodFormData.description}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, description: e.target.value })}
                  />
                </div>

                {/* Existing Period Warning */}
                {existingPeriodWarning && (
                  <div className="col-span-2">
                    <Alert
                      variant="destructive"
                      className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Warning</AlertTitle>
                      <AlertDescription>
                        A payroll period with Week ID {periodFormData.week_id} already exists. Creating a new period
                        with this ID will overwrite the existing one.
                      </AlertDescription>
                    </Alert>

                    <div className="flex items-center space-x-2 mt-2">
                      <Checkbox
                        id="overwrite"
                        checked={overwriteExisting}
                        onCheckedChange={(checked) => setOverwriteExisting(checked as boolean)}
                      />
                      <label
                        htmlFor="overwrite"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        I understand and want to overwrite the existing period
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewPeriodModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || (existingPeriodWarning && !overwriteExisting)}>
                {isLoading ? "Creating..." : "Create Period"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Period Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Payroll Period</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitPeriod}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_period_start">Period Start Date</Label>
                  <Input
                    id="edit_period_start"
                    type="date"
                    required
                    value={periodFormData.period_start}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, period_start: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_period_end">Period End Date</Label>
                  <Input
                    id="edit_period_end"
                    type="date"
                    required
                    value={periodFormData.period_end}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, period_end: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_payment_date">Payment Date</Label>
                  <Input
                    id="edit_payment_date"
                    type="date"
                    required
                    value={periodFormData.payment_date}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, payment_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_week_id">Week ID</Label>
                  <Input
                    id="edit_week_id"
                    type="number"
                    required
                    min="1"
                    value={periodFormData.week_id}
                    onChange={handleWeekIdChange}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_status">Status</Label>
                  <Select
                    value={periodFormData.status}
                    onValueChange={(value) => setPeriodFormData({ ...periodFormData, status: value })}
                  >
                    <SelectTrigger id="edit_status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit_description">Description (Optional)</Label>
                  <Input
                    id="edit_description"
                    placeholder="e.g., First half of January 2024"
                    value={periodFormData.description}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, description: e.target.value })}
                  />
                </div>

                {/* Existing Period Warning (for edit mode) */}
                {existingPeriodWarning && (
                  <div className="col-span-2">
                    <Alert
                      variant="destructive"
                      className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Warning</AlertTitle>
                      <AlertDescription>
                        Another payroll period with Week ID {periodFormData.week_id} already exists. Saving with this ID
                        will overwrite the existing one.
                      </AlertDescription>
                    </Alert>

                    <div className="flex items-center space-x-2 mt-2">
                      <Checkbox
                        id="overwrite_edit"
                        checked={overwriteExisting}
                        onCheckedChange={(checked) => setOverwriteExisting(checked as boolean)}
                      />
                      <label
                        htmlFor="overwrite_edit"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        I understand and want to overwrite the existing period
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || (existingPeriodWarning && !overwriteExisting)}>
                {isLoading ? "Updating..." : "Update Period"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDeleteId !== null} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-500">Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-700 dark:text-slate-300">
              Are you sure you want to delete this payroll period? This will also delete all associated payroll entries.
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => handleDeletePeriod(confirmDeleteId as number)}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete Period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PayrollPeriodsTab

