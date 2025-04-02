"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Calendar } from "lucide-react"
import { router } from "@inertiajs/react"

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
}

interface Employee {
  id: number
  employee_number: string
  full_name: string
}

interface UpdateAttendanceModalProps {
  attendance: Attendance
  onClose: () => void
  onSubmit: (data: any) => void
  employees?: Employee[]
}

const UpdateAttendanceModal = ({ attendance, onClose, onSubmit, employees = [] }: UpdateAttendanceModalProps) => {
  // Make sure the UpdateAttendanceModal component correctly handles the data structure
  useEffect(() => {
    console.log("Attendance data in modal:", attendance)
  }, [attendance])

  const [formData, setFormData] = useState({
    id: attendance.id,
    employee_id: attendance.employee_id || undefined,
    employee_number: attendance.employee_number || "",
    work_date: attendance.work_date || "",
    status: attendance.status || "Present",
    daily_rate: String(attendance.daily_rate || 0),
    adjustment: String(attendance.adjustment || 0),
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [quickSelect, setQuickSelect] = useState<string | null>(attendance.status)
  const [errors, setErrors] = useState({
    duplicate: "",
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear errors when changing date
    if (name === "work_date") {
      setErrors({ duplicate: "" })
    }
  }

  // Set today's date
  const setToday = () => {
    setFormData((prev) => ({
      ...prev,
      work_date: new Date().toISOString().split("T")[0],
    }))
    setErrors({ duplicate: "" })
  }

  // Handle quick select for status
  const handleQuickSelect = (status: string) => {
    setQuickSelect(status)
    setFormData((prev) => ({
      ...prev,
      status,
    }))
  }

  // Replace the handleSubmit function with this improved version:
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Make sure we're using the correct field structure and all numeric values are properly parsed
    const formattedData = {
      id: formData.id,
      employee_number: formData.employee_number,
      work_date: formData.work_date,
      status: formData.status,
      daily_rate: Number.parseFloat(formData.daily_rate) || 0, // Ensure it's a number or default to 0
      adjustment: Number.parseFloat(formData.adjustment) || 0, // Ensure it's a number or default to 0
    }

    // If employee_id is available, include it
    if (formData.employee_id) {
      formattedData.employee_id = formData.employee_id
    }

    setIsSubmitting(true)

    // Check if we're changing the date to a date that might already exist for this employee
    if (formData.work_date !== attendance.work_date) {
      try {
        // Check if a record already exists
        const checkResponse = await fetch(
          `/api/attendance/check-existing?employee_number=${formData.employee_number}&work_date=${formData.work_date}&exclude_id=${formData.id}`,
        )
        const checkData = await checkResponse.json()

        if (checkData.exists) {
          toast.error(`An attendance record already exists for this employee on ${formData.work_date}`)
          setErrors({ duplicate: `An attendance record already exists for this employee on ${formData.work_date}` })
          setIsSubmitting(false)
          return
        }

        // If no existing record, proceed with the update
        proceedWithUpdate(formattedData)
      } catch (error) {
        console.error("Error checking existing record:", error)

        // If the check fails, try direct update but handle duplicate errors
        proceedWithUpdate(formattedData)
      }
    } else {
      // No date change, proceed with update
      proceedWithUpdate(formattedData)
    }
  }

  // Helper function to proceed with the update
  const proceedWithUpdate = (formattedData) => {
    router.put(`/attendance/${formattedData.id}`, formattedData, {
      preserveScroll: true,
      onSuccess: () => {
        toast.success("Attendance record updated successfully")
        onClose()
      },
      onError: (errors) => {
        console.error("Update error:", errors)

        // Check for duplicate entry error in the response
        if (typeof errors === "object") {
          if (errors.duplicate) {
            toast.error(errors.duplicate)
            setErrors({ duplicate: errors.duplicate })
          } else {
            Object.entries(errors).forEach(([field, message]) => {
              if (typeof message === "string" && message.toLowerCase().includes("duplicate")) {
                const errorMsg = `An attendance record already exists for this employee on ${formattedData.work_date}`
                toast.error(errorMsg)
                setErrors({ duplicate: errorMsg })
              } else {
                toast.error(`${field}: ${message}`)
              }
            })
          }
        } else {
          toast.error("Failed to update attendance record")
        }
        setIsSubmitting(false)
      },
    })
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Update Attendance Record</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <div className="p-2 border rounded bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <p className="font-medium">{attendance.full_name || "N/A"}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{attendance.employee_number}</p>
            </div>
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
            {errors.duplicate && <p className="text-sm text-red-500">{errors.duplicate}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${quickSelect === "Present" ? getStatusBadgeColor("Present") : ""}`}
                onClick={() => handleQuickSelect("Present")}
              >
                Present
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${quickSelect === "Absent" ? getStatusBadgeColor("Absent") : ""}`}
                onClick={() => handleQuickSelect("Absent")}
              >
                Absent
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${quickSelect === "Half Day" ? getStatusBadgeColor("Half Day") : ""}`}
                onClick={() => handleQuickSelect("Half Day")}
              >
                Half Day
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${quickSelect === "WFH" ? getStatusBadgeColor("WFH") : ""}`}
                onClick={() => handleQuickSelect("WFH")}
              >
                WFH
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${quickSelect === "Day Off" ? getStatusBadgeColor("Day Off") : ""}`}
                onClick={() => handleQuickSelect("Day Off")}
              >
                Day Off
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${quickSelect === "Leave" ? getStatusBadgeColor("Leave") : ""}`}
                onClick={() => handleQuickSelect("Leave")}
              >
                Leave
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${quickSelect === "Holiday" ? getStatusBadgeColor("Holiday") : ""}`}
                onClick={() => handleQuickSelect("Holiday")}
              >
                Holiday
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${quickSelect === "SP" ? getStatusBadgeColor("SP") : ""}`}
                onClick={() => handleQuickSelect("SP")}
              >
                SP
              </Button>
            </div>
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
              {isSubmitting ? "Updating..." : "Update Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default UpdateAttendanceModal

