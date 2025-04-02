"use client"

import React, { useState, useEffect } from "react"
import { Head, usePage } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Plus, Search, Eye, Edit, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import Sidebar from "@/components/Sidebar" // Make sure this path is correct
import AddUserModal from "./AddUserModal"
import UpdateUserModal from "./UpdateUserModal"
import ViewUserModal from "./ViewUserModal"
import DeleteUserModal from "./DeleteUserModal"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

export default function Index() {
  const { users, flash } = usePage().props
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  // Sidebar state
  const [isOpen, setIsOpen] = useState(() => {
    // Check if we're in the browser
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebarState") === "open"
    }
    return true
  })

  // Set dark mode based on local storage
  useEffect(() => {
    const theme = localStorage.getItem("theme")
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [])

  const toggleSidebar = () => {
    setIsOpen((prevState) => {
      const newState = !prevState
      localStorage.setItem("sidebarState", newState ? "open" : "closed")
      return newState
    })
  }

  // Show toast messages for flash messages
  React.useEffect(() => {
    // Check if flash exists before accessing its properties
    if (flash && flash.success) {
      toast.success(flash.success)
    }
    if (flash && flash.error) {
      toast.error(flash.error)
    }
  }, [flash])

  // Filter users based on search term
  const filteredUsers = users
    ? users.filter(
        (user) =>
          user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.employee_number.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : []

  const handleEdit = (user) => {
    setSelectedUser(user)
    setIsUpdateModalOpen(true)
  }

  const handleView = (user) => {
    setSelectedUser(user)
    setIsViewModalOpen(true)
  }

  const handleDelete = (user) => {
    setSelectedUser(user)
    setIsDeleteModalOpen(true)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-black ">
      {/* Sidebar */}
      <Sidebar isOpen={isOpen} toggleSidebar={toggleSidebar} />

      {/* Main content */}
      <main className={cn("flex-1 overflow-auto transition-all duration-300", isOpen ? "ml-60" : "ml-20")}>
        <Head title="Users Management" />
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Users Management</h1>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add User
            </Button>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Username</th>
                      <th className="text-left p-2">Employee Number</th>
                      <th className="text-left p-2">User Type</th>
                      <th className="text-left p-2">Status</th>

                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">{user.full_name}</td>
                          <td className="p-2">{user.username}</td>
                          <td className="p-2">{user.employee_number}</td>
                          <td className="p-2 capitalize">{user.user_type}</td>
                          <td className="p-2">
                            <Badge variant={user.is_active ? "success" : "destructive"}>
                              {user.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          
                          <td className="p-2">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="icon" onClick={() => handleView(user)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" onClick={() => handleEdit(user)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" onClick={() => handleDelete(user)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-4 text-center">
                          {searchTerm ? "No users found matching your search." : "No users found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modals */}
        <AddUserModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

        {selectedUser && (
          <>
            <UpdateUserModal
              isOpen={isUpdateModalOpen}
              onClose={() => setIsUpdateModalOpen(false)}
              user={selectedUser}
            />
            <ViewUserModal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} user={selectedUser} />
            <DeleteUserModal
              isOpen={isDeleteModalOpen}
              onClose={() => setIsDeleteModalOpen(false)}
              user={selectedUser}
            />
          </>
        )}
      </main>
    </div>
  )
}

