export interface Assignee {
  id: number;
  name: string;
  initials: string;
  color: string;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  assignees: Assignee[];
}
