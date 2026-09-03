import { useEffect, useState } from 'react';
import { AppData, createDefaultData } from './types';
import { loadData, saveData } from './storage';
import { advanceRecurringSeries } from './logic/recurrence';
import { sendDueNotifications } from './logic/notifications';
import Today from './views/Today';
import Projects from './views/Projects';
import Tasks from './views/Tasks';
import CalendarView from './views/Calendar';
import Settings from './views/Settings';
import Stats from './views/Stats';
import Logbook from './views/Logbook';
import Inventory from './views/Inventory';
import QualityControlView from './views/QualityControl';

type Tab = 'today' | 'calendar' | 'projects' | 'tasks' | 'logbook' | 'inventory' | 'quality' | 'stats' | 'settings';

export default function App() {
  const [data, setDataState] = useState<AppData>(() => {
    const initial = loadData() ?? createDefaultData();
    return { ...initial, standaloneTasks: advanceRecurringSeries(initial.standaloneTasks) };
  });
  const [tab, setTab] = useState<Tab>('today');

  useEffect(() => {
    saveData(data);
  }, [data]);

  useEffect(() => {
    const CHECK_INTERVAL_MS = 5 * 60 * 1000;
    function check() {
      setDataState((prev) => sendDueNotifications(prev));
    }
    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  function setData(updater: (prev: AppData) => AppData) {
    setDataState((prev) => updater(prev));
  }

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="brand">Mi Organizador</div>
        <button className={tab === 'today' ? 'nav-btn nav-btn-active' : 'nav-btn'} onClick={() => setTab('today')}>
          📅 Hoy
        </button>
        <button className={tab === 'calendar' ? 'nav-btn nav-btn-active' : 'nav-btn'} onClick={() => setTab('calendar')}>
          🗓️ Calendario
        </button>
        <button className={tab === 'projects' ? 'nav-btn nav-btn-active' : 'nav-btn'} onClick={() => setTab('projects')}>
          📁 Proyectos
        </button>
        <button className={tab === 'tasks' ? 'nav-btn nav-btn-active' : 'nav-btn'} onClick={() => setTab('tasks')}>
          ✅ Tareas
        </button>
        <button className={tab === 'logbook' ? 'nav-btn nav-btn-active' : 'nav-btn'} onClick={() => setTab('logbook')}>
          📓 Bitácora
        </button>
        <button className={tab === 'inventory' ? 'nav-btn nav-btn-active' : 'nav-btn'} onClick={() => setTab('inventory')}>
          📦 Insumos
        </button>
        <button className={tab === 'quality' ? 'nav-btn nav-btn-active' : 'nav-btn'} onClick={() => setTab('quality')}>
          🔍 Calidad
        </button>
        <button className={tab === 'stats' ? 'nav-btn nav-btn-active' : 'nav-btn'} onClick={() => setTab('stats')}>
          📊 Progreso
        </button>
        <button className={tab === 'settings' ? 'nav-btn nav-btn-active' : 'nav-btn'} onClick={() => setTab('settings')}>
          ⚙️ Ajustes
        </button>
      </nav>
      <main className="main-content">
        {tab === 'today' && <Today data={data} setData={setData} />}
        {tab === 'calendar' && <CalendarView data={data} setData={setData} />}
        {tab === 'projects' && <Projects data={data} setData={setData} />}
        {tab === 'tasks' && <Tasks data={data} setData={setData} />}
        {tab === 'logbook' && <Logbook data={data} setData={setData} />}
        {tab === 'inventory' && <Inventory data={data} setData={setData} />}
        {tab === 'quality' && <QualityControlView data={data} setData={setData} />}
        {tab === 'stats' && <Stats data={data} />}
        {tab === 'settings' && <Settings data={data} setData={setData} />}
      </main>
    </div>
  );
}
