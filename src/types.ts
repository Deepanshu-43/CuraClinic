export interface Patient {
  id?: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  gender: "Male" | "Female" | "Other";
  address: string;
  bloodGroup: string;
  allergies: string[];
  createdAt: string;
}

export interface Appointment {
  id?: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  dateTime: string;
  status: "Scheduled" | "Confirmed" | "Completed" | "Cancelled";
  reason: string;
  notes?: string;
  createdAt: string;
}

export interface MedicalRecord {
  id?: string;
  patientId: string;
  date: string;
  diagnosis: string;
  treatment: string;
  prescriptions: string;
  vitals: {
    bp: string;
    temp: string;
    weight: string;
  };
  doctorName: string;
  aiSummary?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: "admin" | "doctor" | "receptionist";
}

export interface Staff {
  id?: string;
  name: string;
  role: "Doctor" | "Nurse" | "Assistant" | "Administrator";
  specialty: string;
  email: string;
  phone: string;
  availability: "Active" | "On Leave" | "Off Duty";
  createdAt: string;
}
