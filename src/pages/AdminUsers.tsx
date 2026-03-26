import React, { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, query, orderBy, addDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, UserRole } from '../types';
import { Shield, ShieldAlert, User as UserIcon, Search, Mail, Calendar, Check, X, Plus, UserPlus, Lock, Eye, EyeOff, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { Navigate } from 'react-router-dom';

export default function AdminUsers() {
  const { isSuperAdmin, isAdmin, resetPassword } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<UserRole | 'all'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    role: 'customer' as UserRole,
    password: ''
  });
  const [editUser, setEditUser] = useState({
    displayName: '',
    role: 'customer' as UserRole,
    password: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
      setUsers(usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email) return;
    
    setIsSubmitting(true);
    try {
      // Check if user already exists in Firestore
      const existing = users.find(u => u.email.toLowerCase() === newUser.email.toLowerCase());
      if (existing) {
        toast.error('A user with this email already exists');
        return;
      }

      // Try to create in Firebase Auth via Admin API
      const response = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUser.email.toLowerCase(),
          password: newUser.password,
          displayName: newUser.displayName,
          role: newUser.role
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user in Auth');
      }

      // Store in Firestore with the real UID from Auth
      const userRef = doc(db, 'users', result.uid);
      await setDoc(userRef, {
        uid: result.uid,
        email: newUser.email.toLowerCase(),
        displayName: newUser.displayName,
        role: newUser.role,
        password: newUser.password, // Store for super admin visibility
        createdAt: new Date().toISOString(),
        isPending: false // No longer pending as it's created in Auth
      });

      toast.success('User added successfully');
      setIsAddModalOpen(false);
      setNewUser({ email: '', displayName: '', role: 'customer', password: '' });
      fetchUsers();
    } catch (error: any) {
      console.error('Add user error:', error);
      toast.error(error.message || 'Failed to add user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateUserRole = async (user: User, newRole: UserRole) => {
    if (!confirm(`Are you sure you want to make this user a ${newRole}?`)) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
      toast.success(`User role updated to ${newRole}`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user role');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.displayName || user.email}? This action cannot be undone.`)) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid));
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      // If password is provided, update it in Firebase Auth via Admin API
      if (editUser.password) {
        const response = await fetch('/api/admin/update-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: selectedUser.uid,
            password: editUser.password,
            displayName: editUser.displayName,
            role: editUser.role
          })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to update user in Auth');
        }
      }

      const updates: any = {
        displayName: editUser.displayName,
        role: editUser.role,
      };

      if (editUser.password) {
        updates.password = editUser.password;
        updates.isPending = false;
      }

      await updateDoc(doc(db, 'users', selectedUser.uid), updates);
      toast.success('User updated successfully');
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Update user error:', error);
      toast.error(error.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!confirm(`Send password reset email to ${user.email}?`)) return;
    await resetPassword(user.email);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || user.role === activeTab;
    return matchesSearch && matchesTab;
  });

  if (!isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">USER MANAGEMENT</h1>
          <p className="text-neutral-500">Manage user roles and permissions.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
          >
            <UserPlus className="w-5 h-5" />
            Add User
          </button>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-600/20"
            />
          </div>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex gap-2 bg-neutral-100 p-1 rounded-2xl w-fit">
        {[
          { id: 'all', label: 'All Users' },
          { id: 'admin', label: 'Admins' },
          { id: 'cashier', label: 'Cashiers' },
          { id: 'customer', label: 'Customers' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all",
              activeTab === tab.id ? "bg-white text-orange-600 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-neutral-100 max-w-md w-full space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black tracking-tight">ADD NEW USER</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Email Address</label>
                  <input
                    required
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-600/20"
                    placeholder="user@example.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Display Name</label>
                  <input
                    type="text"
                    value={newUser.displayName}
                    onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                    className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-600/20"
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Password</label>
                  <input
                    required
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-600/20"
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Initial Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['admin', 'cashier', 'customer'].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setNewUser({ ...newUser, role: role as UserRole })}
                        className={cn(
                          "py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all",
                          newUser.role === role 
                            ? "bg-neutral-900 text-white" 
                            : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
                        )}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Confirm & Add'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-[2.5rem] animate-pulse border border-neutral-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user, idx) => (
            <motion.div
              key={user.uid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
            >
              <div className={cn(
                "absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-5 transition-transform group-hover:scale-110",
                user.role === 'admin' ? "bg-orange-600" : "bg-neutral-900"
              )} />
              
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    user.role === 'admin' ? "bg-orange-100 text-orange-600" : "bg-neutral-100 text-neutral-600"
                  )}>
                    {user.role === 'admin' ? <ShieldAlert className="w-6 h-6" /> : <UserIcon className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{user.displayName || 'Anonymous User'}</h3>
                      {(user as any).isPending && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[8px] font-black uppercase tracking-widest rounded-full">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-neutral-400 text-xs">
                      <Mail className="w-3 h-3" /> {user.email}
                    </div>
                    {isSuperAdmin && (user as any).password && (
                      <div className="flex items-center gap-1 text-orange-600 text-xs font-bold mt-1">
                        <Lock className="w-3 h-3" /> Pass: {(user as any).password}
                      </div>
                    )}
                  </div>
                </div>
                {isSuperAdmin && user.email !== 'mdanyalkayani77@gmail.com' && (
                  <button
                    onClick={() => handleDeleteUser(user)}
                    className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Delete User"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="mt-8 space-y-4 relative z-10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 uppercase font-black tracking-widest">Joined</span>
                  <span className="font-bold text-neutral-600">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 uppercase font-black tracking-widest">Current Role</span>
                  <span className={cn(
                    "px-3 py-1 rounded-full font-black uppercase tracking-widest",
                    user.role === 'admin' ? "bg-orange-100 text-orange-600" : "bg-neutral-100 text-neutral-600"
                  )}>
                    {user.role}
                  </span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-neutral-50 relative z-10 flex gap-2">
                <button
                  onClick={() => {
                    setSelectedUser(user);
                    setEditUser({
                      displayName: user.displayName || '',
                      role: user.role,
                      password: ''
                    });
                    setIsEditModalOpen(true);
                  }}
                  className="flex-1 py-3 bg-neutral-100 text-neutral-600 rounded-xl font-bold hover:bg-neutral-200 transition-all text-xs uppercase tracking-widest"
                >
                  Edit User
                </button>
                <button
                  onClick={() => handleResetPassword(user)}
                  className="p-3 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-all"
                  title="Send Reset Email"
                >
                  <Mail className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-neutral-100 max-w-md w-full space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black tracking-tight">EDIT USER</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Email Address</label>
                  <input
                    disabled
                    type="email"
                    value={selectedUser.email}
                    className="w-full px-6 py-4 bg-neutral-100 border border-neutral-100 rounded-2xl text-neutral-500 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Display Name</label>
                  <input
                    type="text"
                    value={editUser.displayName}
                    onChange={(e) => setEditUser({ ...editUser, displayName: e.target.value })}
                    className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-600/20"
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Reset Password (Optional)</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={editUser.password}
                      onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                      className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-600/20"
                      placeholder="Leave blank to keep current"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 ml-2 mt-1 italic">
                    Setting a password here will mark the user as "Pending" until they login with this new password.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['admin', 'cashier', 'customer'].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setEditUser({ ...editUser, role: role as UserRole })}
                        className={cn(
                          "py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all",
                          editUser.role === role 
                            ? "bg-neutral-900 text-white" 
                            : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
                        )}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Save Changes'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
