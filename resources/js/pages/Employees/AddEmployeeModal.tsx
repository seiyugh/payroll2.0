"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useForm } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, User, Briefcase, FileText, Phone } from "lucide-react"

const AddEmployeeModal = ({ onClose, onSubmit }) => {
  const [activeTab, setActiveTab] = useState("personal")

  const { data, setData, post, errors, processing } = useForm({
    employee_number: "",
    full_name: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    address: "",
    position: "admin",
    department: "Administration",
    assigned_area: "",
    date_hired: "",
    years_of_service: "",
    employment_status: "Probationary",
    date_of_regularization: "",
    status_201: "incomplete",
    date_terminated_resigned: "",
    daily_rate: 1,
    civil_status: "Single",
    gender: "Male",
    birthdate: "",
    birth_place: "",
    age: "",
    contacts: "",
    id_status: "incomplete",
    sss_no: "",
    tin_no: "",
    philhealth_no: "",
    pagibig_no: "",
    emergency_contact_name: "",
    emergency_contact_mobile: "",
    // New fields
    id_no: "",
    ub_account: "",
    resume: false,
    government_id: false,
    type_of_id: null,
    clearance: null,
    id_number: "",
    staff_house: false,
    birth_certificate: false,
    marriage_certificate: false,
    tor: false,
    diploma_hs_college: false,
    contract: "NOT YET",
    performance_evaluation: false,
    medical_cert: false,
    remarks: "",
    email: "",
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    updateData(name, value)
  }

  const updateData = (name, value) => {
    setData((prev) => {
      const newData = {
        ...prev,
        [name]: ["daily_rate", "years_of_service", "age", "contacts"].includes(name)
          ? value === ""
            ? ""
            : Number(value) || 0
          : value,
      }

      // Update full name when any name component changes
      if (["first_name", "middle_name", "last_name"].includes(name)) {
        newData.full_name = `${newData.first_name} ${newData.middle_name} ${newData.last_name}`.trim()
      }

      return newData
    })
  }

  const handleSelectChange = (name, value) => {
    updateData(name, value)
  }

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target
    setData((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Add birthplace field for backend mapping
    const submissionData = {
      ...data,
      birthplace: data.birth_place,
      resignation_termination_date: data.date_terminated_resigned,
    }

    if (onSubmit) {
      onSubmit(submissionData)
    } else {
      post(window.route("employees.store"), {
        onSuccess: () => {
          toast.success("Employee added successfully!")
          onClose()
        },
        onError: (errors) => {
          // Find the first tab with errors and switch to it
          const tabsWithErrors = {
            personal: [
              "first_name",
              "middle_name",
              "last_name",
              "civil_status",
              "gender",
              "birthdate",
              "birth_place",
              "age",
              "address",
            ],
            employment: [
              "employee_number",
              "position",
              "department",
              "assigned_area",
              "date_hired",
              "employment_status",
              "date_of_regularization",
              "years_of_service",
              "daily_rate",
            ],
            government: ["sss_no", "tin_no", "philhealth_no", "pagibig_no", "status_201", "id_status"],
            emergency: ["contacts", "emergency_contact_name", "emergency_contact_mobile"],
            documents: [
              "id_no",
              "ub_account",
              "resume",
              "type_of_id",
              "id_number",
              "clearance",
              "contract",
              "government_id",
              "staff_house",
              "birth_certificate",
              "marriage_certificate",
              "tor",
              "diploma_hs_college",
              "performance_evaluation",
              "medical_cert",
              "remarks",
            ],
          }

          for (const [tab, fields] of Object.entries(tabsWithErrors)) {
            if (fields.some((field) => errors[field])) {
              setActiveTab(tab)
              break
            }
          }

          toast.error("Please correct the errors in the form")
        },
      })
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <div className="bg-background w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-lg shadow-lg border border-border animate-in fade-in-0 zoom-in-95">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-semibold">Add New Employee</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-4 border-b border-border">
              <TabsList className="w-full justify-start h-12 bg-transparent p-0 rounded-none">
                <TabsTrigger
                  value="personal"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <User className="mr-2 h-4 w-4" />
                  Personal
                </TabsTrigger>
                <TabsTrigger
                  value="employment"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <Briefcase className="mr-2 h-4 w-4" />
                  Employment
                </TabsTrigger>
                <TabsTrigger
                  value="government"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Government IDs
                </TabsTrigger>
                <TabsTrigger
                  value="emergency"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Emergency
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Documents
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(90vh-12rem)]">
              <TabsContent value="personal" className="mt-0">
                <Card className="border-0 shadow-none">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        label="First Name"
                        name="first_name"
                        value={data.first_name}
                        onChange={handleChange}
                        error={errors.first_name}
                        required
                      />
                      <FormField
                        label="Middle Name"
                        name="middle_name"
                        value={data.middle_name}
                        onChange={handleChange}
                        error={errors.middle_name}
                      />
                      <FormField
                        label="Last Name"
                        name="last_name"
                        value={data.last_name}
                        onChange={handleChange}
                        error={errors.last_name}
                        required
                      />
                      <FormField
                        label="Full Name"
                        name="full_name"
                        value={data.full_name}
                        onChange={handleChange}
                        error={errors.full_name}
                        disabled
                      />
                      <FormField
                        label="Address"
                        name="address"
                        value={data.address}
                        onChange={handleChange}
                        error={errors.address}
                        className="md:col-span-2"
                      />
                      <FormSelect
                        label="Civil Status"
                        name="civil_status"
                        value={data.civil_status}
                        onChange={(value) => handleSelectChange("civil_status", value)}
                        error={errors.civil_status}
                        options={[
                          { value: "Single", label: "Single" },
                          { value: "Married", label: "Married" },
                          { value: "Widowed", label: "Widowed" },
                          { value: "Separated", label: "Separated" },
                        ]}
                      />
                      <FormSelect
                        label="Gender"
                        name="gender"
                        value={data.gender}
                        onChange={(value) => handleSelectChange("gender", value)}
                        error={errors.gender}
                        options={[
                          { value: "Male", label: "Male" },
                          { value: "Female", label: "Female" },
                          { value: "Other", label: "Other" },
                        ]}
                      />
                      <FormField
                        type="date"
                        label="Birthdate"
                        name="birthdate"
                        value={data.birthdate}
                        onChange={handleChange}
                        error={errors.birthdate}
                      />
                      <FormField
                        label="Birthplace"
                        name="birth_place"
                        value={data.birth_place}
                        onChange={handleChange}
                        error={errors.birth_place}
                      />
                      <FormField
                        type="number"
                        label="Age"
                        name="age"
                        value={data.age}
                        onChange={handleChange}
                        error={errors.age}
                      />
                      <FormField
                        label="Email"
                        name="email"
                        type="email"
                        value={data.email}
                        onChange={handleChange}
                        error={errors.email}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="employment" className="mt-0">
                <Card className="border-0 shadow-none">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        label="Employee Number"
                        name="employee_number"
                        value={data.employee_number}
                        onChange={handleChange}
                        error={errors.employee_number}
                        required
                      />
                      <FormSelect
                        label="Position"
                        name="position"
                        value={data.position}
                        onChange={(value) => handleSelectChange("position", value)}
                        error={errors.position}
                        options={[
                          { value: "admin", label: "Admin" },
                          { value: "hr", label: "HR" },
                          { value: "billing", label: "Billing" },
                          { value: "technician", label: "Technician" },
                          { value: "driver technician", label: "Driver Technician" },
                        ]}
                        required
                      />
                      <FormSelect
                        label="Department"
                        name="department"
                        value={data.department}
                        onChange={(value) => handleSelectChange("department", value)}
                        error={errors.department}
                        options={[
                          { value: "Administration", label: "Administration" },
                          { value: "Human Resources", label: "Human Resources" },
                          { value: "Finance", label: "Finance" },
                          { value: "Operations", label: "Operations" },
                          { value: "Allen One", label: "Allen One" },
                          { value: "Technical", label: "Technical" },
                        ]}
                        required
                      />
                      <FormField
                        label="Assigned Area"
                        name="assigned_area"
                        value={data.assigned_area}
                        onChange={handleChange}
                        error={errors.assigned_area}
                      />
                      <FormField
                        type="date"
                        label="Date Hired"
                        name="date_hired"
                        value={data.date_hired}
                        onChange={handleChange}
                        error={errors.date_hired}
                        required
                      />
                      <FormSelect
                        label="Employment Status"
                        name="employment_status"
                        value={data.employment_status}
                        onChange={(value) => handleSelectChange("employment_status", value)}
                        error={errors.employment_status}
                        options={[
                          { value: "Probationary", label: "Probationary" },
                          { value: "Regular", label: "Regular" },
                          { value: "Project-Based", label: "Project-Based" },
                        ]}
                      />
                      <FormField
                        type="date"
                        label="Date of Regularization"
                        name="date_of_regularization"
                        value={data.date_of_regularization}
                        onChange={handleChange}
                        error={errors.date_of_regularization}
                      />
                      <FormField
                        type="number"
                        label="Years of Service"
                        name="years_of_service"
                        value={data.years_of_service}
                        onChange={handleChange}
                        error={errors.years_of_service}
                      />
                      <FormField
                        type="number"
                        label="Daily Rate"
                        name="daily_rate"
                        value={data.daily_rate}
                        onChange={handleChange}
                        error={errors.daily_rate}
                        required
                      />
                      <FormField
                        type="date"
                        label="Termination/Resignation Date"
                        name="date_terminated_resigned"
                        value={data.date_terminated_resigned}
                        onChange={handleChange}
                        error={errors.date_terminated_resigned}
                      />
                      <FormSelect
                        label="201 File Status"
                        name="status_201"
                        value={data.status_201}
                        onChange={(value) => handleSelectChange("status_201", value)}
                        error={errors.status_201}
                        options={[
                          { value: "incomplete", label: "Incomplete" },
                          { value: "complete", label: "Complete" },
                        ]}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="government" className="mt-0">
                <Card className="border-0 shadow-none">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        label="SSS Number"
                        name="sss_no"
                        value={data.sss_no}
                        onChange={handleChange}
                        error={errors.sss_no}
                      />
                      <FormField
                        label="TIN Number"
                        name="tin_no"
                        value={data.tin_no}
                        onChange={handleChange}
                        error={errors.tin_no}
                      />
                      <FormField
                        label="PhilHealth Number"
                        name="philhealth_no"
                        value={data.philhealth_no}
                        onChange={handleChange}
                        error={errors.philhealth_no}
                      />
                      <FormField
                        label="Pag-IBIG Number"
                        name="pagibig_no"
                        value={data.pagibig_no}
                        onChange={handleChange}
                        error={errors.pagibig_no}
                      />
                      <FormSelect
                        label="ID Status"
                        name="id_status"
                        value={data.id_status}
                        onChange={(value) => handleSelectChange("id_status", value)}
                        error={errors.id_status}
                        options={[
                          { value: "incomplete", label: "Incomplete" },
                          { value: "complete", label: "Complete" },
                        ]}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="emergency" className="mt-0">
                <Card className="border-0 shadow-none">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        label="Contact Number"
                        name="contacts"
                        value={data.contacts}
                        onChange={handleChange}
                        error={errors.contacts}
                        required
                      />
                      <div className="md:col-span-2">
                        <div className="bg-muted/50 p-4 rounded-lg mb-4">
                          <h3 className="font-medium mb-2">Emergency Contact Information</h3>
                          <p className="text-sm text-muted-foreground">
                            Please provide details of someone we can contact in case of emergency.
                          </p>
                        </div>
                      </div>
                      <FormField
                        label="Emergency Contact Name"
                        name="emergency_contact_name"
                        value={data.emergency_contact_name}
                        onChange={handleChange}
                        error={errors.emergency_contact_name}
                        required
                      />
                      <FormField
                        label="Emergency Contact Mobile"
                        name="emergency_contact_mobile"
                        value={data.emergency_contact_mobile}
                        onChange={handleChange}
                        error={errors.emergency_contact_mobile}
                        required
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="mt-0">
                <Card className="border-0 shadow-none">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        label="ID Number"
                        name="id_no"
                        value={data.id_no}
                        onChange={handleChange}
                        error={errors.id_no}
                      />
                      <FormField
                        label="UB Account"
                        name="ub_account"
                        value={data.ub_account}
                        onChange={handleChange}
                        error={errors.ub_account}
                      />
                      <FormSelect
                        label="Type of ID"
                        name="type_of_id"
                        value={data.type_of_id}
                        onChange={(value) => handleSelectChange("type_of_id", value)}
                        error={errors.type_of_id}
                        options={[
                          { value: "PhilID", label: "PhilID" },
                          { value: "DL", label: "Driver's License" },
                          { value: "Phi-health", label: "PhilHealth" },
                          { value: "SSS", label: "SSS" },
                          { value: "UMID", label: "UMID" },
                          { value: "POSTAL", label: "Postal ID" },
                          { value: "Passport", label: "Passport" },
                          { value: "Voters", label: "Voter's ID" },
                          { value: "TIN", label: "TIN ID" },
                          { value: "D1", label: "D1" },
                        ]}
                      />
                      <FormField
                        label="ID Number"
                        name="id_number"
                        value={data.id_number}
                        onChange={handleChange}
                        error={errors.id_number}
                      />
                      <FormSelect
                        label="Clearance"
                        name="clearance"
                        value={data.clearance}
                        onChange={(value) => handleSelectChange("clearance", value)}
                        error={errors.clearance}
                        options={[
                          { value: "BARANGAY Clearance", label: "Barangay Clearance" },
                          { value: "NBI Clearance", label: "NBI Clearance" },
                          { value: "Police Clearance", label: "Police Clearance" },
                        ]}
                      />
                      <FormSelect
                        label="Contract Status"
                        name="contract"
                        value={data.contract}
                        onChange={(value) => handleSelectChange("contract", value)}
                        error={errors.contract}
                        options={[
                          { value: "SIGNED", label: "Signed" },
                          { value: "NOT YET", label: "Not Yet" },
                          { value: "REVIEW", label: "Under Review" },
                        ]}
                      />
                      <div className="md:col-span-2">
                        <Label className="mb-2 block">Document Checklist</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
                          <FormCheckbox
                            label="Government ID"
                            name="government_id"
                            checked={data.government_id}
                            onChange={(e) => handleCheckboxChange(e)}
                          />
                          <FormCheckbox
                            label="Staff House"
                            name="staff_house"
                            checked={data.staff_house}
                            onChange={(e) => handleCheckboxChange(e)}
                          />
                          <FormCheckbox
                            label="Birth Certificate"
                            name="birth_certificate"
                            checked={data.birth_certificate}
                            onChange={(e) => handleCheckboxChange(e)}
                          />
                          <FormCheckbox
                            label="Marriage Certificate"
                            name="marriage_certificate"
                            checked={data.marriage_certificate}
                            onChange={(e) => handleCheckboxChange(e)}
                          />
                          <FormCheckbox
                            label="Transcript of Records"
                            name="tor"
                            checked={data.tor}
                            onChange={(e) => handleCheckboxChange(e)}
                          />
                          <FormCheckbox
                            label="Diploma (HS/College)"
                            name="diploma_hs_college"
                            checked={data.diploma_hs_college}
                            onChange={(e) => handleCheckboxChange(e)}
                          />
                          <FormCheckbox
                            label="Performance Evaluation"
                            name="performance_evaluation"
                            checked={data.performance_evaluation}
                            onChange={(e) => handleCheckboxChange(e)}
                          />
                          <FormCheckbox
                            label="Medical Certificate"
                            name="medical_cert"
                            checked={data.medical_cert}
                            onChange={(e) => handleCheckboxChange(e)}
                          />
                          <FormCheckbox
                            label="Resume"
                            name="resume"
                            checked={data.resume}
                            onChange={(e) => handleCheckboxChange(e)}
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="remarks">Remarks</Label>
                        <textarea
                          id="remarks"
                          name="remarks"
                          value={data.remarks}
                          onChange={handleChange}
                          className={`w-full p-2 border rounded min-h-[100px] ${errors.remarks ? "border-destructive" : "border-input"}`}
                        />
                        {errors.remarks && <p className="text-destructive text-xs">{errors.remarks}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              {processing ? "Saving..." : "Save Employee"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

const FormField = ({ label, type, name, value, onChange, error, disabled, required, className = "" }) => (
  <div className={className}>
    <div className="space-y-2">
      <Label htmlFor={name} className="flex items-center">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={error ? "border-destructive" : ""}
      />
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  </div>
)

const FormSelect = ({ label, name, value, onChange, error, options, required }) => (
  <div>
    <div className="space-y-2">
      <Label htmlFor={name} className="flex items-center">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Select value={value} onValueChange={(value) => onChange(value)}>
        <SelectTrigger id={name} className={error ? "border-destructive" : ""}>
          <SelectValue placeholder={`Select ${label}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  </div>
)

const FormCheckbox = ({ label, name, checked, onChange }) => (
  <div className="flex items-center space-x-2">
    <input
      type="checkbox"
      id={name}
      name={name}
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
    />
    <Label htmlFor={name} className="text-sm font-medium text-gray-700">
      {label}
    </Label>
  </div>
)

export default AddEmployeeModal

