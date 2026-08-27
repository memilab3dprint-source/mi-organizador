import { AppData } from '../types';
import { isOverdue, isProjectOverdue, todayStr } from './planner';

export interface NotifiableItem {
  id: string;
  title: string;
  body: string;
}

/** Tareas y proyectos que vencen hoy o ya están vencidos, listos para avisar. */
export function getNotifiableItems(data: AppData, today: string = todayStr()): NotifiableItem[] {
  const items: NotifiableItem[] = [];

  for (const t of data.standaloneTasks) {
    if (t.status !== 'pending' || !t.dueDate) continue;
    if (t.dueDate === today) {
      items.push({ id: `task-due-${t.id}-${today}`, title: '📌 Tarea vence hoy', body: t.title });
    } else if (isOverdue(t, today)) {
      items.push({ id: `task-overdue-${t.id}-${today}`, title: '⚠️ Tarea vencida', body: t.title });
    }
  }

  for (const p of data.projects) {
    if (p.status !== 'active' || !p.targetEndDate) continue;
    if (p.targetEndDate === today) {
      items.push({ id: `project-due-${p.id}-${today}`, title: '🎯 Proyecto vence hoy', body: p.name });
    } else if (isProjectOverdue(p, today)) {
      items.push({ id: `project-overdue-${p.id}-${today}`, title: '⚠️ Proyecto vencido', body: p.name });
    }
  }

  return items;
}

/** Dispara notificaciones del navegador para los ítems que todavía no se avisaron hoy. */
export function sendDueNotifications(data: AppData): AppData {
  if (!data.settings.notificationsEnabled) return data;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return data;

  const today = todayStr();
  const alreadyNotified = data.notifiedLog.date === today ? new Set(data.notifiedLog.ids) : new Set<string>();

  const items = getNotifiableItems(data, today).filter((item) => !alreadyNotified.has(item.id));
  if (items.length === 0) return data;

  for (const item of items) {
    new Notification(item.title, { body: item.body });
  }

  return {
    ...data,
    notifiedLog: { date: today, ids: [...alreadyNotified, ...items.map((i) => i.id)] },
  };
}
