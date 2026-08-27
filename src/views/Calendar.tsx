import { useMemo, useState } from 'react';
import { AppData, CATEGORY_LABELS, Category, DIFFICULTY_LABELS, Difficulty, Note, PRIORITY_LABELS, Priority, Project, StandaloneTask } from '../types';
import { addDays, daysBetween, durationDays, isOverdue, isProjectOverdue, todayStr } from '../logic/planner';
import { toggleStandaloneTask } from '../logic/taskActions';

interface Props {
  data: AppData;
  setData: (updater: (prev: AppData) => AppData) => void;
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function taskRangeDates(task: StandaloneTask): string[] {
  if (!task.startDate || !task.dueDate) return [];
  const span = daysBetween(task.startDate, task.dueDate);
  if (span <= 0 || span > 60) return [];
  return Array.from({ length: span + 1 }, (_, i) => addDays(task.startDate!, i));
}

export default function CalendarView({ data, setData }: Props) {
  const today = todayStr();
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split('-').map(Number);
    return { year: y, month: m - 1 };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const { year, month } = cursor;

  const tasksByDueDate = useMemo(() => {
    const map = new Map<string, StandaloneTask[]>();
    for (const t of data.standaloneTasks) {
      if (!t.dueDate) continue;
      const list = map.get(t.dueDate) ?? [];
      list.push(t);
      map.set(t.dueDate, list);
    }
    return map;
  }, [data.standaloneTasks]);

  const notesByDate = useMemo(() => {
    const map = new Map<string, Note[]>();
    for (const n of data.notes) {
      const list = map.get(n.date) ?? [];
      list.push(n);
      map.set(n.date, list);
    }
    return map;
  }, [data.notes]);

  const rangeDates = useMemo(() => {
    const set = new Set<string>();
    for (const t of data.standaloneTasks) {
      if (t.status === 'done') continue;
      for (const d of taskRangeDates(t)) set.add(d);
    }
    return set;
  }, [data.standaloneTasks]);

  const projectsByTargetDate = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const p of data.projects) {
      if (!p.targetEndDate) continue;
      const list = map.get(p.targetEndDate) ?? [];
      list.push(p);
      map.set(p.targetEndDate, list);
    }
    return map;
  }, [data.projects]);

  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = (firstOfMonth.getUTCDay() + 6) % 7; // Lunes = 0

  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  function goPrevMonth() {
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  }
  function goNextMonth() {
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));
  }
  function goToday() {
    const [y, m] = today.split('-').map(Number);
    setCursor({ year: y, month: m - 1 });
    setSelectedDate(today);
  }

  function selectDate(dateStr: string) {
    setSelectedDate(dateStr);
    setShowTaskForm(false);
  }

  function addNote(text: string) {
    if (!selectedDate) return;
    const note: Note = { id: crypto.randomUUID(), date: selectedDate, text, createdAt: new Date().toISOString() };
    setData((prev) => ({ ...prev, notes: [...prev.notes, note] }));
  }

  function deleteNote(noteId: string) {
    setData((prev) => ({ ...prev, notes: prev.notes.filter((n) => n.id !== noteId) }));
  }

  function addTaskOnDate(input: {
    title: string;
    category: Category;
    difficulty: Difficulty;
    priority: Priority;
    minutes: number;
    startDate?: string;
    weekly: boolean;
  }) {
    if (!selectedDate) return;
    const task: StandaloneTask = {
      id: crypto.randomUUID(),
      title: input.title,
      category: input.category,
      difficulty: input.difficulty,
      priority: input.priority,
      estimatedMinutes: input.minutes,
      status: 'pending',
      startDate: input.startDate,
      dueDate: selectedDate,
      seriesId: input.weekly ? crypto.randomUUID() : undefined,
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, standaloneTasks: [...prev.standaloneTasks, task] }));
    setShowTaskForm(false);
  }

  function toggleTask(taskId: string) {
    setData((prev) => ({ ...prev, standaloneTasks: toggleStandaloneTask(prev.standaloneTasks, taskId) }));
  }

  function deleteTask(taskId: string) {
    setData((prev) => ({ ...prev, standaloneTasks: prev.standaloneTasks.filter((t) => t.id !== taskId) }));
  }

  const selectedTasks = selectedDate ? (tasksByDueDate.get(selectedDate) ?? []) : [];
  const selectedProjects = selectedDate ? (projectsByTargetDate.get(selectedDate) ?? []) : [];
  const selectedNotes = selectedDate ? (notesByDate.get(selectedDate) ?? []) : [];

  return (
    <div className="view calendar-view">
      <div className="calendar-col">
        <div className="calendar-header">
          <h1>Calendario</h1>
          <div className="calendar-nav">
            <button className="btn-secondary" onClick={goPrevMonth}>
              ← Anterior
            </button>
            <span className="calendar-month-label">
              {MONTH_LABELS[month]} {year}
            </span>
            <button className="btn-secondary" onClick={goNextMonth}>
              Siguiente →
            </button>
            <button className="btn-secondary" onClick={goToday}>
              Hoy
            </button>
          </div>
        </div>

        <div className="calendar-grid calendar-grid-header">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="calendar-weekday">
              {d}
            </div>
          ))}
        </div>
        <div className="calendar-grid">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} className="calendar-cell calendar-cell-empty" />;
            const dateStr = toDateStr(year, month, day);
            const dayTasks = tasksByDueDate.get(dateStr) ?? [];
            const dayProjects = projectsByTargetDate.get(dateStr) ?? [];
            const dayNotes = notesByDate.get(dateStr) ?? [];
            const pendingCount = dayTasks.filter((t) => t.status === 'pending').length;
            const hasOverdue = dayTasks.some((t) => isOverdue(t, today)) || dayProjects.some((p) => isProjectOverdue(p, today));
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;
            const inRange = rangeDates.has(dateStr);
            return (
              <button
                key={i}
                className={`calendar-cell ${isToday ? 'calendar-cell-today' : ''} ${isSelected ? 'calendar-cell-selected' : ''} ${inRange ? 'calendar-cell-in-range' : ''}`}
                onClick={() => selectDate(dateStr)}
              >
                <span className="calendar-cell-day">{day}</span>
                <div className="calendar-cell-dots">
                  {pendingCount > 0 && <span className={`calendar-cell-dot ${hasOverdue ? 'calendar-cell-dot-overdue' : ''}`}>{pendingCount}</span>}
                  {dayProjects.length > 0 && <span className="calendar-cell-dot calendar-cell-dot-project">📁</span>}
                  {dayNotes.length > 0 && <span className="calendar-cell-dot calendar-cell-dot-note">📝</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="calendar-side-col">
        {selectedDate ? (
          <>
            <h2>
              {selectedDate}
              {selectedDate === today ? ' (hoy)' : ''}
            </h2>

            <NoteQuickForm key={`note-${selectedDate}`} onSubmit={addNote} />

            {selectedNotes.length > 0 && (
              <ul className="note-list">
                {selectedNotes.map((note) => (
                  <li key={note.id} className="note-item">
                    <span>📝 {note.text}</span>
                    <button className="note-delete" onClick={() => deleteNote(note.id)} title="Eliminar nota">
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {selectedProjects.length > 0 && (
              <ul className="task-list">
                {selectedProjects.map((p) => (
                  <li key={p.id} className="task-item">
                    <div>
                      <div className="task-title">📁 {p.name}</div>
                      <div className="task-meta">{CATEGORY_LABELS[p.category]} · meta de finalización</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {selectedTasks.length > 0 && (
              <ul className="task-list">
                {selectedTasks.map((task) => (
                  <li key={task.id} className={`task-item ${task.status === 'done' ? 'task-done' : ''}`}>
                    <label>
                      <input type="checkbox" checked={task.status === 'done'} onChange={() => toggleTask(task.id)} />
                      <div>
                        <div className="task-title">
                          {task.title} {task.seriesId && <span title="Se repite cada semana">🔁</span>}
                        </div>
                        <div className="task-meta">
                          {CATEGORY_LABELS[task.category]} · {DIFFICULTY_LABELS[task.difficulty]} · {task.estimatedMinutes} min
                          {task.startDate && ` · Duración: ${durationDays(task.startDate, task.dueDate!)} días (desde ${task.startDate})`}
                        </div>
                      </div>
                    </label>
                    <button className="btn-danger" onClick={() => deleteTask(task.id)}>
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {selectedTasks.length === 0 && selectedProjects.length === 0 && selectedNotes.length === 0 && (
              <p className="empty-state">No hay nada agendado para este día todavía.</p>
            )}

            {showTaskForm ? (
              <QuickAddTaskForm key={`task-${selectedDate}`} onSubmit={addTaskOnDate} />
            ) : (
              <button className="btn-secondary calendar-more-options" onClick={() => setShowTaskForm(true)}>
                + Agregar tarea con más detalles (categoría, duración, repetición…)
              </button>
            )}
          </>
        ) : (
          <p className="empty-state">Hacé clic en un día para ver o agregar algo en esa fecha.</p>
        )}
      </div>
    </div>
  );
}

function NoteQuickForm({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText('');
  }

  return (
    <form className="note-quick-form" onSubmit={submit}>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribí una nota o recordatorio para este día..." autoFocus />
      <button type="submit" className="btn-primary">
        Agregar
      </button>
    </form>
  );
}

function QuickAddTaskForm({
  onSubmit,
}: {
  onSubmit: (input: {
    title: string;
    category: Category;
    difficulty: Difficulty;
    priority: Priority;
    minutes: number;
    startDate?: string;
    weekly: boolean;
  }) => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('carrera');
  const [difficulty, setDifficulty] = useState<Difficulty>(3);
  const [priority, setPriority] = useState<Priority>(2);
  const [minutes, setMinutes] = useState(60);
  const [startDate, setStartDate] = useState('');
  const [weekly, setWeekly] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), category, difficulty, priority, minutes, startDate: startDate || undefined, weekly });
    setTitle('');
  }

  return (
    <form className="new-project-form" onSubmit={submit}>
      <label>
        Nueva tarea con entrega este día
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Entregar informe" autoFocus />
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
      </div>
      <label className="checkbox-row">
        <input type="checkbox" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} />
        Repetir cada semana
      </label>
      <button type="submit" className="btn-primary">
        Agregar
      </button>
    </form>
  );
}
