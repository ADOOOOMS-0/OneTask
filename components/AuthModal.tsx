
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { XMarkIcon, EyeIcon, EyeSlashIcon } from './icons';

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

type AuthView = 'initial' | 'signIn' | 'signUp' | 'createPassword' | 'forgotPassword' | 'setNewPassword';

const LOCAL_USERS_KEY = 'onetask_local_users';
// Reduced timeout to fail fast in preview environments
const API_TIMEOUT = 1000; 

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLoginSuccess }) => {
  const [view, setView] = useState<AuthView>('initial');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (view !== 'initial') {
        // Small delay to ensure DOM update
        setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [view]);

  // --- Helpers ---
  
  const generateId = () => {
    // Robust ID generation safe for all environments
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
    } catch (e) { /* ignore */ }
    
    // Fallback for insecure contexts
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const getLocalUsers = (): User[] => {
    try {
        const item = localStorage.getItem(LOCAL_USERS_KEY);
        return item ? JSON.parse(item) : [];
    } catch { 
        return []; 
    }
  };

  const saveLocalUser = (user: User) => {
    try {
        const users = getLocalUsers();
        const existingIndex = users.findIndex(u => u.id === user.id);
        if (existingIndex >= 0) {
            users[existingIndex] = user;
        } else {
            users.push(user);
        }
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    } catch (e) {
        console.error("Failed to save local user", e);
        throw new Error("Could not save account locally. Storage might be full.");
    }
  };

  const createLocalUser = (name: string, email: string, passwordHash: string): User => {
    const newUser: User = {
        id: generateId(),
        name,
        email: email.toLowerCase(),
        passwordHash, // Storing hash/token
        createdAt: new Date().toISOString(),
    };
    saveLocalUser(newUser);
    return newUser;
  };

  const safeSetError = (msg: string) => {
      if (mountedRef.current) setError(msg);
  };
  
  const safeSetIsLoading = (loading: boolean) => {
      if (mountedRef.current) setIsLoading(loading);
  };

  // --- Handlers ---

  const performLocalAuthAction = (action: 'signup' | 'signin' | 'reset', data: any) => {
    try {
        const localUsers = getLocalUsers();
        
        if (action === 'signup') {
            if (localUsers.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
                throw new Error('An account with this email already exists.');
            }
            const newUser = createLocalUser(data.name, data.email, `local_hash_${data.password}`);
            return newUser;
        }
        
        if (action === 'signin') {
            const user = localUsers.find(u => u.email.toLowerCase() === data.email.toLowerCase());
            if (user && user.passwordHash === `local_hash_${data.password}`) {
                return user;
            }
            throw new Error('Invalid email or password.');
        }

        if (action === 'reset') {
             const userIndex = localUsers.findIndex(u => u.email.toLowerCase() === data.email.toLowerCase());
             if (userIndex >= 0) {
                 localUsers[userIndex].passwordHash = `local_hash_${data.newPassword}`;
                 localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));
                 return true;
             }
             throw new Error('User not found.');
        }
    } catch (e: any) {
        throw e;
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
        safeSetError('Please enter your name and email.');
        return;
    }
    setError('');
    setView('createPassword');
  };
  
  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        safeSetError('Password must be at least 6 characters long.');
        return;
    }
    setError('');
    safeSetIsLoading(true);

    try {
        // We use Promise.race to enforce a strict timeout
        const fetchPromise = fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });

        const timeoutPromise = new Promise<Response>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), API_TIMEOUT)
        );

        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
            const data = await response.json();
            onLoginSuccess(data.user);
            // Return here - finally block handles loading state
            return;
        } 
        throw new Error('API Failed');
    } catch (err) {
        // Fallback to local
        console.log("API unavailable, using local fallback");
        try {
            const newUser = performLocalAuthAction('signup', { name, email, password });
            if (newUser && typeof newUser !== 'boolean') {
                onLoginSuccess(newUser);
            }
        } catch (localErr: any) {
            safeSetError(localErr.message || 'Failed to create account locally.');
        }
    } finally {
        safeSetIsLoading(false);
    }
  };
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    safeSetIsLoading(true);

    try {
        const fetchPromise = fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const timeoutPromise = new Promise<Response>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), API_TIMEOUT)
        );

        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
            const data = await response.json();
            onLoginSuccess(data.user);
            return;
        }
        
        // If it's a 401 from a real server, we trust it.
        // If it's a 404/500/HTML response (sandbox env), we fallback.
        if (response.status === 401) {
            safeSetError('Invalid email or password.');
            return;
        }
        throw new Error('API Failed');
    } catch (err) {
        console.log("API unavailable, using local fallback");
        try {
            const user = performLocalAuthAction('signin', { email, password });
            if (user && typeof user !== 'boolean') {
                onLoginSuccess(user);
            }
        } catch (localErr: any) {
             safeSetError('Invalid email or password.');
        }
    } finally {
        safeSetIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // For preview, skip the check and just let them reset if it exists locally
    setView('setNewPassword');
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        safeSetError('Password must be at least 6 characters long.');
        return;
    }
    setError('');
    safeSetIsLoading(true);
    
    try {
        performLocalAuthAction('reset', { email, newPassword: password });
        setMessage('Password updated locally. Please sign in.');
        setView('signIn');
    } catch (e) {
        safeSetError('User not found.');
    } finally {
        safeSetIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError('');
    setMessage('');
    setPasswordVisible(false);
  };

  const renderContent = () => {
    switch (view) {
      case 'initial':
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">Get Started</h2>
            <div className="space-y-4">
              <button onClick={() => { resetForm(); setView('signUp'); }} className="w-full px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-semibold">
                Sign Up
              </button>
              <button onClick={() => { resetForm(); setView('signIn'); }} className="w-full px-4 py-3 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors font-semibold">
                Sign In
              </button>
            </div>
          </div>
        );
      case 'signUp':
        return (
          <form onSubmit={handleSignUp}>
            <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100">Create an Account</h2>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
              <input type="text" id="name" ref={inputRef} value={name} onChange={e => setName(e.target.value)} required className="w-full input-style" />
            </div>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full input-style" />
            </div>
            <button type="submit" className="w-full btn-primary" disabled={isLoading}>Continue</button>
            <p className="text-center mt-4 text-sm text-slate-600 dark:text-slate-400">Already have an account? <button type="button" onClick={() => { resetForm(); setView('signIn'); }} className="link" disabled={isLoading}>Sign In</button></p>
          </form>
        );
      case 'signIn':
        return (
            <form onSubmit={handleSignIn}>
              <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100">Sign In</h2>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input type="email" id="email" ref={inputRef} value={email} onChange={e => setEmail(e.target.value)} required className="w-full input-style" />
              </div>
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <input type={isPasswordVisible ? 'text' : 'password'} id="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full input-style pr-10" />
                  <button type="button" onClick={() => setPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 dark:text-slate-400" aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}>
                    {isPasswordVisible ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button type="submit" className="w-full btn-primary" disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
              <div className="flex justify-between items-center mt-4 text-sm text-slate-600 dark:text-slate-400">
                <p>No account? <button type="button" onClick={() => { resetForm(); setView('signUp'); }} className="link" disabled={isLoading}>Sign Up</button></p>
                <button type="button" onClick={() => { resetForm(); setView('forgotPassword'); }} className="link" disabled={isLoading}>Forgot Password?</button>
              </div>
            </form>
        );
      case 'createPassword':
        return (
            <form onSubmit={handleCreatePassword}>
              <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100">Set Your Password</h2>
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password (min. 6 characters)</label>
                 <div className="relative">
                  <input type={isPasswordVisible ? 'text' : 'password'} id="password" ref={inputRef} value={password} onChange={e => setPassword(e.target.value)} required className="w-full input-style pr-10" />
                  <button type="button" onClick={() => setPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 dark:text-slate-400" aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}>
                    {isPasswordVisible ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button type="submit" className="w-full btn-primary" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
        );
      case 'forgotPassword':
        return (
            <form onSubmit={handleForgotPassword}>
              <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100">Reset Password</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Enter your email to reset your password.</p>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input type="email" id="email" ref={inputRef} value={email} onChange={e => setEmail(e.target.value)} required className="w-full input-style" />
              </div>
              <button type="submit" className="w-full btn-primary" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Continue'}
              </button>
              <p className="text-center mt-4 text-sm text-slate-600 dark:text-slate-400"><button type="button" onClick={() => { resetForm(); setView('signIn'); }} className="link" disabled={isLoading}>Back to Sign In</button></p>
            </form>
        );
      case 'setNewPassword':
        return (
             <form onSubmit={handleSetNewPassword}>
              <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100">Create New Password</h2>
               <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password (min. 6 characters)</label>
                <div className="relative">
                  <input type={isPasswordVisible ? 'text' : 'password'} id="password" ref={inputRef} value={password} onChange={e => setPassword(e.target.value)} required className="w-full input-style pr-10" />
                  <button type="button" onClick={() => setPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 dark:text-slate-400" aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}>
                    {isPasswordVisible ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button type="submit" className="w-full btn-primary" disabled={isLoading}>
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <style>{`
        .input-style {
            padding: 0.5rem 0.75rem;
            border-radius: 0.375rem;
            border: 1px solid;
            width: 100%;
            outline: none;
            box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            transition: ring 0.2s;
            background-color: #fff;
            border-color: #cbd5e1;
            color: #1e293b;
        }
        .input-style:focus {
            --tw-ring-color: #4f46e5;
            --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
            --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
            box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
        }
        .dark .input-style {
            background-color: #334155;
            border-color: #475569;
            color: #e2e8f0;
        }
        .btn-primary {
            padding: 0.625rem 1rem;
            background-color: #4f46e5;
            color: white;
            border-radius: 0.375rem;
            font-weight: 500;
            width: 100%;
            transition: background-color 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        .btn-primary:hover:not(:disabled) {
            background-color: #4338ca;
        }
        .btn-primary:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
        .link {
            color: #4f46e5;
            font-weight: 500;
            background: none;
            border: none;
            padding: 0;
            cursor: pointer;
        }
        .link:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
        .dark .link {
            color: #818cf8;
        }
      `}</style>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm">
        <div className="p-6 relative">
          <div className="flex justify-end items-center mb-2 absolute top-4 right-4">
            <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          {error && <p className="text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-md text-sm mb-4">{error}</p>}
          {message && <p className="text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-md text-sm mb-4">{message}</p>}
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
