"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "lucide-react"
import { toast } from "sonner"
import { router } from "@inertiajs/react"

interface Employee {
  id: number
  employee_number: string
  full_name: string
  daily_rate: number
}

interface AddAttendanceModalProps {
  onClose: () => void
  onSubmit: (data: any) => void
  employees: Employee[]
}

const AddAttendanceModal = ({ onClose, onSubmit, employees }: AddAttendanceModalProps) => {
  const [formData, setFormData] = useState({
    employee_number: "",
    work_date: new Date().toISOString().split("T")[0],
    status: "Present",
    daily_rate: "",
    adjustment: "0",
  })

  const [errors, setErrors] = useState({
    employee_number: "",
    work_date: "",
    status: "",
    daily_rate: "",
    duplicate: "",
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear error when field is changed
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }
  }

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  // Handle employee selection
  const handleEmployeeChange = (employeeNumber: string) => {
    const employee = employees.find((e) => e.employee_number === employeeNumber)
    if (employee) {
      setSelectedEmployee(employee)
      setFormData((prev) => ({
        ...prev,
        employee_number: employee.employee_number,
        daily_rate: String(employee.daily_rate),
      }))
    }
  }

  // Set today's date
  const setToday = () => {
    setFormData((prev) => ({
      ...prev,
      work_date: new Date().toISOString().split("T")[0],
    }))
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Present":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
      case "Absent":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
      case "Day Off":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
      case "Half Day":
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
      case "WFH":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800"
      case "Leave":
        return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
      case "Holiday":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
      case "SP":
        return "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800"
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate form
    let hasErrors = false
    const newErrors = { ...errors }

    if (!formData.employee_number) {
      newErrors.employee_number = "Employee is required"
      hasErrors = true
    }

    if (!formData.work_date) {
      newErrors.work_date = "Date is required"
      hasErrors = true
    }

    if (!formData.status) {
      newErrors.status = "Status is required"
      hasErrors = true
    }

    if (!formData.daily_rate) {
      newErrors.daily_rate = "Daily rate is required"
      hasErrors = true
    }

    if (hasErrors) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)

    // Format data for submission
    const formattedData = {
      ...formData,
      daily_rate: Number.parseFloat(formData.daily_rate) || 0,
      adjustment: formData.adjustment ? Number.parseFloat(formData.adjustment) || 0 : 0,
    }

    // Find the selected employee for error messages
    const selectedEmployee = employees.find((e) => e.employee_number === formData.employee_number)
    const employeeName = selectedEmployee?.full_name || "this employee"

    // First check if a record already exists for this employee and date
    try {
      // Check if a record already exists
      const checkResponse = await fetch(
        `/api/attendance/check-existing?employee_number=${formData.employee_number}&work_date=${formData.work_date}`,
      )
      const checkData = await checkResponse.json()

      if (checkData.exists) {
        toast.error(`An attendance record already exists for ${employeeName} on ${formData.work_date}`)
        setIsSubmitting(false)
        return
      }

      // If no existing record, proceed with submission
      router.post("/attendance", formattedData, {
        preserveScroll: true,
        onSuccess: () => {
          toast.success(`Attendance record added for ${employeeName}`)
          onClose()
        },
        onError: (errors) => {
          console.error("Submission error:", errors)

          // Check for duplicate entry error in the response
          if (typeof errors === "object") {
            if (errors.duplicate) {
              toast.error(errors.duplicate)
            } else {
              Object.entries(errors).forEach(([field, message]) => {
                if (typeof message === "string" && message.toLowerCase().includes("duplicate")) {
                  toast.error(`An attendance record already exists for ${employeeName} on ${formData.work_date}`)
                } else {
                  toast.error(`${field}: ${message}`)
                }
              })
            }
          } else {
            toast.error("Failed to add attendance record")
          }
          setIsSubmitting(false)
        },
      })
    } catch (error) {
      console.error("Error in submission process:", error)

      // If the API check fails, try direct submission but handle duplicate errors
      router.post("/attendance", formattedData, {
        preserveScroll: true,
        onSuccess: () => {
          toast.success(`Attendance record added for ${employeeName}`)
          onClose()
        },
        onError: (errors) => {
          console.error("Submission error:", errors)

          if (typeof errors === "object") {
            if (errors.duplicate) {
              toast.error(errors.duplicate)
            } else {
              Object.entries(errors).forEach(([field, message]) => {
                if (typeof message === "string" && message.toLowerCase().includes("duplicate")) {
                  toast.error(`An attendance record already exists for ${employeeName} on ${formData.work_date}`)
                } else {
                  toast.error(`${field}: ${message}`)
                }
              })
            }
          } else {
            toast.error("Failed to add attendance record")
          }
          setIsSubmitting(false)
        },
      })
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Attendance Record</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Employee</Label>
            <Select onValueChange={handleEmployeeChange} defaultValue={formData.employee_number}>
              <SelectTrigger>
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.employee_number}>
                    {employee.full_name} ({employee.employee_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employee_number && <p className="text-sm text-red-500">{errors.employee_number}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="date">Date</Label>
              <Button type="button" variant="outline" size="sm" onClick={setToday} className="text-xs h-7">
                <Calendar className="h-3 w-3 mr-1" />
                Today
              </Button>
            </div>
            <Input
              id="date"
              name="work_date"
              type="date"
              value={formData.work_date}
              onChange={handleChange}
              className="w-full"
              required
            />
            {errors.work_date && <p className="text-sm text-red-500">{errors.work_date}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${formData.status === "Present" ? getStatusBadgeColor("Present") : ""}`}
                onClick={() => setFormData((prev) => ({ ...prev, status: "Present" }))}
              >
                Present
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${formData.status === "Absent" ? getStatusBadgeColor("Absent") : ""}`}
                onClick={() => setFormData((prev) => ({ ...prev, status: "Absent" }))}
              >
                Absent
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${formData.status === "Half Day" ? getStatusBadgeColor("Half Day") : ""}`}
                onClick={() => setFormData((prev) => ({ ...prev, status: "Half Day" }))}
              >
                Half Day
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${formData.status === "WFH" ? getStatusBadgeColor("WFH") : ""}`}
                onClick={() => setFormData((prev) => ({ ...prev, status: "WFH" }))}
              >
                WFH
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${formData.status === "Day Off" ? getStatusBadgeColor("Day Off") : ""}`}
                onClick={() => setFormData((prev) => ({ ...prev, status: "Day Off" }))}
              >
                Day Off
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${formData.status === "Leave" ? getStatusBadgeColor("Leave") : ""}`}
                onClick={() => setFormData((prev) => ({ ...prev, status: "Leave" }))}
              >
                Leave
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${formData.status === "Holiday" ? getStatusBadgeColor("Holiday") : ""}`}
                onClick={() => setFormData((prev) => ({ ...prev, status: "Holiday" }))}
              >
                Holiday
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${formData.status === "SP" ? getStatusBadgeColor("SP") : ""}`}
                onClick={() => setFormData((prev) => ({ ...prev, status: "SP" }))}
              >
                SP
              </Button>
            </div>

            {errors.status && <p className="text-sm text-red-500">{errors.status}</p>}
            {errors.duplicate && <p className="text-sm text-red-500">{errors.duplicate}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="daily_rate">Daily Rate</Label>
            <Input
              id="daily_rate"
              name="daily_rate"
              type="number"
              step="0.01"
              value={formData.daily_rate}
              onChange={handleChange}
              className="w-full"
              required
            />
            {errors.daily_rate && <p className="text-sm text-red-500">{errors.daily_rate}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjustment">Adjustment</Label>
            <Input
              id="adjustment"
              name="adjustment"
              type="number"
              step="0.01"
              value={formData.adjustment}
              onChange={handleChange}
              className="w-full"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Use positive or negative values for adjustments
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddAttendanceModal

