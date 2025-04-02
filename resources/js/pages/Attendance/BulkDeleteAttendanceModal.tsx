"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, Trash2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { router } from "@inertiajs/react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Employee {
  id: number
  employee_number: string
  full_name: string
}

interface BulkDeleteModalProps {
  onClose: () => void
  employees?: Employee[]
}

const BulkDeleteAttendanceModal = ({ onClose, employees = [] }: BulkDeleteModalProps) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  })
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectAll, setSelectAll] = useState(false)
  const [deleteMode, setDeleteMode] = useState<"single" | "range">("single")
  const [confirmDelete, setConfirmDelete] = useState(false)

  const setToday = () => {
    setDate(new Date().toISOString().split("T")[0])
  }

  const toggleEmployee = (employeeNumber: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeNumber)
        ? prev.filter(e => e !== employeeNumber)
        : [...prev, employeeNumber]
    )
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedEmployees([])
    } else {
      setSelectedEmployees(employees.map(e => e.employee_number))
    }
    setSelectAll(!selectAll)
  }

  const handleSubmit = async () => {
    if (!confirmDelete) {
      toast.error("Please confirm the deletion")
      return
    }

    if (selectedEmployees.length === 0) {
      toast.error("Please select at least one employee")
      return
    }

    if (deleteMode === "single" && !date) {
      toast.error("Please select a date")
      return
    }

    if (deleteMode === "range" && (!dateRange.startDate || !dateRange.endDate)) {
      toast.error("Please select a date range")
      return
    }

    setIsSubmitting(true)

    try {
      await router.post('/attendance/bulk-delete', {
        employee_numbers: selectedEmployees,
        ...(deleteMode === "single" ? { date } : {
          start_date: dateRange.startDate,
          end_date: dateRange.endDate
        })
      }, {
        preserveScroll: true,
        onSuccess: () => toast.success("Records deleted successfully"),
        onError: errors => {
          if (typeof errors === 'object') {
            Object.values(errors).forEach(toast.error)
          } else {
            toast.error("Failed to delete records")
          }
        }
      })
      onClose()
    } catch (error) {
      toast.error("An error occurred during deletion")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Bulk Delete Attendance</DialogTitle>
          <DialogDescription>
            Delete multiple attendance records at once by selecting employees and date(s).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode selection */}
          <div className="space-y-2">
            <Label>Delete Mode</Label>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="single-date"
                  checked={deleteMode === "single"}
                  onCheckedChange={() => setDeleteMode("single")}
                />
                <Label htmlFor="single-date" className="cursor-pointer">
                  Single Date
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="date-range"
                  checked={deleteMode === "range"}
                  onCheckedChange={() => setDeleteMode("range")}
                />
                <Label htmlFor="date-range" className="cursor-pointer">
                  Date Range
                </Label>
              </div>
            </div>
          </div>

          {/* Date selection */}
          {deleteMode === "single" ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="delete-date">Date</Label>
                <Button variant="outline" size="sm" onClick={setToday} className="text-xs h-7">
                  <Calendar className="h-3 w-3 mr-1" />
                  Today
                </Button>
              </div>
              <Input
                id="delete-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({
                    ...prev,
                    startDate: e.target.value
                  }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({
                    ...prev,
                    endDate: e.target.value
                  }))}
                  required
                />
              </div>
            </div>
          )}

          {/* Employee selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Select Employees</Label>
              <Button variant="outline" size="sm" onClick={toggleSelectAll} className="text-xs h-7">
                {selectAll ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
              {employees.length > 0 ? (
                employees.map((employee) => (
                  <div key={employee.id} className="flex items-center space-x-2 py-1">
                    <Checkbox
                      id={`employee-${employee.id}`}
                      checked={selectedEmployees.includes(employee.employee_number)}
                      onCheckedChange={() => toggleEmployee(employee.employee_number)}
                    />
                    <Label htmlFor={`employee-${employee.id}`} className="text-sm cursor-pointer flex-1">
                      {employee.full_name} ({employee.employee_number})
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-2 text-center">
                  No employees found
                </p>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Selected: {selectedEmployees.length} employees
            </p>
          </div>

          {/* Warning */}
          <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This action cannot be undone. All attendance records will be permanently deleted.
            </AlertDescription>
          </Alert>

          {/* Confirmation */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="confirm-delete"
              checked={confirmDelete}
              onCheckedChange={(checked) => setConfirmDelete(!!checked)}
            />
            <Label htmlFor="confirm-delete" className="text-sm font-medium">
              I confirm that I want to delete these records
            </Label>
          </div>
        </div>

        {/* Footer buttons */}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!confirmDelete || selectedEmployees.length === 0 || isSubmitting}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {isSubmitting ? "Deleting..." : "Delete Records"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BulkDeleteAttendanceModal