"use client"

import { useState } from "react"
import { Head } from "@inertiajs/react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StickyNote } from "@/components/StickyNote"
import { useNotes } from "@/contexts/NotesContext"
import AppLayout from "@/layouts/app-layout"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

const colors = [
  { value: "bg-yellow-100 border-yellow-300", label: "Yellow" },
  { value: "bg-blue-100 border-blue-300", label: "Blue" },
  { value: "bg-green-100 border-green-300", label: "Green" },
  { value: "bg-pink-100 border-pink-300", label: "Pink" },
  { value: "bg-purple-100 border-purple-300", label: "Purple" },
]

const categories = [
  { value: "all", label: "All Notes" },
  { value: "work", label: "Work" },
  { value: "personal", label: "Personal" },
  { value: "ideas", label: "Ideas" },
  { value: "tasks", label: "Tasks" },
  { value: "dashboard", label: "Dashboard" },
]

export default function Notes() {
  const { notes, addNote, updateNote, deleteNote } = useNotes()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [newNoteContent, setNewNoteContent] = useState("")
  const [newNoteColor, setNewNoteColor] = useState(colors[0].value)
  const [newNoteCategory, setNewNoteCategory] = useState("work")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleAddNote = () => {
    if (newNoteContent.trim() === "") return

    addNote(newNoteContent, newNoteColor, newNoteCategory)
    setNewNoteContent("")
    setNewNoteColor(colors[0].value)
    setIsDialogOpen(false)
  }

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = note.content.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === "all" || note.category === category
    return matchesSearch && matchesCategory
  })

  return (
    <AppLayout breadcrumbs={[{ label: "Sticky Notes", href: "/notes" }]}>
      <Head title="Sticky Notes" />

      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Sticky Notes</h1>
            <p className="text-slate-600 dark:text-slate-400">Organize your thoughts and tasks</p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1">
                  <Plus className="h-4 w-4" />
                  <span>New Note</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      placeholder="Write your note here..."
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      className="min-h-[150px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={newNoteCategory} onValueChange={setNewNoteCategory}>
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.slice(1).map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleAddNote}>
                    Create Note
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredNotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg text-slate-500 dark:text-slate-400 mb-4">No notes found</p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Create your first note
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredNotes.map((note) => (
            <StickyNote
              key={note.id}
              id={note.id}
              content={note.content}
              color={note.color}
              onDelete={deleteNote}
              onUpdate={updateNote}
              className="h-full"
            />
          ))}
        </div>
      )}
    </AppLayout>
  )
}

