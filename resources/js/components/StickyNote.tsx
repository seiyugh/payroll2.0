"use client"

import { useState, useRef, useEffect } from "react"
import { Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const colors = [
  { value: "bg-yellow-100 border-yellow-300", label: "Yellow" },
  { value: "bg-blue-100 border-blue-300", label: "Blue" },
  { value: "bg-green-100 border-green-300", label: "Green" },
  { value: "bg-pink-100 border-pink-300", label: "Pink" },
  { value: "bg-purple-100 border-purple-300", label: "Purple" },
]

export function StickyNote({
  id,
  content,
  color = "bg-yellow-100 border-yellow-300",
  onDelete,
  onUpdate,
  className = "",
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(content)
  const [editedColor, setEditedColor] = useState(color)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditing])

  const handleSave = () => {
    if (editedContent.trim() === "") return
    onUpdate(id, editedContent, editedColor)
    setIsEditing(false)
    setIsDialogOpen(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSave()
    }
  }

  const handleDelete = () => {
    setIsDeleting(true)
    setTimeout(() => {
      onDelete(id)
    }, 300)
  }

  const handleEditClick = () => {
    setIsDialogOpen(true)
  }

  return (
    <div
      className={`relative rounded-md border p-3 shadow-sm transition-all duration-300 ${color} ${isDeleting ? "scale-0 opacity-0" : "scale-100 opacity-100"} ${className}`}
    >
      {/* Quick action buttons */}
      <div className="absolute right-2 top-2 flex space-x-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleEditClick}
          className="h-6 w-6 rounded-full bg-white/80 hover:bg-white"
        >
          <Edit className="h-3 w-3 text-slate-600" />
          <span className="sr-only">Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          className="h-6 w-6 rounded-full bg-white/80 hover:bg-white hover:text-red-600"
        >
          <Trash2 className="h-3 w-3 text-slate-600 hover:text-red-600" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>

      {/* Note content */}
      <div className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{content}</div>

      {/* Edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                ref={textareaRef}
                placeholder="Write your note here..."
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[150px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Select value={editedColor} onValueChange={setEditedColor}>
                <SelectTrigger id="color">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {colors.map((colorOption) => (
                    <SelectItem key={colorOption.value} value={colorOption.value}>
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full mr-2 ${colorOption.value.split(" ")[0]}`} />
                        {colorOption.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

