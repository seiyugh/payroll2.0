"use client"

import { Head, useForm } from "@inertiajs/react"
import { LoaderCircle } from "lucide-react"
import type { FormEventHandler } from "react"

import InputError from "@/components/input-error"
import TextLink from "@/components/text-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import AuthLayout from "@/layouts/auth-layout"

type RegisterForm = {
  employee_number: string
  full_name: string
  username: string
  user_type: string
  password: string
  password_confirmation: string
}

export default function Register() {
  const { data, setData, post, processing, errors, reset } = useForm<Required<RegisterForm>>({
    employee_number: "",
    full_name: "",
    username: "",
    user_type: "admin",
    password: "",
    password_confirmation: "",
  })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post(route("register"), {
      onFinish: () => reset("password", "password_confirmation"),
    })
  }

  return (
    <AuthLayout title="Create an account" description="Enter your details below to create your account">
      <Head title="Register" />
      <form className="flex flex-col gap-6" onSubmit={submit}>
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="employee_number">Employee Number</Label>
            <Input
              id="employee_number"
              type="text"
              required
              autoFocus
              tabIndex={1}
              value={data.employee_number}
              onChange={(e) => setData("employee_number", e.target.value)}
              disabled={processing}
              placeholder="YYYY-XXX"
            />
            <InputError message={errors.employee_number} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              type="text"
              required
              tabIndex={2}
              value={data.full_name}
              onChange={(e) => setData("full_name", e.target.value)}
              disabled={processing}
              placeholder="John Doe"
            />
            <InputError message={errors.full_name} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              required
              tabIndex={3}
              value={data.username}
              onChange={(e) => setData("username", e.target.value)}
              disabled={processing}
              placeholder="johndoe"
            />
            <InputError message={errors.username} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="user_type">User Type</Label>
            <select
              id="user_type"
              required
              tabIndex={4}
              value={data.user_type}
              onChange={(e) => setData("user_type", e.target.value)}
              disabled={processing}
              className="border rounded px-3 py-2"
            >
              <option className="text-black" value="admin">
                Admin
              </option>
              <option className="text-black" value="employee">
                Employee
              </option>
              <option className="text-black" value="hr">
                HR
              </option>
              <option className="text-black" value="billing">
                Billing
              </option>
            </select>
            <InputError message={errors.user_type} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              tabIndex={5}
              autoComplete="new-password"
              value={data.password}
              onChange={(e) => setData("password", e.target.value)}
              disabled={processing}
              placeholder="Password"
            />
            <InputError message={errors.password} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password_confirmation">Confirm Password</Label>
            <Input
              id="password_confirmation"
              type="password"
              required
              tabIndex={6}
              autoComplete="new-password"
              value={data.password_confirmation}
              onChange={(e) => setData("password_confirmation", e.target.value)}
              disabled={processing}
              placeholder="Confirm password"
            />
            <InputError message={errors.password_confirmation} />
          </div>

          <Button type="submit" className="mt-2 w-full" tabIndex={5} disabled={processing}>
            {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Create account
          </Button>
        </div>

        <div className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
          <TextLink href={route("login")} tabIndex={6}>
            Log in
          </TextLink>
        </div>
      </form>
    </AuthLayout>
  )
}

