// BranchAccountManager.tsx
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/axios'; // ← adjust relative path if needed

type Branch = {
  id: number;
  branchName: string;
  username: string;
  password?: string;
  createdAt?: string;
  // include server fields if they differ:
  branch_name?: string;
  created_at?: string;
};

const BranchAccountManager: React.FC = () => {
  const router = useRouter();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState<{ branchName: string; username: string; password: string }>({
    branchName: '',
    username: '',
    password: '',
  });

  const [clientId, setClientId] = useState<number | null>(null);

  // helper: try to fetch authenticated user's id from /user endpoint
  const getUserIdFromApi = async (): Promise<number | null> => {
    try {
      const me = await api.get('/user');
      const id = me?.data?.id ?? null;
      return id;
    } catch (e) {
      return null;
    }
  };

  const fetchBranches = async (cid: number | null) => {
    setLoading(true);
    try {
      let id: number | null = cid ?? null;
      if (!id) {
        const fallbackId = await getUserIdFromApi();
        id = fallbackId;
        if (id) {
          setClientId(id);
          await AsyncStorage.setItem('clientId', String(id));
        }
      }

      if (!id) {
        setBranches([]);
        return;
      }

      const res = await api.get(`/clients/${id}/branches`);
      const data = res?.data?.data ?? [];

      const mapped: Branch[] = data.map((b: any) => ({
        id: b.id,
        branchName: b.branch_name ?? b.branchName ?? '',
        username: b.username,
        password: '', // backend should not return plaintext
        createdAt: b.created_at ?? b.createdAt ?? new Date().toISOString(),
      }));

      setBranches(mapped);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Unable to load branches';
      console.warn('Failed to fetch branches', message);
      Alert.alert('Error', 'Unable to load branches. Showing local data if available.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const storedId = await AsyncStorage.getItem('clientId');
        if (storedId) {
          setClientId(Number(storedId));
        }
        await fetchBranches(storedId ? Number(storedId) : null);
      } catch (e) {
        console.warn('Init error', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // replace your existing createBranchOnServer with this
const createBranchOnServer = async (payload: { branchName: string; username: string; password: string }) => {
  // use existing clientId if present
  let id = clientId;

  // try AsyncStorage if we didn't have state
  if (!id) {
    const stored = await AsyncStorage.getItem('clientId');
    if (stored) id = Number(stored);
  }

  // last resort: ask backend for current user id (if /user exists)
  if (!id) {
    const fetched = await getUserIdFromApi();
    if (fetched) {
      id = fetched;
      setClientId(fetched);
      await AsyncStorage.setItem('clientId', String(fetched));
    }
  }

  if (!id) {
    // show nicer error to user instead of throwing
    Alert.alert('Error', 'Client ID not available — please sign in again.');
    throw new Error('Client ID not available');
  }

  const res = await api.post(`/clients/${id}/branches`, {
    branch_name: payload.branchName,
    username: payload.username,
    password: payload.password,
  });
  return res?.data?.data;
};


  const deleteBranchOnServer = async (branchId: number) => {
    const res = await api.delete(`/branches/${branchId}`);
    return res?.data;
  };

  
  const handleConfirm = async () => {
    if (!formData.branchName || !formData.username || !formData.password) {
      Alert.alert('Validation', 'Please fill all fields.');
      return;
    }

    setLoading(true);
    try {
      const created = await createBranchOnServer(formData);

      const newBranch: Branch = {
        id: created?.id ?? Math.floor(Math.random() * 1000000),
        branchName: created?.branch_name ?? formData.branchName,
        username: created?.username ?? formData.username,
        password: formData.password,
        createdAt: created?.created_at ?? new Date().toISOString(),
      };

      setBranches((prev) => [...prev, newBranch]);
      setIsModalOpen(false);
      setFormData({ branchName: '', username: '', password: '' });
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to create branch';
      console.warn('Create branch failed', message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBranch = (branchId: number) => {
    Alert.alert(
      'Delete branch',
      'Are you sure you want to delete this branch?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(branchId) },
      ],
      { cancelable: true }
    );
  };

  const confirmDelete = async (branchId: number) => {
    setLoading(true);
    try {
      await deleteBranchOnServer(branchId);
      setBranches((prev) => prev.filter((b) => b.id !== branchId));
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to delete branch';
      console.warn('Delete failed', message);
      Alert.alert('Error', 'Failed to delete branch');
    } finally {
      setLoading(false);
    }
  };

  const handleViewBranch = (branch: Branch) => {
    router.push({
      pathname: '/dashboardbyaccount',
      params: {
        branchId: String(branch.id),
        branchName: branch.branchName,
        username: branch.username,
        password: branch.password,
        createdAt: branch.createdAt,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Branches</Text>
          <View style={styles.headerAccent} />
        </View>
      </View>

      {/* Branch List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <View style={styles.listHeaderLeft}>
              <View style={styles.iconWrapper}>
                <Ionicons name="location" size={22} color="#3b82f6" />
              </View>
              <Text style={styles.listHeaderText}>Branch Name</Text>
            </View>

            <TouchableOpacity
              onPress={() => setIsModalOpen(true)}
              style={styles.createButton}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tableContent}>
            {loading && branches.length === 0 ? (
              <View style={{ padding: 24 }}>
                <ActivityIndicator size="large" />
              </View>
            ) : (
              branches.map((branch, index) => (
                <View key={branch.id} style={styles.branchRowWrapper}>
                  <View style={styles.branchRow}>
                    <View style={styles.branchLeft}>
                      <View style={styles.branchIconContainer}>
                        <Ionicons name="business" size={20} color="#3b82f6" />
                      </View>
                      <View style={styles.branchInfo}>
                        <Text style={styles.branchName}>{branch.branchName}</Text>
                        <Text style={styles.branchUsername}>@{branch.username}</Text>
                      </View>
                    </View>

                    <View style={styles.actionRow}>
                      <TouchableOpacity onPress={() => handleViewBranch(branch)} style={styles.viewButton} activeOpacity={0.8}>
                        <Ionicons name="eye" size={16} color="#fff" />
                        <Text style={styles.viewButtonText}>View</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {index < branches.length - 1 && <View style={styles.rowDivider} />}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Branch</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Branch Name</Text>
              <TextInput placeholder="Enter branch name" placeholderTextColor="#9ca3af" value={formData.branchName} onChangeText={(t) => setFormData({ ...formData, branchName: t })} style={styles.input} />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput placeholder="Enter username" placeholderTextColor="#9ca3af" value={formData.username} onChangeText={(t) => setFormData({ ...formData, username: t })} style={styles.input} />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput placeholder="Enter password" placeholderTextColor="#9ca3af" secureTextEntry value={formData.password} onChangeText={(t) => setFormData({ ...formData, password: t })} style={styles.input} />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => { setIsModalOpen(false); setFormData({ branchName: '', username: '', password: '' }); }} style={styles.clearButton} activeOpacity={0.8}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton} activeOpacity={0.8} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default BranchAccountManager;

/* styles unchanged (copy your styles here) */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#ffffff', paddingTop: 12, paddingBottom: 20, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 },
  headerContent: { position: 'relative' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1e293b', letterSpacing: -0.5 },
  headerAccent: { position: 'absolute', bottom: -8, left: 0, width: 60, height: 4, backgroundColor: '#3b82f6', borderRadius: 2 },
  content: { flex: 1, padding: 20 },
  listContainer: { backgroundColor: '#ffffff', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 12, overflow: 'hidden' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#f8fafc', borderBottomWidth: 2, borderBottomColor: '#e2e8f0' },
  listHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  iconWrapper: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4, marginRight: 12 },
  listHeaderText: { fontSize: 18, fontWeight: '700', color: '#1e293b', letterSpacing: -0.3 },
  createButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: '#3b82f6', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  createButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 15, letterSpacing: 0.3, marginLeft: 6 },
  tableContent: { paddingVertical: 8 },
  branchRowWrapper: { marginHorizontal: 4 },
  branchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, marginVertical: 6, backgroundColor: '#ffffff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  rowDivider: { height: 1, backgroundColor: '#e2e8f0', marginHorizontal: 20, marginVertical: 4 },
  branchLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  branchIconContainer: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3, marginRight: 16 },
  branchInfo: { flex: 1 },
  branchName: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 4, letterSpacing: -0.2 },
  branchUsername: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  viewButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: '#3b82f6', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5 },
  deleteButton: { backgroundColor: '#ef4444', marginLeft: 8 },
  viewButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14, marginLeft: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 20, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b', letterSpacing: -0.5 },
  closeButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  inputContainer: { marginBottom: 20, paddingHorizontal: 24 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, letterSpacing: 0.2 },
  input: { backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#e2e8f0', padding: 16, borderRadius: 12, fontSize: 16, color: '#1e293b', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  modalButtons: { flexDirection: 'row', padding: 24, paddingTop: 8 },
  clearButton: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', borderWidth: 2, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, marginRight: 12 },
  clearButtonText: { color: '#64748b', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  confirmButton: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: '#22c55e', alignItems: 'center', shadowColor: '#22c55e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  confirmButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
});
