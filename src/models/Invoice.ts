import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInvoiceItemDoc {
  workerId?: mongoose.Types.ObjectId;
  workerName: string;
  role: string;
  regularHours: number;
  regularRate: number;
  overtimeHours: number;
  overtimeRate: number;
  description?: string;
  amount: number;
}

export interface IInvoiceDocument extends Document {
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  periodStart: Date;
  periodEnd: Date;
  invoiceDate: Date;
  dueDate: Date;
  items: IInvoiceItemDoc[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  status: "draft" | "pending" | "paid" | "cancelled";
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItemDoc>(
  {
    workerId: { type: Schema.Types.ObjectId, ref: "Worker" },
    workerName: { type: String, required: true },
    role: { type: String, required: true },
    regularHours: { type: Number, required: true, default: 0, min: 0 },
    regularRate: { type: Number, required: true, default: 0, min: 0 },
    overtimeHours: { type: Number, default: 0, min: 0 },
    overtimeRate: { type: Number, default: 0, min: 0 },
    description: { type: String, default: "" },
    amount: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoiceDocument>(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    clientName: { type: String, required: true, trim: true },
    clientEmail: { type: String, trim: true },
    clientAddress: { type: String, trim: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    invoiceDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    items: [InvoiceItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ["draft", "pending", "paid", "cancelled"],
      default: "draft",
    },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Invoice: Model<IInvoiceDocument> =
  mongoose.models.Invoice || mongoose.model<IInvoiceDocument>("Invoice", InvoiceSchema);
