export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'awaiting_review' | 'done';

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
  status?: TaskStatus;
  creationDate?: string;
  dueDate?: string;
}

const TASKS_STORAGE_KEY = 'tasks';
const BACKEND_URL = 'http://localhost:3001/tasks';

const isValidPriority = (priority: unknown): priority is Priority => {
  return typeof priority === 'string' && ['low', 'medium', 'high'].includes(priority);
};

const isValidStatus = (status: unknown): status is TaskStatus => {
  return typeof status === 'string' && ['todo', 'in_progress', 'awaiting_review', 'done'].includes(status);
};

export const getTasks = async (): Promise<Task[]> => {
  try {
    const response = await fetch(BACKEND_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch tasks from backend');
    }
    const tasks: Task[] = await response.json();

    // Validate and migrate tasks
    const validatedTasks = tasks.map(task => ({
      ...task,
      priority: isValidPriority(task.priority) ? task.priority : 'medium',
      status: isValidStatus(task.status) ? task.status : 'todo',
    }));

    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(validatedTasks));
    return validatedTasks;
  } catch (e) {
    console.error('Failed to fetch tasks from backend, falling back to localStorage', e);
    const savedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!savedTasks) return [];

    try {
      const tasks: Task[] = JSON.parse(savedTasks);
      return tasks.map(task => ({
        ...task,
        priority: isValidPriority(task.priority) ? task.priority : 'medium',
        status: isValidStatus(task.status) ? task.status : 'todo',
      }));
    } catch (err) {
      console.error('Failed to parse tasks from localStorage', err);
      return [];
    }
  }
};

export const addTask = async (title: string, priority: string = 'medium'): Promise<Task> => {
  const validatedPriority = isValidPriority(priority) ? priority : 'medium';
  const now = new Date().toISOString();

  const newTask: Task = {
    id: crypto.randomUUID(),
    title,
    completed: false,
    priority: validatedPriority,
    status: 'todo',
    creationDate: now,
    lastUpdatedAt: now,
  };

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    });
    if (!response.ok) throw new Error('Failed to add task to backend');

    const addedTask = await response.json();
    await getTasks(); // This also updates localStorage
    return addedTask;
  } catch (e) {
    console.error('Failed to add task to backend, updating local state', e);
    const tasks = await getTasks();
    const updatedTasks = [...tasks, newTask];
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
    return newTask;
  }
};

export const updateTask = async (id: string, updates: Partial<Task>): Promise<Task[]> => {
  const tasks = await getTasks();
  let updatedTask: Task | null = null;

  const taskToUpdate = tasks.find(t => t.id === id);
  if (!taskToUpdate) return tasks;

  updatedTask = {
    ...taskToUpdate,
    ...updates,
    lastUpdatedAt: new Date().toISOString()
  };

  if (updates.priority !== undefined && !isValidPriority(updates.priority)) {
    updatedTask.priority = 'medium';
  }

  if (updates.status !== undefined && !isValidStatus(updates.status)) {
    updatedTask.status = 'todo';
  }

  try {
    const response = await fetch(`${BACKEND_URL}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTask),
    });
    if (!response.ok) throw new Error('Failed to update task in backend');

    return await getTasks(); // Sync and return
  } catch (e) {
    console.error('Failed to update task in backend, updating local state', e);
    const localUpdatedTasks = tasks.map(task => (task.id === id ? updatedTask! : task));
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(localUpdatedTasks));
    return localUpdatedTasks;
  }
};

export const deleteTask = async (id: string): Promise<Task[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete task from backend');

    return await getTasks();
  } catch (e) {
    console.error('Failed to delete task from backend, updating local state', e);
    const tasks = await getTasks();
    const updatedTasks = tasks.filter(task => task.id !== id);
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
    return updatedTasks;
  }
};

export const suggestTasks = async (title: string, description?: string): Promise<string[]> => {
  try {
    const response = await fetch('http://localhost:3001/suggest-tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, description }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch suggestions');
    }

    return await response.json();
  } catch (e) {
    console.error('Error fetching task suggestions', e);
    return [];
  }
};
