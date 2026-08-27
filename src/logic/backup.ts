import { AppData } from '../types';
import { parseAppData } from '../storage';

/** Descarga todos los datos actuales como un archivo JSON. */
export function downloadBackup(data: AppData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `organizador-backup-${today}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Lee un archivo de respaldo y lo interpreta como AppData (rellenando campos faltantes). */
export function readBackupFile(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(parseAppData(String(reader.result)));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
