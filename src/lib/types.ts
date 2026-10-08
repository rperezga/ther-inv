export type UserRole = "admin" | "manager" | "viewer" | "agent";
export type AgentType = "PT" | "PTA";

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  agentType?: AgentType;
  isActive: boolean;
  invitedBy?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IServiceRate {
  serviceType: string;
  rate: number;
}

export interface IAgencyAssignment {
  agencyName: string;
  services: IServiceRate[];
}

export interface IWorker {
  _id?: string;
  firstName: string;
  lastName: string;
  initials?: string;
  role: string; // e.g. "Physical Therapy (PT)", "Physical Therapy Assistant (PTA)"
  hourlyRate: number;
  phone?: string;
  email?: string;
  ssnLast4?: string;
  status: "active" | "inactive";
  notes?: string;
  agencyAssignments?: IAgencyAssignment[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IInvoiceItem {
  workerId?: string;
  workerName: string;
  role: string;
  patientName?: string;
  visitDate?: string;
  serviceType?: string;
  regularHours: number;
  regularRate: number;
  overtimeHours: number;
  overtimeRate: number;
  description?: string;
  amount: number;
}

export interface ILot {
  _id?: string;
  lotNumber: number;
  lotCode: string;
  name?: string;
  agencyName?: string;
  periodStart: string | Date;
  periodEnd: string | Date;
  status: "open" | "closed";
  notes?: string;
  invoicesCount?: number;
  totalAmount?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IInvoice {
  _id?: string;
  invoiceNumber: string;
  lotId?: string;
  lotNumber?: number;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  periodStart: string;
  periodEnd: string;
  invoiceDate: string;
  dueDate: string;
  items: IInvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  status: "draft" | "pending" | "paid" | "cancelled";
  notes?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IInvitation {
  _id?: string;
  token: string;
  email: string;
  role: UserRole;
  agentType?: AgentType;
  status: "pending" | "accepted" | "expired";
  invitedBy: {
    _id: string;
    name: string;
    email: string;
  };
  expiresAt: string | Date;
  createdAt?: string | Date;
}

export interface IAgentVisit {
  _id?: string;
  agentId?: string;
  agentName: string;
  agentEmail: string;
  patientName: string;
  serviceType?: string;
  visitDates: string[];
  notes?: string;
  status?: "pending" | "approved" | "invoiced";
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
