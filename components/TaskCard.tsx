
import React, { useState, useMemo } from 'react';
import { Task } from '../types';
import { PencilIcon, TrashIcon, ClockIcon, ExclamationCircleIcon } from './icons';

interface TaskCardProps {
  task: Task;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onComplete: (taskId: string) => void;
}

const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};


const TaskCard: React.FC<TaskCardProps> = ({ task, onDelete, onEdit, onComplete }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Calculate Overdue Status (Robust Date Comparison)
  const dateInfo = useMemo(() => {
    if (!task.dueDate) return { formatted: 'N/A', isOverdue: false };

    // Create dates in local time (midnight to midnight comparison)
    const [y, m, d] = task.dueDate.split('-').map(Number);
    const dueDateObj = new Date(y, m - 1, d); // Month is 0-indexed
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const formatted = dueDateObj.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    // Overdue if strictly less than today (yesterday or earlier)
    const isOverdue = dueDateObj < today;

    return { formatted, isOverdue };
  }, [task.dueDate]);

  const handleComplete = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete(task.id);
    }, 300); // Animation duration
  };

  return (
    <div
      className={`relative p-4 rounded-lg shadow-sm border transition-all duration-300 ease-in-out ${
        isFadingOut ? 'opacity-0 scale-95' : 'hover:shadow-md hover:-translate-y-1'
      } ${
        dateInfo.isOverdue 
            ? 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-800' 
            : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
      }`}
    >
      {/* Overdue Badge */}
      {dateInfo.isOverdue && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 flex items-center gap-1">
            <ExclamationCircleIcon className="w-3 h-3" />
            OVERDUE
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-grow mr-2 min-w-0">
          <input
            type="checkbox"
            checked={isFadingOut}
            onChange={handleComplete}
            className={`mt-1 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer ${dateInfo.isOverdue ? 'border-red-400' : 'border-gray-300'}`}
            aria-label={`Complete task: ${task.title}`}
          />
          <div className="flex-1 min-w-0">
            <p className={`font-medium truncate ${dateInfo.isOverdue ? 'text-red-900 dark:text-red-200' : 'text-slate-800 dark:text-slate-200'}`}>
              {task.title}
            </p>
             <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
                <div className={`whitespace-nowrap ${dateInfo.isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
                    Due: {dateInfo.formatted}
                </div>
                <div className="flex items-center gap-1 whitespace-nowrap">
                    <ClockIcon className="w-4 h-4 shrink-0" />
                    <span>{task.estimatedTime ? formatTime(task.estimatedTime) : 'N/A'}</span>
                </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
            <button
                onClick={() => onEdit(task)}
                className={`transition-colors p-1 ${dateInfo.isOverdue ? 'text-red-400 hover:text-red-600' : 'text-slate-400 hover:text-indigo-500'}`}
                aria-label="Edit task"
            >
                <PencilIcon className="w-5 h-5" />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                className={`transition-colors p-1 ${dateInfo.isOverdue ? 'text-red-400 hover:text-red-600' : 'text-slate-400 hover:text-red-500'}`}
                aria-label="Delete task"
            >
                <TrashIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
