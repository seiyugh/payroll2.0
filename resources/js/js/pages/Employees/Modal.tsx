"use client"

import { Button } from "@/components/ui/button"

const Modal = ({ employee, onClose, onDelete }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Are you sure you want to delete {employee.full_name}?
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone.</p>
        <div className="flex justify-end mt-4 space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Modal

