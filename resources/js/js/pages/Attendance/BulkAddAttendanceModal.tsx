"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, Upload, Users, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { router } from "@inertiajs/react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Employee {
  id: number
  employee_number: string
  full_name: string
}

interface BulkAddAttendanceModalProps {
  onClose: () => void
  onSubmitFile: (file: File) => void
  onSubmitManual: (date: string, employeeNumbers: string[], status: string) => void
  employees?: Employee[]
}

const BulkAddAttendanceModal = ({
  onClose,
  onSubmitFile,
  onSubmitManual,
  employees = [],
}: BulkAddAttendanceModalProps) => {
  const [activeTab, setActiveTab] = useState("file")
  const [file, setFile] = useState<File | null>(null)
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [status, setStatus] = useState<string>("Present")
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectAll, setSelectAll] = useState(false)
  const [errors, setErrors] = useState({
    duplicate: "",
  })

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  // Handle file upload submission
  const handleFileSubmit = () => {
    if (!file) return
    setIsSubmitting(true)
    try {
      onSubmitFile(file)
    } catch (error) {
      console.error("Error uploading file:", error)
      toast.error("Error uploading file. Please try again.")
      setIsSubmitting(false)
    }
  }

  // Handle manual submission
  const handleManualSubmit = async () => {
    if (!date || selectedEmployees.length === 0) {
      toast.error("Please select a date and at least one employee")
      return
    }

    setIsSubmitting(true)
    setErrors({ duplicate: "" })

    try {
      // Check for existing records first
      const checkResponse = await fetch(
        `/api/attendance/check-bulk-existing?employee_numbers=${selectedEmployees.join(",")}&work_date=${date}`,
      )
      const checkData = await checkResponse.json()

      if (checkData.existingEmployees && checkData.existingEmployees.length > 0) {
        // Some employees already have records for this date
        if (checkData.existingEmployees.length === selectedEmployees.length) {
          const errorMsg = `All selected employees already have attendance records for ${date}`
          toast.error(errorMsg)
          setErrors({ duplicate: errorMsg })
          setIsSubmitting(false)
          return
        }

        // Filter out employees that already have records
        const filteredEmployees = selectedEmployees.filter((empNum) => !checkData.existingEmployees.includes(empNum))

        // Ask user if they want to continue with remaining employees
        if (
          confirm(
            `${checkData.existingEmployees.length} employees already have attendance records for ${date}. Do you want to continue with the remaining ${filteredEmployees.length} employees?`,
          )
        ) {
          onSubmitManual(date, filteredEmployees, status)
        } else {
          setIsSubmitting(false)
        }
      } else {
        // No existing records, proceed normally
        onSubmitManual(date, selectedEmployees, status)
      }
    } catch (error) {
      console.error("Error checking existing records:", error)

      // If the check fails, try direct submission but handle duplicate errors
      router.post(
        "/attendance/bulk",
        { work_date: date, employee_numbers: selectedEmployees, status },
        {
          preserveScroll: true,
          onSuccess: () => {
            toast.success("Attendance records added successfully!")
            onClose()
          },
          onError: (errors) => {
            console.error("Bulk add errors:", errors)
            if (typeof errors === "object") {
              if (errors.duplicate) {
                toast.error(errors.duplicate)
                setErrors({ duplicate: errors.duplicate })
              } else {
                Object.values(errors).forEach((message) => {
                  toast.error(`Error: ${message}`)
                })
              }
            } else {
              toast.error("Failed to add attendance records")
            }
            setIsSubmitting(false)
          },
        },
      )
    }
  }

  // Set today's date
  const setToday = () => {
    setDate(new Date().toISOString().split("T")[0])
    setErrors({ duplicate: "" })
  }

  // Toggle employee selection
  const toggleEmployee = (employeeNumber: string) => {
    if (selectedEmployees.includes(employeeNumber)) {
      setSelectedEmployees(selectedEmployees.filter((e) => e !== employeeNumber))
    } else {
      setSelectedEmployees([...selectedEmployees, employeeNumber])
    }
  }

  // Toggle select all employees
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedEmployees([])
    } else {
      setSelectedEmployees(employees.map((e) => e.employee_number))
    }
    setSelectAll(!selectAll)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Bulk Add Attendance</DialogTitle>
          <DialogDescription>
            Add multiple attendance records at once by uploading a file or selecting employees manually.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="file" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">File Upload</TabsTrigger>
            <TabsTrigger value="manual">Manual Selection</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="file">Upload CSV or Excel File</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Drag and drop your file here or click to browse
                </p>
                <Input id="file" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("file")?.click()}
                  className="mt-2"
                >
                  Browse Files
                </Button>
                {file && <p className="mt-2 text-sm text-green-600 dark:text-green-400">Selected: {file.name}</p>}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                File should contain columns: employee_number, work_date, status, daily_rate, adjustment
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button type="button" onClick={handleFileSubmit} disabled={!file || isSubmitting}>
                {isSubmitting ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="manual-date">Date</Label>
                <Button type="button" variant="outline" size="sm" onClick={setToday} className="text-xs h-7">
                  <Calendar className="h-3 w-3 mr-1" />
                  Today
                </Button>
              </div>
              <Input
                id="manual-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  setErrors({ duplicate: "" })
                }}
                className="w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select defaultValue={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                  <SelectItem value="Day Off">Day Off</SelectItem>
                  <SelectItem value="Holiday">Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Select Employees</Label>
                <Button type="button" variant="outline" size="sm" onClick={toggleSelectAll} className="text-xs h-7">
                  <Users className="h-3 w-3 mr-1" />
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
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-2 text-center">No employees found</p>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selected: {selectedEmployees.length} employees
              </p>
            </div>

            {errors.duplicate && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.duplicate}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleManualSubmit}
                disabled={selectedEmployees.length === 0 || !date || isSubmitting}
              >
                {isSubmitting ? "Adding..." : "Add Records"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default BulkAddAttendanceModal

