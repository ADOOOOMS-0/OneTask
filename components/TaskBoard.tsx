
import React, { useState } from 'react';
import { Project, Task, Priority } from '../types';
import TaskCard from './TaskCard';
import ScheduledTasksModal from './ScheduledTasksModal';
import { PlusIcon, CalendarDaysIcon, QueueListIcon } from './icons';

interface TaskBoardProps {
  project: Project;
  onAddTask: () => void;
  onScheduleTask: () => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onCompleteTask: (taskId: string) => void;
  isAutoRotationEnabled: boolean;
}

const PriorityColumn: React.FC<{
  title: string;
  tasks: Task[];
  priority: Priority;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onCompleteTask: (taskId: string) => void;
  className: string;
}> = ({ title, tasks, onDeleteTask, onEditTask, onCompleteTask, className }) => (
  <div className="flex-1 min-w-[280px] md:min-w-[300px]">
    <div className={`p-4 rounded-t-lg ${className}`}>
        <h2 className="font-bold text-lg">{title}</h2>
    </div>
    <div className={`bg-slate-100 dark:bg-slate-800/50 p-4 rounded-b-lg`}>
      <div className="space-y-4">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onDelete={onDeleteTask} onEdit={onEditTask} onComplete={onCompleteTask} />
          ))
        ) : (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 pt-4 pb-4">No tasks here.</p>
        )}
      </div>
    </div>
  </div>
);

const sortTasks = (tasks: Task[], isAutoRotationEnabled: boolean): Task[] => {
    if (!isAutoRotationEnabled) {
        return tasks; // Return original order if auto-rotation is disabled
    }

    // Create a new sorted array when auto-rotation is enabled
    return [...tasks].sort((a, b) => {
        // Consistently parse dates as local time to avoid timezone issues
        const aDate = a.dueDate ? new Date(`${a.dueDate}T00:00:00`) : null;
        const bDate = b.dueDate ? new Date(`${b.dueDate}T00:00:00`) : null;

        // Rule 1: Tasks with due dates come before tasks without.
        if (aDate && !bDate) return -1;
        if (!aDate && bDate) return 1;

        // Rule 2: If both have due dates, sort by the earliest date.
        if (aDate && bDate && aDate.getTime() !== bDate.getTime()) {
            return aDate.getTime() - bDate.getTime();
        }

        // Rule 3: If dates are the same (or both are null), sort by estimated time (descending).
        const aTime = a.estimatedTime || 0;
        const bTime = b.estimatedTime || 0;
        return bTime - aTime;
    });
};

const TaskBoard: React.FC<TaskBoardProps> = ({ project, onAddTask, onScheduleTask, onDeleteTask, onEditTask, onCompleteTask, isAutoRotationEnabled }) => {
  const [isScheduledListOpen, setScheduledListOpen] = useState(false);

  // Get today's date in YYYY-MM-DD format for local comparison
  const now = new Date();
  const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

  // Filter tasks based on schedule
  const visibleTasks = project.tasks.filter(t => !t.scheduledDate || t.scheduledDate <= today);
  const scheduledTasks = project.tasks.filter(t => t.scheduledDate && t.scheduledDate > today);

  const highPriorityTasks = sortTasks(visibleTasks.filter((t) => t.priority === Priority.High), isAutoRotationEnabled);
  const mediumPriorityTasks = sortTasks(visibleTasks.filter((t) => t.priority === Priority.Medium), isAutoRotationEnabled);
  const lowPriorityTasks = sortTasks(visibleTasks.filter((t) => t.priority === Priority.Low), isAutoRotationEnabled);

  return (
    <>
      {/* Project Actions */}
      <div className="mb-6 flex flex-nowrap gap-2 items-center justify-between sm:justify-start overflow-x-auto no-scrollbar pb-1">
        <div className="flex flex-nowrap gap-2 shrink-0">
            <button
            onClick={onAddTask}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap"
            >
            <PlusIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Add Task</span>
            </button>
            <button
            onClick={onScheduleTask}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm whitespace-nowrap"
            >
            <CalendarDaysIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Schedule Task</span>
            </button>
        </div>
        <button
          onClick={() => setScheduledListOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm ml-auto sm:ml-0 whitespace-nowrap shrink-0"
        >
          <QueueListIcon className="w-5 h-5" />
          <span className="hidden sm:inline">View Scheduled ({scheduledTasks.length})</span>
          <span className="sm:hidden">({scheduledTasks.length})</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:items-start">
        <PriorityColumn
          title="High Priority"
          tasks={highPriorityTasks}
          priority={Priority.High}
          onDeleteTask={onDeleteTask}
          onEditTask={onEditTask}
          onCompleteTask={onCompleteTask}
          className="bg-high-priority border-b-2 border-high-priority-border text-high-priority-text"
        />
        <PriorityColumn
          title="Medium Priority"
          tasks={mediumPriorityTasks}
          priority={Priority.Medium}
          onDeleteTask={onDeleteTask}
          onEditTask={onEditTask}
          onCompleteTask={onCompleteTask}
          className="bg-medium-priority border-b-2 border-medium-priority-border text-medium-priority-text"
        />
        <PriorityColumn
          title="Low Priority"
          tasks={lowPriorityTasks}
          priority={Priority.Low}
          onDeleteTask={onDeleteTask}
          onEditTask={onEditTask}
          onCompleteTask={onCompleteTask}
          className="bg-low-priority border-b-2 border-low-priority-border text-low-priority-text"
        />
      </div>

      {isScheduledListOpen && (
        <ScheduledTasksModal 
            tasks={scheduledTasks}
            onClose={() => setScheduledListOpen(false)}
            onEdit={(task) => { setScheduledListOpen(false); onEditTask(task); }}
            onDelete={onDeleteTask}
        />
      )}
    </>
  );
};

export default TaskBoard;
