"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
// Add import for Tabs components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DialogFooter } from "@/components/ui/dialog"

interface Employee {
  id: number
  employee_number: string
  first_name: string
  last_name: string
  daily_rate: string
  department?: string
}

interface PayrollPeriod {
  id: number
  week_id: number
  period_start: string
  period_end: string
  payment_date: string
  status: string
}

interface Attendance {
  id: number
  employee_number: string
  work_date: string
  daily_rate: string | number
  adjustment: string | number
  status: string
}

interface AddPayrollModalProps {
  isOpen?: boolean
  onClose: () => void
  employees: Employee[]
  payrollPeriods: PayrollPeriod[]
  attendances?: any[] // Add this line
}

const AddPayrollModal = ({ isOpen = true, onClose, employees, payrollPeriods, attendances }: AddPayrollModalProps) => {
  const [formData, setFormData] = useState({
    employee_number: "",
    week_id: "",
    daily_rate: "",
    gross_pay: "0.00",
    sss_deduction: "0.00",
    philhealth_deduction: "0.00",
    pagibig_deduction: "0.00",
    tax_deduction: "0.00",
    cash_advance: "0.00",
    loan: "0.00",
    vat: "0.00",
    other_deductions: "0.00",
    total_deductions: "0.00",
    net_pay: "0.00",
    ytd_earnings: "0.00",
    thirteenth_month_pay: "0.00",
    status: "pending",
    short: "0.00",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("")
  const [filteredEmployees, setFilteredEmployees] = useState(employees)
  const [isAllenOne, setIsAllenOne] = useState(false)
  const [selectedAttendances, setSelectedAttendances] = useState<Attendance[]>([])
  const [daysWorked, setDaysWorked] = useState(0)
  const [isCalculatingFromAttendance, setIsCalculatingFromAttendance] = useState(true)
  const [hasAttendanceRecords, setHasAttendanceRecords] = useState(true)
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false)

  // Calculate derived values when form data changes
  useEffect(() => {
    if (selectedEmployee) {
      // Set daily rate from selected employee
      setFormData((prev) => ({
        ...prev,
        daily_rate: selectedEmployee.daily_rate,
      }))
    }
  }, [selectedEmployee])

  // Filter employees based on search term
  useEffect(() => {
    if (employeeSearchTerm.trim() === "") {
      setFilteredEmployees(employees)
    } else {
      const searchTermLower = employeeSearchTerm.toLowerCase()
      const filtered = employees.filter(
        (emp) =>
          emp.employee_number.toLowerCase().includes(searchTermLower) ||
          emp.first_name.toLowerCase().includes(searchTermLower) ||
          emp.last_name.toLowerCase().includes(searchTermLower),
      )
      setFilteredEmployees(filtered)
    }
  }, [employeeSearchTerm, employees])

  // Calculate gross pay, deductions, and net pay
  useEffect(() => {
    const calculatePayroll = () => {
      try {
        // Parse values as numbers
        const dailyRate = Number.parseFloat(formData.daily_rate) || 0
        const sssDeduction = Number.parseFloat(formData.sss_deduction) || 0
        const philhealthDeduction = Number.parseFloat(formData.philhealth_deduction) || 0
        const pagibigDeduction = Number.parseFloat(formData.pagibig_deduction) || 0
        const taxDeduction = Number.parseFloat(formData.tax_deduction) || 0
        const cashAdvance = Number.parseFloat(formData.cash_advance) || 0
        const loan = Number.parseFloat(formData.loan) || 0
        const vat = Number.parseFloat(formData.vat) || 0
        const otherDeductions = Number.parseFloat(formData.other_deductions) || 0
        const short = Number.parseFloat(formData.short) || 0

        // Calculate gross pay (assuming 5 working days per week)
        const grossPay = dailyRate * 5

        // Calculate total deductions
        const totalDeductions =
          sssDeduction +
          philhealthDeduction +
          pagibigDeduction +
          taxDeduction +
          cashAdvance +
          loan +
          vat +
          otherDeductions +
          short

        // Calculate net pay
        const netPay = grossPay - totalDeductions

        // Update form data with calculated values
        setFormData((prev) => ({
          ...prev,
          gross_pay: grossPay.toFixed(2),
          total_deductions: totalDeductions.toFixed(2),
          net_pay: netPay.toFixed(2),
        }))
      } catch (error) {
        console.error("Error calculating payroll:", error)
      }
    }

    if (!isCalculatingFromAttendance) {
      calculatePayroll()
    }
  }, [
    formData.daily_rate,
    formData.sss_deduction,
    formData.philhealth_deduction,
    formData.pagibig_deduction,
    formData.tax_deduction,
    formData.cash_advance,
    formData.loan,
    formData.vat,
    formData.other_deductions,
    formData.short,
    isCalculatingFromAttendance,
  ])

  // Auto-select the first period if available and none is selected
  useEffect(() => {
    if (payrollPeriods.length > 0 && !formData.week_id) {
      // Find a pending period first
      const pendingPeriod = payrollPeriods.find((p) => p.status.toLowerCase() === "pending")

      if (pendingPeriod) {
        setFormData((prev) => ({
          ...prev,
          week_id: pendingPeriod.week_id.toString(),
        }))

        // Fetch attendance if employee is selected
        if (selectedEmployee) {
          setTimeout(fetchAttendanceRecords, 100)
        }
      } else {
        // If no pending period, use the first one
        setFormData((prev) => ({
          ...prev,
          week_id: payrollPeriods[0].week_id.toString(),
        }))

        // Fetch attendance if employee is selected
        if (selectedEmployee) {
          setTimeout(fetchAttendanceRecords, 100)
        }
      }
    }
  }, [payrollPeriods, selectedEmployee])

  // Fetch attendance when period changes
  useEffect(() => {
    if (selectedEmployee && formData.week_id) {
      fetchAttendanceRecords()
    }
  }, [formData.week_id])

  // Modify the fetchAttendanceRecords function to directly fetch from the API like PrintPayslip does
  const fetchAttendanceRecords = () => {
    if (!selectedEmployee || !formData.week_id) return

    setIsAttendanceLoading(true)
    setHasAttendanceRecords(true) // Reset this flag

    console.log("Attempting to process attendance records for:", {
      employee: selectedEmployee.employee_number,
      weekId: formData.week_id,
    })

    // 1. Check attendances prop (via Inertia)
    if (attendances?.length > 0) {
      const filtered = attendances.filter((a) => a.employee_number === selectedEmployee.employee_number)
      setSelectedAttendances(filtered)
      setIsAttendanceLoading(false)
      return
    }

    // 2. Fallback to generation (same as PrintPayslip)
    const generated = generateAttendanceRecords()
    setSelectedAttendances(generated)
    setIsAttendanceLoading(false)
  }

  // Add this function to generate attendance records from payroll data
  const generateAttendanceRecords = () => {
    // Find the payroll period
    const period = payrollPeriods.find((p) => p.week_id.toString() === formData.week_id.toString())

    if (!period || !selectedEmployee) {
      return []
    }

    try {
      const baseDailyRate = Number.parseFloat(selectedEmployee.daily_rate) || 0
      const start = new Date(period.period_start)
      const end = new Date(period.period_end)

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error("Invalid date range in payroll period", {
          start: period.period_start,
          end: period.period_end,
        })
        return []
      }

      // Generate attendance records for each day in the period
      const generatedRecords = []
      const currentDate = new Date(start)
      let id = 1000

      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split("T")[0]
        const dayOfWeek = currentDate.getDay() // 0 = Sunday, 1 = Monday, etc.

        // Default status based on day of week - use proper capitalization
        const status = dayOfWeek === 0 || dayOfWeek === 6 ? "Day Off" : "Present"
        const adjustment = 0

        // Set daily rate based on status
        let dailyRate = baseDailyRate
        if (status === "Day Off") {
          dailyRate = 0
        }

        // Create attendance record for this day
        generatedRecords.push({
          id: id++,
          employee_number: selectedEmployee.employee_number,
          work_date: dateStr,
          daily_rate: dailyRate,
          adjustment: adjustment,
          status: status,
        })

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1)
      }

      return generatedRecords
    } catch (error) {
      console.error("Error generating attendance records:", error)
      return []
    }
  }

  // Calculate gross pay based on attendance records
  const calculateGrossPayFromAttendance = (attendanceRecords) => {
    if (!selectedEmployee || !attendanceRecords.length) return

    const baseDailyRate = Number.parseFloat(selectedEmployee.daily_rate) || 0
    let grossPay = 0

    attendanceRecords.forEach((record) => {
      const status = record.status.toLowerCase()
      const recordDailyRate = Number.parseFloat(record.daily_rate.toString() || "0") || baseDailyRate
      const adjustment = Number.parseFloat(record.adjustment?.toString() || "0") || 0

      // Calculate pay based on status - match the logic in PrintPayslip and Index.tsx
      let amount = 0
      switch (status) {
        case "present":
          amount = recordDailyRate * 1 // Present * 1
          break
        case "absent":
          amount = 0 // Absent * 0
          break
        case "day off":
          amount = 0 // Day Off * 0
          break
        case "half day":
          amount = recordDailyRate / 2 // Half Day / 2
          break
        case "holiday":
          amount = recordDailyRate * 2 // Special holiday * 2
          break
        case "leave":
          amount = 0 // Leave * 0
          break
        case "wfh":
          amount = recordDailyRate * 1 // WFH * 1
          break
        case "sp":
          amount = recordDailyRate * 1 // SP * 1
          break
        default:
          amount = recordDailyRate
          break
      }

      grossPay += amount + adjustment
    })

    // Set the gross pay with proper formatting
    setFormData((prev) => ({
      ...prev,
      gross_pay: grossPay.toFixed(2),
    }))

    // After setting gross pay, calculate standard deductions
    calculateStandardDeductions(grossPay)

    // Update the days worked count
    const workDays = attendanceRecords.filter(
      (record) => record.status.toLowerCase() === "present" || record.status.toLowerCase() === "half day",
    ).length
    setDaysWorked(workDays)
  }

  // Handle employee selection
  const handleEmployeeChange = (value: string) => {
    // Find the selected employee
    const employee = employees.find((emp) => emp.employee_number === value)

    // Check if employee is Allen One
    const isAllen = employee?.department?.toLowerCase() === "allen one"
    setIsAllenOne(isAllen)

    setFormData((prev) => ({
      ...prev,
      employee_number: value,
      daily_rate: employee?.daily_rate || prev.daily_rate,
      short: isAllen ? prev.short : "0", // Reset short if not Allen One
    }))

    setSelectedEmployee(employee || null)

    // Reset attendance-related state
    setSelectedAttendances([])
    setHasAttendanceRecords(true)

    // Fetch attendance records if period is selected
    if (employee && formData.week_id) {
      fetchAttendanceRecords()
    }
  }

  // Handle form input changes
  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    // Validate form data
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setIsSubmitting(false)

      // Show the first error as a toast
      const firstError = Object.values(validationErrors)[0]
      toast.error(firstError)
      return
    }

    // Format the data to match what the server expects
    const formattedData = {
      ...formData,
      week_id: Number.parseInt(formData.week_id),
      daily_rate: Number.parseFloat(formData.daily_rate.toString() || "0"),
      gross_pay: Number.parseFloat(formData.gross_pay),
      sss_deduction: Number.parseFloat(formData.sss_deduction),
      philhealth_deduction: Number.parseFloat(formData.philhealth_deduction),
      pagibig_deduction: Number.parseFloat(formData.pagibig_deduction),
      tax_deduction: Number.parseFloat(formData.tax_deduction),
      cash_advance: Number.parseFloat(formData.cash_advance || "0"),
      loan: Number.parseFloat(formData.loan || "0"),
      vat: Number.parseFloat(formData.vat || "0"),
      other_deductions: Number.parseFloat(formData.other_deductions || "0"),
      total_deductions: Number.parseFloat(formData.total_deductions),
      net_pay: Number.parseFloat(formData.net_pay),
      ytd_earnings: Number.parseFloat(formData.ytd_earnings || "0"),
      thirteenth_month_pay: Number.parseFloat(formData.thirteenth_month_pay || "0"),
      short: Number.parseFloat(formData.short || "0"),
      attendance_records: selectedAttendances.map((record) => ({
        id: record.id,
        employee_number: record.employee_number,
        work_date: record.work_date,
        daily_rate: Number.parseFloat(record.daily_rate.toString() || "0"),
        adjustment: Number.parseFloat(record.adjustment?.toString() || "0"),
        status: record.status,
      })),
    }

    // Ensure short is 0 for non-Allen One employees
    if (!isAllenOne) {
      formattedData.short = 0
    }

    console.log("Submitting new payroll with data:", formattedData)

    // Use Inertia to create the payroll
    router.post("/payroll/entries", formattedData, {
      preserveScroll: true, // Add this to prevent scrolling to top
      onSuccess: () => {
        toast.success("Payroll added successfully!")
        setIsSubmitting(false)
        onClose()

        // Force a refresh of the data
        router.visit(window.location.pathname + window.location.search, {
          only: ["payrollEntries", "payrollSummary"],
          preserveScroll: true,
          preserveState: false,
        })
      },
      onError: (errors) => {
        console.error("Payroll add error:", errors)
        setErrors(errors)
        setIsSubmitting(false)
        Object.entries(errors).forEach(([field, message]) => {
          toast.error(`${field}: ${message}`)
        })
      },
      preserveState: true,
      preserveScroll: true,
    })
  }

  // Validate form data
  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.employee_number) {
      errors.employee_number = "Please select an employee"
    }

    if (!formData.week_id) {
      errors.week_id = "Please select a payroll period"
    }

    if (!formData.daily_rate || Number.parseFloat(formData.daily_rate) <= 0) {
      errors.daily_rate = "Daily rate must be greater than zero"
    }

    if (!formData.status) {
      errors.status = "Please select a status"
    }

    if (!formData.gross_pay) {
      errors.gross_pay = "Gross pay must be greater than zero"
    }

    return errors
  }

  // Calculate standard deductions based on gross pay
  const calculateStandardDeductions = (grossPayValue = null) => {
    const grossPay = grossPayValue !== null ? grossPayValue : Number.parseFloat(formData.gross_pay) || 0

    // Calculate standard deductions based on Philippine rates
    const { sss, philhealth, pagibig, tax } = calculateStandardDeductionsHelper(grossPay)

    // Calculate total deductions
    const totalDeductions =
      Number.parseFloat(sss) +
      Number.parseFloat(philhealth) +
      Number.parseFloat(pagibig) +
      Number.parseFloat(tax) +
      Number.parseFloat(formData.cash_advance || "0") +
      Number.parseFloat(formData.loan || "0") +
      Number.parseFloat(formData.vat || "0") +
      Number.parseFloat(formData.other_deductions || "0") +
      Number.parseFloat(formData.short || "0")

    // Calculate net pay
    const netPay = grossPay - totalDeductions

    setFormData((prev) => ({
      ...prev,
      sss_deduction: sss,
      philhealth_deduction: philhealth,
      pagibig_deduction: pagibig,
      tax_deduction: tax,
      total_deductions: totalDeductions.toFixed(2),
      net_pay: netPay.toFixed(2),
    }))

    if (grossPayValue === null) {
      toast.success("Standard deductions calculated based on gross pay")
    }
  }

  const calculateStandardDeductionsHelper = (grossPay: number) => {
    // Parse the gross pay to ensure it's a number
    const gross = Number.parseFloat(grossPay.toString()) || 0
    const monthlyRate = gross * 4 // Approximate monthly rate based on weekly gross

    // Calculate SSS (Social Security System) contribution for 2025
    // 5% employee contribution based on Monthly Salary Credit (MSC)
    let sss = 0

    // Determine the Monthly Salary Credit (MSC) bracket
    // This is a simplified implementation - adjust according to the actual 2025 SSS table
    if (monthlyRate <= 4000) {
      sss = 4000 * 0.05 // 5% of minimum MSC
    } else if (monthlyRate > 30000) {
      sss = 30000 * 0.05 // 5% of maximum MSC
    } else {
      // Round to the nearest 500 for MSC determination
      const msc = Math.ceil(monthlyRate / 500) * 500
      sss = msc * 0.05
    }

    // Calculate PhilHealth contribution for 2025 (5% of monthly basic salary)
    // Employee pays 2.5% with floor of ₱10,000 and ceiling of ₱100,000
    let philhealth = 0
    if (monthlyRate < 10000) {
      philhealth = 10000 * 0.025 // 2.5% of minimum ₱10,000
    } else if (monthlyRate > 100000) {
      philhealth = 100000 * 0.025 // 2.5% of maximum ₱100,000
    } else {
      philhealth = monthlyRate * 0.025 // 2.5% of actual monthly salary
    }

    // Calculate Pag-IBIG contribution for 2025 (2% of monthly salary, max ₱200)
    const pagibig = Math.min(monthlyRate * 0.02, 200)

    // Calculate withholding tax (based on 2025 BIR tax table)
    let tax = 0
    const annualRate = monthlyRate * 12 // Convert monthly to annual
    const taxableIncome = annualRate - (sss + philhealth + pagibig) * 12 // Annual taxable income

    if (taxableIncome <= 250000) {
      tax = 0 // Exempt
    } else if (taxableIncome <= 400000) {
      tax = (taxableIncome - 250000) * 0.15 // 15% of excess over 250,000
    } else if (taxableIncome <= 800000) {
      tax = 22500 + (taxableIncome - 400000) * 0.2 // 22,500 + 20% of excess over 400,000
    } else if (taxableIncome <= 2000000) {
      tax = 102500 + (taxableIncome - 800000) * 0.25 // 102,500 + 25% of excess over 800,000
    } else if (taxableIncome <= 8000000) {
      tax = 402500 + (taxableIncome - 2000000) * 0.3 // 402,500 + 30% of excess over 2,000,000
    } else {
      tax = 2202500 + (taxableIncome - 8000000) * 0.35 // 2,202,500 + 35% of excess over 8,000,000
    }

    // Convert annual tax to monthly, then to weekly
    const monthlyTax = tax / 12
    const weeklyTax = monthlyTax / 4

    return {
      sss: (sss / 4).toFixed(2), // Convert monthly SSS to weekly
      philhealth: (philhealth / 4).toFixed(2), // Convert monthly PhilHealth to weekly
      pagibig: (pagibig / 4).toFixed(2), // Convert monthly Pag-IBIG to weekly
      tax: weeklyTax.toFixed(2),
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Payroll Entry</DialogTitle>
          <DialogDescription>Create a new payroll entry for an employee</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="dates" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="dates">Dates & Daily Rate</TabsTrigger>
              <TabsTrigger value="deductions">Deductions</TabsTrigger>
            </TabsList>

            <TabsContent value="dates" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="employee_search">Search Employee</Label>
                  <Input
                    id="employee_search"
                    type="text"
                    placeholder="Search by name or employee number"
                    value={employeeSearchTerm}
                    onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                    className="mb-2"
                  />
                  <Label htmlFor="employee_number">Employee</Label>
                  <Select value={formData.employee_number} onValueChange={(value) => handleEmployeeChange(value)}>
                    <SelectTrigger id="employee_number" className={errors.employee_number ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredEmployees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.employee_number}>
                          {employee.employee_number} - {employee.first_name} {employee.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.employee_number && <p className="text-red-500 text-xs mt-1">{errors.employee_number}</p>}
                </div>

                <div>
                  <Label htmlFor="week_id">Payroll Period (Week ID)</Label>
                  <Select value={formData.week_id} onValueChange={(value) => handleChange("week_id", value)}>
                    <SelectTrigger id="week_id" className={errors.week_id ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select Period" />
                    </SelectTrigger>
                    <SelectContent>
                      {payrollPeriods.map((period) => (
                        <SelectItem key={period.id} value={period.week_id.toString()}>
                          Week {period.week_id}: {new Date(period.period_start).toLocaleDateString()} -{" "}
                          {new Date(period.period_end).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.week_id && <p className="text-red-500 text-xs mt-1">{errors.week_id}</p>}
                </div>

                <div>
                  <Label htmlFor="daily_rate">Daily Rate</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                    <Input
                      id="daily_rate"
                      type="number"
                      value={formData.daily_rate}
                      onChange={(e) => handleChange("daily_rate", e.target.value)}
                      step="0.01"
                      className={`pl-8 ${errors.daily_rate ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.daily_rate && <p className="text-red-500 text-xs mt-1">{errors.daily_rate}</p>}
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleChange("status", value)} required>
                    <SelectTrigger id="status" className={errors.status ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
                </div>

                <div className="flex items-center space-x-2">
                  <Label htmlFor="calculation-method" className="flex-grow">
                    Calculation Method:
                  </Label>
                  <div className="flex items-center space-x-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={isCalculatingFromAttendance ? "default" : "outline"}
                      onClick={() => {
                        if (!hasAttendanceRecords) {
                          toast.warning("No attendance records available. Using manual calculation.")
                          return
                        }
                        setIsCalculatingFromAttendance(true)
                        if (selectedAttendances.length > 0) {
                          calculateGrossPayFromAttendance(selectedAttendances)
                        }
                      }}
                      className="text-xs"
                      disabled={isAttendanceLoading || !hasAttendanceRecords}
                    >
                      Attendance
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={!isCalculatingFromAttendance ? "default" : "outline"}
                      onClick={() => setIsCalculatingFromAttendance(false)}
                      className="text-xs"
                    >
                      Manual
                    </Button>
                  </div>
                </div>

                {selectedEmployee && formData.week_id && !hasAttendanceRecords && (
                  <Alert variant="warning" className="bg-amber-50 text-amber-800 border-amber-200">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <AlertDescription>
                      No attendance records found for this employee in the selected period. Using default calculation
                      method.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Attendance Records Table - Moved up in the layout */}
                {selectedAttendances.length > 0 && (
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-2">Daily Attendance Records</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-left py-2 px-2">Date</th>
                              <th className="text-left py-2 px-2">Status</th>
                              <th className="text-right py-2 px-2">Daily Rate</th>
                              <th className="text-right py-2 px-2">Adjustment</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedAttendances.map((record, index) => (
                              <tr
                                key={record.id}
                                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                              >
                                <td className="py-2 px-2">
                                  <span className="font-medium">{new Date(record.work_date).toLocaleDateString()}</span>
                                  <span className="block text-xs text-gray-500">
                                    {new Date(record.work_date).toLocaleDateString(undefined, { weekday: "long" })}
                                  </span>
                                </td>
                                <td className="py-2 px-2">
                                  <Select
                                    value={record.status}
                                    onValueChange={(value) => {
                                      const updatedAttendances = [...selectedAttendances]

                                      // Get the base daily rate
                                      const baseDailyRate = Number.parseFloat(selectedEmployee?.daily_rate || "0")

                                      // Calculate the adjusted amount based on status
                                      let adjustedAmount = baseDailyRate
                                      switch (value.toLowerCase()) {
                                        case "absent":
                                          adjustedAmount = 0
                                          break
                                        case "day off":
                                          adjustedAmount = 0
                                          break
                                        case "half day":
                                          adjustedAmount = baseDailyRate / 2
                                          break
                                        case "holiday":
                                          adjustedAmount = baseDailyRate * 2
                                          break
                                        case "leave":
                                          adjustedAmount = 0
                                          break
                                        case "present":
                                        case "wfh":
                                        case "sp":
                                          adjustedAmount = baseDailyRate
                                          break
                                        default:
                                          adjustedAmount = baseDailyRate
                                      }

                                      updatedAttendances[index] = {
                                        ...record,
                                        status: value,
                                        daily_rate: adjustedAmount, // Update the daily rate to match the status
                                      }

                                      setSelectedAttendances(updatedAttendances)

                                      // Recalculate gross pay if using attendance method
                                      if (isCalculatingFromAttendance) {
                                        calculateGrossPayFromAttendance(updatedAttendances)
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-8 min-h-8 w-full border-gray-200">
                                      <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Present">
                                        <div className="flex items-center">
                                          <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                                          Present
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="Absent">
                                        <div className="flex items-center">
                                          <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                                          Absent
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="Day Off">
                                        <div className="flex items-center">
                                          <div className="w-2 h-2 rounded-full bg-blue-400 mr-2"></div>
                                          Day Off
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="Half Day">
                                        <div className="flex items-center">
                                          <div className="w-2 h-2 rounded-full bg-orange-500 mr-2"></div>
                                          Half Day
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="Holiday">
                                        <div className="flex items-center">
                                          <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                                          Holiday
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="Leave">
                                        <div className="flex items-center">
                                          <div className="w-2 h-2 rounded-full bg-cyan-400 mr-2"></div>
                                          Leave
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="WFH">
                                        <div className="flex items-center">
                                          <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                                          WFH
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="SP">
                                        <div className="flex items-center">
                                          <div className="w-2 h-2 rounded-full bg-pink-500 mr-2"></div>
                                          SP
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="py-2 px-2">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">
                                      ₱
                                    </span>
                                    <Input
                                      type="number"
                                      value={record.daily_rate.toString()}
                                      onChange={(e) => {
                                        const updatedAttendances = [...selectedAttendances]
                                        updatedAttendances[index] = { ...record, daily_rate: e.target.value }
                                        setSelectedAttendances(updatedAttendances)

                                        // Recalculate gross pay if using attendance method
                                        if (isCalculatingFromAttendance) {
                                          calculateGrossPayFromAttendance(updatedAttendances)
                                        }
                                      }}
                                      step="0.01"
                                      className="h-8 min-h-8 pl-6 text-right border-gray-200"
                                    />
                                  </div>
                                </td>
                                <td className="py-2 px-2">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">
                                      ₱
                                    </span>
                                    <Input
                                      type="number"
                                      value={record.adjustment?.toString() || "0"}
                                      onChange={(e) => {
                                        const updatedAttendances = [...selectedAttendances]
                                        updatedAttendances[index] = { ...record, adjustment: e.target.value }
                                        setSelectedAttendances(updatedAttendances)

                                        // Recalculate gross pay if using attendance method
                                        if (isCalculatingFromAttendance) {
                                          calculateGrossPayFromAttendance(updatedAttendances)
                                        }
                                      }}
                                      step="0.01"
                                      className="h-8 min-h-8 pl-6 text-right border-gray-200"
                                    />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50 dark:bg-gray-800/50">
                            <tr>
                              <td colSpan={2} className="py-2 px-2 font-medium text-gray-700 dark:text-gray-300">
                                Total ({selectedAttendances.length} days)
                              </td>
                              <td className="py-2 px-2 text-right font-medium text-gray-700 dark:text-gray-300">
                                ₱
                                {selectedAttendances
                                  .reduce((sum, record) => sum + (Number(record.daily_rate) || 0), 0)
                                  .toFixed(2)}
                              </td>
                              <td className="py-2 px-2 text-right font-medium text-gray-700 dark:text-gray-300">
                                ₱
                                {selectedAttendances
                                  .reduce((sum, record) => sum + (Number(record.adjustment) || 0), 0)
                                  .toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={2} className="py-2 px-2 font-medium text-green-700 dark:text-green-300">
                                Calculated Pay (Based on Status)
                              </td>
                              <td
                                colSpan={2}
                                className="py-2 px-2 text-right font-medium text-green-700 dark:text-green-300"
                              >
                                ₱
                                {selectedAttendances
                                  .reduce((sum, record) => {
                                    const status = record.status.toLowerCase()
                                    const recordDailyRate = Number.parseFloat(record.daily_rate.toString() || "0") || 0
                                    const adjustment = Number.parseFloat(record.adjustment?.toString() || "0") || 0

                                    let amount = 0
                                    switch (status) {
                                      case "present":
                                        amount = recordDailyRate * 1
                                        break
                                      case "absent":
                                        amount = 0
                                        break
                                      case "day off":
                                        amount = 0
                                        break
                                      case "half day":
                                        amount = recordDailyRate / 2
                                        break
                                      case "holiday":
                                        amount = recordDailyRate * 2
                                        break
                                      case "leave":
                                        amount = 0
                                        break
                                      case "wfh":
                                        amount = recordDailyRate * 1
                                        break
                                      case "sp":
                                        amount = recordDailyRate * 1
                                        break
                                      default:
                                        amount = 0
                                        break
                                    }

                                    return sum + amount + adjustment
                                  }, 0)
                                  .toFixed(2)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Summary Cards - Moved below the attendance table */}
                <Card className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800">
                  <CardContent className="p-4">
                    <h3 className="font-medium text-indigo-700 dark:text-indigo-300 mb-2">Payroll Summary</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm text-indigo-600 dark:text-indigo-400">Gross Pay:</p>
                        <p className="font-bold text-indigo-700 dark:text-indigo-300">
                          ₱
                          {selectedAttendances
                            .reduce((sum, record) => {
                              const status = record.status.toLowerCase()
                              const recordDailyRate = Number.parseFloat(record.daily_rate.toString() || "0") || 0
                              const adjustment = Number.parseFloat(record.adjustment?.toString() || "0") || 0

                              let amount = 0
                              switch (status) {
                                case "present":
                                  amount = recordDailyRate * 1
                                  break
                                case "absent":
                                  amount = 0
                                  break
                                case "day off":
                                  amount = 0
                                  break
                                case "half day":
                                  amount = recordDailyRate / 2
                                  break
                                case "holiday":
                                  amount = recordDailyRate * 2
                                  break
                                case "leave":
                                  amount = 0
                                  break
                                case "wfh":
                                  amount = recordDailyRate * 1
                                  break
                                case "sp":
                                  amount = recordDailyRate * 1
                                  break
                                default:
                                  amount = 0
                                  break
                              }

                              return sum + amount + adjustment
                            }, 0)
                            .toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-indigo-600 dark:text-indigo-400">Total Deductions:</p>
                        <p className="font-bold text-indigo-700 dark:text-indigo-300">₱{formData.total_deductions}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-indigo-600 dark:text-indigo-400">Net Pay:</p>
                        <p className="font-bold text-lg text-indigo-700 dark:text-indigo-300">
                          ₱
                          {(
                            selectedAttendances.reduce((sum, record) => {
                              const status = record.status.toLowerCase()
                              const recordDailyRate = Number.parseFloat(record.daily_rate.toString() || "0") || 0
                              const adjustment = Number.parseFloat(record.adjustment?.toString() || "0") || 0

                              let amount = 0
                              switch (status) {
                                case "present":
                                  amount = recordDailyRate * 1
                                  break
                                case "absent":
                                  amount = 0
                                  break
                                case "day off":
                                  amount = 0
                                  break
                                case "half day":
                                  amount = recordDailyRate / 2
                                  break
                                case "holiday":
                                  amount = recordDailyRate * 2
                                  break
                                case "leave":
                                  amount = 0
                                  break
                                case "wfh":
                                  amount = recordDailyRate * 1
                                  break
                                case "sp":
                                  amount = recordDailyRate * 1
                                  break
                                default:
                                  amount = 0
                                  break
                              }

                              return sum + amount + adjustment
                            }, 0) - Number.parseFloat(formData.total_deductions || "0")
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedAttendances.length > 0 && (
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
                    <CardContent className="p-4">
                      <h3 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Attendance Summary</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-sm text-blue-600 dark:text-blue-400">Days Present:</p>
                          <p className="font-bold text-blue-700 dark:text-blue-300">
                            {selectedAttendances.filter((a) => a.status === "Present").length}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-600 dark:text-blue-400">Half Days:</p>
                          <p className="font-bold text-blue-700 dark:text-blue-300">
                            {selectedAttendances.filter((a) => a.status === "Half Day").length}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-600 dark:text-blue-400">Absences:</p>
                          <p className="font-bold text-blue-700 dark:text-blue-300">
                            {selectedAttendances.filter((a) => a.status === "Absent").length}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-600 dark:text-blue-400">Total Records:</p>
                          <p className="font-bold text-blue-700 dark:text-blue-300">{selectedAttendances.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="deductions" className="space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Deductions</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => calculateStandardDeductions()}
                    className="text-xs border-indigo-200 text-indigo-600 hover:border-indigo-300 dark:border-indigo-800 dark:text-indigo-400 dark:hover:border-indigo-700"
                  >
                    Calculate Standard Deductions
                  </Button>
                </div>

                <div>
                  <Label htmlFor="sss_deduction">SSS</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                    <Input
                      id="sss_deduction"
                      type="number"
                      value={formData.sss_deduction}
                      onChange={(e) => handleChange("sss_deduction", e.target.value)}
                      step="0.01"
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="philhealth_deduction">PhilHealth</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                    <Input
                      id="philhealth_deduction"
                      type="number"
                      value={formData.philhealth_deduction}
                      onChange={(e) => handleChange("philhealth_deduction", e.target.value)}
                      step="0.01"
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="pagibig_deduction">Pag-IBIG</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                    <Input
                      id="pagibig_deduction"
                      type="number"
                      value={formData.pagibig_deduction}
                      onChange={(e) => handleChange("pagibig_deduction", e.target.value)}
                      step="0.01"
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="tax_deduction">Tax</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                    <Input
                      id="tax_deduction"
                      type="number"
                      value={formData.tax_deduction}
                      onChange={(e) => handleChange("tax_deduction", e.target.value)}
                      step="0.01"
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="cash_advance">Cash Advance</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                    <Input
                      id="cash_advance"
                      type="number"
                      value={formData.cash_advance}
                      onChange={(e) => handleChange("cash_advance", e.target.value)}
                      step="0.01"
                      className="pl-8"
                    />
                  </div>
                </div>

                {isAllenOne && (
                  <div>
                    <Label htmlFor="short">Short</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                      <Input
                        id="short"
                        type="number"
                        value={formData.short || "0"}
                        onChange={(e) => handleChange("short", e.target.value)}
                        step="0.01"
                        className="pl-8"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="loan">Loan</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                    <Input
                      id="loan"
                      type="number"
                      value={formData.loan}
                      onChange={(e) => handleChange("loan", e.target.value)}
                      step="0.01"
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="vat">VAT</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                    <Input
                      id="vat"
                      type="number"
                      value={formData.vat}
                      onChange={(e) => handleChange("vat", e.target.value)}
                      step="0.01"
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="other_deductions">Other Deductions</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                    <Input
                      id="other_deductions"
                      type="number"
                      value={formData.other_deductions}
                      onChange={(e) => handleChange("other_deductions", e.target.value)}
                      step="0.01"
                      className="pl-8"
                    />
                  </div>
                </div>

                <Card className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800 mt-4">
                  <CardContent className="p-4">
                    <h3 className="font-medium text-indigo-700 dark:text-indigo-300 mb-2">Deductions Summary</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm text-indigo-600 dark:text-indigo-400">Total Deductions:</p>
                        <p className="font-bold text-indigo-700 dark:text-indigo-300">₱{formData.total_deductions}</p>
                      </div>
                      <div>
                        <p className="text-sm text-indigo-600 dark:text-indigo-400">Gross Pay:</p>
                        <p className="font-bold text-indigo-700 dark:text-indigo-300">
                          ₱
                          {selectedAttendances
                            .reduce((sum, record) => {
                              const status = record.status.toLowerCase()
                              const recordDailyRate = Number.parseFloat(record.daily_rate.toString() || "0") || 0
                              const adjustment = Number.parseFloat(record.adjustment?.toString() || "0") || 0

                              let amount = 0
                              switch (status) {
                                case "present":
                                  amount = recordDailyRate * 1
                                  break
                                case "absent":
                                  amount = 0
                                  break
                                case "day off":
                                  amount = 0
                                  break
                                case "half day":
                                  amount = recordDailyRate / 2
                                  break
                                case "holiday":
                                  amount = recordDailyRate * 2
                                  break
                                case "leave":
                                  amount = 0
                                  break
                                case "wfh":
                                  amount = recordDailyRate * 1
                                  break
                                case "sp":
                                  amount = recordDailyRate * 1
                                  break
                                default:
                                  amount = 0
                                  break
                              }

                              return sum + amount + adjustment
                            }, 0)
                            .toFixed(2)}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-indigo-600 dark:text-indigo-400">Net Pay:</p>
                        <p className="font-bold text-lg text-indigo-700 dark:text-indigo-300">
                          ₱
                          {(
                            selectedAttendances.reduce((sum, record) => {
                              const status = record.status.toLowerCase()
                              const recordDailyRate = Number.parseFloat(record.daily_rate.toString() || "0") || 0
                              const adjustment = Number.parseFloat(record.adjustment?.toString() || "0") || 0

                              let amount = 0
                              switch (status) {
                                case "present":
                                  amount = recordDailyRate * 1
                                  break
                                case "absent":
                                  amount = 0
                                  break
                                case "day off":
                                  amount = 0
                                  break
                                case "half day":
                                  amount = recordDailyRate / 2
                                  break
                                case "holiday":
                                  amount = recordDailyRate * 2
                                  break
                                case "leave":
                                  amount = 0
                                  break
                                case "wfh":
                                  amount = recordDailyRate * 1
                                  break
                                case "sp":
                                  amount = recordDailyRate * 1
                                  break
                                default:
                                  amount = 0
                                  break
                              }

                              return sum + amount + adjustment
                            }, 0) - Number.parseFloat(formData.total_deductions || "0")
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Payroll Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddPayrollModal

