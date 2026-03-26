import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { Client, Freelancer, FreelancerSkill, Project, Proposal, Contract, Milestone, Payment, Review, Dispute } from '@/types';
import * as api from '@/services/api';
import { toast } from 'sonner';

interface DataState {
  clients: Client[];
  freelancers: Freelancer[];
  skills: FreelancerSkill[];
  projects: Project[];
  proposals: Proposal[];
  contracts: Contract[];
  milestones: Milestone[];
  payments: Payment[];
  reviews: Review[];
  disputes: Dispute[];
  activeClientId: number | null;
  activeFreelancerId: number | null;
  setActiveClientId: (id: number | null) => void;
  setActiveFreelancerId: (id: number | null) => void;
  isApiConnected: boolean;
  isLoading: boolean;
  refreshData: () => Promise<void>;
  // Client CRUD
  addClient: (c: Omit<Client, 'clientId'>) => void;
  updateClient: (c: Client) => void;
  deleteClient: (id: number) => void;
  // Freelancer CRUD
  addFreelancer: (f: Omit<Freelancer, 'freelancerId'>) => void;
  updateFreelancer: (f: Freelancer) => void;
  deleteFreelancer: (id: number) => void;
  // Skills
  addSkill: (s: FreelancerSkill) => void;
  deleteSkill: (freelancerId: number, skill: string) => void;
  // Project CRUD
  addProject: (p: Omit<Project, 'projectId'>) => void;
  updateProject: (p: Project) => void;
  deleteProject: (id: number) => void;
  // Proposal CRUD
  addProposal: (p: Omit<Proposal, 'proposalId'>) => void;
  updateProposal: (p: Proposal) => void;
  deleteProposal: (id: number) => void;
  acceptProposal: (id: number) => void;
  rejectProposal: (id: number) => void;
  // Contract CRUD
  addContract: (c: Omit<Contract, 'contractId'>) => void;
  updateContract: (c: Contract) => void;
  deleteContract: (id: number) => void;
  // Milestone CRUD
  addMilestone: (m: Omit<Milestone, 'milestoneId'>) => void;
  updateMilestone: (m: Milestone) => void;
  deleteMilestone: (id: number) => void;
  // Payment CRUD
  addPayment: (p: Omit<Payment, 'paymentId'>) => void;
  updatePayment: (p: Payment) => void;
  deletePayment: (id: number) => void;
  markPaymentPaid: (id: number) => void;
  // Review CRUD
  addReview: (r: Omit<Review, 'reviewId'>) => void;
  updateReview: (r: Review) => void;
  deleteReview: (id: number) => void;
  // Dispute CRUD
  addDispute: (d: Omit<Dispute, 'disputeId'>) => void;
  updateDispute: (d: Dispute) => void;
  deleteDispute: (id: number) => void;
}

