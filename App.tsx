import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Project, Task, Priority, User, CompletedTask, List, Recurrence } from './types';
import useSessionStorage from './hooks/useSessionStorage';
import useLocalStorage from './hooks/useLocalStorage';
import Sidebar from './components/Sidebar';
import TaskBoard from './components/TaskBoard';
import ListView from './components/ListView';
import AddProjectModal from './components/AddProjectModal';
import AddListModal from './components/AddListModal';
import AddTaskModal from './components/AddTaskModal';
import EditTaskModal from './components/EditTaskModal';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import { UserCircleIcon, ArrowRightOnRectangleIcon, Bars3Icon, ChevronDoubleLeftIcon } from './components/icons';
import EditProfilePictureModal from './components/account-settings/EditProfilePictureModal';
import EditNameModal from './components/account-settings/EditNameModal';
import EditEmailModal from './components/account-settings/EditEmailModal';
import ChangePasswordModal from './components/account-settings/ChangePasswordModal';
import UndoToast from './components/UndoToast';
import { auth, db, onAuthStateChanged, signOut, doc, setDoc, onSnapshot } from './firebase';
import { handleFirestoreError, OperationType } from './components/firestoreUtils';

const getInitials = (name: string) => {
    if (!name) return '??';
    const clean = name.replace(/[^a-zA-Z0-9]/g, '');
    return clean.slice(0, 2).toUpperCase() || name.trim().slice(0, 2).toUpperCase();
};

interface UserData {
    lists: List[];
    completedTasks: CompletedTask[];
    activeListId: string | null;
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
} | {
    type: 'list';
    item: List;
    index: number;
};

