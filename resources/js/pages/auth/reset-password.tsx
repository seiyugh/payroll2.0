"use client"

import { Head, useForm } from "@inertiajs/react"
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ArrowLeft } from "lucide-react"
import { useState, useEffect } from "react"
import type { FormEventHandler } from "react"

import InputError from "@/components/input-error"
import TextLink from "@/components/text-link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import AuthLayout from "@/layouts/auth-layout"
import { cn } from "@/lib/utils"

interface ResetPasswordProps {
  token: string
  email: string
}

type ResetPasswordForm = {
  token: string
  email: string
  password: string
  password_confirmation: string
}

export default function ResetPassword({ token, email }: ResetPasswordProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [formFilled, setFormFilled] = useState(false)

  const { data, setData, post, processing, errors, reset } = useForm<Required<ResetPasswordForm>>({
    token: token,
    email: email,
    password: "",
    password_confirmation: "",
  })

  // Check password strength
  useEffect(() => {
    if (data.password.length === 0) {
      setPasswordStrength(0)
      return
    }

    let strength = 0
    // Length check
    if (data.password.length >= 8) strength += 25
    // Contains number
    if (/\d/.test(data.password)) strength += 25
    // Contains lowercase
    if (/[a-z]/.test(data.password)) strength += 25
    // Contains uppercase or special char
    if (/[A-Z]/.test(data.password) || /[^A-Za-z0-9]/.test(data.password)) strength += 25

    setPasswordStrength(strength)
  }, [data.password])

  // Check if form is filled to enable button styling
  useEffect(() => {
    setFormFilled(
      data.password.trim() !== "" &&
        data.password_confirmation.trim() !== "" &&
        data.password === data.password_confirmation,
    )
  }, [data.password, data.password_confirmation])

  const getStrengthColor = () => {
    if (passwordStrength <= 25) return "bg-destructive"
    if (passwordStrength <= 50) return "bg-orange-500"
    if (passwordStrength <= 75) return "bg-yellow-500"
    return "bg-green-500"
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post(route("password.store"), {
      onFinish: () => reset("password", "password_confirmation"),
    })
  }

  return (
    <AuthLayout title="" description="">
      <Head title="Reset password" />

      <Card className="w-full max-w-md border-none shadow-lg sm:border sm:border-border">
        <CardHeader className="space-y-1">
          <div className="flex items-center">
            <TextLink
              href={route("login")}
              className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to login</span>
            </TextLink>
            <CardTitle className="text-2xl font-bold">Create new password</CardTitle>
          </div>
          <CardDescription>Please enter a new secure password for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={data.email}
                  className="pl-10 bg-muted/50"
                  readOnly
                  onChange={(e) => setData("email", e.target.value)}
                />
              </div>
              <InputError message={errors.email} className="text-xs" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password" className="text-sm font-medium">
                New Password
              </Label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="new-password"
                  value={data.password}
                  autoFocus
                  onChange={(e) => setData("password", e.target.value)}
                  placeholder="Create a strong password"
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
              {data.password && (
                <div className="space-y-1">
                  <Progress value={passwordStrength} className={cn("h-1", getStrengthColor())} />
                  <p className="text-xs text-muted-foreground">
                    {passwordStrength <= 25 && "Weak password"}
                    {passwordStrength > 25 && passwordStrength <= 50 && "Fair password"}
                    {passwordStrength > 50 && passwordStrength <= 75 && "Good password"}
                    {passwordStrength > 75 && "Strong password"}
                  </p>
                </div>
              )}
              <InputError message={errors.password} className="text-xs" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password_confirmation" className="text-sm font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password_confirmation"
                  type={showConfirmPassword ? "text" : "password"}
                  name="password_confirmation"
                  autoComplete="new-password"
                  value={data.password_confirmation}
                  onChange={(e) => setData("password_confirmation", e.target.value)}
                  placeholder="Confirm your password"
                  className={cn(
                    "pl-10 pr-10 transition-all",
                    errors.password_confirmation ? "border-destructive ring-destructive" : "",
                    data.password_confirmation && data.password !== data.password_confirmation
                      ? "border-destructive"
                      : "",
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showConfirmPassword ? "Hide password" : "Show password"}</span>
                </Button>
              </div>
              {data.password_confirmation && data.password !== data.password_confirmation && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
              <InputError message={errors.password_confirmation} className="text-xs" />
            </div>

            <Button
              type="submit"
              className={cn(
                "w-full transition-all duration-200",
                formFilled && !processing ? "bg-primary hover:bg-primary/90" : "",
              )}
              disabled={processing || data.password !== data.password_confirmation}
            >
              {processing ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Resetting password...
                </>
              ) : (
                "Reset password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}

