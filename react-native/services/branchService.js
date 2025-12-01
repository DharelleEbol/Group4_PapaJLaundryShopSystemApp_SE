import api from '../api/axios';

// ---------------------------------------------
// GET ALL BRANCHES for a client
// ---------------------------------------------
export async function getBranches(clientId) {
  const res = await api.get(`/clients/${clientId}/branches`);
  return res.data?.data ?? [];
}

// ---------------------------------------------
// UPDATE BRANCH
// ---------------------------------------------
export async function updateBranch(branchId, payload) {
  // payload = { branch_name?, username?, password? }
  const res = await api.put(`/branches/${branchId}`, payload);
  return res.data?.data;
}

// ---------------------------------------------
// DELETE BRANCH
// ---------------------------------------------
export async function deleteBranch(branchId) {
  const res = await api.delete(`/branches/${branchId}`);
  return res.data;
}

// ---------------------------------------------
// CREATE BRANCH
// ---------------------------------------------
export async function createBranch(clientId, payload) {
  // payload = { branch_name, username, password }
  const res = await api.post(`/clients/${clientId}/branches`, payload);
  return res.data?.data;
}
