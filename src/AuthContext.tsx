import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { User, UserRole } from './types';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isCashier: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data() as User;
            const isAdminEmail = firebaseUser.email === 'mdanyalkayani77@gmail.com';
            
            if (isAdminEmail && userData.role !== 'admin') {
              const updatedUser = { ...userData, role: 'admin' as UserRole };
              await updateDoc(userRef, { role: 'admin' });
              setUser(updatedUser);
            } else {
              setUser(userData);
            }
          } else {
            // Check for pre-authorized user by email
            const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
            const querySnap = await getDocs(q);
            
            let initialRole: UserRole = 'customer';
            let initialDisplayName = firebaseUser.displayName || '';

            if (!querySnap.empty) {
              const pendingDoc = querySnap.docs[0];
              const pendingData = pendingDoc.data();
              initialRole = pendingData.role || 'customer';
              initialDisplayName = pendingData.displayName || initialDisplayName;
              
              // Delete the pending document
              await deleteDoc(pendingDoc.ref);
            } else {
              const isAdminEmail = firebaseUser.email === 'mdanyalkayani77@gmail.com';
              if (isAdminEmail) initialRole = 'admin';
            }

            const newUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: initialDisplayName,
              photoURL: firebaseUser.photoURL || '',
              role: initialRole,
              createdAt: new Date().toISOString(),
            };
            await setDoc(userRef, newUser);
            setUser(newUser);
          }
        } catch (error: any) {
          console.error('Auth state error:', error);
          // Don't toast for "missing permissions" on the very first check as it might be race condition
          // but do log it clearly.
          if (error.message?.includes('permission-denied')) {
            console.warn('Permission denied during auth sync - this is expected if rules are still propagating or user is new');
          } else {
            toast.error('Error syncing user data. Please refresh.');
          }
          setLoading(false);
        }
      } else {
        // Check local storage for staff session
        const staffSession = localStorage.getItem('staff_session');
        if (staffSession) {
          setUser(JSON.parse(staffSession));
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Successfully logged in!');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to log in. Please try again.');
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      // First try Firebase Auth (if user already registered)
      try {
        await signInWithEmailAndPassword(auth, email, pass);
        toast.success('Successfully logged in!');
        return;
      } catch (e: any) {
        // If user not found in Auth, check Firestore for staff password
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
          const staffDocRef = doc(db, 'users', email.toLowerCase());
          const staffSnap = await getDoc(staffDocRef);
          
          if (staffSnap.exists()) {
            const staffData = staffSnap.data();
            
            if (staffData.password === pass) {
              // Auto-register in Firebase Auth
              try {
                const userCred = await createUserWithEmailAndPassword(auth, email, pass);
                const firebaseUser = userCred.user;
                
                // Update profile
                await updateProfile(firebaseUser, { displayName: staffData.displayName });
                
                // Move data to the real UID
                const newUser: User = {
                  uid: firebaseUser.uid,
                  email: email,
                  displayName: staffData.displayName,
                  photoURL: '',
                  role: staffData.role,
                  createdAt: new Date().toISOString(),
                };
                
                await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
                
                // Delete the old "pending" staff document
                await deleteDoc(staffSnap.ref);
                
                toast.success('Staff account activated and logged in!');
                return;
              } catch (regError: any) {
                console.error('Auto-registration error:', regError);
                if (regError.code === 'auth/email-already-in-use') {
                  // This happens if the user was "reset" by an admin
                  // We can't easily update the password here without the old one
                  // So we should tell them to use the password reset email
                  throw new Error('This account is already active. If you forgot your password, please use the "Forgot Password" link.');
                }
                throw new Error('Invalid email or password');
              }
            }
          }
        }
        throw e;
      }
    } catch (error: any) {
      console.error('Email login error:', error);
      toast.error(error.message || 'Failed to log in.');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Failed to send reset email.');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('staff_session');
      setUser(null);
      toast.success('Successfully logged out!');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out.');
    }
  };

  const isSuperAdmin = user?.email === 'mdanyalkayani77@gmail.com';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const isCashier = user?.role === 'cashier';
  const isStaff = isAdmin || isCashier;

  useEffect(() => {
    if (user) {
      console.log('Auth State Updated:', {
        uid: user.uid,
        email: user.email,
        role: user.role,
        isAdmin,
        isSuperAdmin
      });
    }
  }, [user, isAdmin, isSuperAdmin]);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithEmail, resetPassword, logout, isAdmin, isSuperAdmin, isCashier, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
