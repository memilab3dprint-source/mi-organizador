import { DailyPlan, Project, StandaloneTask } from '../types';

function parseDateUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayStr(): string {
  const d = new Date();
  return formatDateUTC(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
}

export function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.round((parseDateUTC(b).getTime() - parseDateUTC(a).getTime()) / msPerDay);
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDateUTC(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateUTC(d);
}

/** Cantidad de días que abarca una tarea con inicio y fin (ambos días incluidos). */
export function durationDays(startDate: string, dueDate: string): number {
  return daysBetween(startDate, dueDate) + 1;
}

/** Puntos de urgencia por cercanía a una fecha límite: crece a medida que se acerca, se dispara si ya pasó. */
function deadlineUrgency(dueDate: string | undefined, today: string): number {
  if (!dueDate) return 0;
  const daysLeft = daysBetween(today, dueDate);
  return daysLeft <= 0 ? 50 : Math.max(0, 20 - daysLeft * 2);
}

/** Días desde la última vez que se avanzó; si nunca se avanzó, desde que se creó. */
export function staleDays(project: Project, today: string = todayStr()): number {
  const lastActivity = project.lastWorkedAt ?? project.createdAt.slice(0, 10);
  return daysBetween(lastActivity, today);
}

/** true si un proyecto lleva varios días sin avances (riesgo de abandono). Los proyectos
 * recién creados tienen un margen más amplio antes de considerarse "en riesgo". */
export function isAtRisk(project: Project, today: string = todayStr()): boolean {
  if (project.status !== 'active') return false;
  const graceDays = project.lastWorkedAt ? 3 : 5;
  return staleDays(project, today) >= graceDays;
}

/** true si una tarea suelta ya pasó su fecha de entrega y sigue pendiente. */
export function isOverdue(task: StandaloneTask, today: string = todayStr()): boolean {
  return task.status === 'pending' && !!task.dueDate && daysBetween(task.dueDate, today) > 0;
}

/** true si un proyecto activo ya pasó su fecha objetivo de finalización. */
export function isProjectOverdue(project: Project, today: string = todayStr()): boolean {
  return project.status === 'active' && !!project.targetEndDate && daysBetween(project.targetEndDate, today) > 0;
}

/** Puntaje de prioridad para el plan diario: más antiguo sin tocar + más prioridad + cercanía a la meta. */
function projectScore(project: Project, today: string): number {
  return staleDays(project, today) * 2 + project.priority * 3 + deadlineUrgency(project.targetEndDate, today);
}

/** Puntaje de una tarea suelta: prioridad + antigüedad + urgencia por fecha de entrega. */
function standaloneScore(task: StandaloneTask, today: string): number {
  const age = daysBetween(task.createdAt.slice(0, 10), today);
  return task.priority * 3 + age + deadlineUrgency(task.dueDate, today);
}

/**
 * Actualiza la racha de un proyecto al completar una tarea hoy.
 * Devuelve un nuevo objeto Project (no muta el original).
 */
export function withProgressRegistered(project: Project, today: string = todayStr()): Project {
  if (project.lastWorkedAt === today) return project;
  const streakCount = project.lastWorkedAt && daysBetween(project.lastWorkedAt, today) === 1 ? project.streakCount + 1 : 1;
  return { ...project, lastWorkedAt: today, streakCount };
}

const MAX_TASKS_PER_DAY = 6;
const MAX_TASKS_PER_GROUP = 2;

/**
 * Elige qué trabajar hoy entre proyectos (subtareas) y tareas sueltas,
 * repartido para no enfocarse en una sola cosa, priorizando lo más
 * urgente/estancado, y respetando el tiempo disponible del día.
 */
export function generateDailyPlan(
  projects: Project[],
  standaloneTasks: StandaloneTask[],
  minutesAvailable: number,
  today: string = todayStr(),
): Pick<DailyPlan, 'projectTaskIds' | 'standaloneTaskIds'> {
  const eligibleProjects = projects.filter((p) => p.status === 'active' && p.tasks.some((t) => t.status === 'pending'));
  const pendingStandalone = standaloneTasks.filter((t) => t.status === 'pending');

  type Group =
    | { kind: 'project'; key: string; score: number; project: Project }
    | { kind: 'standalone'; key: string; score: number; task: StandaloneTask };

  const groups: Group[] = [
    ...eligibleProjects.map((project) => ({ kind: 'project' as const, key: `project:${project.id}`, score: projectScore(project, today), project })),
    ...pendingStandalone.map((task) => ({ kind: 'standalone' as const, key: `category:${task.category}`, score: standaloneScore(task, today), task })),
  ];
  groups.sort((a, b) => b.score - a.score);

  const projectTaskIds: string[] = [];
  const standaloneTaskIds: string[] = [];
  const perGroupCount = new Map<string, number>();
  let remaining = minutesAvailable;
  let addedInRound = true;

  while (addedInRound && projectTaskIds.length + standaloneTaskIds.length < MAX_TASKS_PER_DAY && remaining > 0) {
    addedInRound = false;
    for (const group of groups) {
      if (projectTaskIds.length + standaloneTaskIds.length >= MAX_TASKS_PER_DAY) break;
      const count = perGroupCount.get(group.key) ?? 0;
      if (count >= MAX_TASKS_PER_GROUP) continue;

      if (group.kind === 'project') {
        const nextTask = group.project.tasks
          .filter((t) => t.status === 'pending' && !projectTaskIds.includes(t.id))
          .sort((a, b) => a.order - b.order)[0];
        if (!nextTask || nextTask.estimatedMinutes > remaining) continue;
        projectTaskIds.push(nextTask.id);
        perGroupCount.set(group.key, count + 1);
        remaining -= nextTask.estimatedMinutes;
        addedInRound = true;
      } else {
        if (standaloneTaskIds.includes(group.task.id) || group.task.estimatedMinutes > remaining) continue;
        standaloneTaskIds.push(group.task.id);
        perGroupCount.set(group.key, count + 1);
        remaining -= group.task.estimatedMinutes;
        addedInRound = true;
      }
    }
  }

  if (projectTaskIds.length === 0 && standaloneTaskIds.length === 0) {
    const projectCandidates = eligibleProjects.flatMap((p) => p.tasks.filter((t) => t.status === 'pending').map((t) => ({ id: t.id, minutes: t.estimatedMinutes, kind: 'project' as const })));
    const standaloneCandidates = pendingStandalone.map((t) => ({ id: t.id, minutes: t.estimatedMinutes, kind: 'standalone' as const }));
    const smallest = [...projectCandidates, ...standaloneCandidates].sort((a, b) => a.minutes - b.minutes)[0];
    if (smallest?.kind === 'project') projectTaskIds.push(smallest.id);
    if (smallest?.kind === 'standalone') standaloneTaskIds.push(smallest.id);
  }

  return { projectTaskIds, standaloneTaskIds };
}
