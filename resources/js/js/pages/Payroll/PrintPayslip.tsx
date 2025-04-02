"use client"

import { useRef, useEffect, useState, useMemo } from "react"
import { router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Printer, Check, X, AlertCircle, Clock } from "lucide-react"
import { toast } from "sonner"

// Update the interface to better match your database schema
interface Attendance {
  id: number
  employee_number: string
  work_date: string
  daily_rate: number
  adjustment: number
  status: "Present" | "Absent" | "Day Off" | "Half Day" | "Vacation Leave" | "Sick Leave" | "Holiday" | "No Record"
  created_at?: string
  updated_at?: string
  full_name?: string
  time_in?: string
  time_out?: string
  notes?: string
}

// Add a specific PayrollPeriod interface
interface PayrollPeriod {
  id: number
  week_id?: number
  period_start: string
  period_end: string
  payment_date?: string
  status?: string
}

interface PrintPayslipProps {
  payroll: {
    id: number
    employee_number: string
    full_name?: string
    department?: string
    position: string
    payroll_period_id: number
    daily_rates: any[] | string
    gross_pay: number
    sss_deduction: number
    philhealth_deduction: number
    pagibig_deduction: number
    tax_deduction: number
    cash_advance: number
    loan: number
    vat: number
    other_deductions: number
    short: number // Add the short field
    total_deductions: number
    net_pay: number
    status: string
    employee?: {
      full_name: string
      department: string
      designation: string
      daily_rate: number
      position: string
    }
    payroll_period?: PayrollPeriod
    attendanceRecords?: Attendance[] // Add this to receive attendance records directly
  }
  attendances?: Attendance[] // Renamed to match the controller's session variable
  onClose: () => void
}

// Remove the fetchAdditionalAttendanceData function that makes API calls
// Replace it with this version that only uses props
const fetchAdditionalAttendanceData = (
  employeeNumber: string,
  weekId: number,
  setAttendanceRecords: any,
  attendances: Attendance[],
) => {
  // Only use attendance records from props
  if (attendances && attendances.length > 0) {
    // Filter to only include records for this employee
    const filteredAttendances = attendances.filter((record) => record.employee_number === employeeNumber)

    if (filteredAttendances.length > 0) {
      setAttendanceRecords(filteredAttendances)
      return
    }
  }

  // If no records found in props, we'll rely on the generateAttendanceFromPayroll function
  console.log("No attendance records found in props for employee:", employeeNumber)
}

// Add a function to determine which template to use based on department
const getPayslipTemplate = (department: string | undefined) => {
  if (!department) return "jbd" // Default to JBD template if no department

  // Convert to lowercase for case-insensitive comparison
  const dept = department.toLowerCase()

  if (dept === "admin" || dept === "technician") {
    return "jbd"
  } else if (dept === "allen one") {
    return "allen-one"
  }

  // Default to JBD template for any other department
  return "jbd"
}

