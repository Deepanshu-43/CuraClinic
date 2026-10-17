import mongoose, { Schema, Document } from "mongoose";

export interface IAppointment extends Document {
  patientId: string;
  patientName: string;
  doctorName: string;
  dateTime: string;
  status: "Scheduled" | "Confirmed" | "Completed" | "Cancelled";
  reason: string;
  notes?: string;
  createdAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>({
  patientId: { type: String, required: true },
  patientName: { type: String, required: true },
  doctorName: { type: String, required: true },
  dateTime: { type: String, required: true },
  status: {
    type: String,
    enum: ["Scheduled", "Confirmed", "Completed", "Cancelled"],
    default: "Scheduled",
  },
  reason: { type: String, required: true },
  notes: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export const AppointmentModel: mongoose.Model<IAppointment> =
  (mongoose.models.Appointment as mongoose.Model<IAppointment>) ||
  mongoose.model<IAppointment>("Appointment", AppointmentSchema);
