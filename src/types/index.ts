export interface Client {
  clientId: number;
  clientName: string;
  email: string;
  phone: string;
  createdDate: string;
}

export interface Freelancer {
  freelancerId: number;
  freelancerName: string;
  email: string;
  phone: string;
  experienceYears: number;
}

export interface FreelancerSkill {
  freelancerId: number;
  skill: string;
}

export interface Project {
  projectId: number;
  clientId: number;
  projectTitle: string;
  description: string;
  budget: number;
  deadline: string;
  status: string;
}

export interface Proposal {
  proposalId: number;
  projectId: number;
  freelancerId: number;
  proposedAmount: number;
  proposedDuration: number;
  proposalDate: string;
  status: string;
}

export interface Contract {
  contractId: number;
  projectId: number;
  freelancerId: number;
  startDate: string;
  endDate: string;
  contractStatus: string;
}

export interface Milestone {
  milestoneId: number;
  contractId: number;
  title: string;
  dueDate: string;
  amount: number;
  status: string;
}

export interface Payment {
  paymentId: number;
  milestoneId: number;
  paymentDate: string;
  amount: number;
  method: string;
  status: string;
}

export interface Review {
  reviewId: number;
  projectId: number;
  freelancerId: number;
  rating: number;
  comment: string;
  reviewDate: string;
}

export interface Dispute {
  disputeId: number;
  contractId: number;
  reason: string;
  disputeDate: string;
  status: string;
  resolution: string;
}

export interface ColumnDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  options?: { value: string | number; label: string }[];
  render?: (value: any, row: any) => React.ReactNode;
  hideInForm?: boolean;
  required?: boolean;
  width?: string;
}
