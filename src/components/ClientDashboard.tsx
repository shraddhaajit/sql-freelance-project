import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import GenericTable from '@/components/GenericTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, CreditCard, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ColumnDef } from '@/types';

const ClientDashboard: React.FC = () => {
  const data = useData();
  const [activeTab, setActiveTab] = useState('profile');

  const clientOptions = data.clients.map(c => ({ value: c.clientId, label: c.clientName }));
  const freelancerOptions = data.freelancers.map(f => ({ value: f.freelancerId, label: f.freelancerName }));

  // ── Filtered data for active client ──────────────────────────────────────
  const myProjects = data.activeClientId
    ? data.projects.filter(p => p.clientId === data.activeClientId)
    : data.projects;
  const myProjectIds = myProjects.map(p => p.projectId);
  const myProposals = data.proposals.filter(p => myProjectIds.includes(p.projectId));
  const myContracts = data.contracts.filter(c => myProjectIds.includes(c.projectId));
  const myContractIds = myContracts.map(c => c.contractId);
  const myMilestones = data.milestones.filter(m => myContractIds.includes(m.contractId));
  const myMilestoneIds = myMilestones.map(m => m.milestoneId);
  const myPayments = data.payments.filter(p => myMilestoneIds.includes(p.milestoneId));
  const myReviews = data.reviews.filter(r => myProjectIds.includes(r.projectId));
  const myDisputes = data.disputes.filter(d => myContractIds.includes(d.contractId));

  // ── Workflow-constrained derived sets ──────────────────────────────────────

  // Projects that already have an accepted proposal cannot receive new proposals
  const acceptedProjectIds = new Set(data.proposals.filter(p => p.status === 'Accepted').map(p => p.projectId));
  const proposableProjects = myProjects.filter(
    p => ['Open', 'Posted'].includes(p.status) && !acceptedProjectIds.has(p.projectId)
  );

  // Completed milestones under this client's contracts only
  const completedMilestones = myMilestones.filter(m => m.status === 'Completed');

  // Only completed projects from this client's scope
  const completedProjects = myProjects.filter(p => p.status === 'Completed');

  // Active contracts scoped to this client
  const activeContracts = myContracts.filter(c => c.contractStatus === 'Active');

  // For reviews: build a map of projectId → freelancer who has an accepted contract on it
  // so the freelancer dropdown only shows the person who actually did the work
  const projectFreelancerMap: Record<number, number[]> = {};
  data.contracts.forEach(c => {
    if (!projectFreelancerMap[c.projectId]) projectFreelancerMap[c.projectId] = [];
    projectFreelancerMap[c.projectId].push(c.freelancerId);
  });

  // ── Column definitions ────────────────────────────────────────────────────

  const clientCols: ColumnDef[] = [
    { key: 'clientId', label: 'ID', type: 'number', hideInForm: true },
    { key: 'clientName', label: 'Name', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'text', required: true },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'createdDate', label: 'Created', type: 'date' },
  ];

  const projectCols: ColumnDef[] = [
    { key: 'projectId', label: 'ID', type: 'number', hideInForm: true },
    { key: 'clientId', label: 'Client', type: 'select', options: clientOptions,
      render: (val) => data.clients.find(c => c.clientId === Number(val))?.clientName ?? val },
    { key: 'projectTitle', label: 'Title', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'budget', label: 'Budget ($)', type: 'number' },
    { key: 'deadline', label: 'Deadline', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'Posted', label: 'Posted' }, { value: 'Open', label: 'Open' }, { value: 'Active', label: 'Active' },
      { value: 'In Progress', label: 'In Progress' }, { value: 'Completed', label: 'Completed' }, { value: 'Cancelled', label: 'Cancelled' },
    ]},
  ];

  // Proposal form: only projects that are open and have no accepted proposal yet
  const proposalCols: ColumnDef[] = [
    { key: 'proposalId', label: 'ID', type: 'number', hideInForm: true },
    { key: 'projectId', label: 'Project', type: 'select',
      options: proposableProjects.map(p => ({ value: p.projectId, label: p.projectTitle })),
      render: (val) => data.projects.find(p => p.projectId === Number(val))?.projectTitle ?? val },
    { key: 'freelancerId', label: 'Freelancer', type: 'select', options: freelancerOptions,
      render: (val) => data.freelancers.find(f => f.freelancerId === Number(val))?.freelancerName ?? val },
    { key: 'proposedAmount', label: 'Amount ($)', type: 'number' },
    { key: 'proposedDuration', label: 'Duration (days)', type: 'number' },
    { key: 'proposalDate', label: 'Date', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'Pending', label: 'Pending' }, { value: 'Accepted', label: 'Accepted' }, { value: 'Rejected', label: 'Rejected' },
    ]},
  ];

  const contractCols: ColumnDef[] = [
    { key: 'contractId', label: 'ID', type: 'number', hideInForm: true },
    { key: 'projectId', label: 'Project', type: 'select', options: myProjects.map(p => ({ value: p.projectId, label: p.projectTitle })),
      render: (val) => data.projects.find(p => p.projectId === Number(val))?.projectTitle ?? val },
    { key: 'freelancerId', label: 'Freelancer', type: 'select', options: freelancerOptions,
      render: (val) => data.freelancers.find(f => f.freelancerId === Number(val))?.freelancerName ?? val },
    { key: 'startDate', label: 'Start', type: 'date' },
    { key: 'endDate', label: 'End', type: 'date' },
    { key: 'contractStatus', label: 'Status', type: 'select', options: [
      { value: 'Active', label: 'Active' }, { value: 'Completed', label: 'Completed' }, { value: 'Terminated', label: 'Terminated' },
    ]},
  ];

  // Payment form: only Completed milestones (can't pay for unfinished work)
  const paymentCols: ColumnDef[] = [
    { key: 'paymentId', label: 'ID', type: 'number', hideInForm: true },
    { key: 'milestoneId', label: 'Milestone', type: 'select',
      options: completedMilestones.map(m => ({ value: m.milestoneId, label: m.title })),
      render: (val) => data.milestones.find(m => m.milestoneId === Number(val))?.title ?? val },
    { key: 'paymentDate', label: 'Date', type: 'date' },
    { key: 'amount', label: 'Amount ($)', type: 'number' },
    { key: 'method', label: 'Method', type: 'select', options: [
      { value: 'Bank Transfer', label: 'Bank Transfer' }, { value: 'Net Banking', label: 'Net Banking' },
      { value: 'PayPal', label: 'PayPal' }, { value: 'Credit Card', label: 'Credit Card' }, { value: 'UPI', label: 'UPI' },
    ]},
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'Pending', label: 'Pending' }, { value: 'Processing', label: 'Processing' },
      { value: 'Paid', label: 'Paid' }, { value: 'Completed', label: 'Completed' },
    ]},
  ];

  // Review form: Completed projects only; freelancer dropdown filtered to who actually worked on it.
  // We use a dynamic column approach — the freelancer options are built per selected project.
  // Since GenericTable uses static column defs, we pre-build options for all completed projects
  // by pooling only the freelancers who have contracts on those projects.
  const reviewableFreelancerIds = new Set(
    completedProjects.flatMap(p => projectFreelancerMap[p.projectId] ?? [])
  );
  const reviewableFreelancers = data.freelancers.filter(f => reviewableFreelancerIds.has(f.freelancerId));

  const reviewCols: ColumnDef[] = [
    { key: 'reviewId', label: 'ID', type: 'number', hideInForm: true },
    { key: 'projectId', label: 'Project', type: 'select',
      options: completedProjects.map(p => ({ value: p.projectId, label: p.projectTitle })),
      render: (val) => data.projects.find(p => p.projectId === Number(val))?.projectTitle ?? val },
    // Only freelancers who worked on at least one completed project
    { key: 'freelancerId', label: 'Freelancer', type: 'select',
      options: reviewableFreelancers.map(f => ({ value: f.freelancerId, label: f.freelancerName })),
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

  // Dispute form: Active contracts scoped to this client only
  const disputeCols: ColumnDef[] = [
    { key: 'disputeId', label: 'ID', type: 'number', hideInForm: true },
    { key: 'contractId', label: 'Contract', type: 'select',
      options: activeContracts.map(c => {
        const proj = data.projects.find(p => p.projectId === c.projectId);
        const fl = data.freelancers.find(f => f.freelancerId === c.freelancerId);
        return { value: c.contractId, label: `#${c.contractId} — ${proj?.projectTitle ?? ''} / ${fl?.freelancerName ?? ''}` };
      }),
      render: (val) => {
        const c = data.contracts.find(x => x.contractId === Number(val));
        if (!c) return `Contract #${val}`;
        const proj = data.projects.find(p => p.projectId === c.projectId);
        const fl = data.freelancers.find(f => f.freelancerId === c.freelancerId);
        return `#${val} — ${proj?.projectTitle ?? ''} / ${fl?.freelancerName ?? ''}`;
      }},
    { key: 'reason', label: 'Reason', type: 'textarea' },
    { key: 'disputeDate', label: 'Date', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'Open', label: 'Open' }, { value: 'Resolved', label: 'Resolved' },
      { value: 'Escalated', label: 'Escalated' }, { value: 'Closed', label: 'Closed' },
    ]},
    { key: 'resolution', label: 'Resolution', type: 'textarea' },
  ];

  const tabs = [
    { value: 'profile', label: 'Clients' },
    { value: 'projects', label: 'Projects' },
    { value: 'proposals', label: 'Proposals' },
    { value: 'contracts', label: 'Contracts' },
    { value: 'payments', label: 'Payments' },
    { value: 'reviews', label: 'Reviews' },
    { value: 'disputes', label: 'Disputes' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Client Portal</h2>
          <p className="text-muted-foreground mt-1">Manage projects, proposals, and payments</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Acting as:</label>
          <select
            value={data.activeClientId ?? ''}
            onChange={e => data.setActiveClientId(Number(e.target.value) || null)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Clients</option>
            {data.clients.map(c => (
              <option key={c.clientId} value={c.clientId}>{c.clientName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Projects', value: myProjects.length, color: 'bg-primary/10 text-primary' },
          { label: 'Active Contracts', value: myContracts.filter(c => c.contractStatus === 'Active').length, color: 'bg-accent text-accent-foreground' },
          { label: 'Pending Proposals', value: myProposals.filter(p => p.status === 'Pending').length, color: 'bg-secondary text-secondary-foreground' },
          { label: 'Total Spent', value: `₹${myPayments.filter(p => p.status === 'Paid' || p.status === 'Completed').reduce((s, p) => s + p.amount, 0).toLocaleString()}`, color: 'bg-muted text-muted-foreground' },
        ].map(stat => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl p-4 ${stat.color}`}>
            <p className="text-sm font-medium opacity-80">{stat.label}</p>
            <p className="text-2xl font-display font-bold mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              {tab.label}
              {tab.value === 'proposals' && myProposals.filter(p => p.status === 'Pending').length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">{myProposals.filter(p => p.status === 'Pending').length}</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="mt-6">

            <TabsContent value="profile" className="mt-0">
              <GenericTable title="Clients" columns={clientCols} data={data.clients} idKey="clientId"
                onAdd={c => data.addClient(c)} onUpdate={c => data.updateClient(c)} onDelete={id => data.deleteClient(id)} />
            </TabsContent>

            <TabsContent value="projects" className="mt-0">
              <GenericTable title="Projects" columns={projectCols} data={myProjects} idKey="projectId"
                onAdd={p => data.addProject({ ...p, clientId: data.activeClientId || Number(p.clientId) })}
                onUpdate={p => data.updateProject(p)} onDelete={id => data.deleteProject(id)}
                defaultValues={{ clientId: data.activeClientId, status: 'Open' }} />
            </TabsContent>

            <TabsContent value="proposals" className="mt-0">
              <GenericTable title="Proposals" columns={proposalCols} data={myProposals} idKey="proposalId"
                onAdd={p => data.addProposal(p)} onUpdate={p => data.updateProposal(p)} onDelete={id => data.deleteProposal(id)}
                customActions={row => row.status === 'Pending' ? (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      onClick={() => data.acceptProposal(row.proposalId)}>
                      <Check className="h-3 w-3" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => data.rejectProposal(row.proposalId)}>
                      <X className="h-3 w-3" /> Reject
                    </Button>
                  </div>
                ) : null}
              />
            </TabsContent>

            <TabsContent value="contracts" className="mt-0">
              <GenericTable title="Contracts" columns={contractCols} data={myContracts} idKey="contractId"
                onAdd={c => data.addContract(c)} onUpdate={c => data.updateContract(c)} onDelete={id => data.deleteContract(id)} />
            </TabsContent>

            <TabsContent value="payments" className="mt-0">
              <GenericTable title="Payments" columns={paymentCols} data={myPayments} idKey="paymentId"
                onAdd={p => data.addPayment(p)} onUpdate={p => data.updatePayment(p)} onDelete={id => data.deletePayment(id)}
                customActions={row => !['Paid', 'Completed'].includes(row.status) ? (
                  <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => data.markPaymentPaid(row.paymentId)}>
                    <CreditCard className="h-3 w-3" /> Pay
                  </Button>
                ) : null}
              />
            </TabsContent>

            <TabsContent value="reviews" className="mt-0">
              <GenericTable title="Reviews" columns={reviewCols} data={myReviews} idKey="reviewId"
                onAdd={r => data.addReview(r)} onUpdate={r => data.updateReview(r)} onDelete={id => data.deleteReview(id)}
                defaultValues={{ reviewDate: new Date().toISOString().split('T')[0] }}
                readOnly={completedProjects.length === 0}
              />
              {completedProjects.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2 px-1">Reviews can only be added once a project is marked Completed.</p>
              )}
            </TabsContent>

            <TabsContent value="disputes" className="mt-0">
              <GenericTable title="Disputes" columns={disputeCols} data={myDisputes} idKey="disputeId"
                onAdd={d => data.addDispute(d)} onUpdate={d => data.updateDispute(d)} onDelete={id => data.deleteDispute(id)}
                defaultValues={{ disputeDate: new Date().toISOString().split('T')[0], status: 'Open' }}
                readOnly={activeContracts.length === 0}
              />
              {activeContracts.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2 px-1">Disputes can only be raised on Active contracts.</p>
              )}
            </TabsContent>

          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
};

export default ClientDashboard;