const PrintPayslip = ({ payroll, attendances = [], onClose }: PrintPayslipProps) => {
  const printRef = useRef<HTMLDivElement>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTemplate, setEditedTemplate] = useState<string>("")

  // Component mount/unmount logging
  useEffect(() => {
    console.log("PrintPayslip component mounted with payroll ID:", payroll?.id)
    return () => console.log("PrintPayslip component unmounted")
  }, [payroll?.id])

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

  // Use attendance records from props or generate them
  useEffect(() => {
    if (!payroll) {
      console.error("No payroll data provided to PrintPayslip")
      return
    }

    console.log("Processing payroll data:", payroll.id)
    setIsLoading(true)

    // First check if attendance records are directly in the payroll object
    if (payroll.attendanceRecords && payroll.attendanceRecords.length > 0) {
      console.log("Using attendance records from payroll object:", payroll.attendanceRecords.length)
      setAttendanceRecords(payroll.attendanceRecords)
      setIsLoading(false)
      return
    }

    // Then check if attendance records were passed via props from the controller
    if (attendances && attendances.length > 0) {
      console.log("Using attendance records from controller:", attendances.length)
      setAttendanceRecords(attendances)
      setIsLoading(false)
      return
    }

    // If no attendance records are provided, generate them from the period data
    console.log("No attendance records provided, generating from daily_rates")
    const periodData = payroll.payroll_period || createFallbackPeriod()
    const generatedRecords = generateAttendanceFromPayroll(periodData)
    setAttendanceRecords(generatedRecords)
    setIsLoading(false)

    // Function to create a fallback period if none is provided
    function createFallbackPeriod(): PayrollPeriod {
      console.log("Creating fallback payroll period")

      // Get current date
      const today = new Date()

      // Find the Monday of the current week
      const startDate = new Date(today)
      const day = startDate.getDay()
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
      startDate.setDate(diff)

      // Find the Sunday of the current week
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)

      return {
        id: payroll.payroll_period_id || 0,
        period_start: startDate.toISOString().split("T")[0],
        period_end: endDate.toISOString().split("T")[0],
        status: "generated",
      }
    }
  }, [payroll, attendances]) // Only depend on payroll and attendances

  // Generate attendance records from payroll data
  const generateAttendanceFromPayroll = (periodData?: PayrollPeriod): Attendance[] => {
    console.log("Generating attendance from payroll data with period:", periodData)

    if (!payroll) {
      console.error("Missing payroll data for generation")
      return []
    }

    if (!periodData) {
      console.error("Missing period data for generation")
      return []
    }

    try {
      // Use employee's daily rate instead of hardcoded value
      const dailyRate = payroll.employee?.daily_rate || 0
      const start = new Date(periodData.period_start)
      const end = new Date(periodData.period_end)

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error("Invalid date range in payroll period", {
          start: periodData.period_start,
          end: periodData.period_end,
        })
        return []
      }

      // Ensure we're starting from Monday and ending on Sunday
      const dayOfWeek = start.getDay()
      if (dayOfWeek !== 1) {
        // 1 is Monday
        // Adjust to previous Monday
        start.setDate(start.getDate() - ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1))
      }

      const endDayOfWeek = end.getDay()
      if (endDayOfWeek !== 0) {
        // 0 is Sunday
        // Adjust to next Sunday
        end.setDate(end.getDate() + (7 - endDayOfWeek))
      }

      // Generate attendance records for Monday-Sunday
      const generatedRecords: Attendance[] = []
      const currentDate = new Date(start)
      let id = 1000

      // Parse daily_rates if it's a string
      let dailyRatesArray: any[] = []

      // Fix for the error: ensure dailyRatesArray is always an array
      if (typeof payroll.daily_rates === "string") {
        try {
          // Try to parse the JSON string
          const parsed = JSON.parse(payroll.daily_rates)
          // Ensure the parsed result is an array
          dailyRatesArray = Array.isArray(parsed) ? parsed : []
          console.log("Parsed daily_rates:", dailyRatesArray)
        } catch (e) {
          console.error("Error parsing daily_rates string:", e)
          dailyRatesArray = [] // Fallback to empty array
        }
      } else if (Array.isArray(payroll.daily_rates)) {
        dailyRatesArray = payroll.daily_rates
      } else {
        // If it's neither a valid JSON string nor an array, use an empty array
        console.warn("daily_rates is neither a valid JSON string nor an array:", payroll.daily_rates)
        dailyRatesArray = []
      }

      // Generate attendance records for each day in the period (Monday-Sunday)
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split("T")[0]
        const dayOfWeek = currentDate.getDay() // 0 = Sunday, 1 = Monday, etc.

        // Default status based on day of week
        let status = dayOfWeek === 0 || dayOfWeek === 6 ? "Day Off" : "Present"
        let adjustment = 0
        let recordDailyRate = dailyRate

        // Find matching daily rate record if available
        const dailyRateRecord =
          dailyRatesArray.length > 0
            ? dailyRatesArray.find((r) => r && (r.date === dateStr || r.work_date === dateStr))
            : null

        if (dailyRateRecord) {
          status = dailyRateRecord.status || status
          adjustment = dailyRateRecord.adjustment || 0
          // Use the amount from daily_rates if available
          if (dailyRateRecord.amount !== undefined) {
            recordDailyRate = dailyRateRecord.amount
          }
        }

        // Create attendance record for this day
        generatedRecords.push({
          id: id++,
          employee_number: payroll.employee_number,
          work_date: dateStr,
          daily_rate: recordDailyRate,
          adjustment: adjustment,
          status: status as any,
          full_name: payroll.full_name || (payroll.employee && payroll.employee.full_name) || "Employee",
        })

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1)
      }

      return generatedRecords
    } catch (error) {
      console.error("Error in generateAttendanceFromPayroll:", error)
      return []
    }
  }

  // Format date to display in a readable format
  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", dateString)
        return "Invalid Date"
      }
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch (error) {
      console.error("Error formatting date:", error)
      return "Error"
    }
  }

  // Format short date (just day and month)
  const formatShortDate = (dateString: string) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        console.error("Invalid date for short format:", dateString)
        return "Invalid Date"
      }
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    } catch (error) {
      console.error("Error formatting short date:", error)
      return "Error"
    }
  }

  // Format currency values
  const formatCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "0.00"
    try {
      const numValue = typeof value === "string" ? Number.parseFloat(value) : value
      if (isNaN(numValue)) {
        console.error("Invalid currency value:", value)
        return "0.00"
      }
      return numValue.toFixed(2)
    } catch (error) {
      console.error("Error formatting currency:", error)
      return "0.00"
    }
  }

  // Calculate amount with more status cases
  const calculateAmount = (status: string, dailyRate: number) => {
    switch (status.toLowerCase()) {
      case "present":
        return dailyRate * 1 // Present * 1
      case "absent":
        return dailyRate * 0 // Absent * 0
      case "day off":
        return dailyRate * 0 // Day Off * 0
      case "half day":
        return dailyRate / 2 // Half Day / 2
      case "holiday":
        // For simplicity, we'll use the higher rate (special holiday)
        return dailyRate * 2 // Special holiday * 2
      case "leave":
        return dailyRate * 0 // Leave * 0
      case "wfh":
        return dailyRate * 1 // WFH * 1
      case "sp":
        return dailyRate * 1 // SP * 1
      case "no record":
        return 0
      default:
        return 0
    }
  }

  // Generate daily rates data from date range
  const generateDailyRatesDataFromRange = (start: Date, end: Date) => {
    try {
      console.log("Using exact date range:", {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      })

      const dates = []
      const currentDate = new Date(start)

      // Generate dates for the exact period
      while (currentDate <= end) {
        dates.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }

      return dates.map((date) => {
        // Find the actual attendance record for this date
        const dateStr = date.toISOString().split("T")[0]
        const record = attendanceRecords.find((record) => {
          if (!record.work_date) return false
          const recordDate = new Date(record.work_date).toISOString().split("T")[0]
          return recordDate === dateStr
        })

        // Use the status directly from the attendance record if available
        const status = record ? record.status : "No Record"

        // Use the daily rate from the attendance record or employee
        const dailyRate = record && record.daily_rate ? record.daily_rate : payroll?.employee?.daily_rate || 0

        const adjustment = record && record.adjustment ? record.adjustment : 0
        const amount = calculateAmount(status, dailyRate)

        return {
          date,
          status,
          dailyRate,
          amount,
          adjustment,
        }
      })
    } catch (error) {
      console.error("Error in generateDailyRatesDataFromRange:", error)
      return []
    }
  }

  // Generate daily rates data
  const generateDailyRatesData = () => {
    // If we don't have payroll period data, use the dates from the attendance records
    if (!payroll?.payroll_period && attendanceRecords.length > 0) {
      // Extract date range from attendance records
      const dates = attendanceRecords.map((r) => new Date(r.work_date))
      const start = new Date(Math.min(...dates.map((d) => d.getTime())))
      const end = new Date(Math.max(...dates.map((d) => d.getTime())))

      // Generate daily rates data from this date range
      return generateDailyRatesDataFromRange(start, end)
    }

    // Use payroll period if available
    if (payroll?.payroll_period) {
      try {
        const start = new Date(payroll.payroll_period.period_start)
        const end = new Date(payroll.payroll_period.period_end)

        // Ensure we're starting from Monday and ending on Sunday
        const dayOfWeek = start.getDay()
        if (dayOfWeek !== 1) {
          // 1 is Monday
          // Adjust to previous Monday
          start.setDate(start.getDate() - ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1))
        }

        const endDayOfWeek = end.getDay()
        if (endDayOfWeek !== 0) {
          // 0 is Sunday
          // Adjust to next Sunday
          end.setDate(end.getDate() + (7 - endDayOfWeek))
        }

        return generateDailyRatesDataFromRange(start, end)
      } catch (error) {
        console.error("Error generating daily rates data from payroll period:", error)

        // Fallback to current week if period data is invalid
        const today = new Date()
        const day = today.getDay()
        const diff = today.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday

        const monday = new Date(today)
        monday.setDate(diff)

        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)

        return generateDailyRatesDataFromRange(monday, sunday)
      }
    }

    // If no period data at all, use current week
    console.log("No date range available, using current week")
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday

    const monday = new Date(today)
    monday.setDate(diff)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return generateDailyRatesDataFromRange(monday, sunday)
  }

  // Memoized calculations
  const dailyRatesData = useMemo(() => generateDailyRatesData(), [payroll?.payroll_period, attendanceRecords])

  // Fix the gross pay calculation to properly sum amounts and adjustments
  const grossPay = useMemo(() => {
    if (!dailyRatesData || dailyRatesData.length === 0) {
      return payroll?.gross_pay ? Number(payroll.gross_pay) : 0
    }

    // For Allen One department, we need to include the short amount in the calculation
    const department = payroll?.department || payroll?.employee?.department || ""
    const isAllenOne = department.toLowerCase() === "allen one"

    // Calculate the sum of all daily amounts and adjustments
    const calculatedGrossPay = dailyRatesData.reduce((total, data) => {
      const amount = Number(data.amount) || 0
      const adjustment = Number(data.adjustment) || 0
      return total + amount + adjustment
    }, 0)

    // For Allen One, we need to ensure the short amount is properly accounted for
    if (isAllenOne && payroll?.short) {
      // The short amount is already included in the deductions, so we don't need to adjust gross pay
      return calculatedGrossPay
    }

    return calculatedGrossPay
  }, [dailyRatesData, payroll?.gross_pay, payroll?.department, payroll?.employee?.department, payroll?.short])

  // Fix the total deductions calculation
  const totalDeductions = useMemo(() => {
    if (!payroll) return 0

    // Include the short amount for Allen One department
    const department = payroll?.department || payroll?.employee?.department || ""
    const isAllenOne = department.toLowerCase() === "allen one"
    const shortAmount = isAllenOne ? Number(payroll.short) || 0 : 0

    return [
      Number(payroll.sss_deduction) || 0,
      Number(payroll.philhealth_deduction) || 0,
      Number(payroll.pagibig_deduction) || 0,
      Number(payroll.tax_deduction) || 0,
      Number(payroll.cash_advance) || 0,
      Number(payroll.loan) || 0,
      Number(payroll.vat) || 0,
      Number(payroll.other_deductions) || 0,
      shortAmount,
    ].reduce((sum, val) => sum + val, 0)
  }, [payroll])

  // Fix the net pay calculation
  const netPay = useMemo(() => {
    const calculatedGrossPay = grossPay || 0
    const calculatedDeductions = totalDeductions || 0
    return Math.max(0, calculatedGrossPay - calculatedDeductions)
  }, [grossPay, totalDeductions])

  // Get payroll status badge color
  const getPayrollStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
      case "paid":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
      case "rejected":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
    }
  }

  // Update the getStatusBadgeColor function to match the one in attendance-index.tsx
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Present":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
      case "Absent":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
      case "Day Off":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
      case "Half Day":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
      case "Vacation Leave":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800"
      case "Sick Leave":
        return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
      case "Holiday":
        return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800"
      case "No Record":
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
    }
  }

  // Add a getStatusIcon function similar to the one in attendance-index.tsx
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
      case "Vacation Leave":
        return <Clock className="h-4 w-4 text-cyan-500" />
      case "Sick Leave":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case "Holiday":
        return <Clock className="h-4 w-4 text-violet-500" />
      default:
        return null
    }
  }

  const handleEditTemplate = () => {
    // Get the current template HTML
    const templateHtml =
      getPayslipTemplate(payroll?.department || payroll?.employee?.department) === "allen-one"
        ? document.querySelector(".allen-one-preview")?.innerHTML
        : document.querySelector(".jbd-telecom-preview")?.innerHTML

    setEditedTemplate(templateHtml || "")
    setIsEditing(true)
  }

  const handleSaveTemplate = () => {
    // In a real implementation, you would save the template to the server
    // For now, we'll just toggle back to preview mode
    setIsEditing(false)
    toast.success("Template changes saved!")
  }

  // Modify the handlePrint function to use the appropriate template based on department
  const handlePrint = () => {
    if (!payroll || !payroll.id) {
      console.error("No payroll data available for printing")
      return
    }

    // Determine which template to use
    const department = payroll.department || payroll.employee?.department
    const template = getPayslipTemplate(department)

    // Create a print window directly without redirecting
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      console.error("Unable to open print window. Please check your browser settings.")
      return
    }

    // Write the print content based on the template
    if (template === "allen-one") {
      // Allen One template
      const allenOneHtml = `
<html>
  <head>
    <title>Payslip - ${payroll.full_name || payroll.employee?.full_name || "Employee"}</title>
    <style>
      @page {
        size: 5.25in 8.5in; /* Letter size for Allen One template */
        margin: 0;
        padding: 0;
      }
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        color: #000;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        position: relative;
      }
      .confidential-bg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 250%;
        z-index: 50;
        pointer-events: none;
        opacity: 0.6;
        overflow: hidden;
      }
      .confidential-text {
        position: absolute;
        font-size: 20px;
        font-weight: bold;
        color: rgba(0, 0, 0, 0.25);
        transform: rotate(-30deg);
        white-space: nowrap;
        overflow: hidden;
        max-width: 150px;
        text-overflow: ellipsis;
      }
      .payslip-container {
        width: 4.25in;
        margin: 0 auto;
        padding: 10px;
        box-sizing: border-box;
        position: relative;
        z-index: 10;
        border:0.5px black solid;

      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      th, td {
        border: 1px solid black;
        padding: 4px 8px;
        text-align: left;
      }
      .header {
        background-color: #FF6600;
        color: white;
        font-weight: bold;
        text-align: center;
        padding: 8px;
        font-size: 16px;
      }
      .sub-header {
        background-color: #003366;
        color: white;
        text-align: center;
        padding: 4px;
        font-size: 12px;
      }
      .contact-info {
        background-color: #00AEEF;
        color: black;
        text-align: center;
        padding: 4px;
        font-size: 12px;
      }
      .payslip-title {
        text-align: center;
        font-weight: bold;
        font-size: 14px;
        margin: 8px 0;
      }
      .earnings-header {
        background-color: #f2f2f2;
      }
      .deduction-header {
        background-color: #f2f2f2;
      }
      .total-row {
        font-weight: bold;
      }
      .net-pay {
        font-weight: bold;
        text-align: right;
      }
      .confidential-diagonal {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
        opacity: 0.1;
        background: 
          repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 50px,
            rgba(255, 0, 0, 0.3) 50px,
            rgba(255, 0, 0, 0.3) 100px
          );
        pointer-events: none;
      }
      
      .confidential-text {
        position: absolute;
        font-size: 40px;
        font-weight: bold;
        color: rgba(255, 0, 0, 0.1);
        transform: rotate(-45deg);
        white-space: nowrap;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        z-index: -1;
      }

      .watermark-text-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 250%;
        z-index: 1;
        pointer-events: none;
        overflow: hidden;
      }

      .watermark-text {
        position: absolute;
        font-size: 8px;
        font-weight: bold;
        color: rgba(128, 128, 128, 0.15);
        transform: rotate(-30deg);
        white-space: nowrap;
        pointer-events: none;
      }
         .signature-section {
        margin-top: 15px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
        .signature-cont{
        display: flex;
        justify-content: center;
        }
      .signature {
        width: 70%;
        text-align: center;
        margin-top: 20px;
        border-top: 1px solid #000;
        padding-top: 3px;
        align-items: center;
      }
      .signature-name {
        font-size: 8px;
      }
      .signature-title {
        font-size: 7px;
      }
    </style>
    <script>
  document.addEventListener("DOMContentLoaded", function() {
    // Wait for everything to be fully loaded
    setTimeout(function() {
      const payslip = document.querySelector('.payslip-container');
      const container = payslip.querySelector('.watermark-text-container');
      
      // Make sure container covers the entire payslip
      container.style.position = 'absolute';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.overflow = 'hidden';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '1';
      
      // Get actual dimensions
      const containerWidth = payslip.offsetWidth;
      const containerHeight = payslip.offsetHeight;
      
      // Clear any existing content
      container.innerHTML = '';
      
      // Create a more controlled watermark pattern with increased visibility
      const xSpacing = 120; // Wider spacing
      const ySpacing = 80;  // Taller spacing
      
      for (let y = 1; y < containerHeight - 1; y += ySpacing) {
        for (let x = 2; x < containerWidth - 20; x += xSpacing) {
          // Create watermark element
          const watermark = document.createElement('div');
          watermark.className = 'watermark-text';
          watermark.textContent = 'CONFIDENTIAL';
          
          // Set explicit positioning with increased opacity (0.25 instead of 0.15)
          watermark.style.position = 'absolute';
          watermark.style.top = y + 'px';
          watermark.style.left = x + 'px';
          watermark.style.fontSize = '9px'; // Slightly larger
          watermark.style.fontWeight = 'bold';
          watermark.style.color = 'rgba(128, 128, 128, 0.7)'; // More visible
          watermark.style.transform = 'rotate(-30deg)';
          watermark.style.whiteSpace = 'nowrap';
          watermark.style.pointerEvents = 'none';
          
          // Add to container
          container.appendChild(watermark);
        }
      }
      
      // Print after a longer delay to ensure everything is rendered
      setTimeout(function() {
        window.print();
        window.close();
      }, 1000);
    }, 200); // Initial delay to ensure DOM is fully loaded
  });
  </script>
  </head>
  <body>
    <div class="payslip-container">
    <!-- Watermark container inside the payslip container -->
    <div class="watermark-text-container"></div>
      <div class="header">AICOMVENIENCE GROCERY PRODUCTS DISTRIBUTION</div>
      <div class="sub-header">Ground Flr Aicom Bldg. Sta Rita Karsada, Batangas City</div>
      <div class="contact-info">Telephone # (043)980-5276/jbd.aicomhrdepartment@gmail.com</div>
      
      <div class="payslip-title">PAYSLIP</div>
      
      <table>
        <tr>
          <td style="width: 20%;">Employee's Name</td>
          <td style="width: 30%;">${payroll.full_name || payroll.employee?.full_name || "Employee"}</td>
          <td style="width: 20%;">Department</td>
          <td style="width: 30%;">${payroll.department || payroll.employee?.department || "Operations"}</td>
        </tr>
        <tr>
          <td>Month & Year</td>
          <td>${payroll.payroll_period ? formatDate(payroll.payroll_period.period_start) + " to " + formatDate(payroll.payroll_period.period_end) : "Current Period"}</td>
          <td>Designation</td>
          <td>${payroll.position || payroll.employee?.position || "Store Staff/Cashier"}</td>
        </tr>
      </table>
      
      <table>
        <tr>
          <td colspan="3" style="text-align: center;">Earnings</td>
          <td colspan="2" style="text-align: center;">Deduction</td>
        </tr>
        <tr>
          <td style="width: 15%;">Cut-Off</td>
          <td style="width: 15%;">Daily Rate</td>
          <td style="width: 15%;">Adjustment</td>
          <td style="width: 30%;">Particular</td>
          <td style="width: 25%;">Amount</td>
        </tr>`

      // Generate rows for daily rates data
      const dailyRatesRows = dailyRatesData
        .map((data, index) => {
          const date = new Date(data.date)
          const dayOfMonth = date.getDate().toString().padStart(2, "0")
          const monthOfYear = (date.getMonth() + 1).toString().padStart(2, "0")
          const dayName = date.toLocaleDateString("en-US", { weekday: "long" })

          // Get deduction values for specific rows
          let deductionLabel = ""
          let deductionValue = ""

          // Current month and year for deduction labels
          const currentDate = new Date()
          const currentMonth = currentDate.toLocaleString("default", { month: "short" })
          const currentYear = currentDate.getFullYear()
          const deductionPeriod = currentMonth + ". " + currentYear

          if (index === 0) {
            deductionLabel = "Cash Advances"
            deductionValue = formatCurrency(payroll.cash_advance)
          } else if (index === 1) {
            deductionLabel = "Short"
            deductionValue = formatCurrency(payroll.short)
          } else if (index === 2) {
            deductionLabel = "Loan"
            deductionValue = formatCurrency(payroll.loan)
          } else if (index === 3) {
            deductionLabel = "HDMF (" + deductionPeriod + ")"
            deductionValue = formatCurrency(payroll.philhealth_deduction)
          } else if (index === 4) {
            deductionLabel = "SSS (" + deductionPeriod + ")"
            deductionValue = formatCurrency(payroll.sss_deduction)
          } else if (index === 5) {
            deductionLabel = "Pag-IBIG (" + deductionPeriod + ")"
            deductionValue = formatCurrency(payroll.pagibig_deduction)
          } else if (index === 6) {
            deductionLabel = "Withholding Tax"
            deductionValue = formatCurrency(payroll.tax_deduction)
          } else if (index === 7) {
            deductionLabel = "Others"
            deductionValue = formatCurrency(payroll.other_deductions)
          }

          return `
        <tr>
          <td>${monthOfYear}/${dayOfMonth}<br>${dayName}</td>
          <td style="text-align: right;">${formatCurrency(data.amount)}</td>
          <td style="text-align: right;">${formatCurrency(data.adjustment)}</td>
          <td>${deductionLabel}</td>
          <td style="text-align: right;">${deductionValue}</td>
        </tr>`
        })
        .join("")

      const allenOneHtmlFooter = `
        <tr class="total-row">
          <td colspan="2">Gross Pay</td>
          <td>${formatCurrency(grossPay)}</td>
          <td>Total Deduction</td>
          <td>${formatCurrency(totalDeductions)}</td>
        </tr>
        <tr>
          <td colspan="3"></td>
          <td>Net Pay</td>
          <td>${formatCurrency(netPay)}</td>
        </tr>
      </table>
      <div class="signature-cont">
       <div class="signature">
          <div class="signature-name">Crissel Ann Bando</div>
          <div class="signature-title">Billing Assistant - OIC</div>
        </div>
        </div>
    </div>
  </body>
</html>`

      printWindow.document.write(allenOneHtml + dailyRatesRows + allenOneHtmlFooter)
    } else {
      // JBD template
      const jbdHtml = `
<html>
  <head>
    <title>Payslip - ${payroll?.full_name || payroll.employee?.full_name || "Employee"}</title>
    <style>
      @page {
        size: 4.25in 7.6in; /* Reduced height from 8.25in to 7.5in */
        margin: 0;
        padding: 0;
      }
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        color: #000;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        position: relative;
      }
      .confidential-bg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 5;
        pointer-events: none;
        opacity: 0.3;
        overflow: hidden;
      }
      .confidential-text {
        position: absolute;
        font-size: 9px;
        font-weight: bold;
        color: rgba(0, 0, 0, 0.25);
        transform: rotate(-30deg);
        white-space: nowrap;
        overflow: hidden;
        max-width: 150px;
        text-overflow: ellipsis;
      }
      .payslip-container {
        width: 4.25in;
        height: 7.6in; /* Reduced height from 8.25in to 7.5in */
        margin: 0 auto;
        box-sizing: border-box;
        position: relative;
        z-index: 10;
      }
      .payslip {
        width: 100%;
        height: 100%;
        border: 1px solid #000;
        box-sizing: border-box;
        padding: 0.15in;
      }
      .header {
        text-align: center;
        font-weight: bold;
        font-size: 12px;
        padding: 6px;
      }
      .company-info {
        text-align: center;
        font-size: 8px;
        padding: 4px;
        border-bottom: 1px solid #000;
      }
      .payslip-title {
        text-align: center;
        font-weight: bold;
        font-size: 10px;
        margin: 8px 0;
      }
      .employee-details {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 8px;
        font-size: 8px;
      }
      .employee-details td {
        padding: 3px 5px;
        border-bottom: 1px solid #000;
      }
      .section-title {
        text-align: center;
        font-weight: bold;
        font-size: 9px;
        margin: 8px 0 4px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 8px;
      }
      th, td {
        border: 1px solid #000;
        padding: 3px 4px;
        text-align: left;
      }
      th {
        background-color: #f0f0f0 !important;
        font-weight: bold;
      }
      .text-right {
        text-align: right;
        }
      .text-center {
        text-align: center;
      }
      .net-salary {
        text-align: right;
        font-weight: bold;
        font-size: 10px;
        margin: 8px 0;
        padding-right: 5px;
      }
      .date {
        text-align: center;
        font-size: 8px;
        margin: 6px 0;
      }
      .signature-section {
        margin-top: 15px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .signature {
        width: 70%;
        text-align: center;
        margin-top: 20px;
        border-top: 1px solid #000;
        padding-top: 3px;
      }
      .signature-name {
        font-size: 8px;
      }
      .signature-title {
        font-size: 7px;
      }
      .date-printed {
        position: absolute;
        bottom: 0.1in;
        width: 100%;
        text-align: center;
        font-size: 7px;
        left: 0;
      }
      .status-badge {
        display: inline-block;
        padding: 2px 4px;
        font-size: 7px;
        font-weight: bold;
      }
      .status-present, .status-absent, .status-half-day, .status-day-off, 
      .status-leave, .status-holiday, .status-no-record {
        color: #000;
      }
      .salary {
        font-weight: bold;
        text-align: right;
        border-top: 1px solid black;
        padding-top: 0.5rem; /* pt-2 equivalent */
        padding-right: 0.5rem; /* pr-2 equivalent */
        font-size: 0.825rem; /* text-lg equivalent */
        line-height: 1.75rem; /* text-lg equivalent */
      }
      .confidential-diagonal {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
        opacity: 0.1;
        background: 
          repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 50px,
            rgba(255, 0, 0, 0.3) 50px,
            rgba(255, 0, 0, 0.3) 100px
          );
        pointer-events: none;
      }
      
      .confidential-text {
        position: absolute;
        font-size: 40px;
        font-weight: bold;
        color: rgba(255, 0, 0, 0.1);
        transform: rotate(-45deg);
        white-space: nowrap;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        z-index: -1;
      }
      /* Optimized Watermark Pattern */
      .watermark-pattern {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
        pointer-events: none;
        opacity: 0.05;
        background:
          repeating-linear-gradient(
            30deg,
            rgba(128, 128, 128, 0.1) 0px,
            rgba(128, 128, 128, 0.1) 1px,
            transparent 1px,
            transparent 60px
          );
      }

      .watermark-text-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
        pointer-events: none;
        overflow: hidden;
      }

      .watermark-text {
        position: absolute;
        font-size: 8px;
        font-weight: bold;
        color: rgba(128, 128, 128, 0.15);
        transform: rotate(-30deg);
        white-space: nowrap;
        pointer-events: none;
      }
    </style>
    <script>
  document.addEventListener("DOMContentLoaded", function() {
    // Wait for everything to be fully loaded
    setTimeout(function() {
      const payslip = document.querySelector('.payslip-container');
      const container = payslip.querySelector('.watermark-text-container');
      
      // Make sure container covers the entire payslip
      container.style.position = 'absolute';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.overflow = 'hidden';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '1';
      
      // Get actual dimensions
      const containerWidth = payslip.offsetWidth;
      const containerHeight = payslip.offsetHeight;
      
      // Clear any existing content
      container.innerHTML = '';
      
      // Create a more controlled watermark pattern
      const xSpacing = 120; // Wider spacing
      const ySpacing = 80;  // Taller spacing
      
      for (let y = 20; y < containerHeight - 20; y += ySpacing) {
        for (let x = 20; x < containerWidth - 20; x += xSpacing) {
          // Create watermark element
          const watermark = document.createElement('div');
          watermark.className = 'watermark-text';
          watermark.textContent = 'CONFIDENTIAL';
          
          // Set explicit positioning
          watermark.style.position = 'absolute';
          watermark.style.top = y + 'px';
          watermark.style.left = x + 'px';
          watermark.style.fontSize = '8px';
          watermark.style.fontWeight = 'bold';
          watermark.style.color = 'rgba(128, 128, 128, 0.70)';
          watermark.style.transform = 'rotate(-30deg)';
          watermark.style.whiteSpace = 'nowrap';
          watermark.style.pointerEvents = 'none';
          
          // Add to container
          container.appendChild(watermark);
        }
      }
      // Print after a longer delay to ensure everything is rendered
      setTimeout(function() {
        window.print();
        window.close();
      }, 1000);
    }, 200); // Initial delay to ensure DOM is fully loaded
  });
</script>
  </head>
  <body>
  <div class="payslip-container">
    <div class="payslip">
      <!-- Watermark container inside the payslip -->
      <div class="watermark-text-container"></div>
      <div class="header" style="
          text-align: center;
          font-weight: bold;
          font-size: 1.125rem;
          background-color: #6b7280;
          color: white;
          padding: 0.5rem 0;">
          JBD TELECOM HUB POINT
        </div>

        <div class="company-info">
          2nd Floor AICOM Bldg., Purok 7 Brgy. Sta. Rita Karsada, Batangas City<br />
          Telephone # (043)980-5276 | jbd.aicomhrdepartment@gmail.com
        </div>

        <div class="payslip-title">PAY SLIP</div>

        <table class="employee-details">
          <tr>
            <td style="width: 25%; font-weight: bold;">Name</td>
            <td>${payroll.full_name || payroll.employee?.full_name || "Employee"}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Department</td>
            <td>${payroll.department || payroll.employee?.department || "N/A"}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Cut-off Period</td>
            <td>${
              payroll.payroll_period
                ? formatDate(payroll.payroll_period.period_start) +
                  " - " +
                  formatDate(payroll.payroll_period.period_end)
                : "Current Period"
            }</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Designation</td>
            <td>${payroll.position || payroll.employee?.position || "N/A"}</td>
          </tr>
          ${
            payroll.status
              ? `
          <tr>
            <td style="font-weight: bold;">Status</td>
            <td>${payroll.status}</td>
          </tr>`
              : ""
          }
        </table>

        <div class="section-title">Earnings</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Daily Rate</th>
              <th>Adjustments</th>
            </tr>
          </thead>
          <tbody>`

      // Generate rows for daily rates data
      const jbdDailyRatesRows = dailyRatesData
        .map((data) => {
          return `
        <tr>
          <td>${formatShortDate(data.date.toISOString())}</td>
          <td><span class="status-badge">${data.status}</span></td>
          <td class="text-right">${formatCurrency(data.amount)}</td>
          <td class="text-right">${formatCurrency(data.adjustment)}</td>
        </tr>`
        })
        .join("")

      const jbdDeductionsRows = [
        ["SSS", payroll.sss_deduction],
        ["PAG-IBIG", payroll.pagibig_deduction],
        ["PHILHEALTH", payroll.philhealth_deduction],
        ["CASH ADVANCE", payroll.cash_advance],
        ["LOAN", payroll.loan],
        ["VAT", payroll.vat],
        ["OTHERS", payroll.other_deductions],
      ]
        .map(
          ([label, value]) => `
      <tr>
        <td>${label}</td>
        <td class="text-right">${formatCurrency(value ?? 0)}</td>
      </tr>`,
        )
        .join("")

      const jbdHtmlFooter = `
          <tr style="font-weight: bold;">
            <td colspan="2">Gross Salary</td>
            <td class="text-right" colspan="2">${formatCurrency(grossPay)}</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">Deductions</div>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${jbdDeductionsRows}
          <tr style="font-weight: bold;">
            <td>Total Deductions</td>
            <td class="text-right">${formatCurrency(totalDeductions)}</td>
          </tr>
        </tbody>
      </table>

      <div class="salary">
        NET SALARY: ${formatCurrency(netPay)}
      </div>

      <div class="date">${formatDate(new Date().toISOString())}</div>

      <div class="signature-section">
        <div class="signature">
          <div class="signature-name">${payroll.full_name || payroll.employee?.full_name || "Employee"}</div>
          <div class="signature-title">Signature Of The Employee</div>
        </div>

        <div class="signature">
          <div class="signature-name">Crissel Ann Bando</div>
          <div class="signature-title">Billing Assistant - OIC</div>
        </div>
      </div>

      <div class="date-printed">
        Printed on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
        <h3 class="watermark"style="margin-top: 6px; font-weight: bold; text-align: center;">-----------------------CONFIDENTIAL-----------------------</h3>
      </div>
    </div>
  </div>
</body>
</html>`

      printWindow.document.write(jbdHtml + jbdDailyRatesRows + jbdHtmlFooter)
    }

    // Close document and focus print window
    printWindow.document.close()
    printWindow.focus()
  }

  // Update the render function to show which template will be used
  const renderTemplateIndicator = () => {
    const department = payroll?.department || payroll?.employee?.department
    const template = getPayslipTemplate(department)

    return (
      <div className="mb-4 text-sm">
        <span className="font-medium">Template:</span>{" "}
        <span
          className={`px-2 py-1 rounded ${template === "allen-one" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}
        >
          {template === "allen-one" ? "Allen One" : "JBD Telecom"}
        </span>
        <span className="ml-2 text-gray-500">({department || "Unknown"} Department)</span>
      </div>
    )
  }

  // Fix the modal closing issue by updating the onClose prop handling
  const handleClose = () => {
    // Check if we're on a print route and navigate back to the main payroll page
    if (window.location.pathname.includes("/print")) {
      router.get("/payroll")
    } else {
      // If it's just a modal, call the onClose prop
      if (onClose) onClose()
    }
  }

  // Update the component's return statement to include the template indicator
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 dark:text-black">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[800px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Payslip Preview</h2>
          <div className="flex space-x-2">
            {isEditing ? (
              <Button onClick={handleSaveTemplate} className="flex items-center gap-1">
                Save Template
              </Button>
            ) : (
              <>

                <Button onClick={handlePrint} className="flex items-center gap-1">
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              </>
            )}
            <Button variant="outline" onClick={handleClose} className="dark:text-white">
              Close
            </Button>
          </div>
        </div>

        {/* Display which template will be used */}
        {renderTemplateIndicator()}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="ml-2">Loading attendance records...</p>
          </div>
        ) : attendanceRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No attendance records available. Please try again.</div>
        ) : (
          <>
            {isEditing ? (
              <div className="border border-gray-300 rounded-md p-4">
                <textarea
                  className="w-full h-[500px] font-mono text-sm"
                  value={editedTemplate}
                  onChange={(e) => setEditedTemplate(e.target.value)}
                />
              </div>
            ) : (
              <div
                ref={printRef}
                className="payslip max-w-md mx-auto p-4 border border-black text-sm relative"
                style={{ maxHeight: "12in" }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 5,
                    overflow: "hidden",
                    pointerEvents: "none",
                    opacity: 0.3,
                  }}
                >
                  {/* Generate confidential watermarks for preview */}
                  {(() => {
                    const watermarks = []
                    const rows = 20
                    const cols = 20

                    for (let r = 0; r < rows; r++) {
                      for (let c = 0; c < cols; c++) {
                        const text = (r + c) % 2 === 0 ? "CONFIDENTIAL" : "PRIVATE"
                        watermarks.push(
                          <div
                            key={`${r}-${c}`}
                            style={{
                              position: "absolute",
                              fontSize: "9px",
                              fontWeight: "bold",
                              color: "rgba(0, 0, 0, 0.25)",
                              transform: "rotate(-30deg)",
                              left: `${(c * 100) / cols}%`,
                              top: `${(r * 100) / rows}%`,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              maxWidth: "150px",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {text}
                          </div>,
                        )
                      }
                    }

                    return watermarks
                  })()}
                </div>
                {/* Preview based on department */}
                {getPayslipTemplate(payroll?.department || payroll?.employee?.department) === "allen-one" ? (
                  // Allen One template preview
                  <div className="allen-one-preview">
                    <div className="text-center font-bold text-lg bg-orange-500 text-white py-2">
                      AICOMVENIENCE GROCERY PRODUCTS DISTRIBUTION
                    </div>
                    <div className="text-center text-xs py-1 bg-blue-800 text-white">
                      Ground Flr Aicom Bldg. Sta Rita Karsada, Batangas City
                    </div>
                    <div className="text-center text-xs py-1 bg-blue-400 border-b border-black">
                      Telephone # (043)980-5276/jbd.aicomhrdepartment@gmail.com
                    </div>

                    {/* Payslip Title */}
                    <div className="text-center font-bold text-base my-2">PAYSLIP</div>

                    {/* Employee Details */}
                    <table className="w-full text-xs border border-black mb-2">
                      <tbody>
                        <tr>
                          <td className="border border-black p-1 w-1/5">Employee's Name</td>
                          <td className="border border-black p-1 w-3/10">
                            {payroll.full_name || payroll.employee?.full_name || "N/A"}
                          </td>
                          <td className="border border-black p-1 w-1/5">Department</td>
                          <td className="border border-black p-1 w-3/10">
                            {payroll.department || (payroll.employee && payroll.employee.department) || "Operations"}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-black p-1">Cut Off Period</td>
                          <td className="border border-black p-1">
                            {payroll.payroll_period &&
                            payroll.payroll_period.period_start &&
                            payroll.payroll_period.period_end
                              ? `${formatDate(payroll.payroll_period.period_start)} to ${formatDate(payroll.payroll_period.period_end)}`
                              : "N/A"}
                          </td>
                          <td className="border border-black p-1">Designation</td>
                          <td className="border border-black p-1">
                            {payroll.position ||
                              (payroll.employee && payroll.employee.position) ||
                              "Store Staff/Cashier"}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Earnings and Deductions Table */}
                    <div className="relative">
                      <table className="w-full text-xs border border-black mb-2">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-black p-1 text-center" colSpan={3}>
                              Earnings
                            </th>
                            <th className="border border-black p-1 text-center" colSpan={2}>
                              Deduction
                            </th>
                          </tr>
                          <tr className="bg-gray-100">
                            <th className="border border-black p-1">Cut-Off</th>
                            <th className="border border-black p-1">Daily Rate</th>
                            <th className="border border-black p-1">Adjustment</th>
                            <th className="border border-black p-1">Particular</th>
                            <th className="border border-black p-1">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyRatesData.slice(0, 7).map((data, index) => {
                            const date = new Date(data.date)
                            const dayOfMonth = date.getDate().toString().padStart(2, "0")
                            const monthOfYear = (date.getMonth() + 1).toString().padStart(2, "0")
                            const dayName = date.toLocaleDateString("en-US", { weekday: "long" })

                            // Get deduction values for specific rows
                            let deductionLabel = ""
                            let deductionValue = ""

                            if (index === 0) {
                              deductionLabel = "Cash Advances"
                              deductionValue = formatCurrency(payroll.cash_advance)
                            } else if (index === 1) {
                              deductionLabel = "Short"
                              deductionValue = formatCurrency(payroll.short)
                            } else if (index === 2) {
                              deductionLabel = "Loan"
                              deductionValue = formatCurrency(payroll.loan)
                            } else if (index === 3) {
                              // Get current month and year for deduction labels
                              const currentDate = new Date()
                              const currentMonth = currentDate.toLocaleString("default", { month: "short" })
                              const currentYear = currentDate.getFullYear()
                              const deductionPeriod = currentMonth + ". " + currentYear

                              deductionLabel = "HDMF (" + deductionPeriod + ")"
                              deductionValue = formatCurrency(payroll.philhealth_deduction)
                            } else if (index === 4) {
                              // Get current month and year for deduction labels
                              const currentDate = new Date()
                              const currentMonth = currentDate.toLocaleString("default", { month: "short" })
                              const currentYear = currentDate.getFullYear()
                              const deductionPeriod = currentMonth + ". " + currentYear

                              deductionLabel = "SSS (" + deductionPeriod + ")"
                              deductionValue = formatCurrency(payroll.sss_deduction)
                            } else if (index === 5) {
                              // Get current month and year for deduction labels
                              const currentDate = new Date()
                              const currentMonth = currentDate.toLocaleString("default", { month: "short" })
                              const currentYear = currentDate.getFullYear()
                              const deductionPeriod = currentMonth + ". " + currentYear

                              deductionLabel = "Pag-IBIG (" + deductionPeriod + ")"
                              deductionValue = formatCurrency(payroll.pagibig_deduction)
                            } else if (index === 6) {
                              deductionLabel = "Withholding Tax"
                              deductionValue = formatCurrency(payroll.tax_deduction)
                            } else if (index === 7) {
                              deductionLabel = "Others"
                              deductionValue = formatCurrency(payroll.other_deductions)
                            }

                            return (
                              <tr key={index}>
                                <td className="border border-black p-1">
                                  {monthOfYear}/{dayOfMonth}
                                  <br />
                                  {dayName}
                                </td>
                                <td className="border border-black p-1 text-right">{formatCurrency(data.amount)}</td>
                                <td className="border border-black p-1 text-right">
                                  {formatCurrency(data.adjustment)}
                                </td>
                                <td className="border border-black p-1">
                                  {index === 0
                                    ? "Cash Advances"
                                    : index === 1
                                      ? "Short"
                                      : index === 2
                                        ? "Loan"
                                        : index === 3
                                          ? `HDMF (${new Date().toLocaleString("default", { month: "short" })}. ${new Date().getFullYear()})`
                                          : index === 4
                                            ? `SSS (${new Date().toLocaleString("default", { month: "short" })}. ${new Date().getFullYear()})`
                                            : index === 5
                                              ? `Pag-IBIG (${new Date().toLocaleString("default", { month: "short" })}. ${new Date().getFullYear()})`
                                              : index === 6
                                                ? "Withholding Tax"
                                                : index === 7
                                                  ? "Others"
                                                  : ""}
                                </td>
                                <td className="border border-black p-1 text-right">
                                  {index === 0
                                    ? formatCurrency(payroll.cash_advance)
                                    : index === 1
                                      ? formatCurrency(payroll.short)
                                      : index === 2
                                        ? formatCurrency(payroll.loan)
                                        : index === 3
                                          ? formatCurrency(payroll.philhealth_deduction)
                                          : index === 4
                                            ? formatCurrency(payroll.sss_deduction)
                                            : index === 5
                                              ? formatCurrency(payroll.pagibig_deduction)
                                              : index === 6
                                                ? formatCurrency(payroll.tax_deduction)
                                                : index === 7
                                                  ? formatCurrency(payroll.other_deductions)
                                                  : ""}
                                </td>
                              </tr>
                            )
                          })}
                          <tr className="font-bold">
                            <td className="border border-black p-1 text-left" colSpan={2} >Gross Pay</td>
                            <td className="border border-black p-1 text-right">{formatCurrency(grossPay)}</td>
                            <td className="border border-black p-1">Total Deduction</td>
                            <td className="border border-black p-1 text-right">{formatCurrency(totalDeductions)}</td>
                          </tr>
                          <tr>
                            <td colSpan={3}></td>
                            <td className="border border-black p-1">Net Pay</td>
                            <td className="border border-black p-1 text-right">{formatCurrency(netPay)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="flex justify-center mt-4">
                         <div className="w-3/4 text-center border-t border-black pt-1 mt-4">
                        Crissel Ann Bando
                        <div className="text-xs">Billing Assistant - OIC</div>
                      </div>
                    </div>
                    </div>
                  </div>
                ) : (
                  // JBD template preview
                  <div className="jbd-telecom-preview">
                    <div className="text-center font-bold text-lg bg-gray-600 text-white py-2">
                      JBD TELECOM HUB POINT
                    </div>
                    <div className="text-center text-xs py-1 border-b border-black">
                      2nd Floor AICOM Bldg., Purok 7 Brgy. Sta. Rita Karsada, Batangas City
                      <br />
                      Telephone # (043)980-5276 | jbd.aicomhrdepartment@gmail.com
                    </div>

                    {/* Payslip Title */}
                    <div className="text-center font-bold text-base my-2">PAY SLIP</div>

                    {/* Employee Details */}
                    <table className="w-full text-xs border border-black mb-2">
                      <tbody>
                        <tr>
                          <td className="border border-black p-1 w-1/4 font-bold">Name</td>
                          <td className="border border-black p-1">
                            {payroll.full_name || payroll.employee?.full_name || "N/A"}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-black p-1 font-bold">Department</td>
                          <td className="border border-black p-1">
                            {payroll.department || (payroll.employee && payroll.employee.department) || "N/A"}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-black p-1 font-bold">Cut-off Period</td>
                          <td className="border border-black p-1">
                            {payroll.payroll_period &&
                            payroll.payroll_period.period_start &&
                            payroll.payroll_period.period_end
                              ? `${formatDate(payroll.payroll_period.period_start)} - ${formatDate(payroll.payroll_period.period_end)}`
                              : "Current Period"}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-black p-1 font-bold">Designation</td>
                          <td className="border border-black p-1">
                            {payroll.position || (payroll.employee && payroll.employee.position) || "N/A"}
                          </td>
                        </tr>
                        {payroll.status && (
                          <tr>
                            <td className="border border-black p-1 font-bold">Status</td>
                            <td className="border border-black p-1">{payroll.status}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Earnings Table */}
                    <div className="text-center font-bold text-sm my-2">Earnings</div>
                    <table className="w-full text-xs border border-black mb-2">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-black p-1">Date</th>
                          <th className="border border-black p-1">Status</th>
                          <th className="border border-black p-1">Daily Rate</th>
                          <th className="border border-black p-1">Adjustments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyRatesData.map((data, index) => (
                          <tr key={index}>
                            <td className="border border-black p-1">{formatShortDate(data.date.toISOString())}</td>
                            <td className="border border-black p-1">
                              <span className="inline-block px-1 py-0.5 text-xs font-bold border border-black">
                                {data.status}
                              </span>
                            </td>
                            <td className="border border-black p-1 text-right">{formatCurrency(data.amount)}</td>
                            <td className="border border-black p-1 text-right">{formatCurrency(data.adjustment)}</td>
                          </tr>
                        ))}
                        <tr className="font-bold">
                          <td colSpan={2}>Gross Salary</td>
                          <td className="border border-black p-1 text-right" colSpan={2}>
                            {formatCurrency(grossPay)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Deductions Table */}
                    <div className="text-center font-bold text-sm my-2">Deductions</div>
                    <table className="w-full text-xs border border-black mb-2">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-black p-1">Type</th>
                          <th className="border border-black p-1">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-black p-1">SSS</td>
                          <td className="border border-black p-1 text-right">
                            {formatCurrency(payroll.sss_deduction)}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-black p-1">PAG-IBIG</td>
                          <td className="border border-black p-1 text-right">
                            {formatCurrency(payroll.pagibig_deduction)}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-black p-1">PHILHEALTH</td>
                          <td className="border border-black p-1 text-right">
                            {formatCurrency(payroll.philhealth_deduction)}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-black p-1">CASH ADVANCE</td>
                          <td className="border border-black p-1 text-right">{formatCurrency(payroll.cash_advance)}</td>
                        </tr>
                        <tr>
                          <td className="border border-black p-1">LOAN</td>
                          <td className="border border-black p-1 text-right">{formatCurrency(payroll.loan)}</td>
                        </tr>
                        <tr>
                          <td className="border border-black p-1">VAT</td>
                          <td className="border border-black p-1 text-right">{formatCurrency(payroll.vat)}</td>
                        </tr>
                        <tr>
                          <td className="border border-black p-1">OTHERS</td>
                          <td className="border border-black p-1 text-right">
                            {formatCurrency(payroll.other_deductions)}
                          </td>
                        </tr>
                        <tr className="font-bold">
                          <td className="border border-black p-1">Total Deductions</td>
                          <td className="border border-black p-1 text-right">{formatCurrency(totalDeductions)}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Net Salary */}
                    <div className="text-right font-bold text-base my-2">NET SALARY: {formatCurrency(netPay)}</div>

                    {/* Date */}
                    <div className="text-center text-xs my-1">{formatDate(new Date().toISOString())}</div>

                    {/* Signature Section */}
                    <div className="flex flex-col items-center mt-4">
                      <div className="w-3/4 text-center border-t border-black pt-1">
                        {payroll.full_name || payroll.employee?.full_name || "Employee"}
                        <div className="text-xs">Signature Of The Employee</div>
                      </div>

                      <div className="w-3/4 text-center border-t border-black pt-1 mt-4">
                        Crissel Ann Bando
                        <div className="text-xs">Billing Assistant - OIC</div>
                      </div>
                    </div>

                    {/* Date Printed */}
                    <div className=" w-full text-center text-xs">
                      Printed on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                      <h3 className="font-bold" style={{ marginTop: "6px", textAlign: "center" }}>
                        -----------------------CONFIDENTIAL-----------------------
                      </h3>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default PrintPayslip

