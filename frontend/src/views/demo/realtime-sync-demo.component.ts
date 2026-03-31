/**
 * Real-Time Sync Demo Component
 * Demonstrates WebSocket-based real-time synchronization between clients and databases
 */

import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { LoggerService } from '../../core/logger.service';

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  status: string;
  created_at: string;
}

interface SyncEvent {
  id: number;
  type: 'create' | 'update' | 'delete' | 'sync';
  source: 'sqlite' | 'duckdb' | 'websocket';
  timestamp: Date;
  data?: any;
  status: 'pending' | 'synced' | 'conflict' | 'failed';
}

interface ConnectionState {
  connected: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  syncMode: 'manual' | 'auto';
}

@Component({
  selector: 'app-realtime-sync-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sync-container">
      <header class="sync-header">
        <h1>🔌 Real-Time Sync Demo</h1>
        <p>WebSocket-based real-time database synchronization</p>
      </header>

      <!-- Connection Status -->
      <div class="connection-status">
        <div class="status-indicator" [class.connected]="connection().connected" [class.disconnected]="!connection().connected">
          <span class="status-dot"></span>
          <span class="status-text">{{ connection().connected ? 'Connected' : 'Disconnected' }}</span>
        </div>
        <div class="status-info">
          <span class="info-item">
            <span class="info-label">Last Sync:</span>
            <span class="info-value">{{ connection().lastSync ? (connection().lastSync | date:'HH:mm:ss') : 'Never' }}</span>
          </span>
          <span class="info-item">
            <span class="info-label">Pending Changes:</span>
            <span class="info-value" [class.has-pending]="connection().pendingChanges > 0">{{ connection().pendingChanges }}</span>
          </span>
          <span class="info-item">
            <span class="info-label">Sync Mode:</span>
            <span class="info-value">{{ connection().syncMode === 'auto' ? '🔄 Auto' : '📍 Manual' }}</span>
          </span>
        </div>
        <div class="status-actions">
          <button class="btn btn-sm" (click)="toggleConnection()" [disabled]="connecting()">
            {{ connection().connected ? '🔌 Disconnect' : '🔌 Connect' }}
          </button>
          <button class="btn btn-sm btn-primary" (click)="syncNow()" [disabled]="!connection().connected || syncing()">
            {{ syncing() ? '⏳ Syncing...' : '🔄 Sync Now' }}
          </button>
        </div>
      </div>

      <!-- Sync Mode Selector -->
      <div class="sync-mode-selector">
        <button
          class="mode-btn"
          [class.active]="connection().syncMode === 'manual'"
          (click)="setSyncMode('manual')">
          📍 Manual Sync
        </button>
        <button
          class="mode-btn"
          [class.active]="connection().syncMode === 'auto'"
          (click)="setSyncMode('auto')">
          🔄 Auto Sync (5s)
        </button>
      </div>

      <!-- Database Panels -->
      <div class="database-panels">
        <!-- SQLite Panel -->
        <div class="db-panel sqlite">
          <div class="db-panel-header">
            <h3>🗄️ SQLite</h3>
            <span class="record-count">{{ sqliteUsers().length }} records</span>
          </div>
          
          <div class="db-panel-actions">
            <button class="btn-action" (click)="addSqliteUser()">+ Add</button>
            <button class="btn-action" (click)="refreshSqlite()">🔄 Refresh</button>
          </div>

          <div class="db-panel-content">
            <div class="user-list">
              @for (user of sqliteUsers(); track user.id) {
                <div class="user-item" [class.pending]="isPending(user.id, 'sqlite')">
                  <div class="user-info">
                    <div class="user-name">{{ user.name }}</div>
                    <div class="user-email">{{ user.email }}</div>
                  </div>
                  <div class="user-actions">
                    <button class="btn-icon" (click)="editUser(user, 'sqlite')">✏️</button>
                    <button class="btn-icon btn-delete" (click)="deleteUser(user.id, 'sqlite')">🗑️</button>
                  </div>
                </div>
              }
              @empty {
                <div class="empty-list">No users in SQLite</div>
              }
            </div>
          </div>
        </div>

        <!-- Sync Events Panel -->
        <div class="sync-events-panel">
          <div class="panel-header">
            <h3>📡 Sync Events</h3>
            <button class="btn-action" (click)="clearEvents()">🗑️ Clear</button>
          </div>
          <div class="events-list">
            @for (event of syncEvents(); track event.id) {
              <div class="event-item" [class]="'event-' + event.type" [class]="'event-' + event.status">
                <div class="event-icon">
                  @if (event.type === 'create') { ➕ }
                  @else if (event.type === 'update') { ✏️ }
                  @else if (event.type === 'delete') { 🗑️ }
                  @else if (event.type === 'sync') { 🔄 }
                </div>
                <div class="event-info">
                  <div class="event-type">{{ event.type | uppercase }}</div>
                  <div class="event-source">{{ event.source }}</div>
                  <div class="event-time">{{ event.timestamp | date:'HH:mm:ss' }}</div>
                </div>
                <div class="event-status" [class]="'status-' + event.status">
                  {{ event.status }}
                </div>
              </div>
            }
            @empty {
              <div class="empty-events">No sync events yet</div>
            }
          </div>
        </div>

        <!-- DuckDB Panel -->
        <div class="db-panel duckdb">
          <div class="db-panel-header">
            <h3>🦆 DuckDB</h3>
            <span class="record-count">{{ duckdbUsers().length }} records</span>
          </div>
          
          <div class="db-panel-actions">
            <button class="btn-action" (click)="addDuckdbUser()">+ Add</button>
            <button class="btn-action" (click)="refreshDuckdb()">🔄 Refresh</button>
          </div>

          <div class="db-panel-content">
            <div class="user-list">
              @for (user of duckdbUsers(); track user.id) {
                <div class="user-item" [class.pending]="isPending(user.id, 'duckdb')">
                  <div class="user-info">
                    <div class="user-name">{{ user.name }}</div>
                    <div class="user-email">{{ user.email }}</div>
                  </div>
                  <div class="user-actions">
                    <button class="btn-icon" (click)="editUser(user, 'duckdb')">✏️</button>
                    <button class="btn-icon btn-delete" (click)="deleteUser(user.id, 'duckdb')">🗑️</button>
                  </div>
                </div>
              }
              @empty {
                <div class="empty-list">No users in DuckDB</div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Sync Configuration -->
      <div class="sync-config">
        <h3>⚙️ Sync Configuration</h3>
        <div class="config-grid">
          <div class="config-item">
            <label>Conflict Resolution</label>
            <select [(ngModel)]="conflictResolution" class="form-select">
              <option value="latest">Latest Timestamp Wins</option>
              <option value="sqlite">SQLite Always Wins</option>
              <option value="duckdb">DuckDB Always Wins</option>
              <option value="manual">Manual Resolution</option>
            </select>
          </div>
          <div class="config-item">
            <label>Batch Size</label>
            <select [(ngModel)]="batchSize" class="form-select">
              <option [ngValue]="10">10 records</option>
              <option [ngValue]="50">50 records</option>
              <option [ngValue]="100">100 records</option>
            </select>
          </div>
          <div class="config-item">
            <label>Auto-Sync Interval</label>
            <select [(ngModel)]="autoSyncInterval" class="form-select">
              <option [ngValue]="5000">5 seconds</option>
              <option [ngValue]="10000">10 seconds</option>
              <option [ngValue]="30000">30 seconds</option>
              <option [ngValue]="60000">1 minute</option>
            </select>
          </div>
          <div class="config-item">
            <label>Direction</label>
            <select [(ngModel)]="syncDirection" class="form-select">
              <option value="bidirectional">↔️ Bidirectional</option>
              <option value="sqlite-to-duckdb">🗄️→🦆 SQLite to DuckDB</option>
              <option value="duckdb-to-sqlite">🦆→🗄️ DuckDB to SQLite</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Sync Statistics -->
      <div class="sync-statistics">
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value">{{ totalSyncs() }}</div>
            <div class="stat-label">Total Syncs</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-value">{{ successfulSyncs() }}</div>
            <div class="stat-label">Successful</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⚠️</div>
          <div class="stat-content">
            <div class="stat-value">{{ conflicts() }}</div>
            <div class="stat-label">Conflicts</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">❌</div>
          <div class="stat-content">
            <div class="stat-value">{{ failedSyncs() }}</div>
            <div class="stat-label">Failed</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⚡</div>
          <div class="stat-content">
            <div class="stat-value">{{ avgSyncTime() }}ms</div>
            <div class="stat-label">Avg Sync Time</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sync-container {
      padding: 24px;
      max-width: 1600px;
      margin: 0 auto;
      color: #e2e8f0;
    }

    .sync-header {
      margin-bottom: 24px;
    }

    .sync-header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #fff;
      margin: 0 0 8px;
    }

    .sync-header p {
      font-size: 14px;
      color: #94a3b8;
      margin: 0;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 20px;
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      margin-bottom: 24px;
      border: 2px solid rgba(148, 163, 184, 0.2);
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      background: rgba(148, 163, 184, 0.1);
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
    }

    .status-indicator.connected {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .status-indicator.disconnected {
      background: rgba(148, 163, 184, 0.2);
      color: #94a3b8;
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .status-info {
      flex: 1;
      display: flex;
      gap: 24px;
    }

    .info-item {
      display: flex;
      gap: 8px;
      font-size: 14px;
    }

    .info-label {
      color: #94a3b8;
    }

    .info-value {
      color: #fff;
      font-weight: 600;
    }

    .info-value.has-pending {
      color: #f59e0b;
    }

    .status-actions {
      display: flex;
      gap: 12px;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-sm {
      padding: 8px 16px;
      font-size: 13px;
    }

    .btn-primary {
      background: #3b82f6;
      color: #fff;
    }

    .btn:hover:not(:disabled) {
      transform: translateY(-2px);
      opacity: 0.9;
    }

    .sync-mode-selector {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
    }

    .mode-btn {
      flex: 1;
      padding: 14px 20px;
      background: rgba(30, 41, 59, 0.5);
      border: 2px solid rgba(148, 163, 184, 0.2);
      border-radius: 10px;
      color: #94a3b8;
      cursor: pointer;
      font-weight: 600;
      font-size: 15px;
      transition: all 0.2s;
    }

    .mode-btn:hover {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
      color: #fff;
    }

    .mode-btn.active {
      background: rgba(139, 92, 246, 0.1);
      border-color: #8b5cf6;
      color: #fff;
    }

    .database-panels {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }

    .db-panel {
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid transparent;
    }

    .db-panel.sqlite {
      border-color: rgba(16, 185, 129, 0.3);
    }

    .db-panel.duckdb {
      border-color: rgba(59, 130, 246, 0.3);
    }

    .db-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: rgba(15, 23, 42, 0.6);
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .db-panel-header h3 {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }

    .record-count {
      font-size: 13px;
      color: #94a3b8;
    }

    .db-panel-actions {
      display: flex;
      gap: 8px;
      padding: 12px 20px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .btn-action {
      padding: 6px 12px;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 6px;
      color: #3b82f6;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      transition: all 0.2s;
    }

    .btn-action:hover {
      background: rgba(59, 130, 246, 0.2);
    }

    .db-panel-content {
      padding: 16px;
      max-height: 300px;
      overflow-y: auto;
    }

    .user-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .user-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: rgba(15, 23, 42, 0.6);
      border-radius: 8px;
      transition: all 0.2s;
    }

    .user-item:hover {
      background: rgba(15, 23, 42, 0.8);
    }

    .user-item.pending {
      border-left: 3px solid #f59e0b;
    }

    .user-info {
      flex: 1;
    }

    .user-name {
      font-weight: 600;
      color: #fff;
      margin-bottom: 4px;
    }

    .user-email {
      font-size: 13px;
      color: #94a3b8;
    }

    .user-actions {
      display: flex;
      gap: 8px;
    }

    .btn-icon {
      padding: 6px 10px;
      background: transparent;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .btn-icon:hover {
      background: rgba(59, 130, 246, 0.2);
    }

    .btn-icon.btn-delete:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    .empty-list {
      text-align: center;
      color: #64748b;
      padding: 32px;
    }

    .sync-events-panel {
      width: 320px;
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      border: 2px solid rgba(139, 92, 246, 0.3);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: rgba(15, 23, 42, 0.6);
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .panel-header h3 {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }

    .events-list {
      flex: 1;
      padding: 12px;
      max-height: 400px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .event-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: rgba(15, 23, 42, 0.6);
      border-radius: 8px;
      border-left: 3px solid transparent;
      font-size: 13px;
    }

    .event-item.event-create { border-left-color: #10b981; }
    .event-item.event-update { border-left-color: #f59e0b; }
    .event-item.event-delete { border-left-color: #ef4444; }
    .event-item.event-sync { border-left-color: #3b82f6; }

    .event-item.event-pending { opacity: 0.7; }
    .event-item.event-synced { opacity: 1; }
    .event-item.event-conflict { background: rgba(245, 158, 11, 0.1); }
    .event-item.event-failed { background: rgba(239, 68, 68, 0.1); }

    .event-icon {
      font-size: 16px;
    }

    .event-info {
      flex: 1;
    }

    .event-type {
      font-weight: 600;
      color: #fff;
      font-size: 11px;
      text-transform: uppercase;
    }

    .event-source {
      color: #94a3b8;
      font-size: 11px;
    }

    .event-time {
      color: #64748b;
      font-family: monospace;
      font-size: 11px;
    }

    .event-status {
      font-size: 10px;
      padding: 4px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      font-weight: 600;
    }

    .event-status.status-pending {
      background: rgba(148, 163, 184, 0.2);
      color: #94a3b8;
    }

    .event-status.status-synced {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .event-status.status-conflict {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
    }

    .event-status.status-failed {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .empty-events {
      text-align: center;
      color: #64748b;
      padding: 32px;
      font-size: 13px;
    }

    .sync-config {
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .sync-config h3 {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 20px;
    }

    .config-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    .config-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .config-item label {
      font-size: 13px;
      font-weight: 600;
      color: #94a3b8;
    }

    .form-select {
      padding: 10px 14px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.8);
      color: #fff;
      font-size: 14px;
    }

    .sync-statistics {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 16px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      border: 2px solid transparent;
      transition: all 0.3s;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    }

    .stat-icon {
      font-size: 32px;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #fff;
    }

    .stat-label {
      font-size: 13px;
      color: #94a3b8;
      margin-top: 4px;
    }

    @media (max-width: 1200px) {
      .database-panels {
        grid-template-columns: 1fr;
      }

      .sync-events-panel {
        width: 100%;
        max-height: 250px;
      }

      .config-grid,
      .sync-statistics {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class RealtimeSyncDemoComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly logger = inject(LoggerService);

  readonly connection = signal<ConnectionState>({
    connected: false,
    lastSync: null,
    pendingChanges: 0,
    syncMode: 'manual',
  });

  readonly connecting = signal(false);
  readonly syncing = signal(false);

  readonly sqliteUsers = signal<User[]>([]);
  readonly duckdbUsers = signal<User[]>([]);

  readonly syncEvents = signal<SyncEvent[]>([]);
  readonly pendingChanges = signal<{ id: number; database: 'sqlite' | 'duckdb'; type: string }[]>([]);

  readonly totalSyncs = signal(0);
  readonly successfulSyncs = signal(0);
  readonly conflicts = signal(0);
  readonly failedSyncs = signal(0);
  readonly avgSyncTime = signal(0);

  conflictResolution = 'latest';
  batchSize = 50;
  autoSyncInterval = 5000;
  syncDirection = 'bidirectional';

  private autoSyncTimer?: any;

  ngOnInit(): void {
    this.loadSqliteUsers();
    this.loadDuckdbUsers();
  }

  ngOnDestroy(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
    }
  }

  async loadSqliteUsers(): Promise<void> {
    try {
      const users = await this.api.callOrThrow<User[]>('getUsers', []);
      this.sqliteUsers.set(users);
    } catch (error) {
      this.logger.error('Failed to load SQLite users', error);
    }
  }

  async loadDuckdbUsers(): Promise<void> {
    try {
      const users = await this.api.callOrThrow<User[]>('duckdbGetUsers', []);
      this.duckdbUsers.set(users);
    } catch (error) {
      this.logger.error('Failed to load DuckDB users', error);
    }
  }

  async toggleConnection(): Promise<void> {
    this.connecting.set(true);
    try {
      if (this.connection().connected) {
        // Disconnect
        if (this.autoSyncTimer) {
          clearInterval(this.autoSyncTimer);
        }
        this.connection.set({ ...this.connection(), connected: false });
        this.addSyncEvent('sync', 'websocket', { message: 'Disconnected' }, 'synced');
      } else {
        // Connect
        await this.sleep(1000); // Simulate connection
        this.connection.set({ 
          ...this.connection(), 
          connected: true,
          lastSync: new Date(),
        });
        this.addSyncEvent('sync', 'websocket', { message: 'Connected' }, 'synced');
        
        // Start auto-sync if enabled
        if (this.connection().syncMode === 'auto') {
          this.startAutoSync();
        }
      }
    } catch (error) {
      this.logger.error('Connection toggle failed', error);
    } finally {
      this.connecting.set(false);
    }
  }

  async syncNow(): Promise<void> {
    if (!this.connection().connected || this.syncing()) return;

    this.syncing.set(true);
    const startTime = Date.now();

    try {
      this.addSyncEvent('sync', 'websocket', { message: 'Starting sync' }, 'pending');

      // Simulate sync process
      await this.sleep(1000);

      // Refresh both databases
      await Promise.all([this.loadSqliteUsers(), this.loadDuckdbUsers()]);

      const duration = Date.now() - startTime;
      
      this.connection.set({
        ...this.connection(),
        lastSync: new Date(),
        pendingChanges: 0,
      });

      this.addSyncEvent('sync', 'websocket', { message: 'Sync complete', duration }, 'synced');
      
      this.totalSyncs.update(v => v + 1);
      this.successfulSyncs.update(v => v + 1);
      this.avgSyncTime.set(duration);

    } catch (error) {
      this.logger.error('Sync failed', error);
      this.addSyncEvent('sync', 'websocket', { message: (error as Error).message }, 'failed');
      this.failedSyncs.update(v => v + 1);
    } finally {
      this.syncing.set(false);
    }
  }

  setSyncMode(mode: 'manual' | 'auto'): void {
    this.connection.set({ ...this.connection(), syncMode: mode });
    
    if (mode === 'auto' && this.connection().connected) {
      this.startAutoSync();
    } else if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
    }
  }

  startAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
    }
    this.autoSyncTimer = setInterval(() => {
      if (this.connection().connected) {
        this.syncNow();
      }
    }, this.autoSyncInterval);
  }

  async addSqliteUser(): Promise<void> {
    const userData = {
      name: `SQLite_User_${Date.now()}`,
      email: `sqlite_${Date.now()}@test.com`,
      age: Math.floor(Math.random() * 40) + 20,
      status: 'active',
    };

    try {
      await this.api.callOrThrow('createUser', [userData]);
      await this.loadSqliteUsers();
      this.addSyncEvent('create', 'sqlite', userData, 'pending');
      this.connection.set({ ...this.connection(), pendingChanges: this.connection().pendingChanges + 1 });
    } catch (error) {
      this.logger.error('Failed to add SQLite user', error);
    }
  }

  async addDuckdbUser(): Promise<void> {
    const userData = {
      name: `DuckDB_User_${Date.now()}`,
      email: `duckdb_${Date.now()}@test.com`,
      age: Math.floor(Math.random() * 40) + 20,
      status: 'active',
    };

    try {
      await this.api.callOrThrow('duckdbCreateUser', [userData]);
      await this.loadDuckdbUsers();
      this.addSyncEvent('create', 'duckdb', userData, 'pending');
      this.connection.set({ ...this.connection(), pendingChanges: this.connection().pendingChanges + 1 });
    } catch (error) {
      this.logger.error('Failed to add DuckDB user', error);
    }
  }

  async refreshSqlite(): Promise<void> {
    await this.loadSqliteUsers();
    this.addSyncEvent('sync', 'sqlite', { message: 'Refreshed SQLite data' }, 'synced');
  }

  async refreshDuckdb(): Promise<void> {
    await this.loadDuckdbUsers();
    this.addSyncEvent('sync', 'duckdb', { message: 'Refreshed DuckDB data' }, 'synced');
  }

  async editUser(user: User, database: 'sqlite' | 'duckdb'): Promise<void> {
    // Simplified edit - in real app would show a form
    const updatedData = { ...user, name: `${user.name}_updated` };
    
    try {
      if (database === 'sqlite') {
        await this.api.callOrThrow('updateUser', [updatedData]);
        await this.loadSqliteUsers();
      } else {
        // DuckDB update would go here
        this.logger.info('DuckDB update not implemented');
      }
      this.addSyncEvent('update', database, updatedData, 'pending');
    } catch (error) {
      this.logger.error('Failed to update user', error);
    }
  }

  async deleteUser(id: number, database: 'sqlite' | 'duckdb'): Promise<void> {
    if (!confirm('Delete this user?')) return;

    try {
      if (database === 'sqlite') {
        await this.api.callOrThrow('deleteUser', [id.toString()]);
        await this.loadSqliteUsers();
      } else {
        await this.api.callOrThrow('duckdbDeleteUser', [{ id }]);
        await this.loadDuckdbUsers();
      }
      this.addSyncEvent('delete', database, { id }, 'pending');
      this.connection.set({ ...this.connection(), pendingChanges: this.connection().pendingChanges + 1 });
    } catch (error) {
      this.logger.error('Failed to delete user', error);
    }
  }

  isPending(userId: number, database: 'sqlite' | 'duckdb'): boolean {
    return this.pendingChanges().some(c => c.id === userId && c.database === database);
  }

  addSyncEvent(
    type: SyncEvent['type'],
    source: SyncEvent['source'],
    data?: any,
    status: SyncEvent['status'] = 'pending'
  ): void {
    this.syncEvents.update(events => [{
      id: Date.now(),
      type,
      source,
      timestamp: new Date(),
      data,
      status,
    }, ...events].slice(0, 50));
  }

  clearEvents(): void {
    this.syncEvents.set([]);
  }

  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
