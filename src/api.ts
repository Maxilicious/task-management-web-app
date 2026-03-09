export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  delegatedBy?: string;
  assignedTo?: string[];
  originalRequestLink?: string;
  delegatedAt?: string;
  lastUpdatedAt?: string;
  estimatedCompletionDate?: string;
  prUrl?: string;
  prStatus?: string;
  status?: string;
  creationDate?: string;
}

const TASKS_STORAGE_KEY = 'tasks';

const isValidPriority = (priority: any): priority is Priority => {
  return ['low', 'medium', 'high'].includes(priority);
};

export const getTasks = (): Task[] => {
  const savedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
  if (!savedTasks) return [];

  try {
    const tasks: any[] = JSON.parse(savedTasks);
    // Validate and migrate existing tasks if they lack priority
    return tasks.map(task => ({
      ...task,
      priority: isValidPriority(task.priority) ? task.priority : 'medium',
    }));
  } catch (e) {
    console.error('Failed to parse tasks from localStorage', e);
    return [];
  }
};

export const addTask = (title: string, priority: string = 'medium'): Task => {
  const validatedPriority = isValidPriority(priority) ? priority : 'medium';

  const newTask: Task = {
    id: crypto.randomUUID(),
    title,
    completed: false,
    priority: validatedPriority,
    creationDate: new Date().toISOString(),
  };

  const tasks = getTasks();
  const updatedTasks = [...tasks, newTask];
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));

  return newTask;
};

export const updateTask = (id: string, updates: Partial<Task>): Task[] => {
  const tasks = getTasks();
  let updatedTask: Task | null = null;

  const updatedTasks = tasks.map(task => {
    if (task.id === id) {
      updatedTask = {
        ...task,
        ...updates,
        lastUpdatedAt: new Date().toISOString()
      };

      // Validate priority if it's being updated
      if (updates.priority !== undefined && !isValidPriority(updates.priority)) {
         updatedTask.priority = 'medium';
      }

      return updatedTask;
    }
    return task;
  });

  if (updatedTask) {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
  }

  return updatedTasks;
};

export const deleteTask = (id: string): Task[] => {
  const tasks = getTasks();
  const updatedTasks = tasks.filter(task => task.id !== id);
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
  return updatedTasks;
};
