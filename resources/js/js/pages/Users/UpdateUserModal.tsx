"use client"

import React from "react"
import { useForm } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "../../../components/ui/switch"
import { toast } from "sonner"

export default function UpdateUserModal({ isOpen, onClose, user }) {
  const { data, setData, put, processing, errors, reset } = useForm({
    full_name: user.full_name,
    username: user.username,
    password: "",
    password_confirmation: "",
    user_type: user.user_type,
    is_active: user.is_active,
  })

  React.useEffect(() => {
    if (user) {
      setData({
        full_name: user.full_name,
        username: user.username,
        password: "",
        password_confirmation: "",
        user_type: user.user_type,
        is_active: user.is_active,
      })
    }
  }, [user])

  const handleSubmit = (e) => {
    e.preventDefault()
    put(`/users/${user.id}`, {
      onSuccess: () => {
        reset()
        onClose()
        toast.success("User updated successfully")
      },
      onError: (errors) => {
        console.error(errors)
        toast.error("Failed to update user")
      },
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update User</DialogTitle>
          <DialogDescription>Update user account information.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" value={data.full_name} onChange={(e) => setData("full_name", e.target.value)} disabled />
              {errors.full_name && <p className="text-sm text-red-500">{errors.full_name}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={data.username} onChange={(e) => setData("username", e.target.value)} />
              {errors.username && <p className="text-sm text-red-500">{errors.username}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password (leave blank to keep current)</Label>
              <Input
                id="password"
                type="password"
                value={data.password}
                onChange={(e) => setData("password", e.target.value)}
              />
              {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password_confirmation">Confirm Password</Label>
              <Input
                id="password_confirmation"
                type="password"
                value={data.password_confirmation}
                onChange={(e) => setData("password_confirmation", e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user_type">User Type</Label>
              <Select value={data.user_type} onValueChange={(value) => setData("user_type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              {errors.user_type && <p className="text-sm text-red-500">{errors.user_type}</p>}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={data.is_active}
                onCheckedChange={(checked) => setData("is_active", checked)}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              Update User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

