import React from 'react';
import { Task, Priority } from '../types';
import { XMarkIcon, PencilIcon, TrashIcon } from './icons';

interface ScheduledTasksModalProps {
  tasks: Task[];
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const ScheduledTasksModal: React.FC<ScheduledTasksModalProps> = ({ tasks, onClose, onEdit, onDelete }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Scheduled Tasks</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">These tasks are hidden until their scheduled date.</p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
              <XMarkIcon className="w-6 h-6" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
            {tasks.length > 0 ? (
                 <div className="space-y-4">
                    {tasks.map(task => (
                        <div key={task.id} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg flex items-center justify-between border border-slate-200 dark:border-slate-600">
                            <div>
                                <h3 className="font-medium text-slate-800 dark:text-slate-200">{task.title}</h3>
                                <div className="flex items-center gap-3 mt-1 text-sm">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                                        task.priority === Priority.High ? 'bg-red-50 text-red-700 border-red-200' :
                                        task.priority === Priority.Medium ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                        'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}>
                                        {task.priority}
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400">
                                        Appears on: {task.scheduledDate ? new Date(task.scheduledDate).toLocaleDateString() : 'Unknown'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onEdit(task)}
                                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                    aria-label="Edit task"
                                >
                                    <PencilIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => onDelete(task.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                    aria-label="Delete task"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                 </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                    <p>No scheduled tasks.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ScheduledTasksModal;