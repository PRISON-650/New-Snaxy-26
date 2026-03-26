import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, LogIn, Chrome, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { user, login, loginWithEmail, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [isEmailLogin, setIsEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Automatically close modal when user is logged in
  useEffect(() => {
    if (user && isOpen) {
      onClose();
    }
  }, [user, isOpen, onClose]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await login();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === 'signin') {
        await loginWithEmail(email, password);
      } else {
        if (!displayName) {
          toast.error('Please enter your name');
          return;
        }
        await signUp(email, password, displayName);
      }
    } catch (error: any) {
      console.error('LoginModal: Auth error:', error);
      // If email already in use, offer to switch to sign in
      if (error.message && (error.message.includes('already registered') || error.message.includes('email-already-in-use'))) {
        toast.info('This email is already registered. Switching to Sign In.');
        setMode('signin');
        setIsEmailLogin(true);
      } else {
        toast.error(error.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setIsEmailLogin(true); // Default to email when switching to signup
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black tracking-tight uppercase">
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {mode === 'signin' && !isEmailLogin && (
                  <button
                    disabled={isLoading}
                    onClick={handleGoogleLogin}
                    className="w-full py-4 bg-white border-2 border-neutral-100 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-neutral-50 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-5 h-5 border-2 border-neutral-200 border-t-blue-500 rounded-full"
                      />
                    ) : (
                      <Chrome className="w-5 h-5 text-blue-500" />
                    )}
                    Continue with Google
                  </button>
                )}

                {(mode === 'signup' || isEmailLogin) && (
                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-neutral-100"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase font-black tracking-widest text-neutral-400">
                      <span className="bg-white px-4">
                        {mode === 'signin' ? 'Or use email' : 'Enter your details'}
                      </span>
                    </div>
                  </div>
                )}

                {!isEmailLogin && mode === 'signin' ? (
                  <button
                    onClick={() => setIsEmailLogin(true)}
                    className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Mail className="w-5 h-5" />
                    Sign in with Email
                  </button>
                ) : (
                  <form onSubmit={handleAuth} className="space-y-4">
                    {mode === 'signup' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Full Name</label>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                          <input
                            required
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                            placeholder="John Doe"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <input
                          required
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                          placeholder="your@email.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center ml-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Password</label>
                        {mode === 'signin' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!email) {
                                toast.error('Please enter your email first');
                                return;
                              }
                              resetPassword(email);
                            }}
                            className="text-xs font-black uppercase tracking-widest text-orange-600 hover:underline px-2 py-1 bg-orange-50 rounded-lg"
                          >
                            Forgot?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <input
                          required
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-12 pr-12 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {mode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => setIsEmailLogin(false)}
                          className="flex-1 py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
                        >
                          Back
                        </button>
                      )}
                      <button
                        disabled={isLoading}
                        type="submit"
                        className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                            Processing...
                          </span>
                        ) : (
                          <>
                            {mode === 'signin' ? 'Sign In' : 'Create Account'}
                            <LogIn className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="pt-4 border-t border-neutral-100 space-y-4">
                <button
                  onClick={toggleMode}
                  className="w-full text-center text-sm font-bold text-neutral-600 hover:text-orange-600 transition-colors"
                >
                  {mode === 'signin' 
                    ? "Don't have an account? Sign Up" 
                    : "Already have an account? Sign In"}
                </button>
                
                {mode === 'signin' && (
                  <p className="text-center text-[10px] text-neutral-400 uppercase tracking-widest font-black">
                    Trouble signing in? <button onClick={() => setMode('signup')} className="text-orange-600 hover:underline">Create a new account</button>
                  </p>
                )}
              </div>

              <p className="text-center text-xs text-neutral-400 leading-relaxed">
                By signing in, you agree to our <span className="text-neutral-900 font-bold">Terms of Service</span> and <span className="text-neutral-900 font-bold">Privacy Policy</span>.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
