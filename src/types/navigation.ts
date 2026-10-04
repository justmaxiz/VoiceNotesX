export type NavigationTab =
  | 'overview'
  | 'notes-and-audio'
  | 'tasks'
  | 'calendar'
  | 'ai-summaries'
  | 'settings';

export interface NavItem {
  id: NavigationTab;
  label: string;
  icon: string;
  badge?: string | number;
  badgeType?: 'default' | 'success' | 'pulse';
}
