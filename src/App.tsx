import {
  useEffect,
  useState,
} from 'preact/hooks';

import HomeTab from './components/HomeTab';
import MultistepTab from './components/MultistepTab';
import RepeatedTasksTab from './components/RepeatedTasksTab';
import TasksTab from './components/TasksTab';
import {
  dbExportAll,
  migrateDB,
  openDB,
} from './db';
// import { runLegacyImport } from './legacyImport';
import { buildActivityLog } from './utils';
import { ItemType } from './types';
import type { TaskType } from './types';

type Tab = TaskType | 'home';

const TABS: { id: Tab; label: string }[] = [
  { id: 'home',        label: 'Home' },
  { id: ItemType.TASK,      label: 'Tasks' },
  { id: ItemType.REPEATED,  label: 'Repeat Tasks' },
  { id: ItemType.MULTISTEP, label: 'Multistep' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [db, setDb]   = useState<IDBDatabase | null>(null);
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    openDB()
      .then(db => migrateDB(db).then(() => db))
      // .then(db => runLegacyImport(db).then(() => db))
      .then(setDb)
      .catch(console.error);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  function handleExport() {
    if (!db) return;
    dbExportAll(db).then(data => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `task-board-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleExportActivity() {
    if (!db) return;
    dbExportAll(db).then(data => {
      const log  = buildActivityLog(data);
      const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `task-board-activity-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="app">
      <header>
        <div className="header-row">
          <div className="header-title">Task Board</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
            <button className="theme-toggle" onClick={() => setDark(d => !d)}>
              {dark ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button className="theme-toggle" onClick={handleExport} disabled={!db}>
              Export JSON
            </button>
            <button className="theme-toggle" onClick={handleExportActivity} disabled={!db}>
              Export Activity Log
            </button>
          </div>
        </div>
        <nav className="tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={'tab-btn' + (tab === t.id ? ' active' : '')}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {tab === 'home' && (
          db ? <HomeTab db={db} /> : <div className="empty-state">Loading…</div>
        )}
        {tab === ItemType.TASK && (
          db ? <TasksTab db={db} /> : <div className="empty-state">Loading…</div>
        )}
        {tab === ItemType.REPEATED && (
          db ? <RepeatedTasksTab db={db} /> : <div className="empty-state">Loading…</div>
        )}
        {tab === ItemType.MULTISTEP && (
          db ? <MultistepTab db={db} /> : <div className="empty-state">Loading…</div>
        )}
      </main>
    </div>
  );
}
