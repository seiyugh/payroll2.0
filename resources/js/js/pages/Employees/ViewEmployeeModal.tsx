"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Briefcase, FileText, Phone, Calendar, CheckCircle, X } from "lucide-react"

interface Employee {
  id?: number
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
  employment_status: string
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
  sss_no: string | null
  tin_no: string | null
  philhealth_no: string | null
  pagibig_no: string | null
  emergency_contact_name: string
  emergency_contact_mobile: string
  email?: string | null
  // New fields from migration
  id_no: string | null
  ub_account: string | null
  resume: boolean | null
  government_id: boolean
  type_of_id: "PhilID" | "DL" | "Phi-health" | "SSS" | "UMID" | "POSTAL" | "Passport" | "Voters" | "TIN" | "D1" | null
  clearance: string | null
  id_number: string | null
  staff_house: boolean
  birth_certificate: boolean
  marriage_certificate: boolean
  tor: boolean
  diploma_hs_college: boolean
  contract: "SIGNED" | "NOT YET" | "REVIEW"
  performance_evaluation: boolean
  medical_cert: boolean
  remarks: string | null
}

interface ViewEmployeeModalProps {
  employee: Employee
  onClose: () => void
  onUpdate: () => void
}

const ViewEmployeeModal = ({ employee, onClose, onUpdate }: ViewEmployeeModalProps) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "regular":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
      case "probationary":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
      case "resigned":
      case "terminated":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-semibold">Employee Information</DialogTitle>
         
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
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
          <TabsContent value="personal">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2 text-indigo-500" />
                    Basic Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Employee Number</span>
                      <span className="font-medium">{employee.employee_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Full Name</span>
                      <span className="font-medium">{employee.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">First Name</span>
                      <span>{employee.first_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Middle Name</span>
                      <span>{employee.middle_name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Last Name</span>
                      <span>{employee.last_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Email</span>
                      <span>{employee.email || "N/A"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2 text-indigo-500" />
                    Personal Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Gender</span>
                      <span>{employee.gender}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Civil Status</span>
                      <span>{employee.civil_status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Birthdate</span>
                      <span>{formatDate(employee.birthdate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Birthplace</span>
                      <span>{employee.birth_place}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Age</span>
                      <span>{employee.age}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Address</span>
                      <span className="text-right max-w-[250px]">{employee.address}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Employment Tab */}
          <TabsContent value="employment">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <Briefcase className="h-5 w-5 mr-2 text-indigo-500" />
                    Employment Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Status</span>
                      <Badge className={getStatusBadgeColor(employee.employment_status)}>
                        {employee.employment_status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Position</span>
                      <span>{employee.position}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Department</span>
                      <span>{employee.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Assigned Area</span>
                      <span>{employee.assigned_area || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Daily Rate</span>
                      <span>
                        ₱
                        {employee.daily_rate.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-indigo-500" />
                    Employment Dates
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Date Hired</span>
                      <span>{formatDate(employee.date_hired)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Years of Service</span>
                      <span>
                        {employee.years_of_service} {employee.years_of_service === 1 ? "year" : "years"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Date of Regularization</span>
                      <span>{formatDate(employee.date_of_regularization)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Termination/Resignation Date</span>
                      <span>{formatDate(employee.date_terminated_resigned)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">201 File Status</span>
                      <Badge
                        variant="outline"
                        className={
                          employee.status_201 === "complete"
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                        }
                      >
                        {employee.status_201 || "Incomplete"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Government IDs Tab */}
          <TabsContent value="government">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-indigo-500" />
                  Government IDs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">SSS Number</span>
                      <span>{employee.sss_no || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">TIN Number</span>
                      <span>{employee.tin_no || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">PhilHealth Number</span>
                      <span>{employee.philhealth_no || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Pag-IBIG Number</span>
                      <span>{employee.pagibig_no || "N/A"}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">ID Status</span>
                      <Badge
                        variant="outline"
                        className={
                          employee.id_status === "complete"
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                        }
                      >
                        {employee.id_status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">ID Number</span>
                      <span>{employee.id_number || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Type of ID</span>
                      <span>{employee.type_of_id || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Clearance</span>
                      <span>{employee.clearance || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Emergency Contact Tab */}
          <TabsContent value="emergency">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-indigo-500" />
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Contact Number</span>
                    <span>{employee.contacts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Emergency Contact Name</span>
                    <span>{employee.emergency_contact_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Emergency Contact Mobile</span>
                    <span>{employee.emergency_contact_mobile}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-indigo-500" />
                    Document Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">ID No</span>
                      <span>{employee.id_no || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">UB Account</span>
                      <span>{employee.ub_account || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Contract Status</span>
                      <Badge
                        variant="outline"
                        className={
                          employee.contract === "SIGNED"
                            ? "bg-green-50 text-green-700"
                            : employee.contract === "REVIEW"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                        }
                      >
                        {employee.contract}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Remarks</span>
                      <span className="text-right max-w-[250px]">{employee.remarks || "N/A"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-indigo-500" />
                    Document Checklist
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-4 h-4 rounded-full ${employee.government_id ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span className="text-sm">Government ID</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-4 h-4 rounded-full ${employee.staff_house ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span className="text-sm">Staff House</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-4 h-4 rounded-full ${employee.birth_certificate ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span className="text-sm">Birth Certificate</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-4 h-4 rounded-full ${employee.marriage_certificate ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span className="text-sm">Marriage Certificate</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full ${employee.tor ? "bg-green-500" : "bg-red-500"}`}></div>
                      <span className="text-sm">Transcript of Records</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-4 h-4 rounded-full ${employee.diploma_hs_college ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span className="text-sm">Diploma (HS/College)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-4 h-4 rounded-full ${employee.performance_evaluation ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span className="text-sm">Performance Evaluation</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-4 h-4 rounded-full ${employee.medical_cert ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span className="text-sm">Medical Certificate</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full ${employee.resume ? "bg-green-500" : "bg-red-500"}`}></div>
                      <span className="text-sm">Resume</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onUpdate} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Edit Employee
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ViewEmployeeModal

