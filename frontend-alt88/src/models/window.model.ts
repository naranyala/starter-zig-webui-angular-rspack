export type WindowState = 'focused' | 'blurred' | 'minimized' | 'maximized' | 'restored' | 'closed';

export interface WindowStateEvent {
  window_id: string;
  state: WindowState;
  title: string;
  timestamp: string;
}

export interface WindowEventPayload {
  id: string;
  title?: string;
}
