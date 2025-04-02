"use client"
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
import { toast } from "sonner"

export default function AddUserModal({ isOpen, onClose }) {
  const { data, setData, post, processing, errors, reset } = useForm({
    full_name: "",
    username: "",
    employee_number: "",
    password: "",
    password_confirmation: "",
    user_type: "user",
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    post("/users", {
      onSuccess: () => {
        reset()
        onClose()
        toast.success("User created successfully")
      },
      onError: (errors) => {
        console.error(errors)
        toast.error("Failed to create user")
      },
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>Create a new user account for the system.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={data.full_name}
                onChange={(e) => setData("full_name", e.target.value)}
                placeholder="John Doe"
              />
              {errors.full_name && <p className="text-sm text-red-500">{errors.full_name}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={data.username}
                onChange={(e) => setData("username", e.target.value)}
                placeholder="johndoe"
              />
              {errors.username && <p className="text-sm text-red-500">{errors.username}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="employee_number">Employee Number</Label>
              <Input
                id="employee_number"
                value={data.employee_number}
                onChange={(e) => setData("employee_number", e.target.value)}
                placeholder="2025-xxx"
              />
              {errors.employee_number && <p className="text-sm text-red-500">{errors.employee_number}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

