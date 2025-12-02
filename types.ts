import { Priority } from './Priority';

export { Priority };

export interface Task {
  id: string;
  title: string;
  dueDate?: string; // ISO string format
  priority: Priority;
  originalPriority?: Priority;
  estimatedTime?: number; // in minutes
  autoPromoteDate?: string; // ISO string format
  scheduledDate?: string; // ISO string format (YYYY-MM-DD) - when task appears on board
}

export interface Project {
  id: string;
  name: string;
  tasks: Task[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // Storing a hash, not the plain password
  createdAt: string; // ISO string format
  profilePicture?: string | null; // data URL
}

export interface CompletedTask extends Task {
  completedAt: string;
  projectId: string;
  projectName: string;
}