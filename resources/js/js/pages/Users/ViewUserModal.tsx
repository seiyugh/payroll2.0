"use client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

export default function ViewUserModal({ isOpen, onClose, user }) {
  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>View detailed information about this user.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Full Name</h3>
              <p className="text-base">{user.full_name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Username</h3>
              <p className="text-base">{user.username}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Employee Number</h3>
              <p className="text-base">{user.employee_number}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">User Type</h3>
              <p className="text-base capitalize">{user.user_type}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
              <Badge variant={user.is_active ? "success" : "destructive"}>
                {user.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

