import { AppData, CATEGORY_LABELS } from '../types';
import { generateDailyPlan, isAtRisk, isOverdue, isProjectOverdue, staleDays, todayStr, withProgressRegistered } from '../logic/planner';
import { toggleStandaloneTask } from '../logic/taskActions';

interface Props {
  data: AppData;
  setData: (updater: (prev: AppData) => AppData) => void;
}

export default function Today({ data, setData }: Props) {
  const today = todayStr();
  const plan = data.dailyPlans.find((p) => p.date === today);

  function regenerate() {
    setData((prev) => {
      const { projectTaskIds, standaloneTaskIds } = generateDailyPlan(prev.projects, prev.standaloneTasks, prev.settings.dailyMinutesAvailable, today);
      const dailyPlans = prev.dailyPlans.filter((p) => p.date !== today);
      dailyPlans.push({ date: today, projectTaskIds, standaloneTaskIds });
      return { ...prev, dailyPlans };
    });
  }

  function toggleProjectTask(projectId: string, taskId: string) {
    setData((prev) => {
      const projects = prev.projects.map((project) => {
        if (project.id !== projectId) return project;
        const tasks = project.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const nowDone = t.status !== 'done';
          return { ...t, status: (nowDone ? 'done' : 'pending') as 'done' | 'pending', completedAt: nowDone ? new Date().toISOString() : undefined };
        });
        const justCompleted = tasks.some((t) => t.id === taskId && t.status === 'done');
        const updatedProject = { ...project, tasks };
        return justCompleted ? withProgressRegistered(updatedProject, today) : updatedProject;
      });
      return { ...prev, projects };
    });
  }

  function toggleTaskDone(taskId: string) {
    setData((prev) => ({ ...prev, standaloneTasks: toggleStandaloneTask(prev.standaloneTasks, taskId) }));
  }

  function setMinutes(minutes: number) {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, dailyMinutesAvailable: minutes } }));
  }

  async function toggleNotifications(enabled: boolean) {
    if (!enabled) {
      setData((prev) => ({ ...prev, settings: { ...prev.settings, notificationsEnabled: false } }));
      return;
    }
    if (typeof Notification === 'undefined') {
      alert('Tu navegador no soporta notificaciones.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert('No se pudo activar: bloqueaste el permiso de notificaciones para este sitio.');
      return;
    }
    setData((prev) => ({ ...prev, settings: { ...prev.settings, notificationsEnabled: true } }));
  }

  const projectPlanItems = (plan?.projectTaskIds ?? [])
    .map((taskId) => {
      for (const project of data.projects) {
        const task = project.tasks.find((t) => t.id === taskId);
        if (task) return { project, task };
      }
      return null;
    })
    .filter((x): x is { project: AppData['projects'][number]; task: AppData['projects'][number]['tasks'][number] } => x !== null);

  const standalonePlanItems = (plan?.standaloneTaskIds ?? [])
    .map((taskId) => data.standaloneTasks.find((t) => t.id === taskId))
    .filter((t): t is AppData['standaloneTasks'][number] => !!t);

  const totalMinutes =
    projectPlanItems.reduce((sum, { task }) => sum + task.estimatedMinutes, 0) + standalonePlanItems.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const doneMinutes =
    projectPlanItems.filter(({ task }) => task.status === 'done').reduce((sum, { task }) => sum + task.estimatedMinutes, 0) +
    standalonePlanItems.filter((t) => t.status === 'done').reduce((sum, t) => sum + t.estimatedMinutes, 0);

  const atRiskProjects = data.projects.filter((p) => isAtRisk(p, today) && !projectPlanItems.some((pt) => pt.project.id === p.id));
  const overdueProjects = data.projects.filter((p) => isProjectOverdue(p, today) && !atRiskProjects.some((rp) => rp.id === p.id));
  const overdueTasks = data.standaloneTasks.filter((t) => isOverdue(t, today) && !standalonePlanItems.some((st) => st.id === t.id));

  const hasPlan = projectPlanItems.length > 0 || standalonePlanItems.length > 0;
  const todayNotes = data.notes.filter((n) => n.date === today);

  return (
    <div className="view">
      <div className="today-header">
        <div>
          <h1>Hoy</h1>
          <p className="muted">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="today-controls">
          <label className="checkbox-row notifications-toggle">
            <input type="checkbox" checked={data.settings.notificationsEnabled} onChange={(e) => toggleNotifications(e.target.checked)} />
            🔔 Notificaciones
          </label>
          <label className="minutes-input">
            Minutos disponibles hoy
            <input
              type="number"
              min={15}
              step={15}
              value={data.settings.dailyMinutesAvailable}
              onChange={(e) => setMinutes(Math.max(0, Number(e.target.value)))}
            />
          </label>
          <button className="btn-primary" onClick={regenerate}>
            {plan ? 'Regenerar plan de hoy' : 'Generar plan de hoy'}
          </button>
        </div>
      </div>

      {todayNotes.length > 0 && (
        <ul className="note-list">
          {todayNotes.map((note) => (
            <li key={note.id} className="note-item">
              <span>📝 {note.text}</span>
            </li>
          ))}
        </ul>
      )}

      {!plan && <p className="empty-state">Aún no generaste tu plan de hoy. Definí tus minutos disponibles y tocá "Generar plan de hoy".</p>}

      {plan && !hasPlan && (
        <p className="empty-state">No hay tareas pendientes en tus proyectos o tareas activas. ¡Agregá un proyecto o una tarea nueva!</p>
      )}

      {hasPlan && (
        <>
          <div className="progress-summary">
            {doneMinutes} / {totalMinutes} min completados hoy
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${totalMinutes ? (doneMinutes / totalMinutes) * 100 : 0}%` }} />
            </div>
          </div>

          <ul className="task-list">
            {projectPlanItems.map(({ project, task }) => (
              <li key={task.id} className={`task-item ${task.status === 'done' ? 'task-done' : ''}`}>
                <label>
                  <input type="checkbox" checked={task.status === 'done'} onChange={() => toggleProjectTask(project.id, task.id)} />
                  <div>
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      📁 {project.name} · {CATEGORY_LABELS[project.category]} · {task.estimatedMinutes} min
                    </div>
                  </div>
                </label>
              </li>
            ))}
            {standalonePlanItems.map((task) => (
              <li key={task.id} className={`task-item ${task.status === 'done' ? 'task-done' : ''}`}>
                <label>
                  <input type="checkbox" checked={task.status === 'done'} onChange={() => toggleTaskDone(task.id)} />
                  <div>
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      ✅ {CATEGORY_LABELS[task.category]} · {task.estimatedMinutes} min
                      {task.dueDate && ` · Entrega: ${task.dueDate}`}
                    </div>
                  </div>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      {(atRiskProjects.length > 0 || overdueProjects.length > 0 || overdueTasks.length > 0) && (
        <div className="risk-box">
          <h3>⚠️ Necesitan atención</h3>
          <ul>
            {atRiskProjects.map((p) => (
              <li key={p.id}>
                Proyecto <strong>{p.name}</strong> — sin avances hace {staleDays(p, today)} días
              </li>
            ))}
            {overdueProjects.map((p) => (
              <li key={p.id}>
                Proyecto <strong>{p.name}</strong> — pasó su fecha objetivo ({p.targetEndDate})
              </li>
            ))}
            {overdueTasks.map((t) => (
              <li key={t.id}>
                Tarea <strong>{t.title}</strong> — vencida (entrega: {t.dueDate})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
