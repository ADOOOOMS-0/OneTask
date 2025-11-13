import React, { useState } from 'react';
import { XMarkIcon } from './icons';

interface AutoPrioritySettingsModalProps {
  selectedDays: number[];
  onClose: () => void;
  onSave: (days: number[]) => void;
}

const daysOfWeek = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];

const AutoPrioritySettingsModal: React.FC<AutoPrioritySettingsModalProps> = ({ selectedDays, onClose, onSave }) => {
  const [currentSelection, setCurrentSelection] = useState<number[]>(selectedDays);

  const handleToggleDay = (dayValue: number) => {
    setCurrentSelection(prev =>
      prev.includes(dayValue) ? prev.filter(d => d !== dayValue) : [...prev, dayValue]
    );
  };

  const handleSave = () => {
    onSave(currentSelection);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Auto-Priority Settings</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
                Select days of the week to automatically promote Medium priority tasks to High priority.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {daysOfWeek.map(day => (
                <label key={day.value} className="flex items-center gap-2 p-3 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={currentSelection.includes(day.value)}
                    onChange={() => handleToggleDay(day.value)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{day.label}</span>
                </label>
              ))}
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
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoPrioritySettingsModal;