import mongoose, { Schema, Document } from "mongoose";

export interface IMedicalRecord extends Document {
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
  createdAt: Date;
}

const MedicalRecordSchema = new Schema<IMedicalRecord>({
  patientId: { type: String, required: true },
  date: { type: String, required: true },
  diagnosis: { type: String, required: true },
  treatment: { type: String, default: "" },
  prescriptions: { type: String, default: "" },
  vitals: {
    bp: { type: String, default: "120/80 mmHg" },
    temp: { type: String, default: "98.6°F" },
    weight: { type: String, default: "70 kg" },
  },
  doctorName: { type: String, required: true },
  aiSummary: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export const MedicalRecordModel: mongoose.Model<IMedicalRecord> =
  (mongoose.models.MedicalRecord as mongoose.Model<IMedicalRecord>) ||
  mongoose.model<IMedicalRecord>("MedicalRecord", MedicalRecordSchema);
