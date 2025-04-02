"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog } from "@headlessui/react"
import { Inertia } from "@inertiajs/inertia"
import { toast } from "react-hot-toast"

interface PayrollPeriod {
  id: number
  week_id: string
  period_start: string
  period_end: string
  description?: string
}

interface GeneratePayrollDialogProps {
  isOpen: boolean
  onClose: () => void
  payrollPeriods: PayrollPeriod[]
}

const GeneratePayrollDialog: React.FC<GeneratePayrollDialogProps> = ({ isOpen, onClose, payrollPeriods }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("")
  const [includeRates, setIncludeRates] = useState<boolean>(true)
  const [respectStatus, setRespectStatus] = useState<boolean>(true)
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    if (isOpen && payrollPeriods.length > 0) {
      setSelectedPeriod(payrollPeriods[0].week_id)
    }
  }, [isOpen, payrollPeriods])

  const handleGeneratePayroll = () => {
    if (!selectedPeriod) {
      setError("Please select a payroll period")
      return
    }

    setIsSubmitting(true)
    setError("")

    // Debug log to see what we're sending
    console.log("Generating payroll with data:", {
      week_id: selectedPeriod,
      include_daily_rates: includeRates,
      respect_attendance_status: respectStatus,
      overwrite_existing: overwriteExisting,
    })

    // Use Inertia.post for form submission
    Inertia.post(
      "/payroll/generate-from-attendance",
      {
        week_id: selectedPeriod,
        include_daily_rates: includeRates,
        respect_attendance_status: respectStatus,
        overwrite_existing: overwriteExisting,
      },
      {
        onSuccess: () => {
          toast.success("Payroll generated successfully!")
          onClose()
          // Redirect to payroll index page
          Inertia.visit("/payroll")
        },
        onError: (errors) => {
          console.error("Payroll generation failed with errors:", errors)
          setError(errors.message || "Failed to generate payroll. Please try again.")
          toast.error("Failed to generate payroll")
        },
        onFinish: () => {
          setIsSubmitting(false)
          console.log("Payroll generation request completed")
        },
      },
    )
  }

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md rounded bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Generate Payroll from Attendance
          </Dialog.Title>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Payroll Period</label>
              <select
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                {payrollPeriods.length === 0 ? (
                  <option value="">No payroll periods available</option>
                ) : (
                  payrollPeriods.map((period) => (
                    <option key={period.id} value={period.week_id}>
                      {period.description || formatDateRange(period.period_start, period.period_end)} (Week ID:{" "}
                      {period.week_id})
                    </option>
                  ))
                )}
              </select>
              {payrollPeriods.length === 0 && (
                <p className="text-yellow-600 text-xs mt-1">Please create a payroll period first.</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                id="include-rates"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={includeRates}
                onChange={(e) => setIncludeRates(e.target.checked)}
              />
              <label htmlFor="include-rates" className="ml-2 block text-sm text-gray-700">
                Include daily rates in payroll
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="respect-status"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={respectStatus}
                onChange={(e) => setRespectStatus(e.target.checked)}
              />
              <label htmlFor="respect-status" className="ml-2 block text-sm text-gray-700">
                Respect attendance status (absent, half day, etc.)
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="overwrite-existing"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
              />
              <label htmlFor="overwrite-existing" className="ml-2 block text-sm text-gray-700">
                Overwrite existing payroll entries for this period
              </label>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
              <p className="text-sm">
                <strong>Important:</strong> Make sure the Week ID is correct. This is required for payroll generation.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={handleGeneratePayroll}
              disabled={isSubmitting || !selectedPeriod}
            >
              {isSubmitting ? "Generating..." : "Generate Payroll"}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

export default GeneratePayrollDialog