const DataContext = createContext<DataState | null>(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

const STORAGE_KEY = 'freelance_platform_data';

// Seed data matching Oracle DB inserts
const seedData = {
  clients: [
    { clientId: 1, clientName: 'ABC Technologies', email: 'abc@company.com', phone: '9876543210', createdDate: '2025-01-10' },
    { clientId: 2, clientName: 'Global Solutions', email: 'global@company.com', phone: '9123456780', createdDate: '2025-02-05' },
    { clientId: 3, clientName: 'Innovate Pvt Ltd', email: 'innovate@company.com', phone: '9988776655', createdDate: '2025-03-12' },
    { clientId: 4, clientName: 'TechNova Systems', email: 'technova@company.com', phone: '9090909090', createdDate: '2025-04-20' },
  ] as Client[],
  freelancers: [
    { freelancerId: 101, freelancerName: 'Rahul Sharma', email: 'rahul@email.com', phone: '9001112233', experienceYears: 5 },
    { freelancerId: 102, freelancerName: 'Priya Verma', email: 'priya@email.com', phone: '9011223344', experienceYears: 3 },
    { freelancerId: 103, freelancerName: 'Arjun Mehta', email: 'arjun@email.com', phone: '9022334455', experienceYears: 7 },
    { freelancerId: 104, freelancerName: 'Sneha Iyer', email: 'sneha@email.com', phone: '9033445566', experienceYears: 4 },
  ] as Freelancer[],
  skills: [
    { freelancerId: 101, skill: 'Python' },
    { freelancerId: 101, skill: 'SQL' },
    { freelancerId: 102, skill: 'UI/UX Design' },
    { freelancerId: 103, skill: 'Machine Learning' },
    { freelancerId: 104, skill: 'Database Management' },
  ] as FreelancerSkill[],
  projects: [
    { projectId: 201, clientId: 1, projectTitle: 'E-Commerce Website', description: 'Develop full online store', budget: 50000, deadline: '2025-06-30', status: 'Posted' },
    { projectId: 202, clientId: 2, projectTitle: 'Mobile App', description: 'Create Android application', budget: 40000, deadline: '2025-07-15', status: 'Active' },
    { projectId: 203, clientId: 3, projectTitle: 'AI Chatbot', description: 'Build AI chatbot', budget: 60000, deadline: '2025-08-20', status: 'Posted' },
    { projectId: 204, clientId: 4, projectTitle: 'Portfolio Website', description: 'Design portfolio site', budget: 20000, deadline: '2025-05-30', status: 'Completed' },
  ] as Project[],
  proposals: [
    { proposalId: 301, projectId: 201, freelancerId: 101, proposedAmount: 48000, proposedDuration: 60, proposalDate: '2025-02-01', status: 'Accepted' },
    { proposalId: 302, projectId: 202, freelancerId: 102, proposedAmount: 39000, proposedDuration: 45, proposalDate: '2025-02-10', status: 'Pending' },
    { proposalId: 303, projectId: 203, freelancerId: 103, proposedAmount: 58000, proposedDuration: 75, proposalDate: '2025-03-05', status: 'Accepted' },
    { proposalId: 304, projectId: 204, freelancerId: 104, proposedAmount: 19000, proposedDuration: 30, proposalDate: '2025-01-25', status: 'Rejected' },
  ] as Proposal[],
  contracts: [
    { contractId: 401, projectId: 201, freelancerId: 101, startDate: '2025-02-05', endDate: '2025-06-30', contractStatus: 'Active' },
    { contractId: 402, projectId: 202, freelancerId: 102, startDate: '2025-02-15', endDate: '2025-07-15', contractStatus: 'Active' },
    { contractId: 403, projectId: 203, freelancerId: 103, startDate: '2025-03-10', endDate: '2025-08-20', contractStatus: 'Active' },
    { contractId: 404, projectId: 204, freelancerId: 104, startDate: '2025-01-30', endDate: '2025-05-30', contractStatus: 'Completed' },
  ] as Contract[],
  milestones: [
    { milestoneId: 501, contractId: 401, title: 'Frontend Module', dueDate: '2025-03-30', amount: 20000, status: 'Completed' },
    { milestoneId: 502, contractId: 402, title: 'UI Design Phase', dueDate: '2025-04-20', amount: 15000, status: 'Pending' },
    { milestoneId: 503, contractId: 403, title: 'Model Development', dueDate: '2025-05-25', amount: 25000, status: 'In Progress' },
    { milestoneId: 504, contractId: 404, title: 'Testing Phase', dueDate: '2025-04-30', amount: 10000, status: 'Completed' },
  ] as Milestone[],
  payments: [
    { paymentId: 601, milestoneId: 501, paymentDate: '2025-04-01', amount: 20000, method: 'UPI', status: 'Paid' },
    { paymentId: 602, milestoneId: 502, paymentDate: '2025-04-20', amount: 15000, method: 'Net Banking', status: 'Pending' },
    { paymentId: 603, milestoneId: 503, paymentDate: '2025-06-01', amount: 25000, method: 'Credit Card', status: 'Processing' },
    { paymentId: 604, milestoneId: 504, paymentDate: '2025-05-02', amount: 10000, method: 'UPI', status: 'Paid' },
  ] as Payment[],
  reviews: [
    { reviewId: 701, projectId: 201, freelancerId: 101, rating: 5, comment: 'Excellent delivery', reviewDate: '2025-07-01' },
    { reviewId: 702, projectId: 202, freelancerId: 102, rating: 4, comment: 'Good design work', reviewDate: '2025-08-01' },
    { reviewId: 703, projectId: 203, freelancerId: 103, rating: 5, comment: 'Outstanding AI solution', reviewDate: '2025-09-01' },
    { reviewId: 704, projectId: 204, freelancerId: 104, rating: 3, comment: 'Work delayed', reviewDate: '2025-06-01' },
  ] as Review[],
  disputes: [
    { disputeId: 801, contractId: 401, reason: 'Delay in submission', disputeDate: '2025-03-20', status: 'Resolved', resolution: 'Deadline extended' },
    { disputeId: 802, contractId: 402, reason: 'Payment delay', disputeDate: '2025-04-28', status: 'Open', resolution: 'Under review' },
    { disputeId: 803, contractId: 403, reason: 'Scope mismatch', disputeDate: '2025-05-30', status: 'Resolved', resolution: 'Clarified' },
    { disputeId: 804, contractId: 404, reason: 'Quality issue', disputeDate: '2025-04-15', status: 'Closed', resolution: 'Rework done' },
  ] as Dispute[],
};

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return seedData;
}

