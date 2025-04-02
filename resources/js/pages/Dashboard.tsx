"use client"

import { useEffect, useState, useRef } from "react"
import { Head, usePage } from "@inertiajs/react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  CheckCircle,
  CalendarDays,
  Users,
  Wallet,
  TrendingUp,
  Clock,
  AlertCircle,
  ArrowUpRight,
  FileText,
  Plus,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import AppLayout from "@/layouts/app-layout"
import { toast } from "sonner"
import { exportToCSV } from "@/utils/export-utils"
import QuickNotes from "@/components/QuickNotes"
import { NotesProvider } from "@/contexts/NotesContext"

// Interactive chart component using canvas
const InteractiveChart = ({ data, labels, color = "#4f46e5", title, onRefresh }) => {
  const canvasRef = useRef(null)
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleRefresh = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    onRefresh && onRefresh()
    setIsLoading(false)
    toast.success(`${title} data refreshed`)
  }

  useEffect(() => {
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
      const x = padding + (i / (data.length - 1)) * (width - 2 * padding)
      const y = height - padding - (data[i] / maxValue) * (height - 2 * padding)

      ctx.beginPath()
      ctx.arc(x, y, hoveredIndex === i ? 6 : 4, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.fill()

      // Draw label for hovered point
      if (hoveredIndex === i && labels && labels[i]) {
        ctx.font = "12px Arial"
        ctx.fillStyle = "#000000"
        ctx.textAlign = "center"
        ctx.fillText(`${labels[i]}: ${data[i]}`, x, y - 15)
      }
    }

    // Add event listeners for hover
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left

      // Find closest point
      let closestIndex = -1
      let closestDistance = Number.POSITIVE_INFINITY

      for (let i = 0; i < data.length; i++) {
        const x = padding + (i / (data.length - 1)) * (width - 2 * padding)
        const distance = Math.abs(mouseX - x)

        if (distance < closestDistance) {
          closestDistance = distance
          closestIndex = i
        }
      }

      // Only update if within reasonable distance
      if (closestDistance < 20) {
        setHoveredIndex(closestIndex)
      } else {
        setHoveredIndex(null)
      }
    }

    const handleMouseLeave = () => {
      setHoveredIndex(null)
    }

    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [data, labels, color, hoveredIndex])

  return (
    <div className="relative">
      <div className="absolute top-0 right-0">
        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading} className="h-8 w-8">
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <canvas ref={canvasRef} width={300} height={150} className="w-full h-auto" />
    </div>
  )
}

