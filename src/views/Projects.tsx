import { useState } from 'react';
import { AppData, CATEGORY_LABELS, Category, DIFFICULTY_LABELS, Difficulty, PRIORITY_LABELS, Priority, Project, Task } from '../types';
import { generateSubtaskDrafts } from '../logic/templates';
import { daysBetween, isAtRisk, isProjectOverdue, staleDays, todayStr, withProgressRegistered } from '../logic/planner';

interface Props {
  data: AppData;
  setData: (updater: (prev: AppData) => AppData) => void;
}

export default function Projects({ data, setData }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const selected = data.projects.find((p) => p.id === selectedId) ?? null;

  function addProject(input: { name: string; category: Category; difficulty: Difficulty; priority: Priority; targetEndDate?: string }) {
    const now = new Date().toISOString();
    const drafts = generateSubtaskDrafts(input.category, input.difficulty);
    const projectId = crypto.randomUUID();
    const tasks: Task[] = drafts.map((d, i) => ({
      id: crypto.randomUUID(),
      projectId,
      title: d.title,
      difficulty: d.weight,
      estimatedMinutes: d.minutes,
      status: 'pending',
      order: i,
      createdAt: now,
    }));
    const project: Project = {
      id: projectId,
      name: input.name,
      category: input.category,
      difficulty: input.difficulty,
      priority: input.priority,
      status: 'active',
      createdAt: now,
      streakCount: 0,
      tasks,
      targetEndDate: input.targetEndDate,
    };
    setData((prev) => ({ ...prev, projects: [...prev.projects, project] }));
    setSelectedId(projectId);
    setShowForm(false);
  }

  function updateProject(projectId: string, updater: (p: Project) => Project) {
    setData((prev) => ({ ...prev, projects: prev.projects.map((p) => (p.id === projectId ? updater(p) : p)) }));
  }

  function deleteProject(projectId: string) {
    if (!confirm('¿Eliminar este proyecto y todas sus tareas?')) return;
    setData((prev) => ({ ...prev, projects: prev.projects.filter((p) => p.id !== projectId) }));
    if (selectedId === projectId) setSelectedId(null);
  }

  function toggleTask(projectId: string, taskId: string) {
    const today = todayStr();
    updateProject(projectId, (project) => {
      const tasks = project.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const nowDone = t.status !== 'done';
        return { ...t, status: (nowDone ? 'done' : 'pending') as 'done' | 'pending', completedAt: nowDone ? new Date().toISOString() : undefined };
      });
      const justCompleted = tasks.some((t) => t.id === taskId && t.status === 'done');
      const updated = { ...project, tasks };
      return justCompleted ? withProgressRegistered(updated, today) : updated;
    });
  }

  function addCustomTask(projectId: string, title: string, difficulty: Difficulty, minutes: number) {
    updateProject(projectId, (project) => ({
      ...project,
      tasks: [
        ...project.tasks,
        {
          id: crypto.randomUUID(),
          projectId,
          title,
          difficulty,
          estimatedMinutes: minutes,
          status: 'pending',
          order: project.tasks.length,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  }

  return (
    <div className="view projects-view">
      <div className="projects-list-col">
        <div className="projects-list-header">
          <h1>Proyectos</h1>
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancelar' : '+ Nuevo proyecto'}
          </button>
        </div>

        {showForm && <NewProjectForm onSubmit={addProject} />}

        <ul className="project-cards">
          {data.projects.map((project) => {
            const total = project.tasks.length;
            const done = project.tasks.filter((t) => t.status === 'done').length;
            const risk = isAtRisk(project);
            const overdue = isProjectOverdue(project);
            return (
              <li
                key={project.id}
                className={`project-card ${selectedId === project.id ? 'project-card-selected' : ''}`}
                onClick={() => setSelectedId(project.id)}
              >
                <div className="project-card-title">
                  {project.name} {(risk || overdue) && <span title={overdue ? 'Pasó la fecha objetivo' : 'En riesgo de abandono'}>⚠️</span>}
                </div>
                <div className="task-meta">{CATEGORY_LABELS[project.category]}</div>
                <div className="badges">
                  <span className="badge">{DIFFICULTY_LABELS[project.difficulty]}</span>
                  <span className="badge">Prioridad: {PRIORITY_LABELS[project.priority]}</span>
                  {project.streakCount > 0 && <span className="badge badge-streak">🔥 {project.streakCount}</span>}
                  {project.targetEndDate && (
                    <span className={`badge ${overdue ? 'badge-risk' : ''}`}>
                      {overdue ? `Vencido (${project.targetEndDate})` : `🎯 ${project.targetEndDate}`}
                    </span>
                  )}
                  {project.status !== 'active' && <span className="badge">{project.status === 'done' ? 'Completado' : 'Pausado'}</span>}
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
        {data.projects.length === 0 && !showForm && <p className="empty-state">Todavía no tenés proyectos. Creá el primero.</p>}
      </div>

      <div className="project-detail-col">
        {selected ? (
          <ProjectDetail
            project={selected}
            onToggleTask={(taskId) => toggleTask(selected.id, taskId)}
            onAddTask={(title, difficulty, minutes) => addCustomTask(selected.id, title, difficulty, minutes)}
            onChangeStatus={(status) => updateProject(selected.id, (p) => ({ ...p, status }))}
            onChangeTargetEndDate={(targetEndDate) => updateProject(selected.id, (p) => ({ ...p, targetEndDate }))}
            onDelete={() => deleteProject(selected.id)}
          />
        ) : (
          <p className="empty-state">Seleccioná un proyecto para ver sus tareas.</p>
        )}
      </div>
    </div>
  );
}

function NewProjectForm({
  onSubmit,
}: {
  onSubmit: (input: { name: string; category: Category; difficulty: Difficulty; priority: Priority; targetEndDate?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('dropshipping');
  const [difficulty, setDifficulty] = useState<Difficulty>(3);
  const [priority, setPriority] = useState<Priority>(2);
  const [targetEndDate, setTargetEndDate] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), category, difficulty, priority, targetEndDate: targetEndDate || undefined });
    setName('');
    setTargetEndDate('');
  }

  return (
    <form className="new-project-form" onSubmit={submit}>
      <label>
        Nombre del proyecto
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Tienda de dropshipping de mascotas" autoFocus />
      </label>
      <label>
        Categoría
        <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="form-row">
        <label>
          Dificultad
          <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value) as Difficulty)}>
            {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Prioridad
          <select value={priority} onChange={(e) => setPriority(Number(e.target.value) as Priority)}>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Fecha objetivo de finalización (opcional)
        <input type="date" value={targetEndDate} onChange={(e) => setTargetEndDate(e.target.value)} />
      </label>
      <p className="hint">Las subtareas se generan automáticamente según la categoría y dificultad elegidas.</p>
      <button type="submit" className="btn-primary">
        Crear proyecto
      </button>
    </form>
  );
}

function ProjectDetail({
  project,
  onToggleTask,
  onAddTask,
  onChangeStatus,
  onChangeTargetEndDate,
  onDelete,
}: {
  project: Project;
  onToggleTask: (taskId: string) => void;
  onAddTask: (title: string, difficulty: Difficulty, minutes: number) => void;
  onChangeStatus: (status: Project['status']) => void;
  onChangeTargetEndDate: (targetEndDate: string | undefined) => void;
  onDelete: () => void;
}) {
  const [newTitle, setNewTitle] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<Difficulty>(3);
  const [newMinutes, setNewMinutes] = useState(45);

  function submitTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddTask(newTitle.trim(), newDifficulty, newMinutes);
    setNewTitle('');
  }

  const today = todayStr();
  const overdue = isProjectOverdue(project, today);
  const daysToTarget = project.targetEndDate ? daysBetween(today, project.targetEndDate) : null;

  return (
    <div>
      <div className="project-detail-header">
        <div>
          <h2>{project.name}</h2>
          <p className="muted">{CATEGORY_LABELS[project.category]}</p>
        </div>
        <div className="project-detail-actions">
          <select value={project.status} onChange={(e) => onChangeStatus(e.target.value as Project['status'])}>
            <option value="active">Activo</option>
            <option value="paused">Pausado</option>
            <option value="done">Completado</option>
          </select>
          <button className="btn-danger" onClick={onDelete}>
            Eliminar
          </button>
        </div>
      </div>

      <div className="badges">
        <span className="badge">{DIFFICULTY_LABELS[project.difficulty]}</span>
        <span className="badge">Prioridad: {PRIORITY_LABELS[project.priority]}</span>
        {project.streakCount > 0 && <span className="badge badge-streak">🔥 Racha de {project.streakCount} día(s)</span>}
        {isAtRisk(project, today) && <span className="badge badge-risk">⚠️ Sin avances hace {staleDays(project, today)} días</span>}
        {project.targetEndDate && daysToTarget !== null && (
          <span className={`badge ${overdue ? 'badge-risk' : ''}`}>
            {overdue ? `⚠️ Venció hace ${-daysToTarget} día(s)` : daysToTarget === 0 ? '🎯 Vence hoy' : `🎯 Faltan ${daysToTarget} día(s)`}
          </span>
        )}
      </div>

      <label className="target-date-field">
        Fecha objetivo de finalización
        <input
          type="date"
          value={project.targetEndDate ?? ''}
          onChange={(e) => onChangeTargetEndDate(e.target.value || undefined)}
        />
      </label>

      <ul className="task-list">
        {[...project.tasks]
          .sort((a, b) => a.order - b.order)
          .map((task) => (
            <li key={task.id} className={`task-item ${task.status === 'done' ? 'task-done' : ''}`}>
              <label>
                <input type="checkbox" checked={task.status === 'done'} onChange={() => onToggleTask(task.id)} />
                <div>
                  <div className="task-title">{task.title}</div>
                  <div className="task-meta">
                    {DIFFICULTY_LABELS[task.difficulty]} · {task.estimatedMinutes} min
                  </div>
                </div>
              </label>
            </li>
          ))}
      </ul>

      <form className="add-task-form" onSubmit={submitTask}>
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Agregar subtarea manual..." />
        <select value={newDifficulty} onChange={(e) => setNewDifficulty(Number(e.target.value) as Difficulty)}>
          {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input type="number" min={5} step={5} value={newMinutes} onChange={(e) => setNewMinutes(Number(e.target.value))} title="Minutos estimados" />
        <button type="submit" className="btn-secondary">
          Agregar
        </button>
      </form>
    </div>
  );
}
