import { AppData, CATEGORY_LABELS, DIFFICULTY_LABELS, PRIORITY_LABELS } from '../types';
import { isAtRisk, isProjectOverdue, todayStr } from '../logic/planner';
import { getAttentionItems, getCategoryEffort, getRecentActivity, getSummaryStats } from '../logic/stats';

interface Props {
  data: AppData;
}

const WEEKDAY_SHORT = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function dayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return WEEKDAY_SHORT[weekday];
}

export default function Stats({ data }: Props) {
  const today = todayStr();
  const summary = getSummaryStats(data, today);
  const activity = getRecentActivity(data, 14, today);
  const categoryEffort = getCategoryEffort(data);
  const attentionItems = getAttentionItems(data, today);

  const maxActivity = Math.max(1, ...activity.map((a) => a.count));
  const maxCategoryMinutes = Math.max(1, ...categoryEffort.map((c) => c.completedMinutes));

  const visibleProjects = [...data.projects]
    .filter((p) => p.status !== 'done')
    .sort((a, b) => Number(isAtRisk(b, today) || isProjectOverdue(b, today)) - Number(isAtRisk(a, today) || isProjectOverdue(a, today)));

  return (
    <div className="view">
      <h1>Progreso</h1>
      <p className="muted">Un vistazo a qué tan seguido avanzás de verdad, no solo a lo que planeaste.</p>

      <div className="stats-tiles">
        <div className="stat-tile">
          <div className="stat-tile-value">{summary.activeProjects}</div>
          <div className="stat-tile-label">Proyectos activos</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value">{summary.doneProjects}</div>
          <div className="stat-tile-label">Proyectos completados</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value">{summary.totalTasksCompleted}</div>
          <div className="stat-tile-label">Tareas completadas</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value">🔥 {summary.bestActiveStreak}</div>
          <div className="stat-tile-label">Mejor racha activa</div>
        </div>
        <div className={`stat-tile ${summary.itemsNeedingAttention > 0 ? 'stat-tile-warning' : ''}`}>
          <div className="stat-tile-value">{summary.itemsNeedingAttention}</div>
          <div className="stat-tile-label">Necesitan atención</div>
        </div>
      </div>

      <h3>Actividad de los últimos 14 días</h3>
      <div className="activity-chart">
        {activity.map((day) => (
          <div key={day.date} className="activity-bar-col" title={`${day.date}: ${day.count} tarea(s) completada(s)`}>
            <div className="activity-bar-track">
              <div className="activity-bar" style={{ height: `${(day.count / maxActivity) * 100}%` }} />
            </div>
            <div className="activity-bar-label">{dayLabel(day.date)}</div>
          </div>
        ))}
      </div>

      {categoryEffort.length > 0 && (
        <>
          <h3>Dónde se fue el tiempo (tareas completadas)</h3>
          <div className="category-effort">
            {categoryEffort.map((c) => (
              <div key={c.category} className="category-bar-row">
                <div className="category-bar-label">{CATEGORY_LABELS[c.category]}</div>
                <div className="category-bar-track">
                  <div className="category-bar-fill" style={{ width: `${(c.completedMinutes / maxCategoryMinutes) * 100}%` }} />
                </div>
                <div className="category-bar-value">
                  {c.completedMinutes} min · {c.completedCount} tarea{c.completedCount === 1 ? '' : 's'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h3>Progreso por proyecto</h3>
      {visibleProjects.length === 0 && <p className="empty-state">No tenés proyectos activos o pausados todavía.</p>}
      <ul className="project-cards stats-project-list">
        {visibleProjects.map((project) => {
          const total = project.tasks.length;
          const done = project.tasks.filter((t) => t.status === 'done').length;
          const risk = isAtRisk(project, today);
          const overdue = isProjectOverdue(project, today);
          return (
            <li key={project.id} className="project-card">
              <div className="project-card-title">
                {project.name} {(risk || overdue) && <span title={overdue ? 'Pasó la fecha objetivo' : 'En riesgo de abandono'}>⚠️</span>}
              </div>
              <div className="task-meta">{CATEGORY_LABELS[project.category]}</div>
              <div className="badges">
                <span className="badge">{DIFFICULTY_LABELS[project.difficulty]}</span>
                <span className="badge">Prioridad: {PRIORITY_LABELS[project.priority]}</span>
                {project.streakCount > 0 && <span className="badge badge-streak">🔥 {project.streakCount}</span>}
                {project.status === 'paused' && <span className="badge">Pausado</span>}
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
              </div>
              <div className="task-meta">
                {done}/{total} tareas
              </div>
            </li>
          );
        })}
      </ul>

      {attentionItems.length > 0 && (
        <div className="risk-box">
          <h3>⚠️ Necesitan atención</h3>
          <ul>
            {attentionItems.map((item) => (
              <li key={item.id}>
                <strong>{item.label}</strong> — {item.detail}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
