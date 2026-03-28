export interface Card {
  id: number;
  title: string;
  description: string;
  icon: string;
  color: string;
  content: string;
}

export interface CardItem {
  title: string;
  description: string;
  icon: string;
  color: string;
  content: string;
  link?: string;
}

export interface WindowEntry {
  id: string;
  title: string;
  minimized: boolean;
  focused: boolean;
}

export interface BottomPanelTab {
  id: string;
  label: string;
  icon: string;
  content: string;
}

export interface SearchResult {
  query: string;
  results: Card[];
}

// Cards for Angular demo
export const TECH_CARDS: Card[] = [
  {
    id: 1,
    title: 'Login / Register',
    description: 'Secure authentication with login and registration forms.',
    icon: '🔐',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    content: '<div class="auth-container"></div>',
  },
  {
    id: 2,
    title: 'SQLite CRUD',
    description: 'Complete CRUD operations with Vlang SQLite integration.',
    icon: '🗄️',
    color: 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)',
    content: '<div class="sqlite-container"></div>',
  },
];
