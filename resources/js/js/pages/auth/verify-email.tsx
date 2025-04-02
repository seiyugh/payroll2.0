"use client"

import { Head, useForm } from "@inertiajs/react"
import { LoaderCircle, Mail, CheckCircle2 } from "lucide-react"
import type { FormEventHandler } from "react"
import { useState } from "react"

import TextLink from "@/components/text-link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import AuthLayout from "@/layouts/auth-layout"
import { usePage } from "@inertiajs/react"

export default function VerifyEmail({ status }: { status?: string }) {
  const [isResending, setIsResending] = useState(false)
  const { post, processing } = useForm({})
  const { url } = usePage().props

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    setIsResending(true)
    post(route("verification.send"), {
      onFinish: () => {
        setTimeout(() => {
          setIsResending(false)
        }, 2000)
      },
    })
  }

  function route(name: string, params?: any): string {
    const routes = {
      "verification.send": "/verification-notification",
      logout: "/logout",
    }

    let routeString = routes[name] || ""

    if (params) {
      Object.keys(params).forEach((key) => {
        routeString = routeString.replace(`{${key}}`, params[key])
      })
    }

    return routeString
  }

  return (
    <AuthLayout title="" description="">
      <Head title="Email verification" />

      <Card className="w-full max-w-md border-none shadow-lg sm:border sm:border-border">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-primary/10 p-3">
              <Mail className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl font-bold">Verify your email</CardTitle>
          <CardDescription className="text-center">
            Please verify your email address by clicking on the link we just emailed to you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "verification-link-sent" && (
            <div className="mb-4 flex items-center justify-center rounded-md bg-green-50 p-3 text-sm font-medium text-green-600">
              <CheckCircle2 className="mr-2 h-4 w-4" />A new verification link has been sent to your email address.
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              If you didn't receive the email, click the button below to request another one.
            </div>

            <div className="flex flex-col gap-2">
              <Button type="submit" variant="outline" className="w-full" disabled={processing || isResending}>
                {processing || isResending ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Sending verification email...
                  </>
                ) : (
                  "Resend verification email"
                )}
              </Button>

              <TextLink
                href={route("logout")}
                method="post"
                className="mx-auto mt-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Log out
              </TextLink>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-4">
          <p className="text-xs text-muted-foreground">
            Need help?{" "}
            <TextLink href="#" className="font-medium text-primary hover:text-primary/80 transition-colors">
              Contact support
            </TextLink>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}

