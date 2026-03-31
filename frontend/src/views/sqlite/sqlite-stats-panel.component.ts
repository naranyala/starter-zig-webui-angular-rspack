/**
 * SQLite Statistics Panel Component
 * 
 * Displays database statistics and analytics
 */

import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Formatters } from '../../utils/format.utils';
import type { SqliteStats } from './sqlite-demo.component';

@Component({
  selector: 'app-sqlite-stats-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stats-panel">
      <div class="panel-header">
        <h2>📊 Database Statistics</h2>
        <p>Overview of user data and distribution</p>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <p>Loading statistics...</p>
        </div>
      } @else if (stats()) {
        <div class="stats-grid">
          <!-- Total Users -->
          <div class="stat-card stat-primary">
            <div class="stat-icon">👥</div>
            <div class="stat-content">
              <div class="stat-value">{{ stats()!.totalUsers }}</div>
              <div class="stat-label">Total Users</div>
            </div>
          </div>

          <!-- Active Users -->
          <div class="stat-card stat-success">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <div class="stat-value">{{ stats()!.activeUsers }}</div>
              <div class="stat-label">Active Users</div>
              <div class="stat-percent">
                {{ calculatePercentage(stats()!.activeUsers, stats()!.totalUsers) }}%
              </div>
            </div>
          </div>

          <!-- Inactive Users -->
          <div class="stat-card stat-secondary">
            <div class="stat-icon">⏸️</div>
            <div class="stat-content">
              <div class="stat-value">{{ stats()!.inactiveUsers }}</div>
              <div class="stat-label">Inactive Users</div>
              <div class="stat-percent">
                {{ calculatePercentage(stats()!.inactiveUsers, stats()!.totalUsers) }}%
              </div>
            </div>
          </div>

          <!-- Pending Users -->
          <div class="stat-card stat-warning">
            <div class="stat-icon">⏳</div>
            <div class="stat-content">
              <div class="stat-value">{{ stats()!.pendingUsers }}</div>
              <div class="stat-label">Pending Users</div>
              <div class="stat-percent">
                {{ calculatePercentage(stats()!.pendingUsers, stats()!.totalUsers) }}%
              </div>
            </div>
          </div>

          <!-- Suspended Users -->
          <div class="stat-card stat-danger">
            <div class="stat-icon">⛔</div>
            <div class="stat-content">
              <div class="stat-value">{{ stats()!.suspendedUsers }}</div>
              <div class="stat-label">Suspended Users</div>
              <div class="stat-percent">
                {{ calculatePercentage(stats()!.suspendedUsers, stats()!.totalUsers) }}%
              </div>
            </div>
          </div>

          <!-- Average Age -->
          <div class="stat-card stat-info">
            <div class="stat-icon">📈</div>
            <div class="stat-content">
              <div class="stat-value">{{ stats()!.avgAge | number:'1.0-1' }}</div>
              <div class="stat-label">Average Age</div>
            </div>
          </div>
        </div>

        <!-- Status Distribution Chart -->
        <div class="chart-section">
          <h3>Status Distribution</h3>
          <div class="distribution-bar">
            @if (stats()!.totalUsers > 0) {
              <div class="segment segment-active"
                [style.width.%]="(stats()!.activeUsers / stats()!.totalUsers) * 100">
                {{ calculatePercentage(stats()!.activeUsers, stats()!.totalUsers) }}%
              </div>
              <div class="segment segment-inactive"
                [style.width.%]="(stats()!.inactiveUsers / stats()!.totalUsers) * 100">
                {{ calculatePercentage(stats()!.inactiveUsers, stats()!.totalUsers) }}%
              </div>
              <div class="segment segment-pending"
                [style.width.%]="(stats()!.pendingUsers / stats()!.totalUsers) * 100">
                {{ calculatePercentage(stats()!.pendingUsers, stats()!.totalUsers) }}%
              </div>
              <div class="segment segment-suspended"
                [style.width.%]="(stats()!.suspendedUsers / stats()!.totalUsers) * 100">
                {{ calculatePercentage(stats()!.suspendedUsers, stats()!.totalUsers) }}%
              </div>
            }
          </div>
          <div class="legend">
            <div class="legend-item">
              <span class="legend-color legend-active"></span>
              <span class="legend-label">Active</span>
            </div>
            <div class="legend-item">
              <span class="legend-color legend-inactive"></span>
              <span class="legend-label">Inactive</span>
            </div>
            <div class="legend-item">
              <span class="legend-color legend-pending"></span>
              <span class="legend-label">Pending</span>
            </div>
            <div class="legend-item">
              <span class="legend-color legend-suspended"></span>
              <span class="legend-label">Suspended</span>
            </div>
          </div>
        </div>

        <!-- Additional Info -->
        <div class="info-grid">
          <div class="info-card">
            <div class="info-label">Newest User</div>
            <div class="info-value">
              {{ Formatters.formatDate(stats()!.newestUser, { format: 'medium' }) }}
            </div>
          </div>
          <div class="info-card">
            <div class="info-label">Database Type</div>
            <div class="info-value">SQLite (OLTP)</div>
          </div>
          <div class="info-card">
            <div class="info-label">Last Updated</div>
            <div class="info-value">{{ getCurrentTimestamp() }}</div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .stats-panel {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .panel-header {
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    }

    .panel-header h2 {
      font-size: 20px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 8px;
    }

    .panel-header p {
      font-size: 14px;
      color: #94a3b8;
      margin: 0;
    }

    .loading-state {
      padding: 32px;
      text-align: center;
      color: #94a3b8;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
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
      flex: 1;
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

    .stat-percent {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }

    .stat-primary .stat-value { color: #3b82f6; }
    .stat-success .stat-value { color: #10b981; }
    .stat-warning .stat-value { color: #f59e0b; }
    .stat-danger .stat-value { color: #ef4444; }
    .stat-info .stat-value { color: #06b6d4; }
    .stat-secondary .stat-value { color: #94a3b8; }

    .chart-section {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
      padding: 20px;
    }

    .chart-section h3 {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 16px;
    }

    .distribution-bar {
      display: flex;
      height: 48px;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
    }

    .segment {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      transition: all 0.3s;
    }

    .segment-active { background: #10b981; }
    .segment-inactive { background: #94a3b8; }
    .segment-pending { background: #f59e0b; }
    .segment-suspended { background: #ef4444; }

    .legend {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #94a3b8;
    }

    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
    }

    .legend-active { background: #10b981; }
    .legend-inactive { background: #94a3b8; }
    .legend-pending { background: #f59e0b; }
    .legend-suspended { background: #ef4444; }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .info-card {
      padding: 16px;
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
    }

    .info-label {
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 8px;
    }

    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .info-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SqliteStatsPanelComponent {
  readonly stats = input<SqliteStats | null>(null);
  readonly loading = input.required<boolean>();

  protected readonly Formatters = Formatters;

  calculatePercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  getCurrentTimestamp(): string {
    return Formatters.formatDate(new Date(), { format: 'short' });
  }
}
