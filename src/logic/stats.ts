import { AppData, Category } from '../types';
import { addDays, isAtRisk, isOverdue, isProjectOverdue, staleDays, todayStr } from './planner';

export interface DailyActivity {
  date: string;
  count: number;
}

/** Cuántas tareas se completaron cada uno de los últimos N días (para ver consistencia real). */
export function getRecentActivity(data: AppData, days = 14, today: string = todayStr()): DailyActivity[] {
  const counts = new Map<string, number>();
  const record = (iso?: string) => {
    if (!iso) return;
    const d = iso.slice(0, 10);
    counts.set(d, (counts.get(d) ?? 0) + 1);
  };
  for (const p of data.projects) for (const t of p.tasks) if (t.status === 'done') record(t.completedAt);
  for (const t of data.standaloneTasks) if (t.status === 'done') record(t.completedAt);

  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, -(days - 1 - i));
    return { date, count: counts.get(date) ?? 0 };
  });
}

export interface CategoryEffort {
  category: Category;
  completedMinutes: number;
  completedCount: number;
}

/** En qué categorías se invirtió realmente el tiempo (según tareas ya completadas). */
export function getCategoryEffort(data: AppData): CategoryEffort[] {
  const map = new Map<Category, { minutes: number; count: number }>();
  const add = (category: Category, minutes: number) => {
    const cur = map.get(category) ?? { minutes: 0, count: 0 };
    cur.minutes += minutes;
    cur.count += 1;
    map.set(category, cur);
  };
  for (const p of data.projects) for (const t of p.tasks) if (t.status === 'done') add(p.category, t.estimatedMinutes);
  for (const t of data.standaloneTasks) if (t.status === 'done') add(t.category, t.estimatedMinutes);

  return Array.from(map.entries())
    .map(([category, v]) => ({ category, completedMinutes: v.minutes, completedCount: v.count }))
    .sort((a, b) => b.completedMinutes - a.completedMinutes);
}

export interface SummaryStats {
  activeProjects: number;
  doneProjects: number;
  pausedProjects: number;
  totalTasksCompleted: number;
  totalTasksPending: number;
  bestActiveStreak: number;
  itemsNeedingAttention: number;
}

export function getSummaryStats(data: AppData, today: string = todayStr()): SummaryStats {
  const activeProjects = data.projects.filter((p) => p.status === 'active').length;
  const doneProjects = data.projects.filter((p) => p.status === 'done').length;
  const pausedProjects = data.projects.filter((p) => p.status === 'paused').length;

  let totalTasksCompleted = 0;
  let totalTasksPending = 0;
  for (const p of data.projects) {
    for (const t of p.tasks) {
      if (t.status === 'done') totalTasksCompleted++;
      else totalTasksPending++;
    }
  }
  for (const t of data.standaloneTasks) {
    if (t.status === 'done') totalTasksCompleted++;
    else totalTasksPending++;
  }

  const bestActiveStreak = data.projects.filter((p) => p.status === 'active').reduce((max, p) => Math.max(max, p.streakCount), 0);

  const atRiskCount = data.projects.filter((p) => isAtRisk(p, today)).length;
  const overdueProjectsCount = data.projects.filter((p) => isProjectOverdue(p, today) && !isAtRisk(p, today)).length;
  const overdueTasksCount = data.standaloneTasks.filter((t) => isOverdue(t, today)).length;

  return {
    activeProjects,
    doneProjects,
    pausedProjects,
    totalTasksCompleted,
    totalTasksPending,
    bestActiveStreak,
    itemsNeedingAttention: atRiskCount + overdueProjectsCount + overdueTasksCount,
  };
}

export interface AttentionItem {
  id: string;
  label: string;
  detail: string;
}

/** Proyectos estancados/vencidos y tareas vencidas, para revisar cuando quieras (no solo hoy). */
export function getAttentionItems(data: AppData, today: string = todayStr()): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const p of data.projects) {
    if (isAtRisk(p, today)) {
      items.push({ id: `risk-${p.id}`, label: `📁 ${p.name}`, detail: `Sin avances hace ${staleDays(p, today)} días` });
    } else if (isProjectOverdue(p, today)) {
      items.push({ id: `overdue-p-${p.id}`, label: `📁 ${p.name}`, detail: `Pasó su fecha objetivo (${p.targetEndDate})` });
    }
  }
  for (const t of data.standaloneTasks) {
    if (isOverdue(t, today)) {
      items.push({ id: `overdue-t-${t.id}`, label: `✅ ${t.title}`, detail: `Venció el ${t.dueDate}` });
    }
  }

  return items;
}
