"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StickyNote } from "@/components/StickyNote"
import { useNotes } from "@/contexts/NotesContext"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const colors = [
  { value: "bg-yellow-100 border-yellow-300", label: "Yellow" },
  { value: "bg-blue-100 border-blue-300", label: "Blue" },
  { value: "bg-green-100 border-green-300", label: "Green" },
  { value: "bg-pink-100 border-pink-300", label: "Pink" },
  { value: "bg-purple-100 border-purple-300", label: "Purple" },
]

export default function QuickNotes({ category = "dashboard" }) {
  const { getNotesByCategory, addNote, updateNote, deleteNote } = useNotes()
  const [newNoteContent, setNewNoteContent] = useState("")
  const [newNoteColor, setNewNoteColor] = useState(colors[0].value)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const notes = getNotesByCategory(category)

  const handleAddNote = () => {
    if (newNoteContent.trim() === "") return

    addNote(newNoteContent, newNoteColor, category)
    setNewNoteContent("")
    setNewNoteColor(colors[0].value)
    setIsDialogOpen(false)
  }

  return (
    <Card className="border border-slate-200 dark:border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Quick Notes</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add note</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Quick Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Write your note here..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Select value={newNoteColor} onValueChange={setNewNoteColor}>
                  <SelectTrigger id="color">
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    {colors.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center">
                          <div className={`w-4 h-4 rounded-full mr-2 ${color.value.split(" ")[0]}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleAddNote}>
                Add Note
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">No notes yet</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="text-indigo-600 border-indigo-200"
            >
              Add your first note
            </Button>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {notes.map((note) => (
              <StickyNote
                key={note.id}
                id={note.id}
                content={note.content}
                color={note.color}
                onDelete={deleteNote}
                onUpdate={updateNote}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