let nextIds: Record<string, number> = {};
function getNextId(data: any[], key: string): number {
  if (!nextIds[key]) {
    nextIds[key] = data.length > 0 ? Math.max(...data.map((d: any) => d[key])) + 1 : 1;
  }
  return nextIds[key]++;
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState(loadData);
  const [activeClientId, setActiveClientId] = useState<number | null>(data.clients[0]?.clientId ?? null);
  const [activeFreelancerId, setActiveFreelancerId] = useState<number | null>(data.freelancers[0]?.freelancerId ?? null);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const initialLoad = useRef(true);

  // Check API on mount and load data from it if available
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const connected = await api.checkApiHealth();
      setIsApiConnected(connected);

      if (connected) {
        try {
          const allData = await api.fetchAllData();
          setData(allData);
          toast.success('Connected to Oracle Database');
        } catch (err) {
          console.error('Failed to load from API, using local data:', err);
          toast.error('Failed to load from database, using local data');
        }
      } else {
        toast.info('Backend not detected — using local data (changes saved to browser)');
      }
      setIsLoading(false);
      initialLoad.current = false;
    };
    init();
  }, []);

  // Persist to localStorage as fallback
  useEffect(() => {
    if (!initialLoad.current) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      nextIds = {};
    }
  }, [data]);

  const refreshData = useCallback(async () => {
    if (!isApiConnected) return;
    try {
      const allData = await api.fetchAllData();
      setData(allData);
    } catch (err) {
      console.error('Refresh failed:', err);
    }
  }, [isApiConnected]);

  const update = useCallback((key: string, updater: (prev: any[]) => any[]) => {
    setData((prev: any) => ({ ...prev, [key]: updater(prev[key]) }));
  }, []);

  // Helper: perform API call then refresh, or fallback to local update
  const apiOrLocal = useCallback(async (
    apiCall: () => Promise<any>,
    localFallback: () => void,
    successMsg?: string,
  ) => {
    if (isApiConnected) {
      try {
        await apiCall();
        await refreshData();
        if (successMsg) toast.success(successMsg);
      } catch (err: any) {
        toast.error(err.message || 'Operation failed');
        console.error(err);
      }
    } else {
      localFallback();
      if (successMsg) toast.success(successMsg + ' (local)');
    }
  }, [isApiConnected, refreshData]);

  // ─── Client CRUD ────────────────────────────────────────────────────
  const addClient = useCallback((c: Omit<Client, 'clientId'>) => {
    apiOrLocal(
      () => api.createRecord('clients', c),
      () => update('clients', prev => [...prev, { ...c, clientId: getNextId(prev, 'clientId') }]),
      'Client added',
    );
  }, [apiOrLocal, update]);

  const updateClient = useCallback((c: Client) => {
    apiOrLocal(
      () => api.updateRecord('clients', c.clientId, c),
      () => update('clients', prev => prev.map((x: Client) => x.clientId === c.clientId ? c : x)),
      'Client updated',
    );
  }, [apiOrLocal, update]);

  const deleteClient = useCallback((id: number) => {
    apiOrLocal(
      () => api.deleteRecord('clients', id),
      () => update('clients', prev => prev.filter((x: Client) => x.clientId !== id)),
      'Client deleted',
    );
  }, [apiOrLocal, update]);

  // ─── Freelancer CRUD ────────────────────────────────────────────────
  const addFreelancer = useCallback((f: Omit<Freelancer, 'freelancerId'>) => {
    apiOrLocal(
      () => api.createRecord('freelancers', f),
      () => update('freelancers', prev => [...prev, { ...f, freelancerId: getNextId(prev, 'freelancerId') }]),
      'Freelancer added',
    );
  }, [apiOrLocal, update]);

  const updateFreelancer = useCallback((f: Freelancer) => {
    apiOrLocal(
      () => api.updateRecord('freelancers', f.freelancerId, f),
      () => update('freelancers', prev => prev.map((x: Freelancer) => x.freelancerId === f.freelancerId ? f : x)),
      'Freelancer updated',
    );
  }, [apiOrLocal, update]);

  const deleteFreelancer = useCallback((id: number) => {
    apiOrLocal(
      () => api.deleteRecord('freelancers', id),
      () => update('freelancers', prev => prev.filter((x: Freelancer) => x.freelancerId !== id)),
      'Freelancer deleted',
    );
  }, [apiOrLocal, update]);

  // ─── Skills ─────────────────────────────────────────────────────────
  const addSkill = useCallback((s: FreelancerSkill) => {
    apiOrLocal(
      () => api.createRecord('skills', s),
      () => update('skills', prev => [...prev, s]),
      'Skill added',
    );
  }, [apiOrLocal, update]);

  const deleteSkillFn = useCallback((freelancerId: number, skill: string) => {
    apiOrLocal(
      () => api.deleteSkill(freelancerId, skill),
      () => update('skills', prev => prev.filter((x: FreelancerSkill) => !(x.freelancerId === freelancerId && x.skill === skill))),
      'Skill removed',
    );
  }, [apiOrLocal, update]);

  // ─── Project CRUD ───────────────────────────────────────────────────
  const addProject = useCallback((p: Omit<Project, 'projectId'>) => {
    apiOrLocal(
      () => api.createRecord('projects', p),
      () => update('projects', prev => [...prev, { ...p, projectId: getNextId(prev, 'projectId') }]),
      'Project added',
    );
  }, [apiOrLocal, update]);

  const updateProject = useCallback((p: Project) => {
    apiOrLocal(
      () => api.updateRecord('projects', p.projectId, p),
      () => update('projects', prev => prev.map((x: Project) => x.projectId === p.projectId ? p : x)),
      'Project updated',
    );
  }, [apiOrLocal, update]);

  const deleteProject = useCallback((id: number) => {
    apiOrLocal(
      () => api.deleteRecord('projects', id),
      () => update('projects', prev => prev.filter((x: Project) => x.projectId !== id)),
      'Project deleted',
    );
  }, [apiOrLocal, update]);

  // ─── Proposal CRUD ─────────────────────────────────────────────────
  const addProposal = useCallback((p: Omit<Proposal, 'proposalId'>) => {
    apiOrLocal(
      () => api.createRecord('proposals', p),
      () => update('proposals', prev => [...prev, { ...p, proposalId: getNextId(prev, 'proposalId') }]),
      'Proposal submitted',
    );
  }, [apiOrLocal, update]);

  const updateProposal = useCallback((p: Proposal) => {
    apiOrLocal(
      () => api.updateRecord('proposals', p.proposalId, p),
      () => update('proposals', prev => prev.map((x: Proposal) => x.proposalId === p.proposalId ? p : x)),
      'Proposal updated',
    );
  }, [apiOrLocal, update]);

  const deleteProposal = useCallback((id: number) => {
    apiOrLocal(
      () => api.deleteRecord('proposals', id),
      () => update('proposals', prev => prev.filter((x: Proposal) => x.proposalId !== id)),
      'Proposal deleted',
    );
  }, [apiOrLocal, update]);

  const acceptProposalFn = useCallback((id: number) => {
    apiOrLocal(
      () => api.acceptProposal(id),
      () => {
        setData((prev: any) => {
          const proposal = prev.proposals.find((p: Proposal) => p.proposalId === id);
          if (!proposal) return prev;
          const newContractId = prev.contracts.length > 0 ? Math.max(...prev.contracts.map((c: Contract) => c.contractId)) + 1 : 1;
          const today = new Date().toISOString().split('T')[0];
          return {
            ...prev,
            proposals: prev.proposals.map((p: Proposal) =>
              p.proposalId === id ? { ...p, status: 'Accepted' } :
              (p.projectId === proposal.projectId && p.status === 'Pending') ? { ...p, status: 'Rejected' } : p
            ),
            projects: prev.projects.map((p: Project) =>
              p.projectId === proposal.projectId ? { ...p, status: 'In Progress' } : p
            ),
            contracts: [...prev.contracts, {
              contractId: newContractId,
              projectId: proposal.projectId,
              freelancerId: proposal.freelancerId,
              startDate: today,
              // Calculate end date from proposal duration (days)
              endDate: new Date(Date.now() + (proposal.proposedDuration || 0) * 86400000).toISOString().split('T')[0],
              contractStatus: 'Active',
            }],
          };
        });
      },
      'Proposal accepted — contract created',
    );
  }, [apiOrLocal]);

  const rejectProposalFn = useCallback((id: number) => {
    apiOrLocal(
      () => api.rejectProposal(id),
      () => update('proposals', prev => prev.map((x: Proposal) => x.proposalId === id ? { ...x, status: 'Rejected' } : x)),
      'Proposal rejected',
    );
  }, [apiOrLocal, update]);

  // ─── Contract CRUD ──────────────────────────────────────────────────
  const addContract = useCallback((c: Omit<Contract, 'contractId'>) => {
    apiOrLocal(
      () => api.createRecord('contracts', c),
      () => update('contracts', prev => [...prev, { ...c, contractId: getNextId(prev, 'contractId') }]),
      'Contract added',
    );
  }, [apiOrLocal, update]);

  const updateContract = useCallback((c: Contract) => {
    apiOrLocal(
      () => api.updateRecord('contracts', c.contractId, c),
      () => update('contracts', prev => prev.map((x: Contract) => x.contractId === c.contractId ? c : x)),
      'Contract updated',
    );
  }, [apiOrLocal, update]);

  const deleteContract = useCallback((id: number) => {
    apiOrLocal(
      () => api.deleteRecord('contracts', id),
      () => update('contracts', prev => prev.filter((x: Contract) => x.contractId !== id)),
      'Contract deleted',
    );
  }, [apiOrLocal, update]);

  // ─── Milestone CRUD ─────────────────────────────────────────────────
  const addMilestone = useCallback((m: Omit<Milestone, 'milestoneId'>) => {
    apiOrLocal(
      () => api.createRecord('milestones', m),
      () => update('milestones', prev => [...prev, { ...m, milestoneId: getNextId(prev, 'milestoneId') }]),
      'Milestone added',
    );
  }, [apiOrLocal, update]);

  const updateMilestone = useCallback((m: Milestone) => {
    apiOrLocal(
      () => api.updateRecord('milestones', m.milestoneId, m),
      () => update('milestones', prev => prev.map((x: Milestone) => x.milestoneId === m.milestoneId ? m : x)),
      'Milestone updated',
    );
  }, [apiOrLocal, update]);

  const deleteMilestone = useCallback((id: number) => {
    apiOrLocal(
      () => api.deleteRecord('milestones', id),
      () => update('milestones', prev => prev.filter((x: Milestone) => x.milestoneId !== id)),
      'Milestone deleted',
    );
  }, [apiOrLocal, update]);

  // ─── Payment CRUD ───────────────────────────────────────────────────
  const addPayment = useCallback((p: Omit<Payment, 'paymentId'>) => {
    apiOrLocal(
      () => api.createRecord('payments', p),
      () => update('payments', prev => [...prev, { ...p, paymentId: getNextId(prev, 'paymentId') }]),
      'Payment added',
    );
  }, [apiOrLocal, update]);

  const updatePayment = useCallback((p: Payment) => {
    apiOrLocal(
      () => api.updateRecord('payments', p.paymentId, p),
      () => update('payments', prev => prev.map((x: Payment) => x.paymentId === p.paymentId ? p : x)),
      'Payment updated',
    );
  }, [apiOrLocal, update]);

  const deletePayment = useCallback((id: number) => {
    apiOrLocal(
      () => api.deleteRecord('payments', id),
      () => update('payments', prev => prev.filter((x: Payment) => x.paymentId !== id)),
      'Payment deleted',
    );
  }, [apiOrLocal, update]);

  const markPaymentPaidFn = useCallback((id: number) => {
    apiOrLocal(
      () => api.markPaymentPaid(id),
      () => update('payments', prev => prev.map((x: Payment) => x.paymentId === id ? { ...x, status: 'Paid', paymentDate: new Date().toISOString().split('T')[0] } : x)),
      'Payment marked as paid',
    );
  }, [apiOrLocal, update]);

  // ─── Review CRUD ────────────────────────────────────────────────────
  const addReview = useCallback((r: Omit<Review, 'reviewId'>) => {
    apiOrLocal(
      () => api.createRecord('reviews', r),
      () => update('reviews', prev => [...prev, { ...r, reviewId: getNextId(prev, 'reviewId') }]),
      'Review added',
    );
  }, [apiOrLocal, update]);

  const updateReview = useCallback((r: Review) => {
    apiOrLocal(
      () => api.updateRecord('reviews', r.reviewId, r),
      () => update('reviews', prev => prev.map((x: Review) => x.reviewId === r.reviewId ? r : x)),
      'Review updated',
    );
  }, [apiOrLocal, update]);

  const deleteReview = useCallback((id: number) => {
    apiOrLocal(
      () => api.deleteRecord('reviews', id),
      () => update('reviews', prev => prev.filter((x: Review) => x.reviewId !== id)),
      'Review deleted',
    );
  }, [apiOrLocal, update]);

  // ─── Dispute CRUD ───────────────────────────────────────────────────
  const addDispute = useCallback((d: Omit<Dispute, 'disputeId'>) => {
    apiOrLocal(
      () => api.createRecord('disputes', d),
      () => update('disputes', prev => [...prev, { ...d, disputeId: getNextId(prev, 'disputeId') }]),
      'Dispute raised',
    );
  }, [apiOrLocal, update]);

  const updateDispute = useCallback((d: Dispute) => {
    apiOrLocal(
      () => api.updateRecord('disputes', d.disputeId, d),
      () => update('disputes', prev => prev.map((x: Dispute) => x.disputeId === d.disputeId ? d : x)),
      'Dispute updated',
    );
  }, [apiOrLocal, update]);

  const deleteDispute = useCallback((id: number) => {
    apiOrLocal(
      () => api.deleteRecord('disputes', id),
      () => update('disputes', prev => prev.filter((x: Dispute) => x.disputeId !== id)),
      'Dispute deleted',
    );
  }, [apiOrLocal, update]);

  return (
    <DataContext.Provider value={{
      ...data, activeClientId, activeFreelancerId, setActiveClientId, setActiveFreelancerId,
      isApiConnected, isLoading, refreshData,
      addClient, updateClient, deleteClient,
      addFreelancer, updateFreelancer, deleteFreelancer,
      addSkill, deleteSkill: deleteSkillFn,
      addProject, updateProject, deleteProject,
      addProposal, updateProposal, deleteProposal, acceptProposal: acceptProposalFn, rejectProposal: rejectProposalFn,
      addContract, updateContract, deleteContract,
      addMilestone, updateMilestone, deleteMilestone,
      addPayment, updatePayment, deletePayment, markPaymentPaid: markPaymentPaidFn,
      addReview, updateReview, deleteReview,
      addDispute, updateDispute, deleteDispute,
    }}>
      {children}
    </DataContext.Provider>
  );
};