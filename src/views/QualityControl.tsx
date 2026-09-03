import { useState } from 'react';
import { AppData, QualityCheck, QualityCheckItem } from '../types';

interface Props {
  data: AppData;
  setData: (updater: (prev: AppData) => AppData) => void;
}

const RESULT_LABELS: Record<QualityCheck['result'], string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

export default function QualityControlView({ data, setData }: Props) {
  const [showForm, setShowForm] = useState(false);

  function createCheck(input: { title: string; projectId?: string; items: string[] }) {
    const check: QualityCheck = {
      id: crypto.randomUUID(),
      title: input.title,
      projectId: input.projectId,
      items: input.items.map((label) => ({ id: crypto.randomUUID(), label, passed: false })),
      result: 'pending',
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, qualityChecks: [check, ...prev.qualityChecks] }));
    setShowForm(false);
  }

  function toggleItem(checkId: string, itemId: string) {
    setData((prev) => ({
      ...prev,
      qualityChecks: prev.qualityChecks.map((c) =>
        c.id !== checkId ? c : { ...c, items: c.items.map((it) => (it.id === itemId ? { ...it, passed: !it.passed } : it)) },
      ),
    }));
  }

  function setResult(checkId: string, result: QualityCheck['result']) {
    setData((prev) => ({
      ...prev,
      qualityChecks: prev.qualityChecks.map((c) =>
        c.id === checkId ? { ...c, result, closedAt: result === 'pending' ? undefined : new Date().toISOString() } : c,
      ),
    }));
  }

  function setNotes(checkId: string, notes: string) {
    setData((prev) => ({ ...prev, qualityChecks: prev.qualityChecks.map((c) => (c.id === checkId ? { ...c, notes } : c)) }));
  }

  function deleteCheck(checkId: string) {
    if (!confirm('¿Eliminar este control de calidad?')) return;
    setData((prev) => ({ ...prev, qualityChecks: prev.qualityChecks.filter((c) => c.id !== checkId) }));
  }

  return (
    <div className="view">
      <div className="projects-list-header">
        <div>
          <h1>Control de calidad</h1>
          <p className="muted">Revisá productos, piezas o pedidos con una checklist antes de darlos por buenos.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Nuevo control'}
        </button>
      </div>

      {showForm && <NewCheckForm projects={data.projects} onSubmit={createCheck} />}

      {data.qualityChecks.length === 0 && !showForm && <p className="empty-state">Todavía no registraste ningún control de calidad.</p>}

      <ul className="task-list qc-list">
        {data.qualityChecks.map((check) => {
          const total = check.items.length;
          const passedCount = check.items.filter((i) => i.passed).length;
          return (
            <li key={check.id} className="task-item qc-item">
              <div className="qc-item-body">
                <div className="qc-item-header">
                  <div>
                    <div className="task-title">{check.title}</div>
                    <div className="task-meta">
                      {total > 0 && `${passedCount}/${total} puntos ok · `}
                      {new Date(check.createdAt).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                  <span
                    className={`badge ${check.result === 'approved' ? 'badge-success' : check.result === 'rejected' ? 'badge-risk' : ''}`}
                  >
                    {RESULT_LABELS[check.result]}
                  </span>
                </div>

                {check.items.length > 0 && (
                  <ul className="qc-checklist">
                    {check.items.map((item: QualityCheckItem) => (
                      <li key={item.id}>
                        <label>
                          <input type="checkbox" checked={item.passed} onChange={() => toggleItem(check.id, item.id)} />
                          {item.label}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}

                <input
                  className="qc-notes-input"
                  value={check.notes ?? ''}
                  onChange={(e) => setNotes(check.id, e.target.value)}
                  placeholder="Notas de la revisión (opcional)"
                />

                <div className="log-actions">
                  <button className="btn-secondary" onClick={() => setResult(check.id, 'approved')}>
                    Aprobar
                  </button>
                  <button className="btn-secondary" onClick={() => setResult(check.id, 'rejected')}>
                    Rechazar
                  </button>
                  <button className="btn-danger" onClick={() => deleteCheck(check.id)}>
                    Eliminar
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NewCheckForm({
  projects,
  onSubmit,
}: {
  projects: AppData['projects'];
  onSubmit: (input: { title: string; projectId?: string; items: string[] }) => void;
}) {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [itemDraft, setItemDraft] = useState('');

  function addItem() {
    if (!itemDraft.trim()) return;
    setItems((prev) => [...prev, itemDraft.trim()]);
    setItemDraft('');
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), projectId: projectId || undefined, items });
    setTitle('');
    setItems([]);
  }

  return (
    <form className="new-project-form" onSubmit={submit}>
      <label>
        Qué se revisa
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Pedido #45 - llaveros impresos" autoFocus />
      </label>
      {projects.length > 0 && (
        <label>
          Proyecto relacionado (opcional)
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Sin proyecto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label>
        Puntos a revisar (checklist)
        <div className="qc-item-add-row">
          <input
            value={itemDraft}
            onChange={(e) => setItemDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addItem();
              }
            }}
            placeholder="Ej: Sin defectos visibles"
          />
          <button type="button" className="btn-secondary" onClick={addItem}>
            Agregar punto
          </button>
        </div>
      </label>

      {items.length > 0 && (
        <ul className="qc-draft-list">
          {items.map((item, i) => (
            <li key={i}>
              {item}
              <button type="button" onClick={() => removeItem(i)} title="Quitar">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="submit" className="btn-primary">
        Crear control
      </button>
    </form>
  );
}
