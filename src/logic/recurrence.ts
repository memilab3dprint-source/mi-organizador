import { StandaloneTask } from '../types';
import { addDays, daysBetween, todayStr } from './planner';

const MAX_CATCHUP_ITERATIONS = 12;

function nextOccurrence(task: StandaloneTask): StandaloneTask {
  return {
    ...task,
    id: crypto.randomUUID(),
    status: 'pending',
    startDate: task.startDate ? addDays(task.startDate, 7) : undefined,
    dueDate: task.dueDate ? addDays(task.dueDate, 7) : undefined,
    createdAt: new Date().toISOString(),
    completedAt: undefined,
  };
}

/**
 * Genera automáticamente la siguiente ocurrencia de cada tarea semanal recurrente
 * cuya ocurrencia más reciente ya se completó o venció, hasta ponerse al día con hoy.
 * No muta el array recibido.
 */
export function advanceRecurringSeries(tasks: StandaloneTask[], today: string = todayStr()): StandaloneTask[] {
  const seriesIds = new Set(tasks.filter((t) => t.seriesId).map((t) => t.seriesId!));
  if (seriesIds.size === 0) return tasks;

  const additions: StandaloneTask[] = [];

  for (const seriesId of seriesIds) {
    const occurrences = [...tasks, ...additions].filter((t) => t.seriesId === seriesId);
    let latest = occurrences.sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))[occurrences.length - 1];
    let guard = 0;
    while (latest.dueDate && (latest.status === 'done' || daysBetween(latest.dueDate, today) > 0) && guard < MAX_CATCHUP_ITERATIONS) {
      const next = nextOccurrence(latest);
      additions.push(next);
      latest = next;
      guard++;
    }
  }

  return additions.length > 0 ? [...tasks, ...additions] : tasks;
}
