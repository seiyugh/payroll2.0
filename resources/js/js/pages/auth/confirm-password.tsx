"use client"

import { Head, useForm } from "@inertiajs/react"
import { Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react"
import type { FormEventHandler } from "react"
import { useState, useEffect } from "react"

import InputError from "@/components/input-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import AuthLayout from "@/layouts/auth-layout"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    route: (route: string, params?: object) => string
  }
}

export default function ConfirmPassword() {
  const [showPassword, setShowPassword] = useState(false)
  const [formFilled, setFormFilled] = useState(false)

  const { data, setData, post, processing, errors, reset } = useForm<Required<{ password: string }>>({
    password: "",
  })

  // Check if form is filled to enable button styling
  useEffect(() => {
    setFormFilled(data.password.trim() !== "")
  }, [data.password])

  const submit: FormEventHandler = (e) => {
    e.preventDefault()

    post(window.route("password.confirm"), {
      onFinish: () => reset("password"),
    })
  }

  return (
    <AuthLayout title="" description="">
      <Head title="Confirm password" />

      <Card className="w-full max-w-md border-none shadow-lg sm:border sm:border-border">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-primary/10 p-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl font-bold">Security check</CardTitle>
          <CardDescription className="text-center">
            This is a secure area of the application. Please confirm your password before continuing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={data.password}
                  autoFocus
                  onChange={(e) => setData("password", e.target.value)}
                  className={cn(
                    "pl-10 pr-10 transition-all",
                    errors.password ? "border-destructive ring-destructive" : "",
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                </Button>
              </div>
              <InputError message={errors.password} className="text-xs" />
            </div>

            <Button
              type="submit"
              className={cn(
                "w-full transition-all duration-200",
                formFilled && !processing ? "bg-primary hover:bg-primary/90" : "",
              )}
              disabled={processing}
            >
              {processing ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                "Confirm password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}

