import { AppData } from './types';

const STORAGE_KEY = 'organizador.data.v1';

/** Interpreta un JSON crudo (de localStorage o de un archivo de respaldo) como AppData,
 * completando valores por defecto para campos que falten (datos de versiones anteriores). */
export function parseAppData(raw: string): AppData {
  const parsed = JSON.parse(raw) as Partial<AppData>;
  return {
    projects: parsed.projects ?? [],
    standaloneTasks: parsed.standaloneTasks ?? [],
    notes: parsed.notes ?? [],
    dailyPlans: (parsed.dailyPlans ?? []).filter(
      (p): p is AppData['dailyPlans'][number] => Array.isArray(p.projectTaskIds) && Array.isArray(p.standaloneTaskIds),
    ),
    settings: { dailyMinutesAvailable: 120, notificationsEnabled: false, ...parsed.settings },
    notifiedLog: parsed.notifiedLog ?? { date: '', ids: [] },
  };
}

export function loadData(): AppData | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return parseAppData(raw);
  } catch {
    return null;
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