export default function Dashboard() {
  const { props } = usePage()
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("week")
  const [filterOpen, setFilterOpen] = useState(false)

  // Extract data from props
  const {
    auth,
    employee,
    total_employees = 0,
    pending_payrolls = 0,
    attendance_summary = { total: 0, ongoing: 0 },
    upcoming_pay_dates = [],
    recent_transactions = [],
    attendance_data = [0, 0, 0, 0, 0, 0, 0],
    payroll_data = [0, 0, 0, 0, 0, 0, 0],
    employee_growth_data = [0, 0, 0, 0, 0, 0, 0],
    quick_stats = [],
    upcoming_tasks = [],
  } = props

  // State for chart data
  const [chartData, setChartData] = useState({
    attendance: attendance_data,
    payroll: payroll_data,
    employeeGrowth: employee_growth_data,
  })

  // Chart labels based on time range
  const getLabels = () => {
    const today = new Date()

    if (timeRange === "week") {
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today)
        date.setDate(date.getDate() - 6 + i)
        return date.toLocaleDateString("en-US", { weekday: "short" })
      })
    } else if (timeRange === "month") {
      return Array.from({ length: 4 }, (_, i) => {
        const date = new Date(today)
        date.setDate(date.getDate() - 21 + i * 7)
        return `Week ${i + 1}`
      })
    } else {
      return Array.from({ length: 12 }, (_, i) => {
        const date = new Date(today)
        date.setMonth(date.getMonth() - 11 + i)
        return date.toLocaleDateString("en-US", { month: "short" })
      })
    }
  }

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  // Handle time range change
  const handleTimeRangeChange = (range) => {
    setTimeRange(range)

    // Simulate fetching new data
    setIsLoading(true)

    setTimeout(() => {
      // Generate random data based on time range
      const generateRandomData = (length, min, max) => {
        return Array.from({ length }, () => Math.floor(Math.random() * (max - min + 1)) + min)
      }

      let newAttendanceData, newPayrollData, newEmployeeGrowthData

      if (range === "week") {
        newAttendanceData = generateRandomData(7, 80, 100)
        newPayrollData = generateRandomData(7, 10000, 15000)
        newEmployeeGrowthData = generateRandomData(7, 45, 55)
      } else if (range === "month") {
        newAttendanceData = generateRandomData(4, 85, 95)
        newPayrollData = generateRandomData(4, 40000, 60000)
        newEmployeeGrowthData = generateRandomData(4, 45, 55)
      } else {
        newAttendanceData = generateRandomData(12, 85, 95)
        newPayrollData = generateRandomData(12, 100000, 250000)
        newEmployeeGrowthData = generateRandomData(12, 40, 60)
      }

      setChartData({
        attendance: newAttendanceData,
        payroll: newPayrollData,
        employeeGrowth: newEmployeeGrowthData,
      })

      setIsLoading(false)
      toast.success(`Data updated for ${range} view`)
    }, 1000)
  }

  // Refresh chart data
  const refreshChartData = (chartType) => {
    const generateRandomData = (length, min, max) => {
      return Array.from({ length }, () => Math.floor(Math.random() * (max - min + 1)) + min)
    }

    const length = timeRange === "week" ? 7 : timeRange === "month" ? 4 : 12

    if (chartType === "attendance") {
      setChartData((prev) => ({
        ...prev,
        attendance: generateRandomData(length, 80, 100),
      }))
    } else if (chartType === "payroll") {
      setChartData((prev) => ({
        ...prev,
        payroll: generateRandomData(
          length,
          timeRange === "week" ? 10000 : timeRange === "month" ? 40000 : 100000,
          timeRange === "week" ? 15000 : timeRange === "month" ? 60000 : 250000,
        ),
      }))
    } else if (chartType === "employeeGrowth") {
      setChartData((prev) => ({
        ...prev,
        employeeGrowth: generateRandomData(length, 40, 60),
      }))
    }
  }

  // Safe data extraction with default values
  const employeeFirstName = auth?.user?.first_name || auth?.user?.name?.split(" ")[0] || "User"
  const totalEmployees = total_employees || 0
  const pendingPayrolls = pending_payrolls || 0
  const attendanceSummary = attendance_summary || { total: 0, ongoing: 0 }
  const upcomingPayDates = upcoming_pay_dates || []
  const recentTransactions = recent_transactions || []

  // Default quick stats if not provided
  const defaultQuickStats = [
    { label: "Attendance Rate", value: "92%", change: "+2%", icon: CheckCircle, color: "text-green-500" },
    { label: "Avg. Daily Rate", value: "₱545", change: "+₱15", icon: TrendingUp, color: "text-indigo-500" },
    { label: "Pending Requests", value: "5", change: "-2", icon: Clock, color: "text-amber-500" },
    { label: "Compliance", value: "98%", change: "+3%", icon: AlertCircle, color: "text-blue-500" },
  ]

  // Use provided quick stats or default
  const displayQuickStats = quick_stats.length > 0 ? quick_stats : defaultQuickStats

  // Default upcoming tasks if not provided
  const defaultUpcomingTasks = [
    { id: 1, title: "Process Payroll", due: "Tomorrow", priority: "High" },
    { id: 2, title: "Review Attendance", due: "In 2 days", priority: "Medium" },
    { id: 3, title: "Update Employee Records", due: "Next week", priority: "Low" },
  ]

  // Use provided upcoming tasks or default
  const displayUpcomingTasks = upcoming_tasks.length > 0 ? upcoming_tasks : defaultUpcomingTasks

  // Export attendance report
  const exportAttendanceReport = () => {
    toast.success("Exporting attendance report...")

    try {
      // Sample attendance data for export (in a real app, this would come from props or state)
      const exportData = [
        { Date: "2025-03-18", Present: 45, Absent: 3, DayOff: 2, AttendanceRate: "90%" },
        { Date: "2025-03-19", Present: 47, Absent: 1, DayOff: 2, AttendanceRate: "94%" },
        { Date: "2025-03-20", Present: 46, Absent: 2, DayOff: 2, AttendanceRate: "92%" },
        { Date: "2025-03-21", Present: 48, Absent: 0, DayOff: 2, AttendanceRate: "96%" },
        { Date: "2025-03-22", Present: 40, Absent: 5, DayOff: 5, AttendanceRate: "80%" },
      ]

      // Generate filename with date
      const date = new Date().toISOString().split("T")[0]
      const filename = `attendance_report_${date}.csv`

      // Export to CSV
      exportToCSV(exportData, filename)

      toast.success("Export completed successfully!")
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export data. Please try again.")
    }
  }

  // Export payroll report
  const exportPayrollReport = () => {
    toast.success("Exporting payroll report...")

    try {
      // Sample payroll data for export (in a real app, this would come from props or state)
      const exportData = [
        {
          Period: "Mar 1-7, 2025",
          TotalGross: "245000.00",
          TotalDeductions: "35750.00",
          TotalNet: "209250.00",
          EmployeeCount: 50,
        },
        {
          Period: "Mar 8-14, 2025",
          TotalGross: "242500.00",
          TotalDeductions: "35375.00",
          TotalNet: "207125.00",
          EmployeeCount: 50,
        },
        {
          Period: "Mar 15-21, 2025",
          TotalGross: "247500.00",
          TotalDeductions: "36125.00",
          TotalNet: "211375.00",
          EmployeeCount: 50,
        },
        {
          Period: "Mar 22-28, 2025",
          TotalGross: "250000.00",
          TotalDeductions: "36500.00",
          TotalNet: "213500.00",
          EmployeeCount: 50,
        },
      ]

      // Generate filename with date
      const date = new Date().toISOString().split("T")[0]
      const filename = `payroll_report_${date}.csv`

      // Export to CSV
      exportToCSV(exportData, filename)

      toast.success("Export completed successfully!")
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export data. Please try again.")
    }
  }

  return (
    <NotesProvider>
      <AppLayout breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }]}>
        <Head title="Dashboard" />

        {/* Welcome Section with Quick Actions */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">Welcome back, {employeeFirstName}!</h1>
              <p className="text-slate-600 dark:text-slate-400">Here's what's happening with your team today.</p>
            </div>
            <div className="flex gap-2 mt-4 md:mt-0">
              <DropdownMenu open={filterOpen} onOpenChange={setFilterOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-1">
                    <Filter className="h-4 w-4" />
                    <span>Time Range: {timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}</span>
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleTimeRangeChange("week")}>This Week</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTimeRangeChange("month")}>This Month</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTimeRangeChange("year")}>This Year</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1">
                <Plus className="h-4 w-4" />
                <span>New Report</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {displayQuickStats.map((stat, index) => (
            <Card
              key={index}
              className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <div className="flex items-center mt-1">
                    <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-xs text-green-500">{stat.change} from last month</span>
                  </div>
                </div>
                <div className={`p-2 rounded-full bg-slate-100 dark:bg-slate-800 ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Main Dashboard Content */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Employee Stats Card */}
          <Card className="p-5 border border-slate-200 dark:border-slate-700 overflow-hidden relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center">
                  <Users className="w-5 h-5 mr-2 text-indigo-500" /> Employees
                </h2>
                <p className="text-3xl font-bold mt-2">{totalEmployees}</p>
              </div>
              <Button
                variant="outline"
                className="text-indigo-600 border-indigo-200 hover:border-indigo-300 dark:text-indigo-400 dark:border-indigo-800 dark:hover:border-indigo-700"
              >
                View All
              </Button>
            </div>
            <div className="mt-2">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Employee Growth</p>
              <InteractiveChart
                data={chartData.employeeGrowth}
                labels={getLabels()}
                color="#4f46e5"
                title="Employee Growth"
                onRefresh={() => refreshChartData("employeeGrowth")}
              />
            </div>
            <div className="mt-4 flex justify-between text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Active</p>
                <p className="font-medium">{Math.round(totalEmployees * 0.92)}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">On Leave</p>
                <p className="font-medium">{Math.round(totalEmployees * 0.05)}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">New</p>
                <p className="font-medium">{Math.round(totalEmployees * 0.03)}</p>
              </div>
            </div>
          </Card>

          {/* Attendance Summary Card */}
          <Card className="p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <CalendarDays className="w-5 h-5 mr-2 text-green-500" /> Attendance
              </h2>
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
              >
                {Math.round((attendanceSummary.ongoing / attendanceSummary.total) * 100)}% Present
              </Badge>
            </div>
            <div className="mt-2">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                {timeRange === "week" ? "Weekly" : timeRange === "month" ? "Monthly" : "Yearly"} Attendance Rate
              </p>
              <InteractiveChart
                data={chartData.attendance}
                labels={getLabels()}
                color="#22c55e"
                title="Attendance"
                onRefresh={() => refreshChartData("attendance")}
              />
            </div>
            <div className="mt-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-slate-500 dark:text-slate-400">Today's Attendance</span>
                <span className="text-sm font-medium">
                  {attendanceSummary.ongoing}/{attendanceSummary.total}
                </span>
              </div>
              <Progress
                value={(attendanceSummary.ongoing / attendanceSummary.total) * 100}
                className="h-2 bg-slate-100 dark:bg-slate-700"
                indicatorClassName="bg-green-500"
              />
            </div>
            <Button
              variant="outline"
              className="w-full mt-4 text-green-600 border-green-200 hover:border-green-300 dark:text-green-400 dark:border-green-800 dark:hover:border-green-700"
            >
              Update Attendance
            </Button>
            <Button
              variant="outline"
              onClick={exportAttendanceReport}
              className="w-full mt-2 text-blue-600 border-blue-200 hover:border-blue-300 dark:text-blue-400 dark:border-blue-800 dark:hover:border-blue-700"
            >
              <Download className="h-4 w-4 mr-1" />
              Export Report
            </Button>
          </Card>

          {/* Pending Payrolls Card */}
          <Card className="p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <Wallet className="w-5 h-5 mr-2 text-amber-500" /> Payroll
              </h2>
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
              >
                {pendingPayrolls} Pending
              </Badge>
            </div>
            <div className="mt-2">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                {timeRange === "week" ? "Weekly" : timeRange === "month" ? "Monthly" : "Yearly"} Payroll (in ₱)
              </p>
              <InteractiveChart
                data={chartData.payroll}
                labels={getLabels()}
                color="#f59e0b"
                title="Payroll"
                onRefresh={() => refreshChartData("payroll")}
              />
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Upcoming Pay Dates</h3>
              <div className="space-y-2">
                {upcomingPayDates.length > 0 ? (
                  upcomingPayDates.map((pay) => (
                    <div
                      key={pay.id}
                      className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded"
                    >
                      <span className="font-medium">
                        {new Date(pay.pay_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                      >
                        Upcoming
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-center">
                    <span className="text-sm text-slate-500">No upcoming pay dates</span>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full mt-4 text-amber-600 border-amber-200 hover:border-amber-300 dark:text-amber-400 dark:border-amber-800 dark:hover:border-amber-700"
            >
              Process Payroll
            </Button>
            <Button
              variant="outline"
              onClick={exportPayrollReport}
              className="w-full mt-2 text-blue-600 border-blue-200 hover:border-blue-300 dark:text-blue-400 dark:border-blue-800 dark:hover:border-blue-700"
            >
              <Download className="h-4 w-4 mr-1" />
              Export Report
            </Button>
          </Card>

          {/* Recent Transactions Card */}
          <Card className="p-5 border border-slate-200 dark:border-slate-700 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-500" /> Recent Transactions
              </h2>
              <Button
                variant="ghost"
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                View All
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800">
                    <TableHead>ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((txn) => (
                      <TableRow key={txn.payroll_entry_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <TableCell className="font-medium">#{txn.payroll_entry_id}</TableCell>
                        <TableCell>{txn.date}</TableCell>
                        <TableCell>₱{txn.amount}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              txn.status === "Completed"
                                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                            }
                          >
                            {txn.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-slate-500">
                        No recent transactions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Quick Notes Card */}
          <QuickNotes category="dashboard" />
        </div>
      </AppLayout>
    </NotesProvider>
  )
}

