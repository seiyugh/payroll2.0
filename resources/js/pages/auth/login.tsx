"use client"

import { Head, useForm } from "@inertiajs/react"
import { Eye, EyeOff, LoaderCircle, LockKeyhole, User } from "lucide-react"
import type { FormEventHandler } from "react"
import { useEffect, useState } from "react"

import InputError from "@/components/input-error"
import TextLink from "@/components/text-link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import AuthLayout from "@/layouts/auth-layout"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { usePage } from "@inertiajs/react"

type LoginForm = {
  employee_number: string
  password: string
  remember: boolean
}

interface LoginProps {
  status?: string
  canResetPassword: boolean
  csrf_token: string
}

export default function Login({ status, canResetPassword, csrf_token }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [formFilled, setFormFilled] = useState(false)
  const { url } = usePage().props

  useEffect(() => {
    const timeout = new URLSearchParams(window.location.search).get("timeout")
    if (timeout === "true") {
      toast.error("Your session has expired. Please log in again.")
    }
  }, [])

  const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
    employee_number: "",
    password: "",
    remember: false,
  })

  // Check if form is filled to enable button styling
  useEffect(() => {
    setFormFilled(data.employee_number.trim() !== "" && data.password.trim() !== "")
  }, [data.employee_number, data.password])

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post(route("login"), {
      data: {
        ...data,
        _token: csrf_token,
      },
      onFinish: () => reset("password"),
      onError: (errors) => {
        if (errors._token) {
          window.location.reload()
        }
      },
    })
  }

  return (
    <AuthLayout title="" description="">
      <Head title="Log in" />

      <Card className="w-full max-w-md border-none shadow-lg sm:border sm:border-border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={submit}>
            {/* Hidden CSRF token field */}
            <input type="hidden" name="_token" value={csrf_token} />

            <div className="grid gap-2">
              <Label htmlFor="employee_number" className="text-sm font-medium">
                Employee Number
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="employee_number"
                  type="text"
                  required
                  autoFocus
                  tabIndex={1}
                  autoComplete="username"
                  value={data.employee_number}
                  onChange={(e) => setData("employee_number", e.target.value)}
                  placeholder="YYYY-XXX"
                  className={cn(
                    "pl-10 transition-all",
                    errors.employee_number ? "border-destructive ring-destructive" : "",
                  )}
                />
              </div>
              <InputError message={errors.employee_number} className="text-xs" />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                {canResetPassword && (
                  <TextLink
                    href={route("password.request")}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    tabIndex={5}
                  >
                    Forgot password?
                  </TextLink>
                )}
              </div>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  tabIndex={2}
                  autoComplete="current-password"
                  value={data.password}
                  onChange={(e) => setData("password", e.target.value)}
                  placeholder="Enter your password"
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

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="remember"
                name="remember"
                checked={data.remember}
                onCheckedChange={(checked) => setData("remember", checked === true ? true : false)}
                tabIndex={3}
                className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
              <Label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Remember me for 30 days
              </Label>
            </div>

            <Button
              type="submit"
              className={cn(
                "mt-2 w-full transition-all duration-200",
                formFilled && !processing ? "bg-primary hover:bg-primary/90" : "",
              )}
              tabIndex={4}
              disabled={processing}
            >
              {processing ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </CardContent>
        {status && (
          <CardFooter>
            <div className="w-full rounded-md bg-green-50 p-2 text-center text-sm font-medium text-green-600">
              {status}
            </div>
          </CardFooter>
        )}
      </Card>
    </AuthLayout>
  )
}

