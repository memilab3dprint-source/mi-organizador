import { useRef, useState } from 'react';
import { AppData } from '../types';
import { downloadBackup, readBackupFile } from '../logic/backup';

interface Props {
  data: AppData;
  setData: (updater: (prev: AppData) => AppData) => void;
}

export default function Settings({ data, setData }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedOk, setImportedOk] = useState(false);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportedOk(false);

    if (!confirm('Esto reemplaza todos tus datos actuales por los del archivo. ¿Continuar?')) {
      e.target.value = '';
      return;
    }
    try {
      const imported = await readBackupFile(file);
      setData(() => imported);
      setImportedOk(true);
    } catch {
      setImportError('No se pudo leer el archivo. ¿Es un respaldo válido de esta app?');
    }
    e.target.value = '';
  }

  const totalItems = data.projects.length + data.standaloneTasks.length + data.notes.length;

  return (
    <div className="view">
      <h1>Ajustes</h1>
      <p className="muted">Tus datos viven solo en este navegador (no hay ningún servidor detrás). Hacé un respaldo de vez en cuando para no perderlos.</p>

      <div className="settings-card">
        <h3>⬇️ Descargar respaldo</h3>
        <p className="hint">
          Guarda un archivo con todos tus proyectos, tareas, notas y racha ({totalItems} ítem{totalItems === 1 ? '' : 's'} en total).
        </p>
        <button className="btn-primary" onClick={() => downloadBackup(data)}>
          Descargar respaldo
        </button>
      </div>

      <div className="settings-card">
        <h3>⬆️ Restaurar desde un archivo</h3>
        <p className="hint">Reemplaza todo lo que tenés ahora por el contenido de un archivo de respaldo descargado antes.</p>
        <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
          Elegir archivo…
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} style={{ display: 'none' }} />
        {importedOk && <p className="settings-success">Datos restaurados correctamente.</p>}
        {importError && <p className="settings-error">{importError}</p>}
      </div>
    </div>
  );
}
