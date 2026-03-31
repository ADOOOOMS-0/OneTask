
import React from 'react';
import { Task, Priority, Recurrence } from '../types';
import { XMarkIcon, CalendarDaysIcon } from './icons';

interface ScheduledTasksModalProps {
  projects: { id: string; name: string; tasks: Task[] }[];
  onClose: () => void;
  onEditTask: (task: Task, projectId?: string) => void;
}

const ScheduledTasksModal: React.FC<ScheduledTasksModalProps> = ({ projects, onClose, onEditTask }) => {
  const allScheduledTasks = projects.flatMap(p => 
    p.tasks
      .filter(t => t.scheduledDate || (t.recurrence && t.recurrence !== Recurrence.None))
      .map(t => ({ ...t, projectId: p.id, projectName: p.name }))
  ).sort((a, b) => {
    if (a.scheduledDate && b.scheduledDate) return a.scheduledDate.localeCompare(b.scheduledDate);
    if (a.scheduledDate) return -1;
    if (b.scheduledDate) return 1;
    return 0;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Scheduled & Recurring Tasks</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {allScheduledTasks.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDaysIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">No scheduled or recurring tasks found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allScheduledTasks.map(task => (
                <div 
                  key={task.id} 
                  className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer group"
                  onClick={() => onEditTask(task, task.projectId)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {task.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                        task.priority === Priority.High ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
                        task.priority === Priority.Medium ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' :
                        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Project:</span>
                      {task.projectName}
                    </div>
                    {task.scheduledDate && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Scheduled:</span>
                        {task.scheduledDate}
                      </div>
                    )}
                    {task.recurrence && task.recurrence !== Recurrence.None && (
                      <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                        <span className="font-medium">Repeats:</span>
                        {task.recurrence.charAt(0).toUpperCase() + task.recurrence.slice(1)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 text-center">
            <p className="text-xs text-slate-400">Click on a task to edit its schedule or details.</p>
        </div>
      </div>
    </div>
  );
};

export default ScheduledTasksModal;
