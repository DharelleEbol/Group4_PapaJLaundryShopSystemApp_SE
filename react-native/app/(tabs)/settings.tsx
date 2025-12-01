// src/screens/BranchList.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getBranches, updateBranch, deleteBranch } from '../../services/branchService';
import { getCurrentClientId } from '../../services/authService';

const ROWS_PER_PAGE = 5;

type Branch = {
  id: number;
  branch_name: string; // backend shape
  username: string;
  // password may or may not be returned by backend — keep optional
  password?: string;
  created_at?: string;
};

const BranchList: React.FC = () => {
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [clientId, setClientId] = useState<number | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false); // <-- toggle

  useEffect(() => {
    // load client id then branches
    (async () => {
      setLoading(true);
      try {
        const cid = await getCurrentClientId();
        if (!cid) {
          Alert.alert('Not signed in', 'Please log in first.');
          setClientId(null);
          setAllBranches([]);
          return;
        }
        setClientId(cid);
        await loadBranches(cid);
      } catch (e) {
        console.warn('load branches error', e);
        Alert.alert('Error', 'Unable to load branches.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadBranches = async (cid: number) => {
    setLoading(true);
    try {
      const data = await getBranches(cid);
      // backend returns branch_name; map if you need legacy keys
      setAllBranches(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (err) {
      console.warn('Failed to fetch branches', err);
      Alert.alert('Error', 'Failed to fetch branches from server.');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(allBranches.length / ROWS_PER_PAGE));
  const startIndex = (page - 1) * ROWS_PER_PAGE;
  const pageData = useMemo(() => allBranches.slice(startIndex, startIndex + ROWS_PER_PAGE), [allBranches, page]);

  const openEditModal = (branch: Branch) => {
    setSelectedBranch(branch);
    setUsername(branch.username ?? '');
    // If backend returns password (not recommended), prefill it; otherwise leave blank
    setPassword(branch.password ?? '');
    setShowPassword(false);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedBranch(null);
    setUsername('');
    setPassword('');
    setShowPassword(false);
  };

  const handleConfirm = async () => {
    if (!selectedBranch) return;
    if (!username) {
      Alert.alert('Validation', 'Username is required.');
      return;
    }

    const payload: { username?: string; password?: string; branch_name?: string } = {};
    if (username !== selectedBranch.username) payload.username = username;
    if (password && password.length > 0) payload.password = password;

    if (Object.keys(payload).length === 0) {
      // nothing changed
      closeModal();
      return;
    }

    setSaving(true);
    try {
      const updated = await updateBranch(selectedBranch.id, payload);
      // update local list
      setAllBranches((prev) => prev.map((b) => (b.id === selectedBranch.id ? { ...b, ...updated } : b)));
      Alert.alert('Success', 'Branch updated.');
      closeModal();
    } catch (err: any) {
      console.warn('Update branch failed', err);
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to update branch';
      Alert.alert('Error', String(msg));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBranch) return;
    Alert.alert('Confirm delete', `Delete branch "${selectedBranch.branch_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await deleteBranch(selectedBranch.id);
            setAllBranches((prev) => prev.filter((b) => b.id !== selectedBranch.id));
            Alert.alert('Deleted', 'Branch deleted successfully.');
            closeModal();
          } catch (err: any) {
            console.warn('Delete failed', err);
            const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to delete branch';
            Alert.alert('Error', String(msg));
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  // Refresh helper
  const refresh = async () => {
    if (!clientId) return;
    await loadBranches(clientId);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Branch Settings</Text>
          <View style={styles.headerAccent} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderTitle}>Branch Name</Text>
            <TouchableOpacity onPress={refresh} activeOpacity={0.7}>
              <Text style={styles.headerEdit}>Refresh</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listContainer}>
            {loading ? (
              <View style={{ padding: 24 }}>
                <ActivityIndicator size="large" />
              </View>
            ) : pageData.length === 0 ? (
              <View style={{ padding: 24 }}>
                <Text>No branches found.</Text>
              </View>
            ) : (
              pageData.map((branch, index) => (
                <View
                  key={branch.id}
                  style={[styles.branchItem, index < pageData.length - 1 && styles.branchItemBorder]}
                >
                  <View style={styles.branchLeft}>
                    <View style={styles.branchIconContainer}>
                      <Ionicons name="location" size={20} color="#3b82f6" />
                    </View>
                    <Text style={styles.branchName}>{branch.branch_name}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditModal(branch)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="create-outline" size={22} color="#3b82f6" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Pagination */}
          <View style={styles.pagination}>
            <TouchableOpacity
              disabled={page === 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              style={[styles.pageBtn, page === 1 && styles.disabledBtn]}
              activeOpacity={0.7}
            >
              <Text style={[styles.pageText, page === 1 && styles.disabledText]}>Prev</Text>
            </TouchableOpacity>

            <View style={styles.pageNumberContainer}>
              <Text style={styles.pageNumber}>
                Page {page} of {totalPages}
              </Text>
            </View>

            <TouchableOpacity
              disabled={page === totalPages}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={[styles.pageBtn, page === totalPages && styles.disabledBtn]}
              activeOpacity={0.7}
            >
              <Text style={[styles.pageText, page === totalPages && styles.disabledText]}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Branch</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeModal}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Username:</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password (leave blank to keep)</Text>

                {/* Password input with eye toggle */}
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, styles.inputWithIcon]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((s) => !s)}
                    style={styles.eyeButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.8}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.deleteButtonText}>Delete</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} activeOpacity={0.8}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Confirm</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default BranchList;

// (styles kept the same as your original — added small rules for the password row and eye)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    position: 'relative',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  headerAccent: {
    position: 'absolute',
    bottom: -8,
    left: 0,
    width: 60,
    height: 4,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  headerEdit: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b82f6',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  listContainer: {
    paddingVertical: 8,
  },
  branchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#ffffff',
    marginVertical: 4,
    marginHorizontal: 4,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  branchItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  branchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  branchIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  branchName: {
    fontSize: 17,
    color: '#1e293b',
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  editButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
    borderTopWidth: 2,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  pageBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  disabledBtn: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  pageText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  disabledText: {
    color: '#94a3b8',
  },
  pageNumberContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  pageNumber: {
    fontWeight: '700',
    fontSize: 14,
    color: '#1e293b',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 20,
    color: '#64748b',
    fontWeight: '600',
  },
  modalContent: {
    padding: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  /* NEW: layout for password input + eye icon */
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  inputWithIcon: {
    flex: 1,
    paddingRight: 44, // space for the eye button
  },
  eyeButton: {
    position: 'absolute',
    right: 10,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
