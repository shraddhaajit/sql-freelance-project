/**
 * API Service Layer
 * 
 * Connects to the Flask backend when available, falls back to localStorage.
 * Change API_BASE_URL to your local Flask server address.
 */

// When running locally with Flask, use: http://localhost:5000/api
// When Flask is not available, the app falls back to localStorage automatically.
const API_BASE_URL = 'http://127.0.0.1:9000';

let isApiAvailable: boolean | null = null;

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    isApiAvailable = res.ok;
    return isApiAvailable;
  } catch {
    isApiAvailable = false;
    return false;
  }
}

export function getApiStatus(): boolean | null {
  return isApiAvailable;
}

// ─── Generic CRUD ────────────────────────────────────────────────────

export async function fetchAll(entity: string): Promise<any[]> {
  const res = await fetch(`${API_BASE_URL}/${entity}`);
  if (!res.ok) throw new Error(`Failed to fetch ${entity}`);
  return res.json();
}

export async function fetchAllData(): Promise<Record<string, any[]>> {
  const res = await fetch(`${API_BASE_URL}/all`);
  if (!res.ok) throw new Error('Failed to fetch all data');
  return res.json();
}

export async function createRecord(entity: string, data: any): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/${entity}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create ${entity}`);
  }
  return res.json();
}

export async function updateRecord(entity: string, id: number, data: any): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/${entity}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update ${entity}`);
  }
  return res.json();
}

export async function deleteRecord(entity: string, id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/${entity}/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // detail = FastAPI HTTPException message, error = legacy format
    throw new Error(err.detail || err.error || `Failed to delete ${entity}`);
  }
}

// ─── Special Endpoints ───────────────────────────────────────────────

export async function deleteSkill(freelancerId: number, skill: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/skills/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ freelancerId, skill }),
  });
  if (!res.ok) throw new Error('Failed to delete skill');
}

export async function acceptProposal(id: number): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/proposals/${id}/accept`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to accept proposal');
  return res.json();
}

export async function rejectProposal(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/proposals/${id}/reject`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reject proposal');
}

export async function completeMilestone(milestoneId: number, contractId: number, amount: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/milestones/${milestoneId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contractId, amount }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'Failed to complete milestone');
  }
}

export async function markPaymentPaid(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/payments/${id}/pay`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'Failed to mark payment as paid');
  }
}