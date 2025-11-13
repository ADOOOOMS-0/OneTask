import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { XMarkIcon, EyeIcon, EyeSlashIcon } from './icons';

// In a real app, this would be a proper hashing function. For this simulation, we'll keep it simple.
const fakeHash = (str: string) => `hashed_${str}`;

interface AuthModalProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  onClose: () => void;
  onAccountCreated: (user: User) => void;
}

type AuthView = 'initial' | 'signIn' | 'signUp' | 'createPassword' | 'forgotPassword' | 'setNewPassword';

const AuthModal: React.FC<AuthModalProps> = ({ users, setUsers, onClose, onAccountCreated }) => {
  const [view, setView] = useState<AuthView>('initial');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  
  const [userForPasswordReset, setUserForPasswordReset] = useState<User | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [view]);

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        setError('An account with this email already exists.');
        return;
    }
    setView('createPassword');
  };
  
  const handleCreatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
    }
    setError('');
    const newUser: User = {
        id: crypto.randomUUID(),
        name,
        email,
        passwordHash: fakeHash(password),
        createdAt: new Date().toISOString(),
    };
    setUsers([...users, newUser]);
    onAccountCreated(newUser);
  };
  
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user && user.passwordHash === fakeHash(password)) {
        setError('');
        onAccountCreated(user);
    } else {
        setError('Invalid email or password.');
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
        setUserForPasswordReset(user);
        setView('setNewPassword');
    } else {
        setError('No account found with that email address.');
    }
  };

  const handleSetNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
    }
    if (userForPasswordReset) {
        const updatedUsers = users.map(u => 
            u.id === userForPasswordReset.id ? { ...u, passwordHash: fakeHash(password) } : u
        );
        setUsers(updatedUsers);
        setError('');
        setMessage('Your password has been reset successfully. Please sign in.');
        setView('signIn');
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
            <button type="submit" className="w-full btn-primary">Continue</button>
            <p className="text-center mt-4 text-sm">Already have an account? <button type="button" onClick={() => { resetForm(); setView('signIn'); }} className="link">Sign In</button></p>
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
              <button type="submit" className="w-full btn-primary">Sign In</button>
              <div className="flex justify-between items-center mt-4 text-sm">
                <p>No account? <button type="button" onClick={() => { resetForm(); setView('signUp'); }} className="link">Sign Up</button></p>
                <button type="button" onClick={() => { resetForm(); setView('forgotPassword'); }} className="link">Forgot Password?</button>
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
              <button type="submit" className="w-full btn-primary">Create Account</button>
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
              <button type="submit" className="w-full btn-primary">Continue</button>
              <p className="text-center mt-4 text-sm"><button type="button" onClick={() => { resetForm(); setView('signIn'); }} className="link">Back to Sign In</button></p>
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
              <button type="submit" className="w-full btn-primary">Reset Password</button>
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
        .light .input-style {
            background-color: #fff;
            border-color: #cbd5e1;
            color: #1e293b;
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