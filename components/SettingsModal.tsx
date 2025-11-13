

import React, { useState, useEffect } from 'react';
import { XMarkIcon, SunIcon, MoonIcon, ComputerDesktopIcon } from './icons';
import ToggleSwitch from './ToggleSwitch';
import { User, CompletedTask } from '../types';
import CompletedTasksView from './CompletedTasksView';

interface Settings {
  theme: 'light' | 'dark' | 'system';
  isAutoPriorityModeEnabled: boolean;
  autoPriorityDays: number[];
  autoPriorityHours: number;
  isAutoRotationEnabled: boolean;
}

type EditingField = 'picture' | 'name' | 'email' | 'password';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSettings: (settings: Settings) => void;
  initialSettings: Settings;
  currentUser: User;
  onUpdateUser: (updates: { name?: string; email?: string; newPassword?: string; profilePicture?: string | null }, currentPassword?: string) => { success: boolean; message: string };
  onDeleteUser: (password: string) => { success: boolean; message: string };
  onEditField: (field: EditingField) => void;
  completedTasks: CompletedTask[];
  onPermanentlyDeleteTask: (taskId: string) => void;
}

const daysOfWeek = [
    { label: 'Sunday', value: 0 }, { label: 'Monday', value: 1 }, { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 }, { label: 'Thursday', value: 4 }, { label: 'Friday', value: 5 }, { label: 'Saturday', value: 6 },
];

const maskEmail = (email: string) => {
    const [name, domain] = email.split('@');
    if (!domain) return email;
    const maskedName = name.length > 2 ? `${name.substring(0, 2)}***` : `${name.substring(0, 1)}***`;
    return `${maskedName}@${domain}`;
};

const getInitials = (name: string) => {
    const names = name.split(' ');
    const initials = names.map(n => n[0]).join('');
    return initials.slice(0, 2).toUpperCase();
};

const InfoRow = ({ label, value, onEdit }: { label: string, value: React.ReactNode, onEdit?: () => void }) => (
    <div className="flex items-center justify-between">
        <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <div className="text-lg text-slate-800 dark:text-slate-100">{value}</div>
        </div>
        {onEdit && (
            <button onClick={onEdit} className="px-3 py-1.5 text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">Edit</button>
        )}
    </div>
);

