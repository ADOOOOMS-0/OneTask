export enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export enum Recurrence {
  None = 'none',
  Daily = 'daily',
  Weekly = 'weekly',
  Monthly = 'monthly',
  Yearly = 'yearly',
}

export interface Task {
  id: string;
  title: string;
  dueDate?: string; // ISO string format
  priority: Priority;
  originalPriority?: Priority;
  estimatedTime?: number; // in minutes
  autoPromoteDate?: string; // ISO string format
  scheduledDate?: string; // ISO string format (YYYY-MM-DD) - when task appears on board
  isAutoPriorityExcluded?: boolean;
  notes?: string;
  recurrence?: Recurrence;
}

export interface Project {
  id: string;
  name: string;
  tasks: Task[];
}

export interface List {
  id: string;
  name: string;
  icon?: string; // Emoji or image URL
  projects: Project[];
  isPriorityRotationEnabled?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  profilePicture?: string | null;
  createdAt: string;
}

export interface CompletedTask extends Task {
  completedAt: string;
  projectId: string;
  projectName: string;
}