"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import { toast } from "sonner"

export type Note = {
  id: string
  content: string
  color: string
  createdAt: string
  updatedAt: string
  category: string
}

type NotesContextType = {
  notes: Note[]
  addNote: (content: string, color: string, category: string) => void
  updateNote: (id: string, content: string, color: string) => void
  deleteNote: (id: string) => void
  getNotesByCategory: (category: string) => Note[]
}

const NotesContext = createContext<NotesContextType | undefined>(undefined)

export const useNotes = () => {
  const context = useContext(NotesContext)
  if (!context) {
    throw new Error("useNotes must be used within a NotesProvider")
  }
  return context
}

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<Note[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Load notes from localStorage on mount
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem("notes")
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes))
      }
    } catch (error) {
      console.error("Failed to parse notes from localStorage:", error)
      // Initialize with empty array if there's an error
      setNotes([])
    }
    setIsInitialized(true)
  }, [])

  // Save notes to localStorage whenever they change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("notes", JSON.stringify(notes))
    }
  }, [notes, isInitialized])

  const addNote = (content: string, color: string, category: string) => {
    const newNote: Note = {
      id: uuidv4(),
      content,
      color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category,
    }
    setNotes((prevNotes) => [...prevNotes, newNote])
    toast.success("Note added")
  }

  const updateNote = (id: string, content: string, color: string) => {
    setNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.id === id
          ? {
              ...note,
              content,
              color,
              updatedAt: new Date().toISOString(),
            }
          : note,
      ),
    )
    toast.success("Note updated")
  }

  const deleteNote = (id: string) => {
    setNotes((prevNotes) => prevNotes.filter((note) => note.id !== id))
    toast.success("Note deleted")
  }

  const getNotesByCategory = (category: string) => {
    return notes.filter((note) => note.category === category)
  }

  return (
    <NotesContext.Provider value={{ notes, addNote, updateNote, deleteNote, getNotesByCategory }}>
      {children}
    </NotesContext.Provider>
  )
}

