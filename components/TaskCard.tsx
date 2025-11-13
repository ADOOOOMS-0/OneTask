
import React, { useState } from 'react';
import { Task } from '../types';
import { PencilIcon, TrashIcon, ClockIcon } from './icons';

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

  let formattedDate = 'N/A';
  let isOverdue = false;

  if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      // Adjust for timezone to show correct date
      const userTimezoneOffset = dueDate.getTimezoneOffset() * 60000;
      const localDate = new Date(dueDate.getTime() + userTimezoneOffset);
      formattedDate = localDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      isOverdue = new Date() > localDate;
  }
  

  const handleComplete = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete(task.id);
    }, 300); // Animation duration
  };

  return (
    <div
      className={`bg-white dark:bg-slate-800/50 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out ${
        isFadingOut ? 'opacity-0 scale-95' : 'hover:shadow-md hover:-translate-y-1'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-grow mr-2 min-w-0">
          <input
            type="checkbox"
            checked={isFadingOut}
            onChange={handleComplete}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            aria-label={`Complete task: ${task.title}`}
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
              {task.title}
            </p>
             <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
                <div className={`whitespace-nowrap ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>
                    Due: {formattedDate}
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
                className="text-slate-400 hover:text-indigo-500 transition-colors p-1"
                aria-label="Edit task"
            >
                <PencilIcon className="w-5 h-5" />
            </button>
            <button
                onClick={() => onDelete(task.id)}
                className="text-slate-400 hover:text-red-500 transition-colors p-1"
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