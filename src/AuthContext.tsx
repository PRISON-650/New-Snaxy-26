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
            const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email?.toLowerCase()));
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
    console.log('Attempting email login for:', email);
    try {
      // First try Firebase Auth (if user already registered)
      try {
        await signInWithEmailAndPassword(auth, email, pass);
        console.log('Firebase Auth login successful');
        toast.success('Successfully logged in!');
        return;
      } catch (e: any) {
        console.warn('Firebase Auth login failed:', e.code, e.message);
        // If user not found in Auth, check Firestore for staff password
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
          console.log('Checking Firestore for fallback authentication...');
          
          // Try both doc ID lookup and field query for robustness
          let staffData: any = null;
          let staffSnap: any = null;

          // 1. Try doc ID lookup (old system used email as ID)
          const staffDocRef = doc(db, 'users', email.toLowerCase());
          staffSnap = await getDoc(staffDocRef);
          
          if (staffSnap.exists()) {
            staffData = staffSnap.data();
          } else {
            // 2. Try field query (new system uses UID as ID)
            const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
              staffSnap = querySnap.docs[0];
              staffData = staffSnap.data();
            }
          }
          
          if (staffData) {
            console.log('Found user in Firestore. Checking password...');
            if (staffData.password === pass) {
              console.log('Password matches Firestore. Attempting auto-registration...');
              // Auto-register in Firebase Auth
              try {
                const userCred = await createUserWithEmailAndPassword(auth, email, pass);
                const firebaseUser = userCred.user;
                console.log('Auto-registration successful. UID:', firebaseUser.uid);
                
                // Update profile
                await updateProfile(firebaseUser, { displayName: staffData.displayName });
                
                // Move data to the real UID if it's currently indexed by email
                const newUser: User = {
                  uid: firebaseUser.uid,
                  email: email.toLowerCase(),
                  displayName: staffData.displayName,
                  photoURL: '',
                  role: staffData.role,
                  createdAt: staffData.createdAt || new Date().toISOString(),
                };
                
                await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
                
                // Delete the old "pending" staff document if it was indexed by email
                if (staffSnap.id === email.toLowerCase()) {
                  await deleteDoc(staffSnap.ref);
                }
                
                toast.success('Account activated and logged in!');
                return;
              } catch (regError: any) {
                console.error('Auto-registration error:', regError);
                if (regError.code === 'auth/email-already-in-use') {
                  throw new Error('This account is already active but the password entered is incorrect. Please use the "Forgot Password" link to reset it.');
                }
                throw new Error('Invalid email or password');
              }
            } else {
              console.warn('Password mismatch in Firestore');
            }
          } else {
            console.warn('User not found in Firestore either');
          }
        }
        
        // Map common Firebase errors to user-friendly messages
        let errorMessage = 'Failed to log in.';
        if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (e.code === 'auth/too-many-requests') {
          errorMessage = 'Too many failed login attempts. Please try again later or reset your password.';
        } else if (e.code === 'auth/operation-not-allowed') {
          errorMessage = 'Email/Password login is not enabled. Please contact the administrator.';
        }
        
        throw new Error(errorMessage);
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
