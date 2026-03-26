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
  signUp: (email: string, pass: string, displayName: string) => Promise<void>;
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
  const [authInProgress, setAuthInProgress] = useState(false);

  useEffect(() => {
    console.log('AuthContext: Initializing onAuthStateChanged listener');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('AuthContext: Auth state changed. Firebase User:', firebaseUser?.email, 'UID:', firebaseUser?.uid);
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const isAdminEmail = firebaseUser.email === 'mdanyalkayani77@gmail.com' || firebaseUser.email === 'gotify.pk@gmail.com';
        
        try {
          console.log('AuthContext: Attempting to fetch user document:', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          console.log('AuthContext: Fetch result exists:', userSnap.exists());

          if (userSnap.exists()) {
            const userData = userSnap.data() as User;
            
            if (isAdminEmail && userData.role !== 'admin') {
              console.log('AuthContext: Forcing admin role for super admin email');
              const updatedUser = { ...userData, role: 'admin' as UserRole };
              try {
                await updateDoc(userRef, { role: 'admin' });
              } catch (e) {
                console.warn('AuthContext: Failed to update admin role in Firestore, but proceeding with local admin state');
              }
              setUser(updatedUser);
            } else {
              setUser(userData);
            }
          } else {
            console.log('Auth sync: User document not found, checking for pre-authorized record...');
            // Check for pre-authorized user by email
            let initialRole: UserRole = isAdminEmail ? 'admin' : 'customer';
            let initialDisplayName = firebaseUser.displayName || '';

            try {
              const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email?.toLowerCase()));
              const querySnap = await getDocs(q);
              
              if (!querySnap.empty) {
                const pendingDoc = querySnap.docs[0];
                const pendingData = pendingDoc.data();
                initialRole = pendingData.role || initialRole;
                initialDisplayName = pendingData.displayName || initialDisplayName;
                
                console.log('Auth sync: Found pre-authorized record with role:', initialRole);
                // Delete the pending document
                try {
                  await deleteDoc(pendingDoc.ref);
                } catch (e) {
                  console.warn('Auth sync: Failed to delete pending doc, but proceeding');
                }
              }
            } catch (queryError: any) {
              console.warn('Auth sync: Could not query for pre-authorized user (likely permission denied).', queryError.code, queryError.message);
              if (queryError.code === 'permission-denied') {
                try {
                  handleFirestoreError(queryError, OperationType.LIST, 'users');
                } catch (e) {}
              }
            }

            const newUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: initialDisplayName,
              photoURL: firebaseUser.photoURL || '',
              role: initialRole,
              createdAt: new Date().toISOString(),
            };
            
            console.log('Auth sync: Creating new user document in Firestore...', newUser);
            try {
              await setDoc(userRef, newUser);
              console.log('Auth sync: Successfully created user document');
            } catch (e: any) {
              console.warn('Auth sync: Failed to create user document in Firestore, using fallback state', e.code, e.message);
            }
            setUser(newUser);
          }
        } catch (error: any) {
          console.error('Auth sync error (CRITICAL):', error.code, error.message, error);
          
          if (error.code === 'permission-denied') {
            try {
              handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
            } catch (e) {}
          }
          
          // Fallback to basic user info from Auth if Firestore fails
          const fallbackUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || '',
            role: isAdminEmail ? 'admin' : 'customer',
            createdAt: new Date().toISOString(),
          };
          console.log('AuthContext: Setting fallback user state:', fallbackUser.email);
          setUser(fallbackUser);
          
          if (!error.message?.includes('permission-denied')) {
            toast.error('Error syncing user data. You might have limited access.');
          }
        } finally {
          console.log('AuthContext: Sync complete, setting loading to false');
          setLoading(false);
        }
      } else {
        console.log('AuthContext: No Firebase user, checking local storage');
        // Check local storage for staff session
        const staffSession = localStorage.getItem('staff_session');
        if (staffSession) {
          console.log('AuthContext: Found staff session in local storage');
          setUser(JSON.parse(staffSession));
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    if (authInProgress) return;
    setAuthInProgress(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Successfully logged in!');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/popup-blocked') {
        toast.error('Sign-in popup was blocked by your browser. Please allow popups for this site.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.warn('AuthContext: Popup request cancelled or closed by user');
      } else if (error.code === 'auth/popup-closed-by-user') {
        console.log('AuthContext: Popup closed by user');
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        toast.error('An account already exists with this email but with a different sign-in method. Please sign in with email/password.');
      } else {
        toast.error('Failed to log in. Please try again.');
      }
    } finally {
      setAuthInProgress(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    if (authInProgress) return;
    setAuthInProgress(true);
    const normalizedEmail = email.toLowerCase().trim();
    console.log('AuthContext: Attempting email login for:', normalizedEmail);
    try {
      // First try Firebase Auth (if user already registered)
      try {
        console.log('AuthContext: Trying Firebase Auth signInWithEmailAndPassword');
        await signInWithEmailAndPassword(auth, normalizedEmail, pass);
        console.log('AuthContext: Firebase Auth login successful');
        toast.success('Successfully logged in!');
        return;
      } catch (e: any) {
        console.warn('AuthContext: Firebase Auth login failed:', e.code, e.message);
        // If user not found in Auth, check Firestore for staff password
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
          console.log('AuthContext: Checking Firestore for fallback authentication...');
          
          // Try both doc ID lookup and field query for robustness
          let staffData: any = null;
          let staffSnap: any = null;

          // 1. Try doc ID lookup (old system used email as ID)
          try {
            const staffDocRef = doc(db, 'users', normalizedEmail);
            console.log('AuthContext: Checking Firestore doc by ID:', normalizedEmail);
            staffSnap = await getDoc(staffDocRef);
            
            if (staffSnap.exists()) {
              staffData = staffSnap.data();
              console.log('AuthContext: Found user doc by ID');
            } else {
              // 2. Try field query (new system uses UID as ID)
              console.log('AuthContext: User doc not found by ID, trying email query');
              const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
              const querySnap = await getDocs(q);
              if (!querySnap.empty) {
                staffSnap = querySnap.docs[0];
                staffData = staffSnap.data();
                console.log('AuthContext: Found user doc by email query');
              }
            }
          } catch (staffError: any) {
            console.warn('AuthContext: Fallback auth check failed (likely permission denied):', staffError.message);
          }
          
          if (staffData) {
            console.log('AuthContext: Found user in Firestore. Checking password match...');
            if (staffData.password && staffData.password === pass) {
              console.log('AuthContext: Password matches Firestore. Attempting auto-registration...');
              // Auto-register in Firebase Auth
              try {
                const userCred = await createUserWithEmailAndPassword(auth, normalizedEmail, pass);
                const firebaseUser = userCred.user;
                console.log('AuthContext: Auto-registration successful. UID:', firebaseUser.uid);
                
                // Update profile
                await updateProfile(firebaseUser, { displayName: staffData.displayName });
                
                // Move data to the real UID if it's currently indexed by email
                const newUser: User = {
                  uid: firebaseUser.uid,
                  email: normalizedEmail,
                  displayName: staffData.displayName,
                  photoURL: '',
                  role: staffData.role,
                  createdAt: staffData.createdAt || new Date().toISOString(),
                };
                
                console.log('AuthContext: Saving new user doc with UID:', firebaseUser.uid);
                await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
                
                // Delete the old "pending" staff document if it was indexed by email
                if (staffSnap.id === normalizedEmail) {
                  console.log('AuthContext: Deleting old email-indexed doc');
                  await deleteDoc(staffSnap.ref);
                }
                
                toast.success('Account activated and logged in!');
                return;
              } catch (regError: any) {
                console.error('AuthContext: Auto-registration error:', regError);
                if (regError.code === 'auth/email-already-in-use') {
                  throw new Error('This email is already registered. If you forgot your password, please use the "Forgot?" link.');
                }
                throw new Error('Failed to activate account. Please try again.');
              }
            } else {
              console.warn('AuthContext: Password mismatch or no password in Firestore');
            }
          } else {
            console.warn('AuthContext: User not found in Firestore either');
          }
        }
        
        // If we reach here, both Firebase Auth and Firestore fallback failed
        // Map common Firebase errors to user-friendly messages
        let errorMessage = 'Failed to log in.';
        if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
          const isSuperAdminEmail = normalizedEmail === 'mdanyalkayani77@gmail.com' || normalizedEmail === 'gotify.pk@gmail.com';
          if (isSuperAdminEmail) {
            errorMessage = 'Super Admin account detected. Please use "Continue with Google" for first-time access or if you forgot your password.';
          } else {
            errorMessage = 'Invalid email or password. Please double-check your credentials. If you have an account but forgot your password, use the "Forgot?" link. If you are new, please Sign Up.';
          }
        } else if (e.code === 'auth/too-many-requests') {
          errorMessage = 'Too many failed login attempts. Please try again later or reset your password.';
        } else if (e.code === 'auth/operation-not-allowed') {
          errorMessage = 'Email/Password login is not enabled. Please contact the administrator.';
        } else if (e.code === 'auth/invalid-email') {
          errorMessage = 'The email address is badly formatted.';
        }
        
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('AuthContext: Email login error:', error);
      toast.error(error.message || 'Failed to log in.');
    } finally {
      setAuthInProgress(false);
    }
  };

  const signUp = async (email: string, pass: string, displayName: string) => {
    if (authInProgress) return;
    setAuthInProgress(true);
    const normalizedEmail = email.toLowerCase().trim();
    console.log('AuthContext: Attempting sign up for:', normalizedEmail);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, normalizedEmail, pass);
      const firebaseUser = userCred.user;
      console.log('AuthContext: Firebase Auth user created:', firebaseUser.uid);
      
      await updateProfile(firebaseUser, { displayName });
      console.log('AuthContext: Profile updated with displayName:', displayName);
      
      const newUser: User = {
        uid: firebaseUser.uid,
        email: normalizedEmail,
        displayName,
        photoURL: '',
        role: 'customer',
        createdAt: new Date().toISOString(),
      };
      
      console.log('AuthContext: Attempting to create Firestore user doc');
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        console.log('AuthContext: Firestore user doc created');
      } catch (e) {
        console.warn('AuthContext: Failed to create Firestore user doc during signup, onAuthStateChanged will retry');
      }
      
      setUser(newUser);
      toast.success('Account created successfully!');
    } catch (error: any) {
      console.error('AuthContext: Sign up error:', error);
      let errorMessage = 'Failed to create account.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please try signing in or use the "Forgot?" link to reset your password.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use at least 6 characters.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      }
      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setAuthInProgress(false);
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

  const isSuperAdmin = user?.email === 'mdanyalkayani77@gmail.com' || user?.email === 'gotify.pk@gmail.com';
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
    <AuthContext.Provider value={{ user, loading, login, loginWithEmail, signUp, resetPassword, logout, isAdmin, isSuperAdmin, isCashier, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
