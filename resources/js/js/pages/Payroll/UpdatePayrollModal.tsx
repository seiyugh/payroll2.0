"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calculator } from "lucide-react"

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

interface PayrollEntry {
  id: number
  employee_number: string
  full_name: string
  week_id: number
  daily_rate: string | number
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
  short?: string
  attendanceRecords?: Attendance[]
}

interface UpdatePayrollModalProps {
  payroll: PayrollEntry
  onClose: () => void
  employees: Employee[]
  payrollPeriods: PayrollPeriod[]
  attendances?: any[]
}

const UpdatePayrollModal = ({ payroll, onClose, employees, payrollPeriods, attendances }: UpdatePayrollModalProps) => {
  const [formData, setFormData] = useState({
    id: payroll.id,
    employee_number: payroll.employee_number,
    week_id: payroll.week_id,
    daily_rate: payroll.daily_rate,
    gross_pay: payroll.gross_pay,
    sss_deduction: payroll.sss_deduction,
    philhealth_deduction: payroll.philhealth_deduction,
    pagibig_deduction: payroll.pagibig_deduction,
    tax_deduction: payroll.tax_deduction,
    cash_advance: payroll.cash_advance,
    loan: payroll.loan,
    vat: payroll.vat,
    other_deductions: payroll.other_deductions,
    total_deductions: payroll.total_deductions,
    net_pay: payroll.net_pay,
    ytd_earnings: payroll.ytd_earnings,
    thirteenth_month_pay: payroll.thirteenth_month_pay,
    status: payroll.status,
    short: payroll.short || "0",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [isOpen, setIsOpen] = useState(true)
  const [isAllenOne, setIsAllenOne] = useState(false)
  const [selectedAttendances, setSelectedAttendances] = useState<Attendance[]>([])
  const [activeTab, setActiveTab] = useState<"basic" | "deductions">("basic")

  useEffect(() => {
    const employee = employees.find((emp) => emp.employee_number === payroll.employee_number)
    setSelectedEmployee(employee || null)
    setIsAllenOne(employee?.department?.toLowerCase() === "allen one")
  }, [employees, payroll.employee_number])

  useEffect(() => {
    if (selectedEmployee && formData.week_id) {
      fetchAttendanceRecords()
    }
  }, [selectedEmployee, formData.week_id])

  // Calculate total deductions and net pay whenever any deduction changes
  useEffect(() => {
    updateTotals()
  }, [
    formData.sss_deduction,
    formData.philhealth_deduction,
    formData.pagibig_deduction,
    formData.tax_deduction,
    formData.cash_advance,
    formData.loan,
    formData.vat,
    formData.other_deductions,
    formData.short,
    formData.gross_pay,
  ])

  const updateTotals = () => {
    // Calculate total deductions
    const totalDeductions =
      Number.parseFloat(formData.sss_deduction) +
      Number.parseFloat(formData.philhealth_deduction) +
      Number.parseFloat(formData.pagibig_deduction) +
      Number.parseFloat(formData.tax_deduction) +
      Number.parseFloat(formData.cash_advance || "0") +
      Number.parseFloat(formData.loan || "0") +
      Number.parseFloat(formData.vat || "0") +
      Number.parseFloat(formData.other_deductions || "0") +
      (isAllenOne ? Number.parseFloat(formData.short || "0") : 0)

    // Calculate net pay
    const grossPay = Number.parseFloat(formData.gross_pay)
    const netPay = grossPay - totalDeductions

    // Update form data
    setFormData((prev) => ({
      ...prev,
      total_deductions: totalDeductions.toFixed(2),
      net_pay: netPay.toFixed(2),
    }))
  }

  const fetchAttendanceRecords = () => {
    if (!selectedEmployee || !formData.week_id) return

    if (payroll.attendanceRecords?.length > 0) {
      setSelectedAttendances(payroll.attendanceRecords)
      return
    }

    if (attendances?.length > 0) {
      const filtered = attendances.filter((a) => a.employee_number === selectedEmployee.employee_number)
      setSelectedAttendances(filtered)
      return
    }

    const generated = generateAttendanceRecords()
    setSelectedAttendances(generated)
  }

  const generateAttendanceRecords = () => {
    const period = payrollPeriods.find((p) => p.week_id === formData.week_id || p.id === formData.week_id)
    if (!period || !selectedEmployee) return []

    try {
      const baseDailyRate = Number.parseFloat(selectedEmployee.daily_rate) || 0
      const start = new Date(period.period_start)
      const end = new Date(period.period_end)
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return []

      const generatedRecords = []
      const currentDate = new Date(start)
      let id = 1000

      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split("T")[0]
        const dayOfWeek = currentDate.getDay()
        const status = dayOfWeek === 0 || dayOfWeek === 6 ? "Day Off" : "Present"
        const adjustment = 0
        const dailyRate = status === "Day Off" ? 0 : baseDailyRate

        generatedRecords.push({
          id: id++,
          employee_number: selectedEmployee.employee_number,
          work_date: dateStr,
          daily_rate: dailyRate,
          adjustment: adjustment,
          status: status,
        })

        currentDate.setDate(currentDate.getDate() + 1)
      }

      return generatedRecords
    } catch (error) {
      console.error("Error generating attendance records:", error)
      return []
    }
  }

  const handleEmployeeChange = (value: string) => {
    const employee = employees.find((emp) => emp.employee_number === value)
    setIsAllenOne(employee?.department?.toLowerCase() === "allen one")

    setFormData((prev) => ({
      ...prev,
      employee_number: value,
      daily_rate: employee?.daily_rate || prev.daily_rate,
      short: employee?.department?.toLowerCase() === "allen one" ? prev.short : "0",
    }))

    setSelectedEmployee(employee || null)
    setSelectedAttendances([])

    if (employee && formData.week_id) {
      fetchAttendanceRecords()
    }
  }

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setIsSubmitting(false)
      toast.error(Object.values(validationErrors)[0])
      return
    }

    // Format the data properly for submission
    const formattedData = {
      id: formData.id,
      employee_number: formData.employee_number,
      week_id: Number.parseInt(formData.week_id.toString()),
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
      short: Number.parseFloat(formData.short || "0"),
      ytd_earnings: Number.parseFloat(formData.ytd_earnings || "0"),
      thirteenth_month_pay: Number.parseFloat(formData.thirteenth_month_pay || "0"),
      status: formData.status,
    }

    // Calculate total deductions to ensure it's correct
    const totalDeductions =
      formattedData.sss_deduction +
      formattedData.philhealth_deduction +
      formattedData.pagibig_deduction +
      formattedData.tax_deduction +
      formattedData.cash_advance +
      formattedData.loan +
      formattedData.vat +
      formattedData.other_deductions +
      (isAllenOne ? formattedData.short : 0)

    // Add total_deductions to the formatted data
    formattedData.total_deductions = totalDeductions

    if (!isAllenOne) {
      formattedData.short = 0
    }

    // Use PUT instead of POST for updating
    router.put(`/payroll/${formData.id}`, formattedData, {
      preserveScroll: true,
      onSuccess: () => {
        toast.success("Payroll updated successfully!")
        setIsSubmitting(false)
        onClose()
        router.visit(window.location.pathname + window.location.search, {
          only: ["payrollEntries", "payrollSummary"],
          preserveScroll: true,
          preserveState: false,
        })
      },
      onError: (errors) => {
        console.error("Payroll update error:", errors)
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

  const calculateStandardDeductions = (grossPayValue = null) => {
    const grossPay = grossPayValue !== null ? grossPayValue : Number.parseFloat(formData.gross_pay) || 0
    const { sss, philhealth, pagibig, tax } = calculateStandardDeductionsHelper(grossPay)

    // Update form data with calculated values
    setFormData((prev) => ({
      ...prev,
      sss_deduction: sss,
      philhealth_deduction: philhealth,
      pagibig_deduction: pagibig,
      tax_deduction: tax,
    }))

    if (grossPayValue === null) {
      toast.success("Standard deductions calculated based on gross pay")
    }
  }

  const calculateStandardDeductionsHelper = (grossPay: number) => {
    const gross = Number.parseFloat(grossPay.toString()) || 0
    const monthlyRate = gross * 4 // Convert weekly to monthly

    // SSS calculation (5% of monthly salary)
    let sss = 0
    if (monthlyRate <= 4000) {
      sss = 4000 * 0.05
    } else if (monthlyRate > 30000) {
      sss = 30000 * 0.05
    } else {
      const msc = Math.ceil(monthlyRate / 500) * 500
      sss = msc * 0.05
    }

    // PhilHealth calculation (2.5% of monthly salary)
    let philhealth = 0
    if (monthlyRate < 10000) {
      philhealth = 10000 * 0.025
    } else if (monthlyRate > 100000) {
      philhealth = 100000 * 0.025
    } else {
      philhealth = monthlyRate * 0.025
    }

    // Pag-IBIG calculation (2% of monthly salary, max 200)
    const pagibig = Math.min(monthlyRate * 0.02, 200)

    // Tax calculation
    let tax = 0
    const annualRate = monthlyRate * 12
    const taxableIncome = annualRate - (sss + philhealth + pagibig) * 12

    if (taxableIncome <= 250000) {
      tax = 0
    } else if (taxableIncome <= 400000) {
      tax = (taxableIncome - 250000) * 0.15
    } else if (taxableIncome <= 800000) {
      tax = 22500 + (taxableIncome - 400000) * 0.2
    } else if (taxableIncome <= 2000000) {
      tax = 102500 + (taxableIncome - 800000) * 0.25
    } else if (taxableIncome <= 8000000) {
      tax = 402500 + (taxableIncome - 2000000) * 0.3
    } else {
      tax = 2202500 + (taxableIncome - 8000000) * 0.35
    }

    const monthlyTax = tax / 12
    const weeklyTax = monthlyTax / 4

    return {
      sss: (sss / 4).toFixed(2), // Convert monthly to weekly
      philhealth: (philhealth / 4).toFixed(2), // Convert monthly to weekly
      pagibig: (pagibig / 4).toFixed(2), // Convert monthly to weekly
      tax: weeklyTax.toFixed(2),
    }
  }

  const handleCloseModal = () => {
    setIsOpen(false)
    onClose()
  }

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === "string" ? Number.parseFloat(value) : value
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(numValue)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseModal}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Payroll Entry #{payroll.id}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "basic" | "deductions")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="deductions">Deductions</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employee_number">Employee</Label>
                  <Select value={formData.employee_number} onValueChange={handleEmployeeChange}>
                    <SelectTrigger id="employee_number" className={errors.employee_number ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.employee_number}>
                          {employee.employee_number} - {employee.first_name} {employee.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.employee_number && <p className="text-red-500 text-xs mt-1">{errors.employee_number}</p>}
                </div>

                <div>
                  <Label htmlFor="week_id">Payroll Period</Label>
                  <Select value={formData.week_id.toString()} onValueChange={(value) => handleChange("week_id", value)}>
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
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
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

                <div>
                  <Label htmlFor="gross_pay">Gross Pay</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                    <Input
                      id="gross_pay"
                      type="number"
                      disabled
                      value={formData.gross_pay}
                      onChange={(e) => handleChange("gross_pay", e.target.value)}
                      step="0.01"
                      className={`pl-8 ${errors.gross_pay ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.gross_pay && <p className="text-red-500 text-xs mt-1">{errors.gross_pay}</p>}
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
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
                  <CardContent className="p-4">
                    <h3 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Payroll Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-600 dark:text-blue-400">Gross Pay:</span>
                        <span className="font-medium">{formatCurrency(formData.gross_pay)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-600 dark:text-blue-400">Total Deductions:</span>
                        <span className="font-medium">{formatCurrency(formData.total_deductions)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-blue-100 dark:border-blue-800">
                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Net Pay:</span>
                        <span className="font-bold text-blue-700 dark:text-blue-300">
                          {formatCurrency(formData.net_pay)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="deductions" className="space-y-4 pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Deductions</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => calculateStandardDeductions()}
                  className="text-xs border-indigo-200 text-indigo-600 hover:border-indigo-300 dark:border-indigo-800 dark:text-indigo-400 dark:hover:border-indigo-700"
                >
                  <Calculator className="h-4 w-4 mr-1" />
                  Calculate Standard Deductions
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
                  <CardContent className="p-4">
                    <h3 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Payroll Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-600 dark:text-blue-400">Gross Pay:</span>
                        <span className="font-medium">{formatCurrency(formData.gross_pay)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-600 dark:text-blue-400">Total Deductions:</span>
                        <span className="font-medium">{formatCurrency(formData.total_deductions)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-blue-100 dark:border-blue-800">
                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Net Pay:</span>
                        <span className="font-bold text-blue-700 dark:text-blue-300">
                          {formatCurrency(formData.net_pay)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
                  <CardContent className="p-4">
                    <h3 className="font-medium text-green-700 dark:text-green-300 mb-2">Mandatory Deductions</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-green-600 dark:text-green-400">SSS:</span>
                        <span className="font-medium">{formatCurrency(formData.sss_deduction)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-green-600 dark:text-green-400">PhilHealth:</span>
                        <span className="font-medium">{formatCurrency(formData.philhealth_deduction)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-green-600 dark:text-green-400">Pag-IBIG:</span>
                        <span className="font-medium">{formatCurrency(formData.pagibig_deduction)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-green-600 dark:text-green-400">Tax:</span>
                        <span className="font-medium">{formatCurrency(formData.tax_deduction)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800">
                  <CardContent className="p-4">
                    <h3 className="font-medium text-purple-700 dark:text-purple-300 mb-2">Other Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-purple-600 dark:text-purple-400">YTD Earnings:</span>
                        <span className="font-medium">{formatCurrency(formData.ytd_earnings || "0.00")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-purple-600 dark:text-purple-400">13th Month Pay:</span>
                        <span className="font-medium">{formatCurrency(formData.thirteenth_month_pay || "0.00")}</span>
                      </div>
                      {isAllenOne && (
                        <div className="flex justify-between">
                          <span className="text-sm text-purple-600 dark:text-purple-400">Short:</span>
                          <span className="font-medium">{formatCurrency(formData.short || "0.00")}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              className="border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isSubmitting ? "Updating..." : "Update Payroll Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default UpdatePayrollModal

