
import React, { useState } from 'react';
import { XMarkIcon } from './icons';

interface AddListModalProps {
  onClose: () => void;
  onAddList: (name: string, icon?: string) => void;
}

const AddListModal: React.FC<AddListModalProps> = ({ onClose, onAddList }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [error, setError] = useState<string | null>(null);

  const commonEmojis = ['📁', '💼', '🏠', '🎓', '🚀', '🛠️', '🎨', '🛒', '📅', '💡'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAddList(name.trim(), icon.trim() || undefined);
      onClose();
    } else {
      setError('List name is required');
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (error) setError(null);
  };

  const renderIcon = (icon?: string, className: string = "w-6 h-6", emojiSize: string = "text-2xl") => {
    if (!icon) return <span className={`${emojiSize} text-slate-400`}>📁</span>;
    
    if (icon.startsWith('http')) {
      return <img src={icon} alt="List icon" className={`${className} object-cover rounded-md`} referrerPolicy="no-referrer" />;
    }
    
    return <span className={emojiSize}>{icon}</span>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Add New List</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="listName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                List Name
              </label>
              <input
                type="text"
                id="listName"
                autoFocus
                value={name}
                onChange={handleNameChange}
                className={`w-full px-3 py-2 border ${
                  error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-600 focus:ring-indigo-500'
                } rounded-md shadow-sm focus:outline-none focus:ring-2 bg-white text-slate-900 dark:bg-slate-700 dark:text-slate-200`}
                placeholder="e.g., Work, Personal, School"
              />
              {error && (
                <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Icon
              </label>
              <div className="flex gap-4 items-start">
                <div className="flex flex-col gap-1 items-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden relative group">
                    {renderIcon(icon, "w-12 h-12", "text-4xl")}
                    <input
                      type="text"
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      title="Paste emoji or URL here"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">Paste icon/URL</span>
                </div>
                <div className="flex-1">
                  <div className="flex gap-1.5 mb-2 flex-wrap">
                    {commonEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        className={`w-8 h-8 flex items-center justify-center rounded-md border ${
                          icon === emoji ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-600'
                        } hover:border-indigo-300 transition-colors text-lg`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Add List
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddListModal;
