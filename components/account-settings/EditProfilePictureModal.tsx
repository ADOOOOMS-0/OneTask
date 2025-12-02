
import React, { useState, useRef } from 'react';
import { User } from '../../types';
import { XMarkIcon } from '../icons';

interface EditProfilePictureModalProps {
    user: User;
    onUpdateUser: (
        updates: { name?: string; email?: string; newPassword?: string; profilePicture?: string | null },
        currentPassword?: string
    ) => Promise<{ success: boolean; message: string }>;
    onClose: () => void;
}

const getInitials = (name: string) => {
    const names = name.split(' ');
    const initials = names.map(n => n[0]).join('');
    return initials.slice(0, 2).toUpperCase();
};

const EditProfilePictureModal: React.FC<EditProfilePictureModalProps> = ({ user, onUpdateUser, onClose }) => {
    const [profilePicture, setProfilePicture] = useState(user.profilePicture);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                setError('File is too large. Please select an image under 2MB.');
                return;
            }
            setError('');
            const reader = new FileReader();
            reader.onload = () => setProfilePicture(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        const { success, message } = await onUpdateUser({ profilePicture });
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
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Edit Profile Picture</h2>
                        <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {error && <p className="text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-md text-sm mb-4">{error}</p>}
                    {success && <p className="text-green-600 bg-green-100 dark:bg-green-900/50 p-3 rounded-md text-sm mb-4">{success}</p>}

                    <div className="flex flex-col items-center gap-4 mb-6">
                        <div className="w-32 h-32 rounded-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 ring-4 ring-white dark:ring-slate-800">
                            {profilePicture ? (
                                <img src={profilePicture} alt="Profile" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <span className="text-4xl font-bold">{getInitials(user.name)}</span>
                            )}
                        </div>
                        <div className="flex gap-2">
                             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600">Change Photo</button>
                            {profilePicture && (
                                <button type="button" onClick={() => setProfilePicture(null)} className="px-3 py-1.5 text-sm text-slate-500 hover:text-red-600 dark:hover:text-red-400">Remove</button>
                            )}
                        </div>
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

export default EditProfilePictureModal;
