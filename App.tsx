

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Project, Task, Priority, User, CompletedTask } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import Sidebar from './components/Sidebar';
import TaskBoard from './components/TaskBoard';
import AddProjectModal from './components/AddClassModal';
import AddTaskModal from './components/AddTaskModal';
import EditTaskModal from './components/EditTaskModal';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import { UserCircleIcon, ArrowRightOnRectangleIcon, Bars3Icon } from './components/icons';
import EditProfilePictureModal from './components/account-settings/EditProfilePictureModal';
import EditNameModal from './components/account-settings/EditNameModal';
import EditEmailModal from './components/account-settings/EditEmailModal';
import ChangePasswordModal from './components/account-settings/ChangePasswordModal';
import UndoToast from './components/UndoToast';

// In a real app, this would be a proper hashing function.
// For simulation, we'll use a simple "hash".
const fakeHash = (str: string) => `hashed_${str}`;

const getInitials = (name: string) => {
    const names = name.split(' ');
    const initials = names.map(n => n[0]).join('');
    return initials.slice(0, 2).toUpperCase();
};

interface UserData {
    projects: Project[];
    completedTasks: CompletedTask[];
    activeProjectId: string | null;
    isSidebarOpen: boolean;
    settings: {
        theme: 'light' | 'dark' | 'system';
        isAutoPriorityModeEnabled: boolean;
        autoPriorityDays: number[];
        autoPriorityHours: number;
        isAutoRotationEnabled: boolean;
    }
}

type EditingField = 'picture' | 'name' | 'email' | 'password';

type ItemToUndo = { item: Task | Project; type: 'task' | 'project'; context: { projectId?: string } };

