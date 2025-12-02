
import React, { useState, useEffect } from 'react';
import { Priority, Task } from '../types';
import { XMarkIcon } from './icons';

interface EditTaskModalProps {
  task: Task;
  onClose: () => void;
  onSave: (updatedTask: Task) => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, onClose, onSave }) => {
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [estimatedTime, setEstimatedTime] = useState(task.estimatedTime?.toString() || '');
  
  const [autoPromoteDate, setAutoPromoteDate] = useState(task.autoPromoteDate || '');
  const [isAutoPromoteEnabled, setIsAutoPromoteEnabled] = useState(!!task.autoPromoteDate);

  const [scheduledDate, setScheduledDate] = useState(task.scheduledDate || '');

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
      onSave({
        ...task,
        title: title.trim(),
        dueDate: dueDate || undefined,
        priority,
        estimatedTime: estimatedTime ? parseInt(estimatedTime, 10) : undefined,
        autoPromoteDate: (isAutoPromoteEnabled && autoPromoteDate) ? autoPromoteDate : undefined,
        scheduledDate: scheduledDate || undefined,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Edit Task</h2>
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

            <div className="mb-4">
                 <label htmlFor="scheduledDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Scheduled Appearance
                </label>
                <input
                    type="date"
                    id="scheduledDate"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 dark:bg-slate-700 dark:text-slate-200"
                />
                 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">If set to a future date, the task will move to "Scheduled Tasks". Clear to move to board immediately.</p>
            </div>

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
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditTaskModal;
