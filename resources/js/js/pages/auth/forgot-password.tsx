"use client"

import { Head, useForm } from "@inertiajs/react"
import { LoaderCircle, Mail, ArrowLeft } from "lucide-react"
import type { FormEventHandler } from "react"
import { useEffect, useState } from "react"

import InputError from "@/components/input-error"
import TextLink from "@/components/text-link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import AuthLayout from "@/layouts/auth-layout"
import { cn } from "@/lib/utils"
import { route } from "@/lib/utils"

export default function ForgotPassword({ status }: { status?: string }) {
  const [formFilled, setFormFilled] = useState(false)

  const { data, setData, post, processing, errors } = useForm<Required<{ email: string }>>({
    email: "",
  })

  // Check if form is filled to enable button styling
  useEffect(() => {
    setFormFilled(data.email.trim() !== "")
  }, [data.email])

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post(route("password.email"))
  }

  return (
    <AuthLayout title="" description="">
      <Head title="Forgot password" />

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
            <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
          </div>
          <CardDescription>Enter your email address and we'll send you a link to reset your password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={data.email}
                  autoFocus
                  onChange={(e) => setData("email", e.target.value)}
                  placeholder="email@example.com"
                  className={cn("pl-10 transition-all", errors.email ? "border-destructive ring-destructive" : "")}
                />
              </div>
              <InputError message={errors.email} className="text-xs" />
            </div>

            <Button
              className={cn(
                "w-full transition-all duration-200",
                formFilled && !processing ? "bg-primary hover:bg-primary/90" : "",
              )}
              disabled={processing}
            >
              {processing ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                "Send reset link"
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
        <CardFooter className="flex justify-center border-t p-4">
          <TextLink
            href={route("login")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to login
          </TextLink>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}

