import { useState, useEffect } from 'preact/hooks';
import { openDB, migrateDB } from './db';
import { runLegacyImport } from './legacyImport';
import type { TaskType } from './types';
import HomeTab from './components/HomeTab';
import TasksTab from './components/TasksTab';
import RepeatedTasksTab from './components/RepeatedTasksTab';
import MultistepTab from './components/MultistepTab';

type Tab = TaskType | 'home';

const TABS: { id: Tab; label: string }[] = [
  { id: 'home',      label: 'Home' },
  { id: 'task',      label: 'Tasks' },
  { id: 'repeated',  label: 'Repeat Tasks' },
  { id: 'multistep', label: 'Multistep' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [db, setDb]   = useState<IDBDatabase | null>(null);

  useEffect(() => {
    openDB()
      .then(db => migrateDB(db).then(() => db))
      .then(db => runLegacyImport(db).then(() => db))
      .then(setDb)
      .catch(console.error);
  }, []);

  return (
    <div className="app">
      <header>
        <div className="header-title">Task Board</div>
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
        {tab === 'task' && (
          db ? <TasksTab db={db} /> : <div className="empty-state">Loading…</div>
        )}
        {tab === 'repeated' && (
          db ? <RepeatedTasksTab db={db} /> : <div className="empty-state">Loading…</div>
        )}
        {tab === 'multistep' && (
          db ? <MultistepTab db={db} /> : <div className="empty-state">Loading…</div>
        )}
      </main>
    </div>
  );
}
