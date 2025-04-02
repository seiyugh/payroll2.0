"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Briefcase, FileText, Phone, CalendarDays, MapPin, Users } from "lucide-react"

interface Employee {
  id: number
  employee_number: string
  full_name: string
  last_name: string
  first_name: string
  middle_name: string | null
  address: string
  position: string
  department: string
  assigned_area: string | null
  date_hired: string
  years_of_service: number
  employment_status: "Regular" | "Probationary" | "Project-Based"
  date_of_regularization: string | null
  status_201: string | null
  date_terminated_resigned: string | null
  daily_rate: number
  civil_status: string
  gender: string
  birthdate: string
  birth_place: string
  age: number
  contacts: string
  id_status: string
  sss_no: string
  tin_no: string
  philhealth_no: string
  pagibig_no: string
  emergency_contact_name: string
  emergency_contact_mobile: string
  // New fields from migration
  id_no?: string | null
  ub_account?: string | null
  resume?: boolean | null
  government_id?: boolean
  type_of_id?: "PhilID" | "DL" | "Phi-health" | "SSS" | "UMID" | "POSTAL" | "Passport" | "Voters" | "TIN" | "D1" | null
  clearance?: "BARANGAY Clearance" | "NBI Clearance" | "Police Clearance" | null
  id_number?: string | null
  staff_house?: boolean
  birth_certificate?: boolean
  marriage_certificate?: boolean
  tor?: boolean
  diploma_hs_college?: boolean
  contract?: "SIGNED" | "NOT YET" | "REVIEW"
  performance_evaluation?: boolean
  medical_cert?: boolean
  remarks?: string | null
  email?: string | null
}

interface UpdateEmployeeModalProps {
  employee: Employee
  onClose: () => void
  onSubmit: (data: Employee) => void
}

