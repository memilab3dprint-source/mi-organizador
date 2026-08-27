import { useState } from 'react';
import { AppData, CATEGORY_LABELS, Category, DIFFICULTY_LABELS, Difficulty, PRIORITY_LABELS, Priority, StandaloneTask } from '../types';
import { durationDays, isOverdue } from '../logic/planner';
import { toggleStandaloneTask } from '../logic/taskActions';

interface Props {
  data: AppData;
  setData: (updater: (prev: AppData) => AppData) => void;
}

function taskMeta(task: StandaloneTask): string {
  const parts = [CATEGORY_LABELS[task.category], `${task.estimatedMinutes} min`];
  if (task.startDate && task.dueDate) {
    parts.push(`${durationDays(task.startDate, task.dueDate)} días (${task.startDate} → ${task.dueDate})`);
  } else if (task.dueDate) {
    parts.push(`Entrega: ${task.dueDate}`);
  }
  return parts.join(' · ');
}

export default function Tasks({ data, setData }: Props) {
  const [showForm, setShowForm] = useState(false);

  function addTask(input: {
    title: string;
    category: Category;
    difficulty: Difficulty;
    priority: Priority;
    minutes: number;
    startDate?: string;
    dueDate?: string;
    weekly: boolean;
  }) {
    const task: StandaloneTask = {
      id: crypto.randomUUID(),
      title: input.title,
      category: input.category,
      difficulty: input.difficulty,
      priority: input.priority,
      estimatedMinutes: input.minutes,
      status: 'pending',
      startDate: input.startDate,
      dueDate: input.dueDate,
      seriesId: input.weekly ? crypto.randomUUID() : undefined,
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, standaloneTasks: [...prev.standaloneTasks, task] }));
    setShowForm(false);
  }

  function toggleTask(taskId: string) {
    setData((prev) => ({ ...prev, standaloneTasks: toggleStandaloneTask(prev.standaloneTasks, taskId) }));
  }

  function deleteTask(taskId: string) {
    setData((prev) => ({ ...prev, standaloneTasks: prev.standaloneTasks.filter((t) => t.id !== taskId) }));
  }

  const pending = [...data.standaloneTasks.filter((t) => t.status === 'pending')].sort((a, b) => {
    const overdueA = isOverdue(a) ? 0 : 1;
    const overdueB = isOverdue(b) ? 0 : 1;
    if (overdueA !== overdueB) return overdueA - overdueB;
    return (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31');
  });
  const done = data.standaloneTasks.filter((t) => t.status === 'done');

  return (
    <div className="view">
      <div className="projects-list-header">
        <div>
          <h1>Tareas</h1>
          <p className="muted">Ítems sueltos que no necesitan un plan de varios pasos (ej: entregas de la carrera).</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Nueva tarea'}
        </button>
      </div>

      {showForm && <NewTaskForm onSubmit={addTask} />}

      {pending.length === 0 && !showForm && <p className="empty-state">No tenés tareas pendientes. ¡Buen momento para agregar una!</p>}

      <ul className="task-list">
        {pending.map((task) => (
          <li key={task.id} className="task-item">
            <label>
              <input type="checkbox" checked={false} onChange={() => toggleTask(task.id)} />
              <div>
                <div className="task-title">
                  {task.title} {task.seriesId && <span title="Se repite cada semana">🔁</span>}
                </div>
                <div className="task-meta">{taskMeta(task)}</div>
              </div>
            </label>
            {isOverdue(task) && <span className="badge badge-risk">⚠️ Vencida</span>}
            <button className="btn-danger" onClick={() => deleteTask(task.id)}>
              Eliminar
            </button>
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <>
          <h3 className="muted">Completadas</h3>
          <ul className="task-list">
            {done.map((task) => (
              <li key={task.id} className="task-item task-done">
                <label>
                  <input type="checkbox" checked onChange={() => toggleTask(task.id)} />
                  <div>
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">{CATEGORY_LABELS[task.category]}</div>
                  </div>
                </label>
                <button className="btn-danger" onClick={() => deleteTask(task.id)}>
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function NewTaskForm({
  onSubmit,
}: {
  onSubmit: (input: {
    title: string;
    category: Category;
    difficulty: Difficulty;
    priority: Priority;
    minutes: number;
    startDate?: string;
    dueDate?: string;
    weekly: boolean;
  }) => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('carrera');
  const [difficulty, setDifficulty] = useState<Difficulty>(3);
  const [priority, setPriority] = useState<Priority>(2);
  const [minutes, setMinutes] = useState(60);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [weekly, setWeekly] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      category,
      difficulty,
      priority,
      minutes,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      weekly,
    });
    setTitle('');
    setStartDate('');
    setDueDate('');
    setWeekly(false);
  }

  return (
    <form className="new-project-form" onSubmit={submit}>
      <label>
        Título de la tarea
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Entregar informe de laboratorio" autoFocus />
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
      <div className="form-row">
        <label>
          Minutos estimados
          <input type="number" min={5} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
        </label>
        <label>
          Fecha de inicio (opcional)
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          Fecha de entrega (opcional)
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
      </div>
      <label className="checkbox-row">
        <input type="checkbox" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} />
        Repetir cada semana (genera la siguiente automáticamente al completarse o vencer)
      </label>
      <button type="submit" className="btn-primary">
        Agregar tarea
      </button>
    </form>
  );
}
