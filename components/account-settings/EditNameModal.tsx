
import React, { useState } from 'react';
import { User } from '../../types';
import { XMarkIcon } from '../icons';

interface EditNameModalProps {
    user: User;
    onUpdateUser: (
        updates: { name?: string; email?: string; newPassword?: string; profilePicture?: string | null },
        currentPassword?: string
    ) => Promise<{ success: boolean; message: string }>;
    onClose: () => void;
}

const EditNameModal: React.FC<EditNameModalProps> = ({ user, onUpdateUser, onClose }) => {
    const [name, setName] = useState(user.name);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!name.trim()) {
            setError("Name cannot be empty.");
            return;
        }

        setIsLoading(true);
        const { success, message } = await onUpdateUser({ name: name.trim() }, password);
        setIsLoading(false);

        if (success) {
            setSuccess(message);
            setTimeout(onClose, 1500);
        } else {
            setError(message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[51] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Edit Name</h2>
                        <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {error && <p className="text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-md text-sm mb-4">{error}</p>}
                    {success && <p className="text-green-600 bg-green-100 dark:bg-green-900/50 p-3 rounded-md text-sm mb-4">{success}</p>}

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="edit-name">
                            New Name
                        </label>
                        <input
                            type="text"
                            id="edit-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 dark:bg-slate-700 dark:text-slate-200"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="current-password-name">
                            Confirm with password
                        </label>
                        <input
                            type="password"
                            id="current-password-name"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 dark:bg-slate-700 dark:text-slate-200"
                        />
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50">
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditNameModal;
