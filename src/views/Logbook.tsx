import { useState } from 'react';
import { AppData, LogEntry } from '../types';

interface Props {
  data: AppData;
  setData: (updater: (prev: AppData) => AppData) => void;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(openedAt: string, closedAt: string): string {
  const ms = new Date(closedAt).getTime() - new Date(openedAt).getTime();
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${m} min`;
}

export default function Logbook({ data, setData }: Props) {
  const [text, setText] = useState('');
  const [projectId, setProjectId] = useState('');

  function openEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      text: text.trim(),
      projectId: projectId || undefined,
      openedAt: new Date().toISOString(),
      status: 'open',
    };
    setData((prev) => ({ ...prev, logEntries: [...prev.logEntries, entry] }));
    setText('');
  }

  function closeEntry(id: string) {
    setData((prev) => ({
      ...prev,
      logEntries: prev.logEntries.map((e) => (e.id === id ? { ...e, status: 'closed', closedAt: new Date().toISOString() } : e)),
    }));
  }

  function reopenEntry(id: string) {
    setData((prev) => ({
      ...prev,
      logEntries: prev.logEntries.map((e) => (e.id === id ? { ...e, status: 'open', closedAt: undefined } : e)),
    }));
  }

  function deleteEntry(id: string) {
    if (!confirm('¿Eliminar esta entrada de la bitácora?')) return;
    setData((prev) => ({ ...prev, logEntries: prev.logEntries.filter((e) => e.id !== id) }));
  }

  const openEntries = data.logEntries.filter((e) => e.status === 'open').sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  const closedEntries = data.logEntries.filter((e) => e.status === 'closed').sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''));

  function projectName(id?: string): string | null {
    if (!id) return null;
    return data.projects.find((p) => p.id === id)?.name ?? null;
  }

  return (
    <div className="view">
      <h1>Bitácora de trabajo</h1>
      <p className="muted">Registrá qué hiciste hoy. Abrí una entrada al empezar y cerrala cuando termines — queda la fecha y hora real de cada una.</p>

      <form className="new-project-form" onSubmit={openEntry}>
        <label>
          ¿Qué vas a trabajar?
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej: Imprimir lote de llaveros para pedido #45" autoFocus />
        </label>
        {data.projects.length > 0 && (
          <label>
            Proyecto relacionado (opcional)
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Sin proyecto</option>
              {data.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" className="btn-primary">
          Abrir bitácora
        </button>
      </form>

      {openEntries.length > 0 && (
        <>
          <h3>En curso</h3>
          <ul className="task-list">
            {openEntries.map((entry) => (
              <li key={entry.id} className="task-item">
                <div>
                  <div className="task-title">{entry.text}</div>
                  <div className="task-meta">
                    {projectName(entry.projectId) && `📁 ${projectName(entry.projectId)} · `}
                    Abierta: {formatDateTime(entry.openedAt)}
                  </div>
                </div>
                <div className="log-actions">
                  <button className="btn-primary" onClick={() => closeEntry(entry.id)}>
                    Cerrar
                  </button>
                  <button className="btn-danger" onClick={() => deleteEntry(entry.id)}>
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {openEntries.length === 0 && closedEntries.length === 0 && <p className="empty-state">Todavía no registraste nada en la bitácora.</p>}

      {closedEntries.length > 0 && (
        <>
          <h3 className="muted">Historial</h3>
          <ul className="task-list">
            {closedEntries.map((entry) => (
              <li key={entry.id} className="task-item task-done">
                <div>
                  <div className="task-title">{entry.text}</div>
                  <div className="task-meta">
                    {projectName(entry.projectId) && `📁 ${projectName(entry.projectId)} · `}
                    {formatDateTime(entry.openedAt)} → {formatDateTime(entry.closedAt!)} · Duración: {formatDuration(entry.openedAt, entry.closedAt!)}
                  </div>
                </div>
                <div className="log-actions">
                  <button className="btn-secondary" onClick={() => reopenEntry(entry.id)}>
                    Reabrir
                  </button>
                  <button className="btn-danger" onClick={() => deleteEntry(entry.id)}>
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
