export type NavigationTab =
  | 'overview'
  | 'notes'
  | 'tasks'
  | 'calendar'
  | 'ai-summaries'
  | 'settings'
  /** @deprecated Use 'notes' instead */
  | 'notes-and-audio';

export interface NavItem {
  id: NavigationTab;
  label: string;
  icon: string;
  badge?: string | number;
  badgeType?: 'default' | 'success' | 'pulse';
}
