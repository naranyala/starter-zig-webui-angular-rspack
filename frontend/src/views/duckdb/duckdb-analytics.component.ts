/**
 * DuckDB Analytics Component
 *
 * Query builder and analytics dashboard
 */

import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoggerService } from '../../core/logger.service';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-duckdb-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="analytics-container">
      <!-- Query Builder Card -->
      <div class="table-card">
        <div class="card-header">
          <h2 class="card-title">
            <span class="title-icon">📊</span>
            SQL Query Builder
          </h2>
        </div>

        <div class="query-builder">
          <div class="query-row">
            <label class="query-label">SELECT</label>
            <input
              type="text"
              class="query-input"
              [(ngModel)]="queryFields"
              placeholder="* or column names (e.g., id, name, email)"
            />
          </div>
          <div class="query-row">
            <label class="query-label">FROM</label>
            <select class="query-input" [(ngModel)]="selectedTable">
              <option value="users">users</option>
              <option value="products">products</option>
              <option value="orders">orders</option>
            </select>
          </div>
          <div class="query-row">
            <label class="query-label">WHERE</label>
            <input
              type="text"
              class="query-input"
              [(ngModel)]="queryWhere"
              placeholder="Optional: age > 25, status = 'active', etc."
            />
          </div>
          <div class="query-row">
            <label class="query-label">ORDER BY</label>
            <input
              type="text"
              class="query-input"
              [(ngModel)]="queryOrder"
              placeholder="Optional: created_at DESC, name ASC"
            />
          </div>
          <div class="query-row">
            <label class="query-label">LIMIT</label>
            <input
              type="number"
              class="query-input"
              [(ngModel)]="queryLimit"
              min="1"
              max="1000"
              placeholder="10"
            />
          </div>
          <div class="query-actions">
            <button class="btn btn-secondary" (click)="resetQuery()">
              <span class="btn-icon">↺</span> Reset
            </button>
            <button class="btn btn-primary" (click)="executeQuery()" [disabled]="isExecuting()">
              <span class="btn-icon">{{ isExecuting() ? '⏳' : '▶' }}</span>
              {{ isExecuting() ? 'Executing...' : 'Execute Query' }}
            </button>
          </div>
        </div>

        <!-- Generated SQL Preview -->
        <div class="sql-preview">
          <div class="preview-header">
            <span class="preview-title">Generated SQL:</span>
            <button class="btn-copy" (click)="copySql()" title="Copy SQL">📋</button>
          </div>
          <pre class="sql-code">{{ generatedSql() }}</pre>
        </div>
      </div>

      <!-- Query Results Card -->
      @if (queryResult()) {
        <div class="table-card">
          <div class="card-header">
            <h2 class="card-title">
              <span class="title-icon">📋</span>
              Query Results
            </h2>
            <span class="result-count">{{ resultCount() }} rows</span>
          </div>

          <div class="table-container">
            @if (resultData().length > 0) {
              <table class="data-table">
                <thead>
                  <tr>
                    @for (col of resultColumns(); track col) {
                      <th>{{ col }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of resultData(); track row; let i = $index) {
                    <tr class="data-row">
                      @for (col of resultColumns(); track col) {
                        <td>{{ row[col] }}</td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <div class="empty-state">
                <span class="empty-icon">📭</span>
                <p>No results returned</p>
              </div>
            }
          </div>
        </div>
      }

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card stat-info">
          <div class="stat-icon">📈</div>
          <div class="stat-content">
            <span class="stat-value">{{ queryTime() }}ms</span>
            <span class="stat-label">Query Time</span>
          </div>
        </div>
        <div class="stat-card stat-success">
          <div class="stat-icon">✓</div>
          <div class="stat-content">
            <span class="stat-value">{{ successfulQueries() }}</span>
            <span class="stat-label">Successful Queries</span>
          </div>
        </div>
        <div class="stat-card stat-warning">
          <div class="stat-icon">⏱</div>
          <div class="stat-content">
            <span class="stat-value">{{ avgQueryTime | number:'1.0-2' }}ms</span>
            <span class="stat-label">Avg Query Time</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analytics-container { display: flex; flex-direction: column; gap: 24px; }
    .table-card { background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(148, 163, 184, 0.1); border-radius: 16px; padding: 24px; backdrop-filter: blur(10px); }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .card-title { display: flex; align-items: center; gap: 12px; margin: 0; font-size: 20px; font-weight: 600; color: #fff; }
    .title-icon { font-size: 24px; }
    .result-count { font-size: 13px; color: #64748b; background: rgba(148, 163, 184, 0.1); padding: 4px 12px; border-radius: 20px; }
    .query-builder { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; padding: 20px; background: rgba(15, 23, 42, 0.3); border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.1); }
    .query-row { display: flex; flex-direction: column; gap: 8px; }
    .query-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .query-input { padding: 12px 16px; background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 10px; color: #fff; font-size: 14px; font-family: monospace; transition: all 0.2s; }
    .query-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
    .query-actions { grid-column: 1 / -1; display: flex; gap: 12px; justify-content: center; padding-top: 8px; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; border: none; }
    .btn-icon { font-size: 16px; }
    .btn-primary { background: linear-gradient(135deg, #06b6d4, #3b82f6); color: #fff; box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3); }
    .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(6, 182, 212, 0.4); }
    .btn-secondary { background: rgba(148, 163, 184, 0.1); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2); }
    .btn-secondary:hover { background: rgba(148, 163, 184, 0.2); color: #fff; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .sql-preview { margin-top: 20px; background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(148, 163, 184, 0.1); border-radius: 12px; overflow: hidden; }
    .preview-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(15, 23, 42, 0.5); border-bottom: 1px solid rgba(148, 163, 184, 0.1); }
    .preview-title { font-size: 13px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
    .btn-copy { background: transparent; border: none; color: #64748b; cursor: pointer; font-size: 16px; padding: 4px 8px; border-radius: 6px; transition: all 0.2s; }
    .btn-copy:hover { background: rgba(148, 163, 184, 0.1); color: #fff; }
    .sql-code { margin: 0; padding: 16px; font-family: monospace; font-size: 13px; line-height: 1.6; color: #10b981; background: transparent; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
    .table-container { overflow-x: auto; border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.1); }
    .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .data-table thead { background: rgba(15, 23, 42, 0.5); }
    .data-table th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(148, 163, 184, 0.1); }
    .data-table tbody tr { border-bottom: 1px solid rgba(148, 163, 184, 0.05); transition: all 0.2s; }
    .data-table tbody tr:hover { background: rgba(59, 130, 246, 0.05); }
    .data-table td { padding: 14px 16px; color: #e2e8f0; }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 20px; color: #64748b; }
    .empty-icon { font-size: 48px; opacity: 0.5; }
    .empty-state p { margin: 0; font-size: 14px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
    .stat-card { display: flex; align-items: center; gap: 16px; padding: 20px; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(148, 163, 184, 0.1); border-radius: 12px; transition: all 0.3s; }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3); }
    .stat-icon { font-size: 40px; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.05); border-radius: 12px; }
    .stat-content { display: flex; flex-direction: column; }
    .stat-value { font-size: 28px; font-weight: 700; color: #fff; }
    .stat-label { font-size: 13px; color: #64748b; margin-top: 4px; }
    .stat-info .stat-icon { background: rgba(6, 182, 212, 0.2); }
    .stat-success .stat-icon { background: rgba(16, 185, 129, 0.2); }
    .stat-warning .stat-icon { background: rgba(245, 158, 11, 0.2); }
  `]
})
export class DuckdbAnalyticsComponent implements OnInit {
  private readonly logger = inject(LoggerService);
  private readonly api = inject(ApiService);

  queryFields = signal('*');
  queryWhere = signal('');
  queryOrder = signal('');
  queryLimit = signal(10);
  selectedTable = signal('users');
  isExecuting = signal(false);
  queryResult = signal<any[] | null>(null);
  queryTime = signal(0);
  successfulQueries = signal(0);
  queryTimes = signal<number[]>([]);

  generatedSql = signal('');
  resultData = signal<any[]>([]);
  resultColumns = signal<string[]>([]);
  resultCount = signal(0);

  ngOnInit(): void {
    this.updateGeneratedSql();
  }

  updateGeneratedSql(): void {
    let sql = `SELECT ${this.queryFields() || '*'}`;
    sql += ` FROM ${this.selectedTable()}`;

    if (this.queryWhere()) {
      sql += ` WHERE ${this.queryWhere()}`;
    }

    if (this.queryOrder()) {
      sql += ` ORDER BY ${this.queryOrder()}`;
    }

    if (this.queryLimit()) {
      sql += ` LIMIT ${this.queryLimit()}`;
    }

    this.generatedSql.set(sql);
  }

  resetQuery(): void {
    this.queryFields.set('*');
    this.queryWhere.set('');
    this.queryOrder.set('');
    this.queryLimit.set(10);
    this.selectedTable.set('users');
    this.queryResult.set(null);
    this.updateGeneratedSql();
  }

  async executeQuery(): Promise<void> {
    this.isExecuting.set(true);
    const startTime = Date.now();

    try {
      this.updateGeneratedSql();
      const sql = this.generatedSql();

      this.logger.info('Executing query:', sql);

      // Execute query via backend
      const result = await this.api.callOrThrow<any[]>('executeQuery', [sql]);

      const endTime = Date.now();
      const time = endTime - startTime;

      this.queryTime.set(time);
      this.successfulQueries.update(c => c + 1);
      this.queryTimes.update(times => [...times, time]);

      // Process results
      if (result && result.length > 0) {
        this.resultData.set(result);
        this.resultColumns.set(Object.keys(result[0]));
        this.resultCount.set(result.length);
        this.queryResult.set(result);
      } else {
        this.resultData.set([]);
        this.resultColumns.set([]);
        this.resultCount.set(0);
        this.queryResult.set([]);
      }

      this.logger.info(`Query executed in ${time}ms, ${result.length} rows returned`);
    } catch (error) {
      this.logger.error('Query execution failed', error);
      this.queryResult.set(null);
    } finally {
      this.isExecuting.set(false);
    }
  }

  get avgQueryTime(): number {
    const times = this.queryTimes();
    if (times.length === 0) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  copySql(): void {
    navigator.clipboard.writeText(this.generatedSql());
    this.logger.info('SQL copied to clipboard');
  }
}
