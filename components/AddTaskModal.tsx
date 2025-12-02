
import React, { useState, useEffect } from 'react';
import { Priority, Task } from '../types';
import { XMarkIcon } from './icons';

interface AddTaskModalProps {
  onClose: () => void;
  onAddTask: (task: Omit<Task, 'id'>) => void;
  initialPriority: Priority;
  isScheduling: boolean;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ onClose, onAddTask, initialPriority, isScheduling }) => {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>(initialPriority);
  const [estimatedTime, setEstimatedTime] = useState('');
  
  // Auto-promote logic
  const [autoPromoteDate, setAutoPromoteDate] = useState('');
  const [isAutoPromoteEnabled, setIsAutoPromoteEnabled] = useState(false);

  // Scheduling logic
  const [scheduledDate, setScheduledDate] = useState('');

  // Set default scheduled date if in scheduling mode
  useEffect(() => {
    if (isScheduling && !scheduledDate) {
        const tmrw = new Date();
        tmrw.setDate(tmrw.getDate() + 1);
        const yyyy = tmrw.getFullYear();
        const mm = String(tmrw.getMonth() + 1).padStart(2, '0');
        const dd = String(tmrw.getDate()).padStart(2, '0');
        setScheduledDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [isScheduling, scheduledDate]);

  // Reset auto promote if priority changes away from Low
  useEffect(() => {
    if (priority !== Priority.Low) {
        setIsAutoPromoteEnabled(false);
        setAutoPromoteDate('');
    }
  }, [priority]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAddTask({ 
          title: title.trim(), 
          dueDate: dueDate || undefined, 
          priority, 
          estimatedTime: estimatedTime ? parseInt(estimatedTime, 10) : undefined,
          autoPromoteDate: (isAutoPromoteEnabled && autoPromoteDate) ? autoPromoteDate : undefined,
          scheduledDate: (isScheduling && scheduledDate) ? scheduledDate : undefined,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {isScheduling ? 'Schedule Task' : 'Add New Task'}
            </h2>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Task Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 dark:bg-slate-700 dark:text-slate-200"
                placeholder="e.g., Read Chapter 3"
                required
              />
            </div>
            
            {isScheduling && (
                 <div className="mb-4 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-md border border-indigo-100 dark:border-indigo-800">
                    <label htmlFor="scheduledDate" className="block text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                        Schedule to appear on
                    </label>
                    <input
                        type="date"
                        id="scheduledDate"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 dark:bg-slate-700 dark:text-slate-200"
                        required={isScheduling}
                    />
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Task will be hidden from the board until this date.</p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Due Date
                    </label>
                    <input
                        type="date"
                        id="dueDate"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 dark:bg-slate-700 dark:text-slate-200"
                    />
                </div>
                 <div>
                    <label htmlFor="estimatedTime" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Time (minutes)
                    </label>
                    <input
                        type="number"
                        id="estimatedTime"
                        value={estimatedTime}
                        onChange={(e) => setEstimatedTime(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 dark:bg-slate-700 dark:text-slate-200"
                        placeholder="e.g., 60"
                        min="0"
                    />
                </div>
            </div>
            <div className="mb-4">
              <label htmlFor="priority" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 dark:bg-slate-700 dark:text-slate-200"
              >
                {Object.values(Priority).map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            {priority === Priority.Low && (
              <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-600">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input 
                          type="checkbox"
                          checked={isAutoPromoteEnabled}
                          onChange={(e) => {
                            setIsAutoPromoteEnabled(e.target.checked);
                            if (e.target.checked && !autoPromoteDate) {
                                // Default to tomorrow if not set
                                const tmrw = new Date();
                                tmrw.setDate(tmrw.getDate() + 1);
                                setAutoPromoteDate(tmrw.toISOString().split('T')[0]);
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto-promote to Medium</span>
                  </label>
                  
                  {isAutoPromoteEnabled && (
                      <div className="pl-6 animate-fadeIn">
                          <label htmlFor="promoteDate" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                              Promote on date
                          </label>
                          <input
                              type="date"
                              id="promoteDate"
                              value={autoPromoteDate}
                              onChange={(e) => setAutoPromoteDate(e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-200"
                              required={isAutoPromoteEnabled}
                          />
                          <p className="mt-1 text-xs text-slate-400">Task will move to Medium priority on this day.</p>
                      </div>
                  )}
              </div>
            )}

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
                {isScheduling ? 'Schedule Task' : 'Add Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddTaskModal;
