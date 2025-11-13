import { Priority } from './Priority';

export { Priority };

export interface Task {
  id: string;
  title: string;
  dueDate?: string; // ISO string format
  priority: Priority;
  originalPriority?: Priority;
  estimatedTime?: number; // in minutes
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