const UpdateEmployeeModal = ({ employee, onClose, onSubmit }: UpdateEmployeeModalProps) => {
  // Add a function to format dates properly
  const formatDateForInput = (dateString: string | null): string => {
    if (!dateString) return ""

    // Check if the date is in ISO format with time
    if (dateString.includes("T")) {
      return dateString.split("T")[0]
    }

    return dateString
  }

  // Update the useState initialization to format dates
  const [formData, setFormData] = useState<Employee>({
    ...employee,
    birthdate: formatDateForInput(employee.birthdate),
    date_hired: formatDateForInput(employee.date_hired),
    date_of_regularization: formatDateForInput(employee.date_of_regularization),
    date_terminated_resigned: formatDateForInput(employee.date_terminated_resigned),
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("personal")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Update full name when first, middle, or last name changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      full_name: `${prev.first_name} ${prev.middle_name || ""} ${prev.last_name}`.trim(),
    }))
  }, [formData.first_name, formData.middle_name, formData.last_name])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: ["daily_rate", "age", "years_of_service"].includes(name) ? Number(value) || 0 : value,
    }))
  }

  const handleSelectChange = (value: string, name: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: ["daily_rate"].includes(name) ? Number(value) || 0 : value,
    }))
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  // Update the handleSubmit function to use direct path instead of route
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
  
    console.log("Starting employee update process...");
    console.log("Employee ID being updated:", formData.id);
    console.log("Employee number being submitted:", formData.employee_number);
    console.log("Update URL:", `/employees/${formData.id}`);
    console.log("Full form data being submitted:", formData);
  
    // Create a copy of formData with mapped fields
    const submissionData = {
      ...formData,
      birthplace: formData.birth_place, // Map birth_place to birthplace
      resignation_termination_date: formData.date_terminated_resigned, // Map date_terminated_resigned
    };
  
    console.log("Final submission data:", submissionData);
  
    // Simulate submission (Remove this if connecting to backend)
    setTimeout(() => {
      console.log("Simulated submission complete.");
      setIsSubmitting(false); // Re-enable button after "submission"
    }, 900);
  
    onSubmit(submissionData);
  };
  

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="!w-max !h-max !max-w-[110vw] !max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-semibold">Edit Employee: {formData.full_name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 mb-6">
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Personal</span>
              </TabsTrigger>
              <TabsTrigger value="employment" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                <span className="hidden sm:inline">Employment</span>
              </TabsTrigger>
              <TabsTrigger value="government" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Government IDs</span>
              </TabsTrigger>
              <TabsTrigger value="emergency" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Emergency</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Documents</span>
              </TabsTrigger>
            </TabsList>

            {/* Personal Information Tab */}
            <TabsContent value="personal" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="flex items-center">
                    First Name <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className={errors.first_name ? "border-red-500" : ""}
                    required
                  />
                  {errors.first_name && <p className="text-red-500 text-xs">{errors.first_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="middle_name">Middle Name</Label>
                  <Input
                    id="middle_name"
                    name="middle_name"
                    value={formData.middle_name || ""}
                    onChange={handleChange}
                    className={errors.middle_name ? "border-red-500" : ""}
                  />
                  {errors.middle_name && <p className="text-red-500 text-xs">{errors.middle_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name" className="flex items-center">
                    Last Name <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className={errors.last_name ? "border-red-500" : ""}
                    required
                  />
                  {errors.last_name && <p className="text-red-500 text-xs">{errors.last_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name (Auto)</Label>
                  <Input id="full_name" name="full_name" value={formData.full_name} className="bg-muted" disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="civil_status">Civil Status</Label>
                  <Select
                    value={formData.civil_status}
                    onValueChange={(value) => handleSelectChange(value, "civil_status")}
                  >
                    <SelectTrigger className={errors.civil_status ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Divorced">Divorced</SelectItem>
                      <SelectItem value="Widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.civil_status && <p className="text-red-500 text-xs">{errors.civil_status}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleSelectChange(value, "gender")}>
                    <SelectTrigger className={errors.gender ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && <p className="text-red-500 text-xs">{errors.gender}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthdate" className="flex items-center">
                    Birthdate <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <div className="flex items-center">
                    <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                    <Input
                      id="birthdate"
                      type="date"
                      name="birthdate"
                      value={formData.birthdate}
                      onChange={handleChange}
                      className={errors.birthdate ? "border-red-500" : ""}
                      required
                    />
                  </div>
                  {errors.birthdate && <p className="text-red-500 text-xs">{errors.birthdate}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_place">Birthplace</Label>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <Input
                      id="birth_place"
                      name="birth_place"
                      value={formData.birth_place}
                      onChange={handleChange}
                      className={errors.birth_place ? "border-red-500" : ""}
                    />
                  </div>
                  {errors.birth_place && <p className="text-red-500 text-xs">{errors.birth_place}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className={errors.age ? "border-red-500" : ""}
                  />
                  {errors.age && <p className="text-red-500 text-xs">{errors.age}</p>}
                </div>

                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <Label htmlFor="address">Address</Label>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className={errors.address ? "border-red-500" : ""}
                    />
                  </div>
                  {errors.address && <p className="text-red-500 text-xs">{errors.address}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contacts">Contact Number</Label>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <Input
                      id="contacts"
                      name="contacts"
                      value={formData.contacts}
                      onChange={handleChange}
                      className={errors.contacts ? "border-red-500" : ""}
                    />
                  </div>
                  {errors.contacts && <p className="text-red-500 text-xs">{errors.contacts}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={handleChange}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
                </div>
              </div>
            </TabsContent>

            {/* Employment Tab */}
            <TabsContent value="employment" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_number" className="flex items-center">
                    Employee Number <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="employee_number"
                    name="employee_number"
                    value={formData.employee_number}
                    onChange={handleChange}
                    className={errors.employee_number ? "border-red-500" : ""}
                    required
                  />
                  {errors.employee_number && <p className="text-red-500 text-xs">{errors.employee_number}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Select value={formData.position} onValueChange={(value) => handleSelectChange(value, "position")}>
                    <SelectTrigger className={errors.position ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="technician">Technician</SelectItem>
                      <SelectItem value="driver technician">Driver Technician</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.position && <p className="text-red-500 text-xs">{errors.position}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => handleSelectChange(value, "department")}
                  >
                    <SelectTrigger className={errors.department ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Administration">Administration</SelectItem>
                      <SelectItem value="Human Resources">Human Resources</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Allen One">Allen One</SelectItem>
                      <SelectItem value="Technical">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.department && <p className="text-red-500 text-xs">{errors.department}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_area">Assigned Area</Label>
                  <Input
                    id="assigned_area"
                    name="assigned_area"
                    value={formData.assigned_area || ""}
                    onChange={handleChange}
                    className={errors.assigned_area ? "border-red-500" : ""}
                  />
                  {errors.assigned_area && <p className="text-red-500 text-xs">{errors.assigned_area}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_hired" className="flex items-center">
                    Date Hired <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <div className="flex items-center">
                    <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                    <Input
                      id="date_hired"
                      type="date"
                      name="date_hired"
                      value={formData.date_hired}
                      onChange={handleChange}
                      className={errors.date_hired ? "border-red-500" : ""}
                      required
                    />
                  </div>
                  {errors.date_hired && <p className="text-red-500 text-xs">{errors.date_hired}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employment_status">Employment Status</Label>
                  <Select
                    value={formData.employment_status}
                    onValueChange={(value) => handleSelectChange(value, "employment_status")}
                  >
                    <SelectTrigger className={errors.employment_status ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Probationary">Probationary</SelectItem>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Project-Based">Project-Based</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.employment_status && <p className="text-red-500 text-xs">{errors.employment_status}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_of_regularization">Regularization Date</Label>
                  <div className="flex items-center">
                    <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                    <Input
                      id="date_of_regularization"
                      type="date"
                      name="date_of_regularization"
                      value={formData.date_of_regularization || ""}
                      onChange={handleChange}
                      className={errors.date_of_regularization ? "border-red-500" : ""}
                    />
                  </div>
                  {errors.date_of_regularization && (
                    <p className="text-red-500 text-xs">{errors.date_of_regularization}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="daily_rate">Daily Rate</Label>
                  <Input
                    id="daily_rate"
                    type="number"
                    name="daily_rate"
                    value={formData.daily_rate}
                    onChange={handleChange}
                    className={errors.daily_rate ? "border-red-500" : ""}
                  />
                  {errors.daily_rate && <p className="text-red-500 text-xs">{errors.daily_rate}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="years_of_service">Years of Service</Label>
                  <Input
                    id="years_of_service"
                    type="number"
                    name="years_of_service"
                    value={formData.years_of_service}
                    onChange={handleChange}
                    className={errors.years_of_service ? "border-red-500" : ""}
                  />
                  {errors.years_of_service && <p className="text-red-500 text-xs">{errors.years_of_service}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_terminated_resigned">Resignation/Termination Date</Label>
                  <div className="flex items-center">
                    <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                    <Input
                      id="date_terminated_resigned"
                      type="date"
                      name="date_terminated_resigned"
                      value={formData.date_terminated_resigned || ""}
                      onChange={handleChange}
                      className={errors.date_terminated_resigned ? "border-red-500" : ""}
                    />
                  </div>
                  {errors.date_terminated_resigned && (
                    <p className="text-red-500 text-xs">{errors.date_terminated_resigned}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status_201">201 File Status</Label>
                  <Select
                    value={formData.status_201 || "incomplete"}
                    onValueChange={(value) => handleSelectChange(value, "status_201")}
                  >
                    <SelectTrigger className={errors.status_201 ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incomplete">Incomplete</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status_201 && <p className="text-red-500 text-xs">{errors.status_201}</p>}
                </div>
              </div>
            </TabsContent>

            {/* Government IDs Tab */}
            <TabsContent value="government" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sss_no">SSS Number</Label>
                  <Input
                    id="sss_no"
                    name="sss_no"
                    value={formData.sss_no}
                    onChange={handleChange}
                    className={errors.sss_no ? "border-red-500" : ""}
                  />
                  {errors.sss_no && <p className="text-red-500 text-xs">{errors.sss_no}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tin_no">TIN Number</Label>
                  <Input
                    id="tin_no"
                    name="tin_no"
                    value={formData.tin_no}
                    onChange={handleChange}
                    className={errors.tin_no ? "border-red-500" : ""}
                  />
                  {errors.tin_no && <p className="text-red-500 text-xs">{errors.tin_no}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="philhealth_no">PhilHealth Number</Label>
                  <Input
                    id="philhealth_no"
                    name="philhealth_no"
                    value={formData.philhealth_no}
                    onChange={handleChange}
                    className={errors.philhealth_no ? "border-red-500" : ""}
                  />
                  {errors.philhealth_no && <p className="text-red-500 text-xs">{errors.philhealth_no}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pagibig_no">Pag-IBIG Number</Label>
                  <Input
                    id="pagibig_no"
                    name="pagibig_no"
                    value={formData.pagibig_no}
                    onChange={handleChange}
                    className={errors.pagibig_no ? "border-red-500" : ""}
                  />
                  {errors.pagibig_no && <p className="text-red-500 text-xs">{errors.pagibig_no}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id_status">ID Status</Label>
                  <Select value={formData.id_status} onValueChange={(value) => handleSelectChange(value, "id_status")}>
                    <SelectTrigger className={errors.id_status ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incomplete">Incomplete</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.id_status && <p className="text-red-500 text-xs">{errors.id_status}</p>}
                </div>
              </div>
            </TabsContent>

            {/* Emergency Contact Tab */}
            <TabsContent value="emergency" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                    <Input
                      id="emergency_contact_name"
                      name="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={handleChange}
                      className={errors.emergency_contact_name ? "border-red-500" : ""}
                    />
                  </div>
                  {errors.emergency_contact_name && (
                    <p className="text-red-500 text-xs">{errors.emergency_contact_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_mobile">Emergency Contact Number</Label>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <Input
                      id="emergency_contact_mobile"
                      name="emergency_contact_mobile"
                      value={formData.emergency_contact_mobile}
                      onChange={handleChange}
                      className={errors.emergency_contact_mobile ? "border-red-500" : ""}
                    />
                  </div>
                  {errors.emergency_contact_mobile && (
                    <p className="text-red-500 text-xs">{errors.emergency_contact_mobile}</p>
                  )}
                </div>
              </div>
            </TabsContent>
            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="id_no">ID Number</Label>
                  <Input
                    id="id_no"
                    name="id_no"
                    value={formData.id_no || ""}
                    onChange={handleChange}
                    className={errors.id_no ? "border-red-500" : ""}
                  />
                  {errors.id_no && <p className="text-red-500 text-xs">{errors.id_no}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ub_account">UB Account</Label>
                  <Input
                    id="ub_account"
                    name="ub_account"
                    value={formData.ub_account || ""}
                    onChange={handleChange}
                    className={errors.ub_account ? "border-red-500" : ""}
                  />
                  {errors.ub_account && <p className="text-red-500 text-xs">{errors.ub_account}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type_of_id">Type of ID</Label>
                  <Select
                    value={formData.type_of_id || ""}
                    onValueChange={(value) => handleSelectChange(value, "type_of_id")}
                  >
                    <SelectTrigger className={errors.type_of_id ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select ID Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PhilID">PhilID</SelectItem>
                      <SelectItem value="DL">Driver's License</SelectItem>
                      <SelectItem value="Phi-health">PhilHealth</SelectItem>
                      <SelectItem value="SSS">SSS</SelectItem>
                      <SelectItem value="UMID">UMID</SelectItem>
                      <SelectItem value="POSTAL">Postal ID</SelectItem>
                      <SelectItem value="Passport">Passport</SelectItem>
                      <SelectItem value="Voters">Voter's ID</SelectItem>
                      <SelectItem value="TIN">TIN ID</SelectItem>
                      <SelectItem value="D1">D1</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type_of_id && <p className="text-red-500 text-xs">{errors.type_of_id}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id_number">ID Number</Label>
                  <Input
                    id="id_number"
                    name="id_number"
                    value={formData.id_number || ""}
                    onChange={handleChange}
                    className={errors.id_number ? "border-red-500" : ""}
                  />
                  {errors.id_number && <p className="text-red-500 text-xs">{errors.id_number}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clearance">Clearance</Label>
                  <Select
                    value={formData.clearance || ""}
                    onValueChange={(value) => handleSelectChange(value, "clearance")}
                  >
                    <SelectTrigger className={errors.clearance ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select Clearance Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BARANGAY Clearance">Barangay Clearance</SelectItem>
                      <SelectItem value="NBI Clearance">NBI Clearance</SelectItem>
                      <SelectItem value="Police Clearance">Police Clearance</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.clearance && <p className="text-red-500 text-xs">{errors.clearance}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract">Contract Status</Label>
                  <Select
                    value={formData.contract || "NOT YET"}
                    onValueChange={(value) => handleSelectChange(value, "contract")}
                  >
                    <SelectTrigger className={errors.contract ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select Contract Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIGNED">Signed</SelectItem>
                      <SelectItem value="NOT YET">Not Yet</SelectItem>
                      <SelectItem value="REVIEW">Under Review</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.contract && <p className="text-red-500 text-xs">{errors.contract}</p>}
                </div>

                <div className="lg:col-span-3 space-y-2">
                  <Label>Document Checklist</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-md">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="government_id"
                        name="government_id"
                        checked={formData.government_id || false}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <Label htmlFor="government_id" className="text-sm font-medium text-gray-700">
                        Government ID
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="staff_house"
                        name="staff_house"
                        checked={formData.staff_house || false}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <Label htmlFor="staff_house" className="text-sm font-medium text-gray-700">
                        Staff House
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="birth_certificate"
                        name="birth_certificate"
                        checked={formData.birth_certificate || false}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <Label htmlFor="birth_certificate" className="text-sm font-medium text-gray-700">
                        Birth Certificate
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="marriage_certificate"
                        name="marriage_certificate"
                        checked={formData.marriage_certificate || false}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <Label htmlFor="marriage_certificate" className="text-sm font-medium text-gray-700">
                        Marriage Certificate
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="tor"
                        name="tor"
                        checked={formData.tor || false}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <Label htmlFor="tor" className="text-sm font-medium text-gray-700">
                        Transcript of Records
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="diploma_hs_college"
                        name="diploma_hs_college"
                        checked={formData.diploma_hs_college || false}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <Label htmlFor="diploma_hs_college" className="text-sm font-medium text-gray-700">
                        Diploma (HS/College)
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="performance_evaluation"
                        name="performance_evaluation"
                        checked={formData.performance_evaluation || false}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <Label htmlFor="performance_evaluation" className="text-sm font-medium text-gray-700">
                        Performance Evaluation
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="medical_cert"
                        name="medical_cert"
                        checked={formData.medical_cert || false}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <Label htmlFor="medical_cert" className="text-sm font-medium text-gray-700">
                        Medical Certificate
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="resume"
                        name="resume"
                        checked={formData.resume || false}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <Label htmlFor="resume" className="text-sm font-medium text-gray-700">
                        Resume
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-3 space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <textarea
                    id="remarks"
                    name="remarks"
                    value={formData.remarks || ""}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded min-h-[100px] ${
                      errors.remarks ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.remarks && <p className="text-red-500 text-xs">{errors.remarks}</p>}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? "Saving..." : "Update Employee"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default UpdateEmployeeModal

