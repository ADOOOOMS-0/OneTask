
import React, { useState, useEffect, useRef } from 'react';
import { Project, Priority } from '../types';
import { PlusIcon, TrashIcon, PencilIcon, Bars3Icon } from './icons';

interface SidebarProps {
  projects: Project[];
  activeProjectId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectProject: (id: string) => void;
  onAddProject: () => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onReorderProjects: (projects: Project[]) => void;
  isReorderEnabled: boolean;
}

const getProjectPriority = (project: Project): Priority | null => {
  // Get today's date string for comparison
  const now = new Date();
  const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

  // Only consider tasks that are NOT scheduled for the future
  const visibleTasks = project.tasks.filter(t => !t.scheduledDate || t.scheduledDate <= today);

  if (visibleTasks.length === 0) return null;
  if (visibleTasks.some(task => task.priority === Priority.High)) return Priority.High;
  if (visibleTasks.some(task => task.priority === Priority.Medium)) return Priority.Medium;
  if (visibleTasks.some(task => task.priority === Priority.Low)) return Priority.Low;
  return null;
};

const hasOverdueTasks = (project: Project): boolean => {
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    now.setHours(0, 0, 0, 0); // Local midnight

    return project.tasks.some(t => {
        // Ignore tasks scheduled for the future
        if (t.scheduledDate && t.scheduledDate > todayStr) return false;

        if (!t.dueDate) return false;
        const [y, m, d] = t.dueDate.split('-').map(Number);
        const due = new Date(y, m - 1, d);
        return due < now;
    });
};

const Sidebar: React.FC<SidebarProps> = ({ projects, activeProjectId, isOpen, onToggle, onSelectProject, onAddProject, onDeleteProject, onRenameProject, onReorderProjects, isReorderEnabled }) => {
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartEditing = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingName(project.name);
  };

  const handleCancelEditing = () => {
    setEditingProjectId(null);
    setEditingName('');
  };

  const handleSaveRename = () => {
    if (editingProjectId && editingName.trim()) {
      onRenameProject(editingProjectId, editingName.trim());
    }
    handleCancelEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveRename();
    else if (e.key === 'Escape') handleCancelEditing();
  };
  
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Immediate delete (Undo handled by App.tsx)
    onDeleteProject(id);
  };

  useEffect(() => {
    if (editingProjectId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingProjectId]);

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, project: Project) => {
    if (!isReorderEnabled) return;
    e.dataTransfer.setData('text/plain', project.id);
    // Use a timeout to allow the browser to create a drag preview before we update the state
    setTimeout(() => {
        setDraggedId(project.id);
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetProject: Project) => {
    if (!isReorderEnabled || !draggedId) return;

    const draggedProjectId = e.dataTransfer.getData('text/plain');
    if (draggedProjectId === targetProject.id) {
        return; // Don't drop on itself
    }

    const draggedIndex = projects.findIndex(p => p.id === draggedProjectId);
    const targetIndex = projects.findIndex(p => p.id === targetProject.id);

    if (draggedIndex === -1) {
        return; // Item not found
    }

    const reorderedProjects = [...projects];
    const [draggedItem] = reorderedProjects.splice(draggedIndex, 1);
    reorderedProjects.splice(targetIndex, 0, draggedItem);
    
    onReorderProjects(reorderedProjects);
  };

  const priorityStyles = {
    [Priority.High]: 'border-l-high-priority-border',
    [Priority.Medium]: 'border-l-medium-priority-border',
    [Priority.Low]: 'border-l-low-priority-border',
  };

  const sidebarClasses = `
    flex flex-col bg-white dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out flex-shrink-0
    fixed md:relative inset-y-0 left-0 z-30
    ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 md:translate-x-0 md:w-16'}
  `;

  return (
    <aside className={sidebarClasses}>
        <div className={`flex items-center border-b border-slate-200 dark:border-slate-700 h-16 px-4 ${isOpen ? 'justify-between' : 'justify-center'}`}>
            <h2 className={`font-bold text-lg text-slate-800 dark:text-slate-200 ${!isOpen && 'hidden'}`}>My Projects</h2>
             <button
                onClick={onToggle}
                className="hidden md:block text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
                <Bars3Icon className="w-6 h-6" />
            </button>
        </div>

        <nav className={`flex-grow overflow-y-auto overflow-x-hidden ${isOpen ? 'p-2' : 'py-2 px-0'}`}>
            <ul>
                {projects.map((p) => {
                    const isEditing = editingProjectId === p.id;
                    const priority = getProjectPriority(p);
                    const priorityStyle = priority ? priorityStyles[priority] : 'border-l-transparent';
                    
                    const isActive = activeProjectId === p.id;
                    const isOverdue = hasOverdueTasks(p);

                    return (
                        <li key={p.id} className="mb-1 group">
                            {isEditing ? (
                                <div className="flex items-center p-2 bg-slate-200 dark:bg-slate-700 rounded-md border-l-4 border-indigo-500 h-10">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        onBlur={handleSaveRename}
                                        onKeyDown={handleKeyDown}
                                        className="bg-transparent outline-none w-full text-slate-800 dark:text-slate-200"
                                    />
                                </div>
                            ) : (
                                <div
                                    className={`relative flex items-center ${isOpen ? 'justify-between' : 'justify-center'} w-full rounded-md transition-all duration-150 border-l-4 ${priorityStyle} ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'} ${isReorderEnabled ? 'cursor-grab' : ''} ${draggedId === p.id ? 'opacity-30' : 'opacity-100'} cursor-pointer h-10`}
                                    draggable={isReorderEnabled}
                                    onDragStart={(e) => handleDragStart(e, p)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, p)}
                                    onClick={() => onSelectProject(p.id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectProject(p.id); }}
                                >
                                    {/* Project Name Area */}
                                    <div className={`${isOpen ? 'flex-grow p-2 text-left' : 'hidden'} min-w-0`}>
                                        <span 
                                            className={`truncate block ${isOverdue ? 'text-red-600 dark:text-red-400 font-bold' : ''}`}
                                            title={isOverdue ? "Has overdue tasks" : undefined}
                                        >
                                            {p.name}
                                        </span>
                                    </div>
                                    
                                    {/* Action Buttons Area */}
                                    <div className={`flex items-center shrink-0 p-1 transition-opacity ${isOpen ? 'opacity-100 md:opacity-0 md:group-hover:opacity-100 mr-1' : 'justify-center w-full gap-0.5'}`}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleStartEditing(p); }} 
                                            className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-black/5 dark:hover:bg-white/10"
                                            aria-label={`Rename ${p.name}`}
                                        >
                                            <PencilIcon className={`${isOpen ? 'w-4 h-4' : 'w-4 h-4'}`} />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDelete(e, p.id)} 
                                            className="p-1 hover:text-red-500 rounded hover:bg-black/5 dark:hover:bg-white/10"
                                            aria-label={`Delete ${p.name}`}
                                        >
                                            <TrashIcon className={`${isOpen ? 'w-4 h-4' : 'w-4 h-4'}`} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </nav>

        <div className="border-t border-slate-200 dark:border-slate-700 p-2">
            <button onClick={onAddProject} className={`w-full flex items-center gap-2 p-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors ${!isOpen && 'justify-center'}`}>
                <PlusIcon className="w-5 h-5" />
                <span className={`${!isOpen && 'hidden'}`}>New Project</span>
            </button>
        </div>
    </aside>
  );
};

export default Sidebar;
