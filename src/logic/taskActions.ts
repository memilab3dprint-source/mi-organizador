import { StandaloneTask } from '../types';
import { advanceRecurringSeries } from './recurrence';

/** Alterna pendiente/hecha una tarea suelta y, si pertenece a una serie semanal, genera la próxima ocurrencia. */
export function toggleStandaloneTask(tasks: StandaloneTask[], taskId: string): StandaloneTask[] {
  const toggled = tasks.map((t) => {
    if (t.id !== taskId) return t;
    const nowDone = t.status !== 'done';
    return { ...t, status: (nowDone ? 'done' : 'pending') as 'done' | 'pending', completedAt: nowDone ? new Date().toISOString() : undefined };
  });
  return advanceRecurringSeries(toggled);
}
