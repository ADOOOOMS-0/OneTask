import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Project, Task, Priority, User, CompletedTask } from './types';
import useSessionStorage from './hooks/useSessionStorage';
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

type DeletedItem = {
    type: 'project';
    item: Project;
    index: number;
} | {
    type: 'task';
    item: Task;
    projectId: string;
};

const App: React.FC = () => {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useSessionStorage<User | null>('onetask-currentUser', null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  
  // --- App Data State ---
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
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // --- UI State ---
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [editingAccountField, setEditingAccountField] = useState<EditingField | null>(null);

  // --- Undo State ---
  const [deletedItem, setDeletedItem] = useState<DeletedItem | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Helper to get local data key ---
  const getLocalDataKey = (userId: string) => `onetask_data_${userId}`;

  // --- Load user data on login ---
  useEffect(() => {
    if (currentUser) {
      setIsDataLoaded(false);
      
      // 1. Load from Local Storage (Offline/Sync Source)
      const localDataJson = localStorage.getItem(getLocalDataKey(currentUser.id));
      if (localDataJson) {
          try {
              const localData: UserData = JSON.parse(localDataJson);
              setProjects(localData.projects || []);
              setCompletedTasks(localData.completedTasks || []);
              setActiveProjectId(localData.activeProjectId);
              setSidebarOpen(localData.isSidebarOpen);
              setSettings(localData.settings || settings);
          } catch (e) { console.error("Error parsing local data", e); }
      }

      // 2. Try to fetch from API to sync (Best effort)
      const fetchData = async () => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2000); // Short timeout for sync
          
          const response = await fetch('/api/data', {
            headers: { 'x-user-id': currentUser.id },
            signal: controller.signal
          });
          clearTimeout(timeout);
          
          const contentType = response.headers.get("content-type");
          if (response.ok && contentType && contentType.includes("application/json")) {
            const data: UserData = await response.json();
            setProjects(data.projects || []);
            setCompletedTasks(data.completedTasks || []);
            setActiveProjectId(data.activeProjectId);
            setSidebarOpen(data.isSidebarOpen);
            setSettings(data.settings || settings);
          }
        } catch (error) {
            // Silently fail to local mode
            console.debug('Using local mode (API unreachable)');
        } finally {
            setIsDataLoaded(true);
        }
      };
      
      fetchData();
    } else {
      // Clear data on logout
      setProjects([]);
      setCompletedTasks([]);
      setActiveProjectId(null);
      setIsDataLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustivedeps
  }, [currentUser]);

  // --- Save user data on change ---
  const saveData = useCallback(async (dataToSave: UserData) => {
    if (!currentUser) return;
    
    // 1. Save to Local Storage (Always)
    try {
        localStorage.setItem(getLocalDataKey(currentUser.id), JSON.stringify(dataToSave));
    } catch (e) { console.error("Local save failed", e); }

    // 2. Save to API (Best Effort)
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify(dataToSave),
      });
    } catch (error) {
       // Ignore network errors
    }
  }, [currentUser]);

  // Debounced save effect
  useEffect(() => {
    if (currentUser && isDataLoaded) {
      const dataToSave = { projects, completedTasks, activeProjectId, isSidebarOpen, settings };
      const handler = setTimeout(() => {
        saveData(dataToSave);
      }, 500); // 500ms debounce

      return () => {
        clearTimeout(handler);
      };
    }
  }, [projects, completedTasks, activeProjectId, isSidebarOpen, settings, saveData, currentUser, isDataLoaded]);


  // --- Modals State ---
  const [isAddProjectModalOpen, setAddProjectModalOpen] = useState(false);
  const [isAddTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [isSchedulingTask, setIsSchedulingTask] = useState(false);
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
    if (!isDataLoaded) return;

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
        let newTask = { ...t };
        let hasChanged = false;

        // 1. Handle Low -> Medium Promotion
        if (newTask.priority === Priority.Low && newTask.autoPromoteDate) {
           const today = new Date();
           today.setHours(0, 0, 0, 0);
           const promoteDate = new Date(newTask.autoPromoteDate + 'T00:00:00');
           
           if (today.getTime() >= promoteDate.getTime()) {
             newTask.priority = Priority.Medium;
             delete newTask.autoPromoteDate; // Task is promoted, remove the trigger
             hasChanged = true;
           }
        }

        // 2. Handle Medium -> High Promotion (and Reverting)
        const basePriority = newTask.originalPriority || newTask.priority;

        if (settings.isAutoPriorityModeEnabled) {
            if (basePriority === Priority.Medium && newTask.dueDate) {
                const isPromotableByDate = isDueWithinTimeframe(newTask.dueDate, settings.autoPriorityHours);
                const taskDueDate = new Date(newTask.dueDate + 'T00:00:00');
                const isDueOnSpecialDay = settings.autoPriorityDays.includes(taskDueDate.getDay());
                const shouldBePromoted = isPromotableByDate || isDueOnSpecialDay;

                if (shouldBePromoted && newTask.priority !== Priority.High) {
                    newTask = { ...newTask, priority: Priority.High, originalPriority: basePriority };
                    hasChanged = true;
                } else if (newTask.originalPriority && !shouldBePromoted) {
                    // Revert if conditions no longer met (but still in auto mode)
                    newTask = { ...newTask, priority: newTask.originalPriority };
                    delete newTask.originalPriority;
                    hasChanged = true;
                }
            }
        } else {
            // Revert High -> Medium if Auto Mode is disabled
            if (newTask.originalPriority) {
                newTask = { ...newTask, priority: newTask.originalPriority };
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
  }, [settings.isAutoPriorityModeEnabled, projects, settings.autoPriorityDays, settings.autoPriorityHours, isDataLoaded]);

  // --- UNDO LOGIC ---
  const handleUndo = () => {
    if (!deletedItem) return;

    if (deletedItem.type === 'project') {
      const newProjects = [...projects];
      newProjects.splice(deletedItem.index, 0, deletedItem.item);
      setProjects(newProjects);
      // Automatically switch back to the restored project if appropriate
      setActiveProjectId(deletedItem.item.id);
    } else if (deletedItem.type === 'task') {
      const updatedProjects = projects.map(p => {
        if (p.id === deletedItem.projectId) {
          return { ...p, tasks: [...p.tasks, deletedItem.item] };
        }
        return p;
      });
      setProjects(updatedProjects);
    }

    setDeletedItem(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  };

  const registerDeletion = (item: DeletedItem) => {
      setDeletedItem(item);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = setTimeout(() => {
          setDeletedItem(null);
          undoTimeoutRef.current = null;
      }, 5000); // 5 seconds to undo
  };

  const handleAddProject = (name: string) => {
    const newProject: Project = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name,
      tasks: [],
    };
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    setActiveProjectId(newProject.id);
  };
  
  const handleDeleteProject = (projectId: string) => {
    const projectIndex = projects.findIndex(p => p.id === projectId);
    const projectToDelete = projects[projectIndex];
    
    if (projectToDelete) {
        // Immediate update
        const updatedProjects = projects.filter(p => p.id !== projectId);
        setProjects(updatedProjects);

        // If we deleted the active project, select another one immediately
        if (activeProjectId === projectId) {
            if (updatedProjects.length > 0) {
                // Try to stay at the same index, or go to the last one
                const newIndex = Math.min(projectIndex, updatedProjects.length - 1);
                setActiveProjectId(updatedProjects[newIndex].id);
            } else {
                setActiveProjectId(null);
            }
        }

        registerDeletion({
            type: 'project',
            item: projectToDelete,
            index: projectIndex
        });
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

  const handleOpenAddTask = () => {
    setTaskPriority(Priority.Medium);
    setIsSchedulingTask(false);
    setAddTaskModalOpen(true);
  };

  const handleOpenScheduleTask = () => {
    setTaskPriority(Priority.Medium);
    setIsSchedulingTask(true);
    setAddTaskModalOpen(true);
  };

  const handleAddTask = (taskData: Omit<Task, 'id'>) => {
    if (!activeProjectId) return;
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
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
    const updatedProjects = projects.map((c) => {
        if (c.id === activeProjectId) {
            return {
                ...c,
                tasks: c.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
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
    
    if (project && taskToDelete) {
        // Immediate update
        const updatedProjects = projects.map(p => {
            if (p.id === activeProjectId) {
              return { ...p, tasks: p.tasks.filter(t => t.id !== taskId) };
            }
            return p;
        });
        setProjects(updatedProjects);

        registerDeletion({
            type: 'task',
            item: taskToDelete,
            projectId: activeProjectId
        });
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
  
  const handleUpdateUser = async (updates: { name?: string; email?: string; newPassword?: string, profilePicture?: string | null }, currentPassword?: string): Promise<{ success: boolean, message: string }> => {
    if (!currentUser) return { success: false, message: "No user is logged in." };
    
    // --- Local Update (Optimistic with checks) ---
    let localUpdateSuccessful = false;
    let localError = "";

    try {
        const localUsersStr = localStorage.getItem('onetask_local_users');
        if (localUsersStr) {
            const localUsers: User[] = JSON.parse(localUsersStr);
            const index = localUsers.findIndex(u => u.id === currentUser.id);
            if (index !== -1) {
                const user = localUsers[index];

                // Verify current password against ANY supported hash format
                if ((updates.email || updates.newPassword) && currentPassword) {
                    const storedHash = user.passwordHash;
                    const isValid = storedHash === `local_hash_${currentPassword}` || storedHash === `hashed_${currentPassword}`;
                    if (!isValid) {
                        return { success: false, message: "The password you entered is incorrect." };
                    }
                }
                
                if (updates.name) user.name = updates.name;
                if (updates.email) {
                    // Simple uniqueness check
                    if (localUsers.some(u => u.id !== user.id && u.email.toLowerCase() === updates.email?.toLowerCase())) {
                        return { success: false, message: "This email is already in use." };
                    }
                    user.email = updates.email;
                }
                if ('profilePicture' in updates) user.profilePicture = updates.profilePicture;
                if (updates.newPassword) user.passwordHash = `local_hash_${updates.newPassword}`;
                
                localUsers[index] = user;
                localStorage.setItem('onetask_local_users', JSON.stringify(localUsers));
                setCurrentUser(user);
                localUpdateSuccessful = true;
            }
        }
    } catch (e) { 
        console.error(e);
        localError = "Failed to update local storage.";
    }

    // --- Server Sync ---
    try {
        const fetchPromise = fetch('/api/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
            body: JSON.stringify({ 
                updates, 
                currentPassword,
                email: currentUser.email // IMPORTANT: Pass current email for server lookup
            }),
        });
        
        // Timeout to prevent hanging in preview envs
        const timeoutPromise = new Promise<Response>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 1500)
        );

        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
             const data = await response.json();
             if (response.ok) {
                 setCurrentUser(data.user);
                 return { success: true, message: "Account updated successfully." };
             }
             return { success: false, message: data.message || "An error occurred." };
        }
    } catch (err) {
        // Fallback: If server failed/timed out, but local succeeded, report success.
        if (localUpdateSuccessful) {
             return { success: true, message: "Account updated locally." };
        }
    }
    
    // Default fallback
    if (localUpdateSuccessful) return { success: true, message: "Account updated locally." };
    return { success: false, message: localError || "Could not update account." };
  };

  const handleDeleteUser = async (password: string): Promise<{ success: boolean, message: string }> => {
    if (!currentUser) return { success: false, message: "No user is logged in." };
    
    // Helper for local delete logic
    const performLocalDelete = () => {
         try {
             // Local password check (Any format)
            const pwdHash = currentUser.passwordHash;
            const enteredHashLocal = `local_hash_${password}`;
            const enteredHashApi = `hashed_${password}`;

            if (pwdHash !== enteredHashLocal && pwdHash !== enteredHashApi) {
                return { success: false, message: "The password you entered is incorrect." };
            }

            const localUsersStr = localStorage.getItem('onetask_local_users');
            if (localUsersStr) {
                const localUsers: User[] = JSON.parse(localUsersStr);
                const newUsers = localUsers.filter(u => u.id !== currentUser.id);
                localStorage.setItem('onetask_local_users', JSON.stringify(newUsers));
            }
            localStorage.removeItem(getLocalDataKey(currentUser.id));
            setCurrentUser(null);
            setSettingsModalOpen(false);
            return { success: true, message: "Account deleted locally." };
        } catch (e) {
             return { success: false, message: "Could not delete account." };
        }
    };

    try {
        const fetchPromise = fetch('/api/users', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
            body: JSON.stringify({ 
                password,
                email: currentUser.email // IMPORTANT: Pass email for server lookup
            }),
        });
        
        const timeoutPromise = new Promise<Response>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 1500)
        );

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        const contentType = response.headers.get("content-type");
         if (contentType && contentType.includes("application/json")) {
             const data = await response.json();
             if (response.ok) {
                 setCurrentUser(null);
                 setSettingsModalOpen(false);
                 return { success: true, message: "Account deleted successfully." };
             }
             return { success: false, message: data.message || "An error occurred." };
         }
         throw new Error("API fail");
    } catch (err) {
        // Fallback to local delete
        return performLocalDelete();
    }
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

  const sortedProjects = useMemo(() => {
    if (!settings.isAutoRotationEnabled) return projects;
    
    return [...projects].sort((a, b) => {
      const aValue = getProjectSortValue(a);
      const bValue = getProjectSortValue(b);
      if (aValue.earliestDueDate.getTime() !== bValue.earliestDueDate.getTime()) return aValue.earliestDueDate.getTime() - bValue.earliestDueDate.getTime();
      if (aValue.highestPriority !== bValue.highestPriority) return bValue.highestPriority - aValue.highestPriority;
      return bValue.timeForUrgentTask - aValue.timeForUrgentTask;
    });
  }, [projects, settings.isAutoRotationEnabled]);

  const activeProject = useMemo(() => {
    return projects.find((c) => c.id === activeProjectId) || null;
  }, [projects, activeProjectId]);

  // --- Auth Handlers ---
  const handleSignOut = () => {
      setCurrentUser(null);
      setUserMenuOpen(false);
  };
  
  const handleLoginSuccess = (user: User) => {
      setCurrentUser(user);
      setAuthModalOpen(false);
  }

  const handleEditField = (field: EditingField) => {
    setEditingAccountField(field);
  };

  const getDeletedItemName = () => {
      if (!deletedItem) return 'Item';
      if (deletedItem.type === 'project') return deletedItem.item.name;
      return deletedItem.item.title;
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
                      onAddTask={handleOpenAddTask}
                      onScheduleTask={handleOpenScheduleTask}
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
        isVisible={!!deletedItem}
        message={`'${getDeletedItemName()}' deleted.`}
        onUndo={handleUndo}
      />

      {isAddProjectModalOpen && currentUser && (
        <AddProjectModal onClose={() => setAddProjectModalOpen(false)} onAddProject={handleAddProject} />
      )}
      {isAddTaskModalOpen && currentUser && (
        <AddTaskModal
          onClose={() => setAddTaskModalOpen(false)}
          onAddTask={handleAddTask}
          initialPriority={taskPriority}
          isScheduling={isSchedulingTask}
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
            onClose={() => setAuthModalOpen(false)}
            onLoginSuccess={handleLoginSuccess}
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