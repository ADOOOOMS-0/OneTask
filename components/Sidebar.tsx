
import React, { useState, useEffect, useRef } from 'react';
import { Project, Priority, List, Recurrence } from '../types';
import { PlusIcon, TrashIcon, PencilIcon, Bars3Icon, ArrowLeftIcon, QueueListIcon, CalendarDaysIcon } from './icons';

interface SidebarProps {
  lists: List[];
  activeListId: string | null;
  activeProjectId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectList: (id: string | null) => void;
  onSelectProject: (id: string) => void;
  onAddProject: () => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onReorderProjects: (projects: Project[]) => void;
  onAddList: () => void;
  onDeleteList: (id: string) => void;
  onUpdateList: (id: string, updates: { name?: string; icon?: string; isPriorityRotationEnabled?: boolean }) => void;
  onReorderLists: (lists: List[]) => void;
  isReorderEnabled: boolean;
  projects?: Project[];
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

const Sidebar: React.FC<SidebarProps> = ({ 
  lists, 
  activeListId, 
  activeProjectId, 
  isOpen, 
  onToggle, 
  onSelectList, 
  onSelectProject, 
  onAddProject, 
  onDeleteProject, 
  onRenameProject, 
  onReorderProjects,
  onAddList,
  onDeleteList,
  onUpdateList,
  onReorderLists,
  isReorderEnabled,
  projects: projectsProp
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingIcon, setEditingIcon] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeList = lists.find(l => l.id === activeListId);
  let projects = projectsProp || (activeList ? activeList.projects : []);

  if (activeList?.isPriorityRotationEnabled && !projectsProp) {
    projects = [...projects].sort((a, b) => {
      const getPriorityValue = (p: Project) => {
        const priority = getProjectPriority(p);
        if (priority === Priority.High) return 3;
        if (priority === Priority.Medium) return 2;
        if (priority === Priority.Low) return 1;
        return 0;
      };
      return getPriorityValue(b) - getPriorityValue(a);
    });
  }

  const scheduledTasksCount = projects.reduce((acc, p) => 
    acc + p.tasks.filter(t => t.scheduledDate || (t.recurrence && t.recurrence !== Recurrence.None)).length, 0
  );

  const handleStartEditing = (id: string, name: string, icon?: string) => {
    setEditingId(id);
    setEditingName(name);
    setEditingIcon(icon || '');
  };

  const handleCancelEditing = () => {
    setEditingId(null);
    setEditingName('');
    setEditingIcon('');
  };

  const handleSaveRename = () => {
    if (editingId && editingName.trim()) {
      if (activeListId) {
        onRenameProject(editingId, editingName.trim());
      } else {
        onUpdateList(editingId, { name: editingName.trim(), icon: editingIcon.trim() || undefined });
      }
    }
    handleCancelEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveRename();
    else if (e.key === 'Escape') handleCancelEditing();
  };
  
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (activeListId) {
      onDeleteProject(id);
    } else {
      onDeleteList(id);
    }
  };

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, project: Project) => {
    if (!isReorderEnabled || !activeListId || activeList?.isPriorityRotationEnabled) return;
    e.dataTransfer.setData('text/plain', project.id);
    setTimeout(() => {
        setDraggedId(project.id);
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetProject: Project) => {
    if (!isReorderEnabled || !draggedId || !activeListId || activeList?.isPriorityRotationEnabled) return;

    const draggedProjectId = e.dataTransfer.getData('text/plain');
    if (draggedProjectId === targetProject.id) return;

    const draggedIndex = projects.findIndex(p => p.id === draggedProjectId);
    const targetIndex = projects.findIndex(p => p.id === targetProject.id);

    if (draggedIndex === -1) return;

    const reorderedProjects = [...projects];
    const [draggedItem] = reorderedProjects.splice(draggedIndex, 1);
    reorderedProjects.splice(targetIndex, 0, draggedItem);
    
    onReorderProjects(reorderedProjects);
  };

  const handleDragStartList = (e: React.DragEvent<HTMLDivElement>, list: List) => {
    if (!isReorderEnabled || activeListId) return;
    e.dataTransfer.setData('text/plain', list.id);
    setTimeout(() => {
        setDraggedId(list.id);
    }, 0);
  };

  const handleDropList = (e: React.DragEvent<HTMLDivElement>, targetList: List) => {
    if (!isReorderEnabled || !draggedId || activeListId) return;

    const draggedListId = e.dataTransfer.getData('text/plain');
    if (draggedListId === targetList.id) return;

    const draggedIndex = lists.findIndex(l => l.id === draggedListId);
    const targetIndex = lists.findIndex(l => l.id === targetList.id);

    if (draggedIndex === -1) return;

    const reorderedLists = [...lists];
    const [draggedItem] = reorderedLists.splice(draggedIndex, 1);
    reorderedLists.splice(targetIndex, 0, draggedItem);
    
    onReorderLists(reorderedLists);
  };

  const priorityStyles = {
    [Priority.High]: 'border-l-high-priority-border',
    [Priority.Medium]: 'border-l-medium-priority-border',
    [Priority.Low]: 'border-l-low-priority-border',
  };

  const sidebarClasses = `
    flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out flex-shrink-0
    fixed md:relative inset-y-0 left-0 z-30
    ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 md:translate-x-0 md:w-16'}
  `;

  const renderIcon = (icon?: string, className: string = "w-5 h-5") => {
    if (!icon) return <QueueListIcon className={className} />;
    
    if (icon.startsWith('http') || icon.startsWith('data:image')) {
      return <img src={icon} alt="List icon" className={`${className} object-cover rounded-md`} referrerPolicy="no-referrer" />;
    }
    
    return <span className={className.replace('w-5 h-5', 'text-xl')}>{icon}</span>;
  };

  return (
    <aside className={sidebarClasses}>
        <div className={`flex items-center border-b border-slate-200 dark:border-slate-700 h-16 px-4 ${isOpen ? 'justify-between' : 'justify-center'}`}>
            <div className={`flex items-center gap-2 overflow-hidden ${!isOpen && 'hidden'}`}>
                {activeListId && (
                    <button 
                        onClick={() => onSelectList(null)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500"
                        title="Back to Lists"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                )}
                {activeListId && (
                    <div className="w-6 h-6 flex items-center justify-center overflow-hidden shrink-0">
                        {renderIcon(activeList?.icon, "w-full h-full")}
                    </div>
                )}
                <h2 className="font-bold text-lg text-slate-800 dark:text-slate-200 truncate">
                    {activeListId ? activeList?.name : 'My Lists'}
                </h2>
            </div>
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
                {activeListId ? (
                    // Show Projects
                    projects.map((p) => {
                        const isEditing = editingId === p.id;
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
                                        className={`relative flex items-center ${isOpen ? 'justify-between' : 'justify-center'} w-full rounded-md transition-all duration-150 border-l-4 ${priorityStyle} ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'} ${isReorderEnabled && !activeList?.isPriorityRotationEnabled ? 'cursor-grab' : ''} ${draggedId === p.id ? 'opacity-30' : 'opacity-100'} cursor-pointer h-10`}
                                        draggable={isReorderEnabled && !activeList?.isPriorityRotationEnabled}
                                        onDragStart={(e) => handleDragStart(e, p)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, p)}
                                        onClick={() => onSelectProject(p.id)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectProject(p.id); }}
                                    >
                                        <div className={`${isOpen ? 'flex-grow p-2 text-left' : 'flex justify-center w-full items-center'} min-w-0`}>
                                            {isOpen ? (
                                                <span className={`truncate block ${isOverdue ? 'text-red-600 dark:text-red-400 font-bold' : ''}`}>
                                                    {p.name}
                                                </span>
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                                    {(() => {
                                                        const clean = p.name.replace(/[^a-zA-Z0-9]/g, '');
                                                        return clean.slice(0, 2).toUpperCase() || p.name.trim().slice(0, 2).toUpperCase();
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                        <div className={`flex items-center shrink-0 p-1 transition-opacity ${isOpen ? 'opacity-100 md:opacity-0 md:group-hover:opacity-100 mr-1' : 'justify-center w-full gap-0.5'}`}>
                                            <button onClick={(e) => { e.stopPropagation(); handleStartEditing(p.id, p.name); }} className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-black/5 dark:hover:bg-white/10">
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={(e) => handleDelete(e, p.id)} className="p-1 hover:text-red-500 rounded hover:bg-black/5 dark:hover:bg-white/10">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })
                ) : (
                    // Show Lists
                    lists.map((l) => {
                        const isEditing = editingId === l.id;
                        const isActive = activeListId === l.id;

                        return (
                            <li key={l.id} className="mb-1 group">
                                {isEditing ? (
                                    <div className="flex items-center gap-2 p-1 bg-slate-200 dark:bg-slate-700 rounded-md border-l-4 border-indigo-500 h-10">
                                        <div className="w-6 h-6 flex items-center justify-center overflow-hidden shrink-0">
                                            {renderIcon(editingIcon, "w-full h-full")}
                                        </div>
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onBlur={handleSaveRename}
                                            onKeyDown={handleKeyDown}
                                            className="bg-transparent outline-none flex-1 text-slate-800 dark:text-slate-200 truncate"
                                        />
                                    </div>
                                ) : (
                                    <div
                                        className={`relative flex items-center ${isOpen ? 'justify-between' : 'justify-center'} w-full rounded-md transition-all duration-150 border-l-4 border-transparent ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'} ${isReorderEnabled ? 'cursor-grab' : ''} ${draggedId === l.id ? 'opacity-30' : 'opacity-100'} cursor-pointer h-10`}
                                        draggable={isReorderEnabled}
                                        onDragStart={(e) => handleDragStartList(e, l)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDropList(e, l)}
                                        onClick={() => onSelectList(l.id)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectList(l.id); }}
                                    >
                                        <div className={`${isOpen ? 'flex items-center gap-2 flex-grow p-2 text-left' : 'flex justify-center w-full'} min-w-0`}>
                                            <div className="w-5 h-5 flex items-center justify-center overflow-hidden shrink-0">
                                                {renderIcon(l.icon, "w-full h-full")}
                                            </div>
                                            <span className={`${isOpen ? 'truncate block' : 'hidden'}`}>
                                                {l.name}
                                            </span>
                                        </div>
                                        <div className={`flex items-center shrink-0 p-1 transition-opacity ${isOpen ? 'opacity-100 md:opacity-0 md:group-hover:opacity-100 mr-1' : 'hidden'}`}>
                                            <button onClick={(e) => { e.stopPropagation(); handleStartEditing(l.id, l.name, l.icon); }} className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-black/5 dark:hover:bg-white/10">
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={(e) => handleDelete(e, l.id)} className="p-1 hover:text-red-500 rounded hover:bg-black/5 dark:hover:bg-white/10">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })
                )}
            </ul>
        </nav>

        <div className="border-t border-slate-200 dark:border-slate-700 p-2">
            {activeListId ? (
                <button onClick={onAddProject} className={`w-full flex items-center gap-2 p-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors ${!isOpen && 'justify-center'}`}>
                    <PlusIcon className="w-5 h-5" />
                    <span className={`${!isOpen && 'hidden'}`}>New Project</span>
                </button>
            ) : (
                <button onClick={onAddList} className={`w-full flex items-center gap-2 p-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors ${!isOpen && 'justify-center'}`}>
                    <PlusIcon className="w-5 h-5" />
                    <span className={`${!isOpen && 'hidden'}`}>New List</span>
                </button>
            )}
        </div>
    </aside>
  );
};

export default Sidebar;
