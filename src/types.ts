export type Category = 'dropshipping' | 'ecommerce_meli' | 'carrera' | 'impresion3d' | 'otro';

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type Priority = 1 | 2 | 3; // baja, media, alta

/** Subtarea que pertenece al desglose automático de un proyecto. */
export interface Task {
  id: string;
  projectId: string;
  title: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  status: 'pending' | 'done';
  order: number;
  createdAt: string;
  completedAt?: string;
}

/** Iniciativa de varios pasos (ej: armar una tienda). Se desglosa sola en subtareas. */
export interface Project {
  id: string;
  name: string;
  category: Category;
  difficulty: Difficulty;
  priority: Priority;
  status: 'active' | 'paused' | 'done';
  createdAt: string;
  lastWorkedAt?: string;
  streakCount: number;
  tasks: Task[];
  /** Fecha objetivo en la que se quiere tener el proyecto terminado. */
  targetEndDate?: string;
}

/** Ítem suelto y ya atómico (ej: una tarea de la carrera con fecha de entrega). No se desglosa. */
export interface StandaloneTask {
  id: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  priority: Priority;
  estimatedMinutes: number;
  status: 'pending' | 'done';
  /** Día en que arranca (ej: cuando se asigna una tarea semanal). Opcional. */
  startDate?: string;
  /** Fecha límite / de entrega. */
  dueDate?: string;
  /** Presente cuando la tarea se repite semanalmente; comparten este id todas sus ocurrencias. */
  seriesId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface DailyPlan {
  date: string;
  projectTaskIds: string[];
  standaloneTaskIds: string[];
}

/** Recordatorio libre anclado a un día del calendario. No es una tarea: no tiene estado ni desglose. */
export interface Note {
  id: string;
  date: string;
  text: string;
  createdAt: string;
}

export interface AppData {
  projects: Project[];
  standaloneTasks: StandaloneTask[];
  notes: Note[];
  dailyPlans: DailyPlan[];
  settings: {
    dailyMinutesAvailable: number;
    notificationsEnabled: boolean;
  };
  /** IDs ya notificados hoy, para no repetir el mismo aviso una y otra vez. */
  notifiedLog: { date: string; ids: string[] };
}

export const CATEGORY_LABELS: Record<Category, string> = {
  dropshipping: 'Dropshipping',
  ecommerce_meli: 'E-commerce (Mercado Libre)',
  carrera: 'Carrera: Automatización y Robótica',
  impresion3d: 'Impresión 3D',
  otro: 'Otro',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: 'Muy fácil',
  2: 'Fácil',
  3: 'Media',
  4: 'Difícil',
  5: 'Muy difícil',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  1: 'Baja',
  2: 'Media',
  3: 'Alta',
};

export function createDefaultData(): AppData {
  return {
    projects: [],
    standaloneTasks: [],
    notes: [],
    dailyPlans: [],
    settings: {
      dailyMinutesAvailable: 120,
      notificationsEnabled: false,
    },
    notifiedLog: { date: '', ids: [] },
  };
}
