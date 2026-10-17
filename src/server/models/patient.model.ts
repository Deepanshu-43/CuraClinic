import mongoose, { Schema, Document } from "mongoose";

export interface IPatient extends Document {
  name: string;
  email: string;
  phone: string;
  dob: string;
  gender: "Male" | "Female" | "Other";
  address: string;
  bloodGroup: string;
  allergies: string[];
  createdAt: Date;
}

const PatientSchema = new Schema<IPatient>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  dob: { type: String, required: true },
  gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
  address: { type: String, default: "" },
  bloodGroup: { type: String, default: "Unknown" },
  allergies: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export const PatientModel: mongoose.Model<IPatient> =
  (mongoose.models.Patient as mongoose.Model<IPatient>) ||
  mongoose.model<IPatient>("Patient", PatientSchema);
