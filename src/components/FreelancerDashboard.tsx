import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import GenericTable from '@/components/GenericTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send, Star, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { ColumnDef } from '@/types';

const FreelancerDashboard: React.FC = () => {
  const data = useData();
  const [activeTab, setActiveTab] = useState('profile');
  const [proposalDialog, setProposalDialog] = useState<number | null>(null);
  const [proposalForm, setProposalForm] = useState({ proposedAmount: '', proposedDuration: '' });

  const clientOptions = data.clients.map(c => ({ value: c.clientId, label: c.clientName }));
  const freelancerOptions = data.freelancers.map(f => ({ value: f.freelancerId, label: f.freelancerName }));

  // ── Derived sets ──────────────────────────────────────────────────────────

  // Only Open/Posted projects can receive proposals
  const openProjects = data.projects.filter(p => ['Open', 'Posted'].includes(p.status));

  // Projects this freelancer already proposed on (any status)
  const alreadyProposedProjectIds = new Set(
    data.proposals
      .filter(p => p.freelancerId === data.activeFreelancerId)
      .map(p => p.projectId)
  );

  // This freelancer's contracts
  const myContracts = data.activeFreelancerId
    ? data.contracts.filter(c => c.freelancerId === data.activeFreelancerId)
    : data.contracts;
  const myContractIds = myContracts.map(c => c.contractId);
  const activeMyContracts = myContracts.filter(c => c.contractStatus === 'Active');

  // Milestones under this freelancer's contracts
  const myMilestones = data.milestones.filter(m => myContractIds.includes(m.contractId));
  const myMilestoneIds = myMilestones.map(m => m.milestoneId);

  // Completed milestones not yet paid
  const paidMilestoneIds = new Set(data.payments.map(p => p.milestoneId));
  const unpaidCompletedMilestones = myMilestones.filter(
    m => m.status === 'Completed' && !paidMilestoneIds.has(m.milestoneId)
  );

  const mySkills = data.activeFreelancerId
    ? data.skills.filter(s => s.freelancerId === data.activeFreelancerId)
    : data.skills;
  const myProposals = data.activeFreelancerId
    ? data.proposals.filter(p => p.freelancerId === data.activeFreelancerId)
    : data.proposals;
  const myPayments = data.payments.filter(p => myMilestoneIds.includes(p.milestoneId));
  const myReviews = data.activeFreelancerId
    ? data.reviews.filter(r => r.freelancerId === data.activeFreelancerId)
    : data.reviews;
  const myDisputes = data.disputes.filter(d => myContractIds.includes(d.contractId));

  // ── Budget warnings per contract ─────────────────────────────────────────
  // For each active contract, sum milestone amounts and compare to project budget
  const contractBudgetWarnings: Record<number, string> = {};
  activeMyContracts.forEach(contract => {
    const project = data.projects.find(p => p.projectId === contract.projectId);
    if (!project) return;
    const contractMilestones = data.milestones.filter(m => m.contractId === contract.contractId);
    const totalMilestoneAmount = contractMilestones.reduce((sum, m) => sum + (m.amount || 0), 0);
    if (totalMilestoneAmount > project.budget) {
      contractBudgetWarnings[contract.contractId] =
        `Total milestone amounts (₹${totalMilestoneAmount.toLocaleString()}) exceed project budget (₹${project.budget.toLocaleString()})`;
    }
  });

  // Overall warning message for the milestone tab
  const milestoneOverBudgetWarning = Object.values(contractBudgetWarnings)[0] ?? null;

  // ── Column definitions ────────────────────────────────────────────────────

  const freelancerCols: ColumnDef[] = [
    { key: 'freelancerId', label: 'ID', type: 'number', hideInForm: true },
    { key: 'freelancerName', label: 'Name', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'text', required: true },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'experienceYears', label: 'Experience (yrs)', type: 'number' },
  ];

  const skillCols: ColumnDef[] = [
    { key: 'freelancerId', label: 'Freelancer', type: 'select', options: freelancerOptions,
      render: (val) => data.freelancers.find(f => f.freelancerId === Number(val))?.freelancerName ?? val },
    { key: 'skill', label: 'Skill', type: 'text', required: true },
  ];

  const projectCols: ColumnDef[] = [
    { key: 'projectId', label: 'ID', type: 'number', hideInForm: true },
    { key: 'clientId', label: 'Client', type: 'select', options: clientOptions,
      render: (val) => data.clients.find(c => c.clientId === Number(val))?.clientName ?? val },
    { key: 'projectTitle', label: 'Title', type: 'text' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'budget', label: 'Budget (₹)', type: 'number' },
    { key: 'deadline', label: 'Deadline', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'Posted', label: 'Posted' }, { value: 'Open', label: 'Open' },
      { value: 'In Progress', label: 'In Progress' }, { value: 'Completed', label: 'Completed' },
    ]},
  ];

  // Proposals: status hidden from form, always Pending on create
  const proposalCols: ColumnDef[] = [
    { key: 'proposalId', label: 'ID', type: 'number', hideInForm: true },
    { key: 'projectId', label: 'Project', type: 'select',
      options: openProjects.map(p => ({ value: p.projectId, label: p.projectTitle })),
      render: (val) => data.projects.find(p => p.projectId === Number(val))?.projectTitle ?? val },
    { key: 'freelancerId', label: 'Freelancer', type: 'select', options: freelancerOptions,
      render: (val) => data.freelancers.find(f => f.freelancerId === Number(val))?.freelancerName ?? val },
    { key: 'proposedAmount', label: 'Amount (₹)', type: 'number' },
    { key: 'proposedDuration', label: 'Duration (days)', type: 'number' },
    { key: 'proposalDate', label: 'Date', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', hideInForm: true, options: [
      { value: 'Pending', label: 'Pending' }, { value: 'Accepted', label: 'Accepted' }, { value: 'Rejected', label: 'Rejected' },
    ]},
  ];

  const contractCols: ColumnDef[] = [
    { key: 'contractId', label: 'ID', type: 'number', hideInForm: true },
    { key: 'projectId', label: 'Project', type: 'select', options: data.projects.map(p => ({ value: p.projectId, label: p.projectTitle })),
      render: (val) => data.projects.find(p => p.projectId === Number(val))?.projectTitle ?? val },
    { key: 'freelancerId', label: 'Freelancer', type: 'select', options: freelancerOptions,
      render: (val) => data.freelancers.find(f => f.freelancerId === Number(val))?.freelancerName ?? val },
    { key: 'startDate', label: 'Start', type: 'date' },
    { key: 'endDate', label: 'End', type: 'date' },
    { key: 'contractStatus', label: 'Status', type: 'select', options: [
      { value: 'Active', label: 'Active' }, { value: 'Completed', label: 'Completed' }, { value: 'Terminated', label: 'Terminated' },
    ]},
  ];

  // Milestones: active contracts only, with project name label
  const milestoneCols: ColumnDef[] = [
    { key: 'milestoneId', label: 'ID', type: 'number', hideInForm: true },
    { key: 'contractId', label: 'Contract', type: 'select',
      options: activeMyContracts.map(c => {
        const proj = data.projects.find(p => p.projectId === c.projectId);
        const totalSoFar = data.milestones
          .filter(m => m.contractId === c.contractId)
          .reduce((s, m) => s + (m.amount || 0), 0);
        const budget = proj?.budget ?? 0;
        const over = totalSoFar > budget;
        return {
          value: c.contractId,
          label: `#${c.contractId} — ${proj?.projectTitle ?? ''} (Budget: ₹${budget.toLocaleString()}${over ? ' ⚠ OVER' : ''})`,
        };
      }),
      render: (val) => {
        const c = data.contracts.find(x => x.contractId === Number(val));
        const proj = c ? data.projects.find(p => p.projectId === c.projectId) : null;
        return proj ? `#${val} — ${proj.projectTitle}` : `Contract #${val}`;
      }},
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'amount', label: 'Amount (₹)', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'Pending', label: 'Pending' }, { value: 'In Progress', label: 'In Progress' },
      { value: 'Completed', label: 'Completed' },
    ]},
  ];

  const paymentCols: ColumnDef[] = [
    { key: 'paymentId', label: 'ID', type: 'number', hideInForm: true },
    { key: 'milestoneId', label: 'Milestone', type: 'select',
      options: data.milestones.map(m => ({ value: m.milestoneId, label: m.title })),
      render: (val) => data.milestones.find(m => m.milestoneId === Number(val))?.title ?? val },
    { key: 'paymentDate', label: 'Date', type: 'date' },
    { key: 'amount', label: 'Amount (₹)', type: 'number' },
    { key: 'method', label: 'Method', type: 'select', options: [
      { value: 'Bank Transfer', label: 'Bank Transfer' }, { value: 'Net Banking', label: 'Net Banking' },
      { value: 'PayPal', label: 'PayPal' }, { value: 'Credit Card', label: 'Credit Card' }, { value: 'UPI', label: 'UPI' },
    ]},
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'Pending', label: 'Pending' }, { value: 'Processing', label: 'Processing' },
      { value: 'Paid', label: 'Paid' }, { value: 'Completed', label: 'Completed' },
    ]},
  ];

  const reviewCols: ColumnDef[] = [
    { key: 'reviewId', label: 'ID', type: 'number', hideInForm: true },
    { key: 'projectId', label: 'Project', type: 'select',
      options: data.projects.map(p => ({ value: p.projectId, label: p.projectTitle })),
      render: (val) => data.projects.find(p => p.projectId === Number(val))?.projectTitle ?? val },
    { key: 'freelancerId', label: 'Freelancer', type: 'select', options: freelancerOptions,
      render: (val) => data.freelancers.find(f => f.freelancerId === Number(val))?.freelancerName ?? val },
    { key: 'rating', label: 'Rating', type: 'number',
      render: (val) => (
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`h-4 w-4 ${i < Number(val) ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
          ))}
        </div>
      )},
    { key: 'comment', label: 'Comment', type: 'textarea' },
    { key: 'reviewDate', label: 'Date', type: 'date' },
  ];

  const disputeCols: ColumnDef[] = [
    { key: 'disputeId', label: 'ID', type: 'number', hideInForm: true },
    { key: 'contractId', label: 'Contract', type: 'select',
      options: activeMyContracts.map(c => {
        const proj = data.projects.find(p => p.projectId === c.projectId);
        return { value: c.contractId, label: `#${c.contractId} — ${proj?.projectTitle ?? ''}` };
      }),
      render: (val) => {
        const c = data.contracts.find(x => x.contractId === Number(val));
        const proj = c ? data.projects.find(p => p.projectId === c.projectId) : null;
        return proj ? `#${val} — ${proj.projectTitle}` : `Contract #${val}`;
      }},
    { key: 'reason', label: 'Reason', type: 'textarea' },
    { key: 'disputeDate', label: 'Date', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'Open', label: 'Open' }, { value: 'Resolved', label: 'Resolved' },
      { value: 'Escalated', label: 'Escalated' }, { value: 'Closed', label: 'Closed' },
    ]},
    { key: 'resolution', label: 'Resolution', type: 'textarea' },
  ];

  // ── Proposal submit with budget validation ────────────────────────────────
  const selectedProject = data.projects.find(p => p.projectId === proposalDialog);
  const proposalOverBudget =
    selectedProject && proposalForm.proposedAmount
      ? Number(proposalForm.proposedAmount) > selectedProject.budget
      : false;

  const handleSubmitProposal = () => {
    if (proposalDialog === null || !data.activeFreelancerId) return;
    if (Number(proposalForm.proposedDuration) <= 0) {
      toast.error('Duration must be at least 1 day');
      return;
    }
    if (Number(proposalForm.proposedAmount) <= 0) {
      toast.error('Proposed amount must be greater than 0');
      return;
    }
    data.addProposal({
      projectId: proposalDialog,
      freelancerId: data.activeFreelancerId,
      proposedAmount: Number(proposalForm.proposedAmount),
      proposedDuration: Number(proposalForm.proposedDuration),
      proposalDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
    });
    setProposalDialog(null);
    setProposalForm({ proposedAmount: '', proposedDuration: '' });
  };

  // ── Milestone add with budget + due date validation ───────────────────────
  const handleAddMilestone = (m: any) => {
    // Due date must be within contract dates
    const contract = data.contracts.find(c => c.contractId === Number(m.contractId));
    if (contract && m.dueDate) {
      if (contract.endDate && m.dueDate > contract.endDate.split(' ')[0]) {
        toast.error(`Due date (${m.dueDate}) is after the contract end date (${contract.endDate.split(' ')[0]})`);
        return;
      }
      if (contract.startDate && m.dueDate < contract.startDate.split(' ')[0]) {
        toast.error(`Due date cannot be before the contract start date`);
        return;
      }
    }
    // Budget warning (allow but warn)
    if (contract) {
      const project = data.projects.find(p => p.projectId === contract.projectId);
      if (project) {
        const existingTotal = data.milestones
          .filter(ms => ms.contractId === contract.contractId)
          .reduce((s, ms) => s + (ms.amount || 0), 0);
        const newTotal = existingTotal + Number(m.amount || 0);
        if (newTotal > project.budget) {
          toast.warning(
            `Total milestones (₹${newTotal.toLocaleString()}) will exceed project budget (₹${project.budget.toLocaleString()}). Milestone added anyway.`
          );
        }
      }
    }
    data.addMilestone(m);
  };

  const tabs = [
    { value: 'profile', label: 'Freelancers' },
    { value: 'skills', label: 'Skills' },
    { value: 'browse', label: 'Browse Projects' },
    { value: 'proposals', label: 'My Proposals' },
    { value: 'contracts', label: 'Contracts' },
    { value: 'milestones', label: 'Milestones' },
    { value: 'payments', label: 'Payments' },
    { value: 'reviews', label: 'Reviews' },
    { value: 'disputes', label: 'Disputes' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Freelancer Portal</h2>
          <p className="text-muted-foreground mt-1">Browse projects, manage proposals, and track work</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Acting as:</label>
          <select
            value={data.activeFreelancerId ?? ''}
            onChange={e => data.setActiveFreelancerId(Number(e.target.value) || null)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Freelancers</option>
            {data.freelancers.map(f => (
              <option key={f.freelancerId} value={f.freelancerId}>{f.freelancerName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Contracts', value: myContracts.filter(c => c.contractStatus === 'Active').length, color: 'bg-primary/10 text-primary' },
          { label: 'Open Projects', value: openProjects.length, color: 'bg-accent text-accent-foreground' },
          { label: 'Pending Proposals', value: myProposals.filter(p => p.status === 'Pending').length, color: 'bg-secondary text-secondary-foreground' },
          { label: 'Total Earned', value: `₹${myPayments.filter(p => p.status === 'Paid' || p.status === 'Completed').reduce((s, p) => s + p.amount, 0).toLocaleString()}`, color: 'bg-muted text-muted-foreground' },
        ].map(stat => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl p-4 ${stat.color}`}>
            <p className="text-sm font-medium opacity-80">{stat.label}</p>
            <p className="text-2xl font-display font-bold mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 p-1 rounded-xl flex-wrap h-auto gap-1">
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              {tab.label}
              {tab.value === 'proposals' && myProposals.filter(p => p.status === 'Pending').length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">{myProposals.filter(p => p.status === 'Pending').length}</Badge>
              )}
              {tab.value === 'milestones' && milestoneOverBudgetWarning && (
                <AlertTriangle className="ml-1 h-3.5 w-3.5 text-amber-500" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="mt-6">

            <TabsContent value="profile" className="mt-0">
              <GenericTable title="Freelancers" columns={freelancerCols} data={data.freelancers} idKey="freelancerId"
                onAdd={f => data.addFreelancer(f)} onUpdate={f => data.updateFreelancer(f)} onDelete={id => data.deleteFreelancer(id)} />
            </TabsContent>

            <TabsContent value="skills" className="mt-0">
              <GenericTable title="Skills" columns={skillCols} data={mySkills} idKey="skill"
                onAdd={s => data.addSkill({ ...s, freelancerId: data.activeFreelancerId || Number(s.freelancerId) })}
                onDelete={(skill) => {
                  const row = mySkills.find(s => s.skill === skill);
                  if (row) data.deleteSkill(row.freelancerId, row.skill);
                }}
                defaultValues={{ freelancerId: data.activeFreelancerId }} />
            </TabsContent>

            <TabsContent value="browse" className="mt-0">
              <GenericTable title="Available Projects" columns={projectCols} data={openProjects} idKey="projectId"
                readOnly
                customActions={row => {
                  const alreadyProposed = alreadyProposedProjectIds.has(row.projectId);
                  return (
                    <Button size="sm" className="h-7 gap-1 text-xs"
                      onClick={() => { setProposalForm({ proposedAmount: '', proposedDuration: '' }); setProposalDialog(row.projectId); }}
                      disabled={!data.activeFreelancerId || alreadyProposed}
                      title={alreadyProposed ? 'You already proposed on this project' : undefined}
                    >
                      <Send className="h-3 w-3" />
                      {alreadyProposed ? 'Proposed' : 'Propose'}
                    </Button>
                  );
                }}
              />
            </TabsContent>

            <TabsContent value="proposals" className="mt-0">
              <GenericTable title="My Proposals" columns={proposalCols} data={myProposals} idKey="proposalId"
                onAdd={p => data.addProposal({ ...p, freelancerId: data.activeFreelancerId || Number(p.freelancerId), status: 'Pending' })}
                onDelete={id => data.deleteProposal(id)}
                defaultValues={{ freelancerId: data.activeFreelancerId, status: 'Pending', proposalDate: new Date().toISOString().split('T')[0] }}
              />
              <p className="text-xs text-muted-foreground mt-2 px-1">Proposals are submitted as Pending. Clients accept or reject them.</p>
            </TabsContent>

            <TabsContent value="contracts" className="mt-0">
              {/* Contracts are auto-created on proposal accept — read-only */}
              <GenericTable title="My Contracts" columns={contractCols} data={myContracts} idKey="contractId" readOnly />
            </TabsContent>

            <TabsContent value="milestones" className="mt-0">
              {/* Budget over-limit warning banner */}
              {milestoneOverBudgetWarning && (
                <div className="flex items-start gap-2 mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{milestoneOverBudgetWarning}</span>
                </div>
              )}
              <GenericTable title="Milestones" columns={milestoneCols} data={myMilestones} idKey="milestoneId"
                onAdd={handleAddMilestone}
                onUpdate={m => data.updateMilestone(m)}
                onDelete={id => data.deleteMilestone(id)}
                readOnly={activeMyContracts.length === 0}
              />
              {activeMyContracts.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2 px-1">Milestones can only be added to Active contracts.</p>
              )}
            </TabsContent>

            <TabsContent value="payments" className="mt-0">
              <GenericTable title="My Payments" columns={paymentCols} data={myPayments} idKey="paymentId" readOnly />
              <p className="text-xs text-muted-foreground mt-2 px-1">Payments are processed by clients. You can track status here.</p>
            </TabsContent>

            <TabsContent value="reviews" className="mt-0">
              <GenericTable title="My Reviews" columns={reviewCols} data={myReviews} idKey="reviewId" readOnly />
            </TabsContent>

            <TabsContent value="disputes" className="mt-0">
              <GenericTable title="Disputes" columns={disputeCols} data={myDisputes} idKey="disputeId"
                onAdd={d => data.addDispute(d)}
                onUpdate={d => data.updateDispute(d)}
                onDelete={id => data.deleteDispute(id)}
                defaultValues={{ disputeDate: new Date().toISOString().split('T')[0], status: 'Open' }}
                readOnly={activeMyContracts.length === 0}
              />
              {activeMyContracts.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2 px-1">Disputes can only be raised on Active contracts.</p>
              )}
            </TabsContent>

          </motion.div>
        </AnimatePresence>
      </Tabs>

      {/* Submit Proposal Dialog */}
      <Dialog open={proposalDialog !== null} onOpenChange={() => setProposalDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              Submit Proposal — {selectedProject?.projectTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedProject && (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                Project budget: <span className="font-semibold text-foreground">₹{selectedProject.budget.toLocaleString()}</span>
                &nbsp;·&nbsp; Deadline: <span className="font-semibold text-foreground">{selectedProject.deadline?.split(' ')[0]}</span>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Proposed Amount (₹)</Label>
              <Input
                type="number" min={1}
                value={proposalForm.proposedAmount}
                onChange={e => setProposalForm(f => ({ ...f, proposedAmount: e.target.value }))}
                placeholder={`e.g. ${selectedProject?.budget ?? ''}`}
                className={proposalOverBudget ? 'border-amber-400 focus-visible:ring-amber-400' : ''}
              />
              {proposalOverBudget && (
                <p className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  Your amount exceeds the project budget of ₹{selectedProject?.budget.toLocaleString()}. You can still submit.
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Duration (days)</Label>
              <Input
                type="number" min={1}
                value={proposalForm.proposedDuration}
                onChange={e => setProposalForm(f => ({ ...f, proposedDuration: e.target.value }))}
                placeholder="e.g. 30"
              />
              {proposalForm.proposedDuration && Number(proposalForm.proposedDuration) > 0 && selectedProject?.deadline && (
                <p className="text-xs text-muted-foreground">
                  Estimated completion: {new Date(Date.now() + Number(proposalForm.proposedDuration) * 86400000).toISOString().split('T')[0]}
                  {new Date(Date.now() + Number(proposalForm.proposedDuration) * 86400000).toISOString().split('T')[0] > selectedProject.deadline.split(' ')[0]
                    ? <span className="text-amber-600 ml-1">⚠ After project deadline</span>
                    : <span className="text-green-600 ml-1">✓ Within deadline</span>
                  }
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProposalDialog(null)}>Cancel</Button>
            <Button
              onClick={handleSubmitProposal}
              disabled={!proposalForm.proposedAmount || !proposalForm.proposedDuration || Number(proposalForm.proposedDuration) <= 0}
            >
              Submit Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FreelancerDashboard;