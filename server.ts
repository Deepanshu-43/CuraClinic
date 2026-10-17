import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { connectDB, isDbConnected } from "./src/server/db.js";
import { PatientModel } from "./src/server/models/patient.model.js";
import { AppointmentModel } from "./src/server/models/appointment.model.js";
import { MedicalRecordModel } from "./src/server/models/record.model.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory persistent data store fallback for zero-configuration instant preview
let inMemoryPatients = [
  {
    id: "p1",
    name: "Eleanor Vance",
    email: "eleanor.vance@example.com",
    phone: "+1 (555) 234-5678",
    dob: "1984-06-15",
    gender: "Female",
    address: "42 Elmwood Ave, Boston, MA",
    bloodGroup: "O+",
    allergies: ["Penicillin", "Sulfa drugs"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "p2",
    name: "Marcus Aurelius Chen",
    email: "marcus.chen@example.com",
    phone: "+1 (555) 876-5432",
    dob: "1976-11-03",
    gender: "Male",
    address: "108 Beacon St, Boston, MA",
    bloodGroup: "A-",
    allergies: ["Aspirin", "NSAIDs"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "p3",
    name: "Sophia Rodriguez",
    email: "sophia.r@example.com",
    phone: "+1 (555) 432-1098",
    dob: "1992-03-22",
    gender: "Female",
    address: "71 Commonwealth Ave, Cambridge, MA",
    bloodGroup: "B+",
    allergies: ["Peanuts", "Latex"],
    createdAt: new Date().toISOString(),
  },
];

let inMemoryAppointments = [
  {
    id: "a1",
    patientId: "p1",
    patientName: "Eleanor Vance",
    doctorName: "Dr. Sarah Jenkins",
    dateTime: "2026-10-18T10:00:00",
    status: "Confirmed",
    reason: "Hypertension follow-up and lab review",
    notes: "Review BP log and lisinopril titration",
    createdAt: new Date().toISOString(),
  },
  {
    id: "a2",
    patientId: "p2",
    patientName: "Marcus Aurelius Chen",
    doctorName: "Dr. Alexander Ross",
    dateTime: "2026-10-18T11:30:00",
    status: "Scheduled",
    reason: "Routine cardiovascular screening",
    notes: "Fasting lipid panel completed yesterday",
    createdAt: new Date().toISOString(),
  },
  {
    id: "a3",
    patientId: "p3",
    patientName: "Sophia Rodriguez",
    doctorName: "Dr. Emily Taylor",
    dateTime: "2026-10-19T09:15:00",
    status: "Scheduled",
    reason: "Asthma action plan update",
    notes: "Check spirometry results",
    createdAt: new Date().toISOString(),
  },
];

let inMemoryRecords = [
  {
    id: "r1",
    patientId: "p1",
    date: "2026-09-14",
    diagnosis: "Stage 1 Essential Hypertension, Mild Asthma",
    treatment: "Lifestyle counseling, sodium reduction, continue home BP tracking.",
    prescriptions: "Lisinopril 10mg PO daily, Albuterol HFA 90mcg inhaler 2 puffs PRN.",
    vitals: {
      bp: "138/86 mmHg",
      temp: "98.4°F",
      weight: "68 kg",
    },
    doctorName: "Dr. Sarah Jenkins",
    aiSummary: "Patient exhibits stable stage 1 HTN on current dose. No adverse reactions reported. Remind avoidance of NSAIDs due to renal and BP effects.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "r2",
    patientId: "p2",
    date: "2026-08-20",
    diagnosis: "Hyperlipidemia, Pre-diabetes",
    treatment: "Moderate-intensity statin therapy, dietary consultation scheduled.",
    prescriptions: "Atorvastatin 20mg PO QHS, Metformin 500mg PO BID.",
    vitals: {
      bp: "126/78 mmHg",
      temp: "98.6°F",
      weight: "82 kg",
    },
    doctorName: "Dr. Alexander Ross",
    aiSummary: "Lipid targets pending 3-month follow-up. Avoid prescribing aspirin due to documented severe allergy.",
    createdAt: new Date().toISOString(),
  },
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Connect to MongoDB if available
  await connectDB();

  // Initialize server-side Gemini SDK
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // Health probe
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      stack: "MERN (MongoDB / Express / React / Node)",
      dbConnected: isDbConnected(),
      mode: isDbConnected() ? "mongodb" : "zero-config fallback / firestore synced",
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // ----------------------------------------------------
  // AI MEDICAL INSIGHTS QUERY ENDPOINT (Gemini 3.8 Flash)
  // ----------------------------------------------------
  app.post("/api/insights/query", async (req, res) => {
    try {
      const { query, promptType, patient, records, clinicStats } = req.body;

      if (!query && !promptType) {
        return res.status(400).json({ error: "Query or promptType is required" });
      }

      const systemInstruction = `You are CuraClinic's AI Medical Insights Decision Support Assistant.
You assist licensed medical clinicians by synthesizing electronic health records, flagging risk factors, assessing potential drug-drug/drug-allergy interactions, and summarizing clinical trajectories.
Guidelines:
1. Maintain a high standard of clinical precision, clarity, and conciseness.
2. Structure your response with clear sections using clean Markdown:
   - Summary / Clinical Findings
   - Pertinent Risk Factors & Alerts (e.g. Allergies, Abnormal Vitals)
   - Medication & Interaction Review
   - Suggested Clinical Next Steps
3. Always check and cross-reference documented patient allergies against existing and suggested medications.
4. If vitals or lab values indicate potential hypertension, fever, tachycardia, or decompensation, highlight them prominently.
5. Conclude with a concise clinical note disclaimer: "*Clinical Decision Support: AI-generated guidance. Always verify independently against clinical guidelines and institutional protocols.*"`;

      let contextPrompt = "";
      if (patient) {
        contextPrompt += `PATIENT PROFILE:
- Name: ${patient.name}
- DOB / Age: ${patient.dob}
- Gender: ${patient.gender}
- Blood Group: ${patient.bloodGroup || "Not recorded"}
- Known Allergies: ${Array.isArray(patient.allergies) ? patient.allergies.join(", ") : patient.allergies || "None documented"}
`;
      } else {
        contextPrompt += `GENERAL CLINIC CONTEXT:
Clinic has ${inMemoryPatients.length} active registered patients and upcoming scheduled procedures.
`;
      }

      if (records && records.length > 0) {
        contextPrompt += `\nHISTORICAL MEDICAL RECORDS (${records.length} entries):\n`;
        records.forEach((r: any, idx: number) => {
          contextPrompt += `[Record #${idx + 1} - Date: ${r.date} | Clinician: ${r.doctorName}]
Diagnosis: ${r.diagnosis}
Treatment: ${r.treatment || "N/A"}
Prescriptions: ${r.prescriptions || "N/A"}
Vitals: BP: ${r.vitals?.bp || "N/A"}, Temp: ${r.vitals?.temp || "N/A"}, Weight: ${r.vitals?.weight || "N/A"}
AI Note: ${r.aiSummary || "None"}
---\n`;
        });
      }

      let userQueryText = query || "";
      if (promptType === "summary") {
        userQueryText = `Please generate an executive clinical summary of this patient's medical history, current active conditions, and treatment stability.`;
      } else if (promptType === "interactions") {
        userQueryText = `Perform a comprehensive medication safety and allergy cross-check. Highlight any documented allergies, potential contraindications, and drug interactions based on active prescriptions.`;
      } else if (promptType === "risks") {
        userQueryText = `Analyze this patient's vitals, chronic diagnoses, and recent records. What are the top clinical risk flags and preventive indicators?`;
      } else if (promptType === "followup") {
        userQueryText = `Formulate a concise evidence-based follow-up and monitoring plan for the clinician, including recommended lab intervals, home monitoring goals, and lifestyle considerations.`;
      }

      const fullPrompt = `${contextPrompt}\nCLINICIAN QUERY: ${userQueryText}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: fullPrompt,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      const generatedText = response.text || "No insights could be generated at this time.";

      res.json({
        success: true,
        insight: generatedText,
        patientId: patient?.id,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("[Gemini Insights API Error]:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to generate AI clinical insights",
      });
    }
  });

  // ----------------------------------------------------
  // PATIENTS REST API (MERN endpoints)
  // ----------------------------------------------------
  app.get("/api/patients", async (req, res) => {
    try {
      if (isDbConnected()) {
        const patients = await PatientModel.find().sort({ createdAt: -1 });
        return res.json(patients);
      }
      res.json(inMemoryPatients);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/patients", async (req, res) => {
    try {
      const data = req.body;
      if (isDbConnected()) {
        const newPatient = new PatientModel(data);
        await newPatient.save();
        return res.status(201).json(newPatient);
      }
      const newPatient = {
        id: `p-${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString(),
      };
      inMemoryPatients.unshift(newPatient);
      res.status(201).json(newPatient);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/patients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      if (isDbConnected()) {
        const updated = await PatientModel.findByIdAndUpdate(id, data, { new: true });
        return res.json(updated);
      }
      const index = inMemoryPatients.findIndex((p) => p.id === id);
      if (index !== -1) {
        inMemoryPatients[index] = { ...inMemoryPatients[index], ...data };
        return res.json(inMemoryPatients[index]);
      }
      res.status(404).json({ error: "Patient not found" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/patients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (isDbConnected()) {
        await PatientModel.findByIdAndDelete(id);
        return res.json({ success: true });
      }
      inMemoryPatients = inMemoryPatients.filter((p) => p.id !== id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // APPOINTMENTS REST API (MERN endpoints)
  // ----------------------------------------------------
  app.get("/api/appointments", async (req, res) => {
    try {
      if (isDbConnected()) {
        const appointments = await AppointmentModel.find().sort({ dateTime: 1 });
        return res.json(appointments);
      }
      res.json(inMemoryAppointments);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const data = req.body;
      if (isDbConnected()) {
        const newAppt = new AppointmentModel(data);
        await newAppt.save();
        return res.status(201).json(newAppt);
      }
      const newAppt = {
        id: `a-${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString(),
      };
      inMemoryAppointments.push(newAppt);
      res.status(201).json(newAppt);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // MEDICAL RECORDS REST API (MERN endpoints)
  // ----------------------------------------------------
  app.get("/api/records", async (req, res) => {
    try {
      const { patientId } = req.query;
      if (isDbConnected()) {
        const query = patientId ? { patientId: String(patientId) } : {};
        const records = await MedicalRecordModel.find(query).sort({ date: -1 });
        return res.json(records);
      }
      let filtered = inMemoryRecords;
      if (patientId) {
        filtered = inMemoryRecords.filter((r) => r.patientId === patientId);
      }
      res.json(filtered);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/records", async (req, res) => {
    try {
      const data = req.body;
      if (isDbConnected()) {
        const newRecord = new MedicalRecordModel(data);
        await newRecord.save();
        return res.status(201).json(newRecord);
      }
      const newRecord = {
        id: `r-${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString(),
      };
      inMemoryRecords.unshift(newRecord);
      res.status(201).json(newRecord);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // VITE DEV MIDDLEWARE / STATIC PRODUCTION BUNDLE
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CuraClinic CRM MERN Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
