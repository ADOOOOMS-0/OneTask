
import React from 'react';
import { Project, Task, Priority } from '../types';
import TaskCard from './TaskCard';
import { PlusIcon } from './icons';

interface TaskBoardProps {
  project: Project;
  onAddTask: (priority: Priority) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onCompleteTask: (taskId: string) => void;
  isAutoRotationEnabled: boolean;
}

const PriorityColumn: React.FC<{
  title: string;
  tasks: Task[];
  priority: Priority;
  onAddTask: (priority: Priority) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onCompleteTask: (taskId: string) => void;
  className: string;
}> = ({ title, tasks, priority, onAddTask, onDeleteTask, onEditTask, onCompleteTask, className }) => (
  <div className="flex-1 min-w-[280px] md:min-w-[300px]">
    <div className={`p-4 rounded-t-lg ${className}`}>
        <h2 className="font-bold text-lg">{title}</h2>
    </div>
    <div className={`bg-slate-100 dark:bg-slate-800/50 p-4 rounded-b-lg`}>
      <button
        onClick={() => onAddTask(priority)}
        className="w-full flex items-center justify-center gap-2 mb-4 px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
      >
        <PlusIcon className="w-5 h-5" />
        Add Task
      </button>
      <div className="space-y-4">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onDelete={onDeleteTask} onEdit={onEditTask} onComplete={onCompleteTask} />
          ))
        ) : (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 pt-4">No tasks here.</p>
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

const TaskBoard: React.FC<TaskBoardProps> = ({ project, onAddTask, onDeleteTask, onEditTask, onCompleteTask, isAutoRotationEnabled }) => {
  const highPriorityTasks = sortTasks(project.tasks.filter((t) => t.priority === Priority.High), isAutoRotationEnabled);
  const mediumPriorityTasks = sortTasks(project.tasks.filter((t) => t.priority === Priority.Medium), isAutoRotationEnabled);
  const lowPriorityTasks = sortTasks(project.tasks.filter((t) => t.priority === Priority.Low), isAutoRotationEnabled);

  return (
    <div className="flex flex-col md:flex-row gap-6 md:items-start">
      <PriorityColumn
        title="High Priority"
        tasks={highPriorityTasks}
        priority={Priority.High}
        onAddTask={onAddTask}
        onDeleteTask={onDeleteTask}
        onEditTask={onEditTask}
        onCompleteTask={onCompleteTask}
        className="bg-high-priority border-b-2 border-high-priority-border text-high-priority-text"
      />
      <PriorityColumn
        title="Medium Priority"
        tasks={mediumPriorityTasks}
        priority={Priority.Medium}
        onAddTask={onAddTask}
        onDeleteTask={onDeleteTask}
        onEditTask={onEditTask}
        onCompleteTask={onCompleteTask}
        className="bg-medium-priority border-b-2 border-medium-priority-border text-medium-priority-text"
      />
      <PriorityColumn
        title="Low Priority"
        tasks={lowPriorityTasks}
        priority={Priority.Low}
        onAddTask={onAddTask}
        onDeleteTask={onDeleteTask}
        onEditTask={onEditTask}
        onCompleteTask={onCompleteTask}
        className="bg-low-priority border-b-2 border-low-priority-border text-low-priority-text"
      />
    </div>
  );
};

export default TaskBoard;