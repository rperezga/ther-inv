import mongoose, { Schema, Document, Model } from "mongoose";

export interface IServiceRate {
  serviceType: string; // "SOC", "ReCert", "ReEval", "Eval", "Disch", "NoBill", "Missed Visit"
  rate: number;
}

export interface IAgencyAssignment {
  agencyName: string; // e.g. "A&A HEALTH SERVICE", "ALC", "INNOVATION", "MEDCARE", "OASIS", "USAD"
  services: IServiceRate[];
}

export interface IWorkerDocument extends Document {
  firstName: string;
  lastName: string;
  role: string;
  hourlyRate: number;
  phone?: string;
  email?: string;
  ssnLast4?: string;
  status: "active" | "inactive";
  notes?: string;
  agencyAssignments?: IAgencyAssignment[];
  createdAt: Date;
  updatedAt: Date;
}

const ServiceRateSchema = new Schema(
  {
    serviceType: { type: String, required: true, trim: true },
    rate: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const AgencyAssignmentSchema = new Schema(
  {
    agencyName: { type: String, required: true, trim: true },
    services: [ServiceRateSchema],
  },
  { _id: false }
);

const WorkerSchema = new Schema<IWorkerDocument>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    hourlyRate: { type: Number, default: 0, min: 0 },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    ssnLast4: { type: String, trim: true },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    notes: { type: String, trim: true },
    agencyAssignments: [AgencyAssignmentSchema],
  },
  { timestamps: true }
);

// Virtual for full name
WorkerSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

WorkerSchema.set("toJSON", { virtuals: true });
WorkerSchema.set("toObject", { virtuals: true });

export const Worker: Model<IWorkerDocument> =
  mongoose.models.Worker || mongoose.model<IWorkerDocument>("Worker", WorkerSchema);