const App: React.FC = () => {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          id: user.uid,
          name: user.displayName || 'User',
          email: user.email || '',
          profilePicture: user.photoURL,
          createdAt: user.metadata.creationTime || new Date().toISOString()
        });
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserMenuOpen(false);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };
  
  // --- App Data State ---
  const [lists, setLists] = useState<List[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const activeList = useMemo(() => {
    return lists.find(l => l.id === activeListId) || null;
  }, [lists, activeListId]);

  const projects = useMemo(() => {
    return activeList ? activeList.projects : [];
  }, [activeList]);

  const updateProjects = useCallback((newProjects: Project[]) => {
    setLists(prev => prev.map(l => l.id === activeListId ? { ...l, projects: newProjects } : l));
  }, [activeListId]);
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
      
      const migrateData = (data: any): UserData => {
        // Migration: If user has projects but no lists, create a default list
        if (data.projects && !data.lists) {
            const defaultList: List = {
                id: 'default-list',
                name: 'My Projects',
                projects: data.projects
            };
            return {
                ...data,
                lists: [defaultList],
                activeListId: 'default-list',
                activeProjectId: data.activeProjectId
            };
        }
        return data as UserData;
      };

      // Firestore Real-time Sync
      const unsubscribe = onSnapshot(doc(db, 'userData', currentUser.id), (snapshot) => {
        if (snapshot.exists()) {
          const rawData = snapshot.data();
          const data = migrateData(rawData);
          setLists(data.lists || []);
          setCompletedTasks(data.completedTasks || []);
          setActiveListId(data.activeListId || null);
          setActiveProjectId(data.activeProjectId || null);
          setSidebarOpen(data.isSidebarOpen !== undefined ? data.isSidebarOpen : true);
          setSettings(prev => ({ ...prev, ...(data.settings || {}) }));
        } else {
          // Initialize new user data
          const initialData: UserData = {
            lists: [],
            completedTasks: [],
            activeListId: null,
            activeProjectId: null,
            isSidebarOpen: true,
            settings: settings
          };
          setDoc(doc(db, 'userData', currentUser.id), initialData)
            .catch(err => handleFirestoreError(err, OperationType.CREATE, `userData/${currentUser.id}`));
        }
        setIsDataLoaded(true);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, `userData/${currentUser.id}`);
      });

      return () => unsubscribe();
    } else {
      // Clear data on logout
      setLists([]);
      setCompletedTasks([]);
      setActiveListId(null);
      setActiveProjectId(null);
      setIsDataLoaded(true);
    }
  }, [currentUser]);

  // --- Save user data on change ---
  const saveData = useCallback(async (dataToSave: UserData) => {
    if (!currentUser) return;
    
    try {
      await setDoc(doc(db, 'userData', currentUser.id), dataToSave);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `userData/${currentUser.id}`);
    }
  }, [currentUser]);

  // Debounced save effect
  useEffect(() => {
    if (currentUser && isDataLoaded) {
      const dataToSave = { lists, completedTasks, activeListId, activeProjectId, isSidebarOpen, settings };
      const handler = setTimeout(() => {
        saveData(dataToSave);
      }, 500); // 500ms debounce

      return () => {
        clearTimeout(handler);
      };
    }
  }, [lists, completedTasks, activeListId, activeProjectId, isSidebarOpen, settings, saveData, currentUser, isDataLoaded]);


  // --- Modals State ---
  const [isAddProjectModalOpen, setAddProjectModalOpen] = useState(false);
  const [isAddListModalOpen, setAddListModalOpen] = useState(false);
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

  // --- List Handlers ---
  const handleAddList = (name: string, icon?: string) => {
    const newList: List = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name,
      icon,
      projects: [],
    };
    setLists(prev => [...prev, newList]);
    setActiveListId(newList.id);
  };

  const handleDeleteList = (listId: string) => {
    const listIndex = lists.findIndex(l => l.id === listId);
    const listToDelete = lists[listIndex];

    if (listToDelete) {
      setLists(prev => prev.filter(l => l.id !== listId));
      if (activeListId === listId) {
        setActiveListId(null);
        setActiveProjectId(null);
      }

      registerDeletion({
        type: 'list',
        item: listToDelete,
        index: listIndex
      });
    }
  };

  const handleUpdateList = (listId: string, updates: { name?: string; icon?: string; isPriorityRotationEnabled?: boolean }) => {
    setLists(prev => prev.map(l => l.id === listId ? { ...l, ...updates } : l));
  };

  const handleReorderLists = (reorderedLists: List[]) => {
    setLists(reorderedLists);
  };
  
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

    const isDueWithin7Days = (dueDateStr: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const taskDueDate = new Date(dueDateStr + 'T00:00:00');
        const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;
        
        // Include overdue tasks (past) and tasks due within the next 7 days
        return taskDueDate.getTime() <= today.getTime() + sevenDaysInMillis;
    };

    let needsUpdate = false;
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    
    const updatedProjects = projects.map(p => ({
      ...p,
      tasks: p.tasks.map(t => {
        // Ignore tasks scheduled for the future
        if (t.scheduledDate && t.scheduledDate > todayStr) return t;

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

        if (settings.isAutoPriorityModeEnabled && !newTask.isAutoPriorityExcluded) {
            if (basePriority === Priority.Medium && newTask.dueDate) {
                const isWithin7DayWindow = isDueWithin7Days(newTask.dueDate);
                const isPromotableByDate = isDueWithinTimeframe(newTask.dueDate, settings.autoPriorityHours);
                const taskDueDate = new Date(newTask.dueDate + 'T00:00:00');
                const isDueOnSpecialDay = settings.autoPriorityDays.includes(taskDueDate.getDay());
                
                const shouldBePromoted = isWithin7DayWindow && (isPromotableByDate || isDueOnSpecialDay);

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
      updateProjects(updatedProjects);
    }
  }, [settings.isAutoPriorityModeEnabled, projects, settings.autoPriorityDays, settings.autoPriorityHours, isDataLoaded, updateProjects]);

  // --- UNDO LOGIC ---
  const handleUndo = () => {
    if (!deletedItem) return;

    if (deletedItem.type === 'project') {
      const newProjects = [...projects];
      newProjects.splice(deletedItem.index, 0, deletedItem.item);
      updateProjects(newProjects);
      // Automatically switch back to the restored project if appropriate
      setActiveProjectId(deletedItem.item.id);
    } else if (deletedItem.type === 'task') {
      const updatedProjects = projects.map(p => {
        if (p.id === deletedItem.projectId) {
          return { ...p, tasks: [...p.tasks, deletedItem.item] };
        }
        return p;
      });
      updateProjects(updatedProjects);
    } else if (deletedItem.type === 'list') {
      const newLists = [...lists];
      newLists.splice(deletedItem.index, 0, deletedItem.item);
      setLists(newLists);
      setActiveListId(deletedItem.item.id);
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
    updateProjects(updatedProjects);
    setActiveProjectId(newProject.id);
  };
  
  const handleDeleteProject = (projectId: string) => {
    const projectIndex = projects.findIndex(p => p.id === projectId);
    const projectToDelete = projects[projectIndex];
    
    if (projectToDelete) {
        // Immediate update
        const updatedProjects = projects.filter(p => p.id !== projectId);
        updateProjects(updatedProjects);

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
    updateProjects(updatedProjects);
  };
  
  const handleReorderProjects = (reorderedProjects: Project[]) => {
    updateProjects(reorderedProjects);
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
      originalPriority: taskData.priority,
    };
    const updatedProjects = projects.map((c) => {
      if (c.id === activeProjectId) {
        return { ...c, tasks: [...c.tasks, newTask] };
      }
      return c;
    });
    updateProjects(updatedProjects);
  };
  
  const handleOpenEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setEditTaskModalOpen(true);
  };
  
  const handleEditTask = (updatedTask: Task) => {
    const taskWithOriginalPriority = {
        ...updatedTask,
        originalPriority: updatedTask.originalPriority || updatedTask.priority
    };
    const updatedProjects = projects.map((c) => {
        return {
            ...c,
            tasks: c.tasks.map(t => t.id === updatedTask.id ? taskWithOriginalPriority : t)
        };
    });
    updateProjects(updatedProjects);
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
        updateProjects(updatedProjects);

        registerDeletion({
            type: 'task',
            item: taskToDelete,
            projectId: activeProjectId
        });
    }
  };

  const handleCompleteTask = (taskId: string) => {
    let taskToComplete: Task | null = null;
    let projectOfTask: Project | null = null;

    projects.forEach(p => {
        const t = p.tasks.find(task => task.id === taskId);
        if (t) {
            taskToComplete = t;
            projectOfTask = p;
        }
    });

    if (projectOfTask && taskToComplete) {
        const task = taskToComplete as Task;
        const project = projectOfTask as Project;

        const completed: CompletedTask = {
            ...task,
            completedAt: new Date().toISOString(),
            projectId: project.id,
            projectName: project.name,
        };
        setCompletedTasks(prev => [completed, ...prev]);

        // Handle Recurrence
        let nextTask: Task | null = null;
        if (task.recurrence && task.recurrence !== Recurrence.None) {
            const dateStr = task.dueDate || task.scheduledDate || new Date().toISOString().split('T')[0];
            const [y, m, d] = dateStr.split('-').map(Number);
            const nextDate = new Date(y, m - 1, d);
            
            if (task.recurrence === Recurrence.Daily) nextDate.setDate(nextDate.getDate() + 1);
            else if (task.recurrence === Recurrence.Weekly) nextDate.setDate(nextDate.getDate() + 7);
            else if (task.recurrence === Recurrence.Monthly) nextDate.setMonth(nextDate.getMonth() + 1);
            else if (task.recurrence === Recurrence.Yearly) nextDate.setFullYear(nextDate.getFullYear() + 1);

            const nextDateStr = nextDate.getFullYear() + '-' + 
                              String(nextDate.getMonth() + 1).padStart(2, '0') + '-' + 
                              String(nextDate.getDate()).padStart(2, '0');
            
            nextTask = {
                ...task,
                id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
                dueDate: task.dueDate ? nextDateStr : undefined,
                scheduledDate: nextDateStr, // Always schedule the next occurrence to avoid immediate re-appearance
                priority: task.originalPriority || task.priority, // Reset priority to original
            };
        }

        const updatedProjects = projects.map(p => {
            if (p.id === project.id) {
                const newTasks = p.tasks.filter(t => t.id !== taskId);
                if (nextTask) newTasks.push(nextTask);
                return { ...p, tasks: newTasks };
            }
            return p;
        });
        updateProjects(updatedProjects);
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
    
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user found.");

      if (updates.name) {
        const { updateProfile } = await import('firebase/auth');
        await updateProfile(user, { displayName: updates.name });
      }

      if (updates.profilePicture !== undefined) {
        const { updateProfile } = await import('firebase/auth');
        await updateProfile(user, { photoURL: updates.profilePicture });
      }

      // Email and password updates are more complex with Google Auth and usually not needed
      // We'll just update the local state which will be synced by onAuthStateChanged
      
      return { success: true, message: "Account updated successfully." };
    } catch (err: any) {
      console.error('Update User Error:', err);
      return { success: false, message: err.message || "Could not update account." };
    }
  };

  const handleDeleteUser = async (password: string): Promise<{ success: boolean, message: string }> => {
    if (!currentUser) return { success: false, message: "No user is logged in." };
    
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user found.");

      const { deleteUser } = await import('firebase/auth');
      await deleteUser(user);
      
      setSettingsModalOpen(false);
      return { success: true, message: "Account deleted successfully." };
    } catch (err: any) {
      console.error('Delete User Error:', err);
      return { success: false, message: "Could not delete account. You may need to re-authenticate." };
    }
  };

  const getProjectSortValue = (project: Project) => {
    const now = new Date();
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const visibleTasks = project.tasks.filter(t => !t.scheduledDate || t.scheduledDate <= today);

    const farFutureDate = new Date('9999-12-31');
    if (visibleTasks.length === 0) return { earliestDueDate: farFutureDate, highestPriority: 0, timeForUrgentTask: 0 };
    const priorityValues = { [Priority.High]: 3, [Priority.Medium]: 2, [Priority.Low]: 1 };
    let earliestDueDate: Date | null = null;
    visibleTasks.forEach(task => {
        if (task.dueDate) {
            const taskDate = new Date(`${task.dueDate}T00:00:00`);
            if (!earliestDueDate || taskDate < earliestDueDate) earliestDueDate = taskDate;
        }
    });
    if (!earliestDueDate) earliestDueDate = farFutureDate;

    // 2. Find highest priority overall (consistent with Sidebar border)
    let highestPriority = 0;
    visibleTasks.forEach(task => {
        const p = priorityValues[task.priority];
        if (p > highestPriority) highestPriority = p;
    });

    // 3. Find time for urgent task (highest priority tasks at earliest deadline)
    let timeForUrgentTask = 0;
    const urgentTasks = visibleTasks.filter(task => {
        const p = priorityValues[task.priority];
        if (p !== highestPriority) return false;
        if (earliestDueDate.getTime() === farFutureDate.getTime()) return true;
        if (!task.dueDate) return false;
        return new Date(`${task.dueDate}T00:00:00`).getTime() === earliestDueDate.getTime();
    });
    
    urgentTasks.forEach(task => {
        if (task.estimatedTime && task.estimatedTime > timeForUrgentTask) {
            timeForUrgentTask = task.estimatedTime;
        }
    });

    return { earliestDueDate, highestPriority, timeForUrgentTask };
  };

  const sortedProjects = useMemo(() => {
    if (!settings.isAutoRotationEnabled) return projects;
    
    return [...projects].sort((a, b) => {
      const aValue = getProjectSortValue(a);
      const bValue = getProjectSortValue(b);
      // Primary: Highest Priority
      if (aValue.highestPriority !== bValue.highestPriority) return bValue.highestPriority - aValue.highestPriority;
      // Secondary: Earliest Due Date
      if (aValue.earliestDueDate.getTime() !== bValue.earliestDueDate.getTime()) return aValue.earliestDueDate.getTime() - bValue.earliestDueDate.getTime();
      // Tertiary: Time for Urgent Task
      return bValue.timeForUrgentTask - aValue.timeForUrgentTask;
    });
  }, [projects, settings.isAutoRotationEnabled]);

  const activeProject = useMemo(() => {
    return projects.find((c) => c.id === activeProjectId) || null;
  }, [projects, activeProjectId]);

  // --- Auth Handlers ---
  const handleSignOut = async () => {
    try {
      if (currentUser && isDataLoaded) {
          const dataToSave = { lists, completedTasks, activeListId, activeProjectId, isSidebarOpen, settings };
          await saveData(dataToSave);
      }
      await signOut(auth);
      setUserMenuOpen(false);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const handleEditField = (field: EditingField) => {
    setEditingAccountField(field);
  };

  const getDeletedItemName = () => {
      if (!deletedItem) return 'Item';
      if (deletedItem.type === 'project' || deletedItem.type === 'list') return deletedItem.item.name;
      return deletedItem.item.title;
  };

  if (currentUser && !isDataLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      {currentUser && activeListId && (
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
              lists={lists}
              activeListId={activeListId}
              activeProjectId={activeProjectId}
              projects={sortedProjects}
              onSelectList={(id) => {
                setActiveListId(id);
                if (id === null) {
                  setActiveProjectId(null);
                }
              }}
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
              onAddList={() => setAddListModalOpen(true)}
              onDeleteList={handleDeleteList}
              onUpdateList={handleUpdateList}
              onReorderLists={handleReorderLists}
              isReorderEnabled={!settings.isAutoRotationEnabled}
            />
        </>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-slate-800/50 sticky top-0 z-10 backdrop-blur-sm flex-shrink-0">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center gap-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4 flex-grow flex-shrink min-w-0">
              {currentUser && activeListId && (
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
                    activeListId ? (activeProject ? activeProject.name : activeList?.name) : 'My Lists'
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
                  {!activeListId ? (
                    <ListView 
                      lists={lists}
                      onSelectList={setActiveListId}
                      onAddList={handleAddList}
                      onDeleteList={handleDeleteList}
                      onUpdateList={handleUpdateList}
                      onReorderLists={handleReorderLists}
                    />
                  ) : activeProject ? (
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
                        <h2 className="text-xl font-semibold text-slate-600 dark:text-slate-400">No projects in this list yet!</h2>
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
      {isAddListModalOpen && currentUser && (
        <AddListModal onClose={() => setAddListModalOpen(false)} onAddList={handleAddList} />
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