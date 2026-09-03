import { useState } from 'react';
import { AppData, Supply } from '../types';

interface Props {
  data: AppData;
  setData: (updater: (prev: AppData) => AppData) => void;
}

export default function Inventory({ data, setData }: Props) {
  const [showForm, setShowForm] = useState(false);

  function addSupply(input: { name: string; quantity: number; unit: string; minStock: number; notes?: string }) {
    const now = new Date().toISOString();
    const supply: Supply = {
      id: crypto.randomUUID(),
      name: input.name,
      quantity: input.quantity,
      unit: input.unit,
      minStock: input.minStock,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };
    setData((prev) => ({ ...prev, supplies: [...prev.supplies, supply] }));
    setShowForm(false);
  }

  function adjustQuantity(id: string, delta: number) {
    setData((prev) => ({
      ...prev,
      supplies: prev.supplies.map((s) =>
        s.id === id ? { ...s, quantity: Math.max(0, s.quantity + delta), updatedAt: new Date().toISOString() } : s,
      ),
    }));
  }

  function deleteSupply(id: string) {
    if (!confirm('¿Eliminar este insumo del inventario?')) return;
    setData((prev) => ({ ...prev, supplies: prev.supplies.filter((s) => s.id !== id) }));
  }

  const sorted = [...data.supplies].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="view">
      <div className="projects-list-header">
        <div>
          <h1>Inventario de insumos</h1>
          <p className="muted">Materiales, packaging, filamento y todo lo que uses para tus proyectos.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Agregar insumo'}
        </button>
      </div>

      {showForm && <NewSupplyForm onSubmit={addSupply} />}

      {sorted.length === 0 && !showForm && <p className="empty-state">Todavía no cargaste insumos.</p>}

      <ul className="task-list">
        {sorted.map((supply) => {
          const low = supply.quantity <= supply.minStock;
          return (
            <li key={supply.id} className="task-item">
              <div>
                <div className="task-title">
                  {supply.name} {low && <span className="badge badge-risk">⚠️ Stock bajo</span>}
                </div>
                <div className="task-meta">
                  {supply.quantity} {supply.unit}
                  {supply.minStock > 0 && ` · Mínimo: ${supply.minStock} ${supply.unit}`}
                  {supply.notes && ` · ${supply.notes}`}
                </div>
              </div>
              <div className="log-actions">
                <button className="btn-secondary" onClick={() => adjustQuantity(supply.id, -1)}>
                  −1
                </button>
                <button className="btn-secondary" onClick={() => adjustQuantity(supply.id, 1)}>
                  +1
                </button>
                <button className="btn-danger" onClick={() => deleteSupply(supply.id)}>
                  Eliminar
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NewSupplyForm({
  onSubmit,
}: {
  onSubmit: (input: { name: string; quantity: number; unit: string; minStock: number; notes?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('');
  const [minStock, setMinStock] = useState(0);
  const [notes, setNotes] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), quantity, unit: unit.trim() || 'unidades', minStock, notes: notes.trim() || undefined });
    setName('');
    setNotes('');
  }

  return (
    <form className="new-project-form" onSubmit={submit}>
      <label>
        Nombre del insumo
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Filamento PLA negro" autoFocus />
      </label>
      <div className="form-row">
        <label>
          Cantidad
          <input type="number" min={0} step={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        </label>
        <label>
          Unidad
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="unidades, kg, rollos..." />
        </label>
        <label>
          Stock mínimo
          <input type="number" min={0} step={1} value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} />
        </label>
      </div>
      <label>
        Notas (opcional)
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Proveedor, color, etc." />
      </label>
      <button type="submit" className="btn-primary">
        Agregar insumo
      </button>
    </form>
  );
}