const App: React.FC = () => {
  // --- Auth State ---
  const [users, setUsers] = useLocalStorage<User[]>('onetask-users', []);
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('onetask-currentUser', null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  
  // --- App Data State (now user-specific) ---
  const [userData, setUserData] = useLocalStorage<Record<string, UserData>>('onetask-userData', {});
  const [projects, setProjects] = useState<Project[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [settings, setSettings] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
    isAutoPriorityModeEnabled: false,
    autoPriorityDays: [] as number[],
    autoPriorityHours: 24,
    isAutoRotationEnabled: false,
  });

  // --- UI State ---
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [editingAccountField, setEditingAccountField] = useState<EditingField | null>(null);

  // --- Undo State ---
  const [itemToUndo, setItemToUndo] = useState<ItemToUndo | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ItemToUndo | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  // --- Load user data on login ---
  useEffect(() => {
    if (currentUser) {
      const data = userData[currentUser.id] || {
        projects: [],
        completedTasks: [],
        activeProjectId: null,
        isSidebarOpen: true,
        settings: {
          theme: 'system',
          isAutoPriorityModeEnabled: false,
          autoPriorityDays: [],
          autoPriorityHours: 24,
          isAutoRotationEnabled: false,
        }
      };
      setProjects(data.projects);
      setCompletedTasks(data.completedTasks);
      setActiveProjectId(data.activeProjectId);
      setSidebarOpen(data.isSidebarOpen);
      setSettings(data.settings);
    } else {
      // Clear data on logout
      setProjects([]);
      setCompletedTasks([]);
      setActiveProjectId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // --- Save user data on change ---
  const saveCurrentUserData = useCallback(() => {
    if (currentUser) {
      setUserData(prevData => ({
        ...prevData,
        [currentUser.id]: { projects, completedTasks, activeProjectId, isSidebarOpen, settings }
      }));
    }
  }, [currentUser, projects, completedTasks, activeProjectId, isSidebarOpen, settings, setUserData]);

  useEffect(() => {
    if (currentUser) {
      saveCurrentUserData();
    }
  }, [projects, completedTasks, activeProjectId, isSidebarOpen, settings, currentUser, saveCurrentUserData]);


  // --- Modals State ---
  const [isAddProjectModalOpen, setAddProjectModalOpen] = useState(false);
  const [isAddTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [taskPriority, setTaskPriority] = useState<Priority>(Priority.Medium);
  const [isEditTaskModalOpen, setEditTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);


  useEffect(() => {
    if (projects.length > 0 && (!activeProjectId || !projects.find(c => c.id === activeProjectId))) {
      setActiveProjectId(projects[0].id);
    }
    if (projects.length === 0) {
        setActiveProjectId(null);
    }
  }, [projects, activeProjectId]);
  
  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
            setUserMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Apply theme
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    root.classList.toggle('dark', isDark);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
        if (settings.theme === 'system') {
            root.classList.toggle('dark', mediaQuery.matches);
        }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme]);

  // Auto-priority logic
  useEffect(() => {
    if (!settings.isAutoPriorityModeEnabled) return;

    const isDueWithinTimeframe = (dueDateStr: string, hours: number) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const taskDueDate = new Date(dueDateStr + 'T00:00:00');
        const timeframeInMillis = hours * 60 * 60 * 1000;
        return taskDueDate.getTime() - today.getTime() <= timeframeInMillis;
    };

    let needsUpdate = false;
    
    const updatedProjects = projects.map(p => ({
      ...p,
      tasks: p.tasks.map(t => {
        if (!t.dueDate) return t;
        let newTask = { ...t };
        let hasChanged = false;
        const basePriority = t.originalPriority || t.priority;

        if (settings.isAutoPriorityModeEnabled) {
          let shouldBePromoted = false;
          if (basePriority === Priority.Medium) {
            const isPromotableByDate = isDueWithinTimeframe(t.dueDate, settings.autoPriorityHours);
            const taskDueDate = new Date(t.dueDate + 'T00:00:00');
            const isDueOnSpecialDay = settings.autoPriorityDays.includes(taskDueDate.getDay());
            shouldBePromoted = isPromotableByDate || isDueOnSpecialDay;
          }

          if (shouldBePromoted && t.priority !== Priority.High) {
            newTask = { ...t, priority: Priority.High, originalPriority: basePriority };
            hasChanged = true;
          }
          else if (t.originalPriority && !shouldBePromoted) {
            newTask = { ...t, priority: t.originalPriority };
            delete newTask.originalPriority;
            hasChanged = true;
          }
        } else {
          if (t.originalPriority) {
            newTask = { ...t, priority: t.originalPriority };
            delete newTask.originalPriority;
            hasChanged = true;
          }
        }
        
        if (hasChanged) {
          needsUpdate = true;
          return newTask;
        }
        return t;
      })
    }));

    if (needsUpdate) {
      setProjects(updatedProjects);
    }
  }, [settings.isAutoPriorityModeEnabled, projects, settings.autoPriorityDays, settings.autoPriorityHours]);

  // --- UNDO/DELETE LOGIC ---
  const startUndoTimer = (itemForUndo: ItemToUndo) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      // When the timer expires, stage the item for deletion and hide the toast.
      setItemToDelete(itemForUndo);
      setItemToUndo(null); // This will trigger the fade-out animation on the toast.
    }, 5000);
  };
  
  // This effect handles the actual deletion after the toast has faded out.
  useEffect(() => {
    if (itemToDelete) {
      // The toast is now hidden. Wait for the animation to finish, then delete.
      const deleteTimer = setTimeout(() => {
        const item = itemToDelete;
        if (!item) return;

        if (item.type === 'project') {
          const updatedProjects = projects.filter(p => p.id !== item.item.id);
          setProjects(updatedProjects);
          if (activeProjectId === item.item.id) {
            setActiveProjectId(updatedProjects.length > 0 ? updatedProjects[0].id : null);
          }
        } else if (item.type === 'task') {
          const { projectId } = item.context;
          if (!projectId) return;
          setProjects(prevProjects => prevProjects.map(p => {
            if (p.id === projectId) {
              return { ...p, tasks: p.tasks.filter(t => t.id !== item.item.id) };
            }
            return p;
          }));
        }

        // Clean up after deletion.
        setItemToDelete(null);
      }, 300); // This duration MUST match the toast's animation duration.

      return () => clearTimeout(deleteTimer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemToDelete]);
  
  const cancelUndoableDelete = () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    // Prevent the deletion from happening and hide the toast.
    setItemToDelete(null);
    setItemToUndo(null);
  };

  const getItemNameForUndo = () => {
    if (!itemToUndo) return '';
    const { item } = itemToUndo;
    // Use a type guard to safely access the correct property
    if ('title' in item) { // It's a Task
        return item.title;
    }
    return item.name; // It's a Project
  };
  // --- END UNDO/DELETE LOGIC ---

  const handleAddProject = (name: string) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      tasks: [],
    };
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    setActiveProjectId(newProject.id);
  };
  
  const handleDeleteProject = (projectId: string) => {
    const projectToDelete = projects.find(p => p.id === projectId);
    if (projectToDelete) {
        const item: ItemToUndo = { item: projectToDelete, type: 'project', context: {} };
        setItemToUndo(item);
        startUndoTimer(item);
    }
  };

  const handleRenameProject = (projectId: string, newName: string) => {
    if (!newName.trim()) return;
    const updatedProjects = projects.map(c =>
      c.id === projectId ? { ...c, name: newName.trim() } : c
    );
    setProjects(updatedProjects);
  };
  
  const handleReorderProjects = (reorderedProjects: Project[]) => {
    setProjects(reorderedProjects);
  };

  const handleOpenAddTaskModal = (priority: Priority) => {
    setTaskPriority(priority);
    setAddTaskModalOpen(true);
  };

  const handleAddTask = (taskData: Omit<Task, 'id'>) => {
    if (!activeProjectId) return;
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
    };
    const updatedProjects = projects.map((c) => {
      if (c.id === activeProjectId) {
        return { ...c, tasks: [...c.tasks, newTask] };
      }
      return c;
    });
    setProjects(updatedProjects);
  };
  
  const handleOpenEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setEditTaskModalOpen(true);
  };
  
  const handleEditTask = (updatedTask: Task) => {
    if (!activeProjectId) return;
    const finalUpdatedTask: Task = { ...updatedTask };
    delete finalUpdatedTask.originalPriority;
    const updatedProjects = projects.map((c) => {
        if (c.id === activeProjectId) {
            return {
                ...c,
                tasks: c.tasks.map(t => t.id === finalUpdatedTask.id ? finalUpdatedTask : t)
            };
        }
        return c;
    });
    setProjects(updatedProjects);
    setEditTaskModalOpen(false);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    if (!activeProjectId) return;
    const project = projects.find(p => p.id === activeProjectId);
    const taskToDelete = project?.tasks.find(t => t.id === taskId);
    if (taskToDelete) {
        const item: ItemToUndo = { item: taskToDelete, type: 'task', context: { projectId: activeProjectId } };
        setItemToUndo(item);
        startUndoTimer(item);
    }
  };

  const handleCompleteTask = (taskId: string) => {
    if (!activeProjectId) return;
    const project = projects.find(p => p.id === activeProjectId);
    const taskToComplete = project?.tasks.find(t => t.id === taskId);

    if (project && taskToComplete) {
        const completed: CompletedTask = {
            ...taskToComplete,
            completedAt: new Date().toISOString(),
            projectId: project.id,
            projectName: project.name,
        };
        setCompletedTasks(prev => [completed, ...prev]);
        const updatedProjects = projects.map(p => {
            if (p.id === activeProjectId) {
                return { ...p, tasks: p.tasks.filter(t => t.id !== taskId) };
            }
            return p;
        });
        setProjects(updatedProjects);
    }
  };
  
  const handlePermanentlyDeleteCompletedTask = (taskId: string) => {
    setCompletedTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleSaveSettings = (newSettings: { theme: 'light' | 'dark' | 'system'; isAutoPriorityModeEnabled: boolean; autoPriorityDays: number[]; autoPriorityHours: number; isAutoRotationEnabled: boolean; }) => {
    setSettings(newSettings);
  };
  
  const handleUpdateUser = (updates: { name?: string; email?: string; newPassword?: string, profilePicture?: string | null }, currentPassword?: string): { success: boolean, message: string } => {
    if (!currentUser) return { success: false, message: "No user is logged in." };
    const userFromUsersArray = users.find(u => u.id === currentUser.id);
    if (!userFromUsersArray) return { success: false, message: "Could not find user to update." };
    const requiresPassword = 'name' in updates || 'email' in updates || 'newPassword' in updates;

    if (requiresPassword) {
      if (!currentPassword) {
          return { success: false, message: "Password is required to make this change." };
      }
      if (fakeHash(currentPassword) !== userFromUsersArray.passwordHash) {
        return { success: false, message: "The password you entered is incorrect." };
      }
    }

    if (updates.email) {
      const emailExists = users.some(u => u.email.toLowerCase() === updates.email!.toLowerCase() && u.id !== currentUser.id);
      if (emailExists) {
        return { success: false, message: "This email is already in use by another account." };
      }
    }

    const updatedUser: User = { ...userFromUsersArray };
    if (updates.name) updatedUser.name = updates.name;
    if (updates.email) updatedUser.email = updates.email;
    if (updates.newPassword) updatedUser.passwordHash = fakeHash(updates.newPassword);
    if ('profilePicture' in updates) updatedUser.profilePicture = updates.profilePicture;
    
    const updatedUsers = users.map(u => u.id === currentUser.id ? updatedUser : u);
    setUsers(updatedUsers);
    setCurrentUser(updatedUser);
    return { success: true, message: "Your account has been updated successfully." };
  };

  const handleDeleteUser = (password: string): { success: boolean, message: string } => {
    if (!currentUser) return { success: false, message: "No user is logged in." };
    if (fakeHash(password) !== currentUser.passwordHash) {
        return { success: false, message: "The password you entered is incorrect." };
    }
    const updatedUsers = users.filter(u => u.id !== currentUser.id);
    setUsers(updatedUsers);
    const newUserData = { ...userData };
    delete newUserData[currentUser.id];
    setUserData(newUserData);
    setCurrentUser(null);
    setSettingsModalOpen(false);
    return { success: true, message: "Account deleted successfully." };
  };

  const getProjectSortValue = (project: Project) => {
    const farFutureDate = new Date('9999-12-31');
    if (project.tasks.length === 0) return { earliestDueDate: farFutureDate, highestPriority: 0, timeForUrgentTask: 0 };
    const priorityValues = { [Priority.High]: 3, [Priority.Medium]: 2, [Priority.Low]: 1 };
    let earliestDueDate: Date | null = null;
    project.tasks.forEach(task => {
        if (task.dueDate) {
            const taskDate = new Date(`${task.dueDate}T00:00:00`);
            if (!earliestDueDate || taskDate < earliestDueDate) earliestDueDate = taskDate;
        }
    });
    if (!earliestDueDate) earliestDueDate = farFutureDate;
    const tasksToConsider = project.tasks.filter(task => {
        if (!earliestDueDate || earliestDueDate.getTime() === farFutureDate.getTime()) return true;
        if (!task.dueDate) return false;
        return new Date(`${task.dueDate}T00:00:00`).getTime() === earliestDueDate.getTime();
    });
    let highestPriority = 0, timeForUrgentTask = 0;
    tasksToConsider.forEach(task => {
        const currentPriority = priorityValues[task.priority];
        const currentTime = task.estimatedTime || 0;
        if (currentPriority > highestPriority) {
            highestPriority = currentPriority;
            timeForUrgentTask = currentTime;
        } else if (currentPriority === highestPriority && currentTime > timeForUrgentTask) {
            timeForUrgentTask = currentTime;
        }
    });
    return { earliestDueDate, highestPriority, timeForUrgentTask };
  };

  const projectsForDisplay = useMemo(() => {
    const itemBeingDeleted = itemToUndo || itemToDelete;
    if (!itemBeingDeleted) return projects;

    if (itemBeingDeleted.type === 'project') {
      return projects.filter(p => p.id !== itemBeingDeleted.item.id);
    }

    if (itemBeingDeleted.type === 'task') {
      const { projectId } = itemBeingDeleted.context;
      return projects.map(p => {
        if (p.id === projectId) {
          return { ...p, tasks: p.tasks.filter(t => t.id !== itemBeingDeleted.item.id) };
        }
        return p;
      });
    }
    return projects;
  }, [projects, itemToUndo, itemToDelete]);

  const sortedProjects = useMemo(() => {
    const projectsToDisplay = projectsForDisplay;
    
    if (!settings.isAutoRotationEnabled) return projectsToDisplay;
    
    return [...projectsToDisplay].sort((a, b) => {
      const aValue = getProjectSortValue(a);
      const bValue = getProjectSortValue(b);
      if (aValue.earliestDueDate.getTime() !== bValue.earliestDueDate.getTime()) return aValue.earliestDueDate.getTime() - bValue.earliestDueDate.getTime();
      if (aValue.highestPriority !== bValue.highestPriority) return bValue.highestPriority - aValue.highestPriority;
      return bValue.timeForUrgentTask - aValue.timeForUrgentTask;
    });
  }, [projectsForDisplay, settings.isAutoRotationEnabled]);

  const activeProject = useMemo(() => {
    return projectsForDisplay.find((c) => c.id === activeProjectId) || null;
  }, [projectsForDisplay, activeProjectId]);

  // --- Auth Handlers ---
  const handleSignOut = () => {
      setCurrentUser(null);
      setUserMenuOpen(false);
  };
  
  const handleAccountCreated = (user: User) => {
      setCurrentUser(user);
      setAuthModalOpen(false);
  }

  const handleEditField = (field: EditingField) => {
    setEditingAccountField(field);
  };

  return (
    <div className="h-screen flex bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      {currentUser && (
        <>
          {isSidebarOpen && (
              <div 
                className="fixed inset-0 bg-black/30 z-20 md:hidden" 
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
              ></div>
            )}
            <Sidebar 
              isOpen={isSidebarOpen}
              onToggle={() => setSidebarOpen(!isSidebarOpen)}
              projects={sortedProjects}
              activeProjectId={activeProjectId}
              onSelectProject={(id) => {
                setActiveProjectId(id);
                if (window.innerWidth < 768) {
                  setSidebarOpen(false);
                }
              }}
              onAddProject={() => setAddProjectModalOpen(true)}
              onDeleteProject={handleDeleteProject}
              onRenameProject={handleRenameProject}
              onReorderProjects={handleReorderProjects}
              isReorderEnabled={!settings.isAutoRotationEnabled}
            />
        </>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-slate-800/50 sticky top-0 z-10 backdrop-blur-sm flex-shrink-0">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center gap-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4 flex-grow flex-shrink min-w-0">
              {currentUser && (
                <button 
                  onClick={() => setSidebarOpen(!isSidebarOpen)}
                  className="md:hidden text-slate-500 dark:text-slate-400"
                  aria-label="Toggle sidebar"
                >
                  <Bars3Icon className="w-6 h-6" />
                </button>
              )}
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                {currentUser ? (
                    activeProject ? activeProject.name : 'Dashboard'
                ) : "OneTask"}
              </h1>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              {!currentUser && (
                  <button
                      onClick={() => setAuthModalOpen(true)}
                      className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
                      aria-label="Sign in or sign up"
                  >
                      <span className="font-medium hidden sm:inline">Sign In</span>
                      <UserCircleIcon className="w-8 h-8"/>
                  </button>
              )}
              {currentUser && (
                <div className="relative" ref={userMenuRef}>
                    <button onClick={() => setUserMenuOpen(prev => !prev)} className="flex items-center gap-2" aria-label="Open user menu" aria-haspopup="true" aria-expanded={isUserMenuOpen}>
                        {currentUser.profilePicture ? (
                            <img src={currentUser.profilePicture} alt="Profile" className="w-8 h-8 rounded-full object-cover bg-slate-200 dark:bg-slate-700" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                                {getInitials(currentUser.name)}
                            </div>
                        )}
                    </button>
                    {isUserMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                            <button
                                onClick={() => { setSettingsModalOpen(true); setUserMenuOpen(false); }}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                <span className="w-5 h-5 inline-flex items-center justify-center text-lg">⚙️</span>
                                Settings
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {currentUser ? (
                <>
                  {activeProject ? (
                  <TaskBoard 
                      project={activeProject} 
                      onAddTask={handleOpenAddTaskModal}
                      onDeleteTask={handleDeleteTask}
                      onEditTask={handleOpenEditTaskModal}
                      onCompleteTask={handleCompleteTask}
                      isAutoRotationEnabled={settings.isAutoRotationEnabled}
                  />
                  ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                      <h2 className="text-xl font-semibold text-slate-600 dark:text-slate-400">No projects yet!</h2>
                      <p className="text-slate-500 mt-2">Get started by adding your first project from the sidebar.</p>
                      <button
                          onClick={() => setAddProjectModalOpen(true)}
                          className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                          Add Your First Project
                      </button>
                  </div>
                  )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Welcome to OneTask</h2>
                    <p className="mt-4 max-w-xl text-slate-600 dark:text-slate-400">Your personal space to manage projects, track tasks, and conquer your goals. Sign in to access your dashboard or create an account to get started!</p>
                    <button
                        onClick={() => setAuthModalOpen(true)}
                        className="mt-8 inline-flex items-center gap-2 px-6 py-3 text-lg font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Sign In or Create Account
                    </button>
                </div>
            )}
        </main>
      </div>

      <UndoToast
        isVisible={!!itemToUndo}
        message={`'${getItemNameForUndo()}' deleted.`}
        onUndo={cancelUndoableDelete}
      />

      {isAddProjectModalOpen && currentUser && (
        <AddProjectModal onClose={() => setAddProjectModalOpen(false)} onAddProject={handleAddProject} />
      )}
      {isAddTaskModalOpen && currentUser && (
        <AddTaskModal
          onClose={() => setAddTaskModalOpen(false)}
          onAddTask={handleAddTask}
          initialPriority={taskPriority}
        />
      )}
      {isEditTaskModalOpen && editingTask && currentUser && (
        <EditTaskModal
          task={editingTask}
          onClose={() => {
            setEditTaskModalOpen(false);
            setEditingTask(null);
          }}
          onSave={handleEditTask}
        />
      )}
      {isSettingsModalOpen && currentUser && (
        <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setSettingsModalOpen(false)}
            onSaveSettings={handleSaveSettings}
            initialSettings={settings}
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onEditField={handleEditField}
            completedTasks={completedTasks}
            onPermanentlyDeleteTask={handlePermanentlyDeleteCompletedTask}
        />
      )}
      {isAuthModalOpen && !currentUser && (
        <AuthModal
            users={users}
            setUsers={setUsers}
            onClose={() => setAuthModalOpen(false)}
            onAccountCreated={handleAccountCreated}
        />
      )}

      {editingAccountField && currentUser && (
          <>
              {editingAccountField === 'picture' && (
                  <EditProfilePictureModal user={currentUser} onUpdateUser={handleUpdateUser} onClose={() => setEditingAccountField(null)} />
              )}
              {editingAccountField === 'name' && (
                  <EditNameModal user={currentUser} onUpdateUser={handleUpdateUser} onClose={() => setEditingAccountField(null)} />
              )}
              {editingAccountField === 'email' && (
                  <EditEmailModal user={currentUser} onUpdateUser={handleUpdateUser} onClose={() => setEditingAccountField(null)} />
              )}
              {editingAccountField === 'password' && (
                  <ChangePasswordModal onUpdateUser={handleUpdateUser} onClose={() => setEditingAccountField(null)} />
              )}
          </>
      )}
    </div>
  );
};

export default App;