const ThemeOption = ({ label, icon, isSelected, onClick }: { label: string, icon: React.ReactNode, isSelected: boolean, onClick: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all duration-200 ${
            isSelected
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 hover:border-slate-400 dark:hover:border-slate-500'
        }`}
        aria-pressed={isSelected}
    >
        {icon}
        <span className={`mt-2 font-medium text-sm ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>{label}</span>
    </button>
);


const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSaveSettings, initialSettings, currentUser, onUpdateUser, onDeleteUser, onEditField, completedTasks, onPermanentlyDeleteTask }) => {
  const [activeTab, setActiveTab] = useState('account');
  const [draftSettings, setDraftSettings] = useState<Settings>(initialSettings);

  // State for Account tab
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDraftSettings(initialSettings);
      setActiveTab('account');
      setIsConfirmingDelete(false);
      setDeletePassword('');
      setDeleteError('');
    }
  }, [isOpen, initialSettings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(draftSettings);
    onClose();
  };

  const handleToggleDay = (dayValue: number) => {
    const currentDays = draftSettings.autoPriorityDays || [];
    const newDays = currentDays.includes(dayValue)
        ? currentDays.filter(d => d !== dayValue)
        : [...currentDays, dayValue];
    setDraftSettings({ ...draftSettings, autoPriorityDays: newDays });
  };
  
  const TABS = [
    { id: 'account', label: 'My Account'},
    { id: 'autoPriority', label: 'Auto-Priority Tools' },
    { id: 'completed', label: 'Completed Tasks' },
    { id: 'theme', label: 'Theme' },
  ];

  const handleDeleteAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    const { success, message } = onDeleteUser(deletePassword);
    if (!success) {
        setDeleteError(message);
    }
    // On success, App.tsx will handle logout and closing the modal.
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
          <h2 id="settings-modal-title" className="text-xl font-bold text-slate-800 dark:text-slate-100">Settings</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="flex flex-grow overflow-hidden">
          <aside className="w-1/3 md:w-1/4 border-r border-slate-200 dark:border-slate-700 p-4">
            <nav>
              <ul>
                {TABS.map(tab => (
                    <li key={tab.id}>
                        <button 
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            {tab.label}
                        </button>
                    </li>
                ))}
              </ul>
            </nav>
          </aside>

          <main className="w-2/3 md:w-3/4 p-6 overflow-y-auto">
            {activeTab === 'account' && (
                <div>
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="relative flex-shrink-0">
                                <div className="w-24 h-24 rounded-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 ring-4 ring-white dark:ring-slate-800">
                                    {currentUser.profilePicture ? (
                                        <img src={currentUser.profilePicture} alt="Profile" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <span className="text-3xl font-bold">{getInitials(currentUser.name)}</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{currentUser.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Member since {new Date(currentUser.createdAt).toLocaleDateString()}
                                </p>
                                <button onClick={() => onEditField('picture')} className="mt-3 px-3 py-1.5 text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">Change Picture</button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="bg-white dark:bg-slate-800/50 p-4 rounded-md">
                                <InfoRow label="Name" value={currentUser.name} onEdit={() => onEditField('name')} />
                            </div>
                            <div className="bg-white dark:bg-slate-800/50 p-4 rounded-md">
                                <InfoRow label="Email" value={maskEmail(currentUser.email)} onEdit={() => onEditField('email')} />
                            </div>
                            <div className="bg-white dark:bg-slate-800/50 p-4 rounded-md">
                                <InfoRow label="Password" value="••••••••" onEdit={() => onEditField('password')} />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-red-500/30">
                        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Danger Zone</h3>
                        {!isConfirmingDelete ? (
                            <>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                                    Permanently delete your account and all associated data. This action is irreversible.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => { setIsConfirmingDelete(true); setDeleteError(''); }}
                                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:ring-offset-slate-800 transition-colors"
                                >
                                    Delete My Account
                                </button>
                            </>
                        ) : (
                            <form onSubmit={handleDeleteAccount} className="mt-4 p-4 rounded-lg border border-red-500/50 bg-red-500/5 dark:bg-red-500/10">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    To confirm deletion, please enter your password.
                                </p>
                                {deleteError && <p className="text-red-500 text-sm my-2">{deleteError}</p>}
                                <div className="mt-2">
                                    <label htmlFor="delete-password" className="sr-only">Current Password</label>
                                    <input
                                        id="delete-password"
                                        type="password"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        required
                                        placeholder="Current Password"
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-slate-700 dark:text-slate-200"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsConfirmingDelete(false)}
                                        className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!deletePassword}
                                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Permanently Delete
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
            {activeTab === 'autoPriority' && (
              <section>
                <div className="flex items-start justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg mb-6">
                    <div className="flex-grow pr-4">
                        <h3 className="font-medium text-slate-700 dark:text-slate-200">Auto-Priority Rotation</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Automatically sort projects by the earliest due date, then by task priority and duration. This also enables sorting for tasks within each column.</p>
                    </div>
                    <ToggleSwitch 
                        checked={draftSettings.isAutoRotationEnabled}
                        onChange={(checked) => setDraftSettings({ ...draftSettings, isAutoRotationEnabled: checked })}
                        aria-label="Enable Auto-Priority Rotation"
                    />
                </div>
                
                <div className="flex items-start justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div className="flex-grow pr-4">
                        <h3 className="font-medium text-slate-700 dark:text-slate-200">Auto-Priority Mode</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">When enabled, Medium Priority tasks are automatically promoted to High Priority based on rules you set.</p>
                    </div>
                    <ToggleSwitch 
                        checked={draftSettings.isAutoPriorityModeEnabled}
                        onChange={(checked) => setDraftSettings({ ...draftSettings, isAutoPriorityModeEnabled: checked })}
                        aria-label="Enable Auto-Priority Mode"
                    />
                </div>
                
                <div className="mt-6 space-y-4">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100">Promotion Rules</h4>
                    
                    <div className={`p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg transition-opacity ${!draftSettings.isAutoPriorityModeEnabled && 'opacity-50'}`}>
                        <label htmlFor="promotion-hours" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Promote tasks due within:
                        </label>
                        <select
                            id="promotion-hours"
                            value={draftSettings.autoPriorityHours}
                            onChange={(e) => setDraftSettings({ ...draftSettings, autoPriorityHours: parseInt(e.target.value, 10) })}
                            className="w-full sm:w-1/2 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-200 disabled:opacity-75"
                            disabled={!draftSettings.isAutoPriorityModeEnabled}
                        >
                            <option value="24">24 hours (1 day)</option>
                            <option value="48">48 hours (2 days)</option>
                            <option value="72">72 hours (3 days)</option>
                            <option value="168">168 hours (1 week)</option>
                        </select>
                         <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            Promotes Medium priority tasks to High when the due date is within the selected timeframe.
                        </p>
                    </div>

                    <div className={`p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg transition-opacity ${!draftSettings.isAutoPriorityModeEnabled && 'opacity-50'}`}>
                         <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Promote tasks due on specific days:</h5>
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {daysOfWeek.map(day => (
                                <label key={day.value} className={`flex items-center gap-2 p-3 rounded-md border border-slate-200 dark:border-slate-700 transition-colors ${draftSettings.isAutoPriorityModeEnabled ? 'hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer' : 'cursor-not-allowed'}`}>
                                    <input
                                        type="checkbox"
                                        checked={draftSettings.autoPriorityDays.includes(day.value)}
                                        onChange={() => handleToggleDay(day.value)}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-75"
                                        disabled={!draftSettings.isAutoPriorityModeEnabled}
                                    />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{day.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                    Tasks revert to their original priority when this mode is off or rules no longer apply.
                </p>
              </section>
            )}
            {activeTab === 'completed' && (
                <CompletedTasksView tasks={completedTasks} onPermanentlyDelete={onPermanentlyDeleteTask} />
            )}
             {activeTab === 'theme' && (
                <section>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Appearance</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                        Choose how OneTask looks to you. Select a theme or sync with your system.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <ThemeOption
                            label="Light"
                            icon={<SunIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />}
                            isSelected={draftSettings.theme === 'light'}
                            onClick={() => setDraftSettings({ ...draftSettings, theme: 'light' })}
                        />
                        <ThemeOption
                            label="Dark"
                            icon={<MoonIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />}
                            isSelected={draftSettings.theme === 'dark'}
                            onClick={() => setDraftSettings({ ...draftSettings, theme: 'dark' })}
                        />
                        <ThemeOption
                            label="System"
                            icon={<ComputerDesktopIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />}
                            isSelected={draftSettings.theme === 'system'}
                            onClick={() => setDraftSettings({ ...draftSettings, theme: 'system' })}
                        />
                    </div>
                </section>
            )}
          </main>
        </div>

        <footer className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
};

export default SettingsModal;