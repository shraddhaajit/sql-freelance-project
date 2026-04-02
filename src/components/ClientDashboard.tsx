import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import GenericTable from '@/components/GenericTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, X, CreditCard, Star, AlertTriangle, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { ColumnDef } from '@/types';

const ClientDashboard: React.FC = () => {
  const data = useData();
  const [activeTab, setActiveTab] = useState('profile');
  // Which freelancer's profile panel is open (null = closed)
  const [profileFreelancerId, setProfileFreelancerId] = useState<number | null>(null);

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

  // ── Workflow constraints ──────────────────────────────────────────────────
  const acceptedProjectIds = new Set(data.proposals.filter(p => p.status === 'Accepted').map(p => p.projectId));
  const proposableProjects = myProjects.filter(
    p => ['Open', 'Posted'].includes(p.status) && !acceptedProjectIds.has(p.projectId)
  );

  const paidMilestoneIds = new Set(data.payments.map(p => p.milestoneId));
  const payableMilestones = myMilestones.filter(
    m => m.status === 'Completed' && !paidMilestoneIds.has(m.milestoneId)
  );

  const completedProjects = myProjects.filter(p => p.status === 'Completed');
  const activeContracts = myContracts.filter(c => c.contractStatus === 'Active');

  const reviewedPairs = new Set(data.reviews.map(r => `${r.projectId}-${r.freelancerId}`));

  const activeDisputeContractIds = new Set(
    data.disputes.filter(d => ['Open', 'Escalated'].includes(d.status)).map(d => d.contractId)
  );
  const disputeableContracts = activeContracts.filter(c => !activeDisputeContractIds.has(c.contractId));

  const projectFreelancerMap: Record<number, number[]> = {};
  data.contracts.forEach(c => {
    if (!projectFreelancerMap[c.projectId]) projectFreelancerMap[c.projectId] = [];
    projectFreelancerMap[c.projectId].push(c.freelancerId);
  });
  const reviewableFreelancerIds = new Set(
    completedProjects.flatMap(p => projectFreelancerMap[p.projectId] ?? [])
  );
  const reviewableFreelancers = data.freelancers.filter(f => reviewableFreelancerIds.has(f.freelancerId));

  // ── Freelancer profile data (for proposal review panel) ──────────────────
  const profileFreelancer = profileFreelancerId !== null
    ? data.freelancers.find(f => f.freelancerId === profileFreelancerId)
    : null;
  const profileSkills = profileFreelancerId !== null
    ? data.skills.filter(s => s.freelancerId === profileFreelancerId)
    : [];
  const profileReviews = profileFreelancerId !== null
    ? data.reviews.filter(r => r.freelancerId === profileFreelancerId)
    : [];
  const profileAvgRating = profileReviews.length > 0
    ? (profileReviews.reduce((s, r) => s + r.rating, 0) / profileReviews.length).toFixed(1)
    : null;

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
    { key: 'budget', label: 'Budget (₹)', type: 'number' },
    { key: 'deadline', label: 'Deadline', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'Posted', label: 'Posted' }, { value: 'Open', label: 'Open' }, { value: 'Active', label: 'Active' },
      { value: 'In Progress', label: 'In Progress' }, { value: 'Completed', label: 'Completed' }, { value: 'Cancelled', label: 'Cancelled' },
    ]},
  ];

  const proposalCols: ColumnDef[] = [
    { key: 'proposalId', label: 'ID', type: 'number', hideInForm: true },
    { key: 'projectId', label: 'Project', type: 'select',
      options: proposableProjects.map(p => ({ value: p.projectId, label: p.projectTitle })),
      render: (val) => data.projects.find(p => p.projectId === Number(val))?.projectTitle ?? val },
    { key: 'freelancerId', label: 'Freelancer', type: 'select', options: freelancerOptions,
      render: (val) => data.freelancers.find(f => f.freelancerId === Number(val))?.freelancerName ?? val },
    { key: 'proposedAmount', label: 'Amount (₹)', type: 'number' },
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

  const paymentCols: ColumnDef[] = [
    { key: 'paymentId', label: 'ID', type: 'number', hideInForm: true },
    { key: 'milestoneId', label: 'Milestone', type: 'select',
      options: payableMilestones.map(m => ({ value: m.milestoneId, label: `${m.title} (₹${m.amount?.toLocaleString()})` })),
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
      options: completedProjects.map(p => ({ value: p.projectId, label: p.projectTitle })),
      render: (val) => data.projects.find(p => p.projectId === Number(val))?.projectTitle ?? val },
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

  const disputeCols: ColumnDef[] = [
    { key: 'disputeId', label: 'ID', type: 'number', hideInForm: true },
    { key: 'contractId', label: 'Contract', type: 'select',
      options: disputeableContracts.map(c => {
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

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAddPayment = (p: any) => {
    const milestone = data.milestones.find(m => m.milestoneId === Number(p.milestoneId));
    const amount = p.amount && Number(p.amount) > 0 ? Number(p.amount) : milestone?.amount ?? 0;
    if (!milestone) { toast.error('Please select a milestone'); return; }
    data.addPayment({ ...p, amount, paymentDate: p.paymentDate || new Date().toISOString().split('T')[0] });
  };

  const handleAddReview = (r: any) => {
    if (reviewedPairs.has(`${r.projectId}-${r.freelancerId}`)) {
      toast.error('You have already reviewed this freelancer for this project');
      return;
    }
    data.addReview(r);
  };

  const handleAddDispute = (d: any) => {
    if (activeDisputeContractIds.has(Number(d.contractId))) {
      toast.error('This contract already has an open dispute. Resolve it before raising another.');
      return;
    }
    data.addDispute(d);
  };

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
                <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                  {myProposals.filter(p => p.status === 'Pending').length}
                </Badge>
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
              <GenericTable
                title="Proposals"
                columns={proposalCols}
                data={myProposals}
                idKey="proposalId"
                onAdd={p => data.addProposal(p)}
                onUpdate={p => data.updateProposal(p)}
                onDelete={id => data.deleteProposal(id)}
                customActions={row => row.status === 'Pending' ? (
                  <div className="flex gap-1">
                    {/* View freelancer profile before deciding */}
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      title="View freelancer profile"
                      onClick={() => setProfileFreelancerId(row.freelancerId)}
                    >
                      <User className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline"
                      className="h-7 gap-1 text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      onClick={() => data.acceptProposal(row.proposalId)}>
                      <Check className="h-3 w-3" /> Accept
                    </Button>
                    <Button size="sm" variant="outline"
                      className="h-7 gap-1 text-xs border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => data.rejectProposal(row.proposalId)}>
                      <X className="h-3 w-3" /> Reject
                    </Button>
                  </div>
                ) : null}
              />
            </TabsContent>

            <TabsContent value="contracts" className="mt-0">
              <GenericTable title="Contracts" columns={contractCols} data={myContracts} idKey="contractId"
                onUpdate={c => data.updateContract(c)} onDelete={id => data.deleteContract(id)} />
              <p className="text-xs text-muted-foreground mt-2 px-1">Contracts are created automatically when a proposal is accepted.</p>
            </TabsContent>

            <TabsContent value="payments" className="mt-0">
              <GenericTable title="Payments" columns={paymentCols} data={myPayments} idKey="paymentId"
                onAdd={handleAddPayment}
                onUpdate={p => data.updatePayment(p)}
                onDelete={id => data.deletePayment(id)}
                defaultValues={{ status: 'Pending', paymentDate: new Date().toISOString().split('T')[0] }}
                customActions={row => !['Paid', 'Completed'].includes(row.status) ? (
                  <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => data.markPaymentPaid(row.paymentId)}>
                    <CreditCard className="h-3 w-3" /> Pay
                  </Button>
                ) : null}
                readOnly={payableMilestones.length === 0 && myPayments.length === 0}
              />
              {payableMilestones.length === 0 && myPayments.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2 px-1">Payments are created automatically when a freelancer completes a milestone.</p>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="mt-0">
              <GenericTable title="Reviews" columns={reviewCols} data={myReviews} idKey="reviewId"
                onAdd={handleAddReview} onUpdate={r => data.updateReview(r)} onDelete={id => data.deleteReview(id)}
                defaultValues={{ reviewDate: new Date().toISOString().split('T')[0] }}
                readOnly={completedProjects.length === 0}
              />
              {completedProjects.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2 px-1">Reviews can only be added once a project is marked Completed.</p>
              )}
            </TabsContent>

            <TabsContent value="disputes" className="mt-0">
              <GenericTable title="Disputes" columns={disputeCols} data={myDisputes} idKey="disputeId"
                onAdd={handleAddDispute} onUpdate={d => data.updateDispute(d)} onDelete={id => data.deleteDispute(id)}
                defaultValues={{ disputeDate: new Date().toISOString().split('T')[0], status: 'Open' }}
                readOnly={activeContracts.length === 0}
              />
              {activeContracts.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2 px-1">Disputes can only be raised on Active contracts.</p>
              )}
              {disputeableContracts.length === 0 && activeContracts.length > 0 && (
                <div className="flex items-center gap-2 mt-2 px-1 text-xs text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  All active contracts already have an open dispute.
                </div>
              )}
            </TabsContent>

          </motion.div>
        </AnimatePresence>
      </Tabs>

      {/* ── Freelancer Profile Panel ── */}
      <Dialog open={profileFreelancerId !== null} onOpenChange={() => setProfileFreelancerId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <User className="h-5 w-5" />
              {profileFreelancer?.freelancerName ?? 'Freelancer Profile'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Basic info */}
            <div className="rounded-lg bg-muted/40 p-4 space-y-1 text-sm">
              <p><span className="text-muted-foreground">Email:</span> <span className="font-medium">{profileFreelancer?.email}</span></p>
              <p><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{profileFreelancer?.phone}</span></p>
              <p><span className="text-muted-foreground">Experience:</span> <span className="font-medium">{profileFreelancer?.experienceYears} years</span></p>
              {profileAvgRating && (
                <p className="flex items-center gap-1">
                  <span className="text-muted-foreground">Avg Rating:</span>
                  <span className="font-medium flex items-center gap-1">
                    {profileAvgRating}
                    <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                    <span className="text-muted-foreground text-xs">({profileReviews.length} review{profileReviews.length !== 1 ? 's' : ''})</span>
                  </span>
                </p>
              )}
            </div>

            {/* Skills */}
            <div>
              <p className="text-sm font-semibold mb-2">Skills</p>
              {profileSkills.length === 0 ? (
                <p className="text-xs text-muted-foreground">No skills listed</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {profileSkills.map(s => (
                    <Badge key={s.skill} variant="secondary" className="text-xs">{s.skill}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Past Reviews */}
            <div>
              <p className="text-sm font-semibold mb-2">Past Reviews</p>
              {profileReviews.length === 0 ? (
                <p className="text-xs text-muted-foreground">No reviews yet</p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {profileReviews.map(r => {
                    const project = data.projects.find(p => p.projectId === r.projectId);
                    return (
                      <div key={r.reviewId} className="rounded-lg border bg-card p-3 text-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs text-muted-foreground">{project?.projectTitle ?? `Project #${r.projectId}`}</span>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
                            ))}
                          </div>
                        </div>
                        {r.comment && <p className="text-muted-foreground text-xs">{r.comment}</p>}
                        <p className="text-xs text-muted-foreground/60">{r.reviewDate?.split(' ')[0]}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDashboard;