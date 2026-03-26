import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, LogIn, Chrome } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { cn } from '../lib/utils';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login, loginWithEmail } = useAuth();
  const [isEmailLogin, setIsEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await loginWithEmail(email, password);
      onClose();
    } finally {
      setIsLoading(false);
    }
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
                <h2 className="text-3xl font-black tracking-tight">SIGN IN</h2>
                <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <button
                  onClick={login}
                  className="w-full py-4 bg-white border-2 border-neutral-100 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-neutral-50 transition-all active:scale-95"
                >
                  <Chrome className="w-5 h-5 text-blue-500" />
                  Continue with Google
                </button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-100"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase font-black tracking-widest text-neutral-400">
                    <span className="bg-white px-4">Or use email</span>
                  </div>
                </div>

                {!isEmailLogin ? (
                  <button
                    onClick={() => setIsEmailLogin(true)}
                    className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Mail className="w-5 h-5" />
                    Sign in with Email
                  </button>
                ) : (
                  <form onSubmit={handleEmailLogin} className="space-y-4">
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <input
                          required
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEmailLogin(false)}
                        className="flex-1 py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
                      >
                        Back
                      </button>
                      <button
                        disabled={isLoading}
                        type="submit"
                        className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                        <LogIn className="w-5 h-5" />
                      </button>
                    </div>
                  </form>
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
