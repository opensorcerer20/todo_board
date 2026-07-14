export interface TaskItem {
  key: string; title: string; done: boolean; starred: boolean;
  projectName: string; stepLabel: string; isProject: boolean;
}

export interface HabitItem {
  id: number; title: string; doneToday: boolean; streakLabel: string; starred: boolean;
}
