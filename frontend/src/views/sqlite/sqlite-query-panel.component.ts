/**
 * SQLite Query Panel Component
 * 
 * SQL query editor and results viewer
 */

import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmptyStateComponent } from '../../shared/components/common/empty-state.component';

@Component({
  selector: 'app-sqlite-query-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent],
  template: `
    <div class="query-panel">
      <div class="panel-header">
        <h2>💻 SQL Query Editor</h2>
        <p>Execute custom SQL queries against the SQLite database</p>
      </div>

      <!-- Query Editor -->
      <div class="query-editor-section">
        <div class="editor-toolbar">
          <div class="query-presets">
            <button class="preset-btn" (click)="loadPreset('all')">All Users</button>
            <button class="preset-btn" (click)="loadPreset('active')">Active Users</button>
            <button class="preset-btn" (click)="loadPreset('stats')">Statistics</button>
            <button class="preset-btn" (click)="loadPreset('recent')">Recent Users</button>
          </div>
          <button
            class="btn btn-primary"
            (click)="execute()"
            [disabled]="queryExecuting()">
            {{ queryExecuting() ? '⏳ Executing...' : '▶️ Execute Query' }}
          </button>
        </div>

        <div class="editor-container">
          <textarea
            #queryInput
            class="sql-editor"
            placeholder="Enter SQL query (SELECT only)..."
            rows="8"
            spellcheck="false"></textarea>
        </div>

        <div class="editor-hints">
          <span class="hint">💡 Tip: Use SELECT statements only. Supported: WHERE, GROUP BY, ORDER BY, LIMIT</span>
        </div>
      </div>

      <!-- Results -->
      @if (queryResults().length > 0) {
        <div class="results-section">
          <div class="results-header">
            <h3>Query Results</h3>
            <span class="results-count">{{ queryResults().length }} rows</span>
          </div>

          <div class="table-wrapper">
            <table class="results-table">
              <thead>
                <tr>
                  @for (col of getColumnNames(); track col) {
                    <th>{{ col }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of queryResults(); track $index) {
                  <tr>
                    @for (col of getColumnNames(); track col) {
                      <td>{{ row[col] }}</td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Empty State -->
      @if (queryResults().length === 0 && !queryExecuting()) {
        <div class="empty-results">
          <app-empty-state
            icon="💻"
            title="No Results Yet"
            message="Execute a SQL query to see results here">
          </app-empty-state>
        </div>
      }
    </div>
  `,
  styles: [`
    .query-panel {
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

    .query-editor-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .editor-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .query-presets {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .preset-btn {
      padding: 8px 16px;
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 6px;
      color: #94a3b8;
      cursor: pointer;
      font-weight: 500;
      font-size: 13px;
      transition: all 0.2s;
    }

    .preset-btn:hover {
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.3);
      color: #fff;
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

    .btn-primary {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
    }

    .editor-container {
      position: relative;
    }

    .sql-editor {
      width: 100%;
      padding: 16px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.8);
      color: #06b6d4;
      font-family: 'Fira Code', monospace;
      font-size: 14px;
      resize: vertical;
      line-height: 1.6;
    }

    .sql-editor:focus {
      outline: none;
      border-color: #10b981;
    }

    .editor-hints {
      padding: 12px;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 6px;
    }

    .hint {
      font-size: 13px;
      color: #60a5fa;
    }

    .results-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .results-header h3 {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }

    .results-count {
      padding: 4px 12px;
      background: rgba(16, 185, 129, 0.2);
      border-radius: 12px;
      color: #10b981;
      font-size: 13px;
      font-weight: 600;
    }

    .table-wrapper {
      overflow-x: auto;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
      max-height: 400px;
      overflow-y: auto;
    }

    .results-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .results-table th {
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      color: #94a3b8;
      background: rgba(16, 185, 129, 0.1);
      border-bottom: 2px solid rgba(16, 185, 129, 0.3);
      position: sticky;
      top: 0;
      white-space: nowrap;
    }

    .results-table td {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
      color: #e2e8f0;
      font-family: 'Fira Code', monospace;
      font-size: 12px;
    }

    .results-table tr:hover {
      background: rgba(16, 185, 129, 0.05);
    }

    .empty-results {
      padding: 32px;
    }
  `]
})
export class SqliteQueryPanelComponent {
  readonly queryResults = input.required<Record<string, unknown>[]>();
  readonly queryExecuting = input.required<boolean>();
  readonly executeQuery = output<string>();

  private presetQueries: Record<string, string> = {
    all: 'SELECT * FROM users ORDER BY id DESC',
    active: "SELECT * FROM users WHERE status = 'active' ORDER BY name",
    stats: `SELECT status, COUNT(*) as count, AVG(age) as avg_age 
            FROM users GROUP BY status ORDER BY status`,
    recent: 'SELECT * FROM users ORDER BY created_at DESC LIMIT 10',
  };

  getColumnNames(): string[] {
    const results = this.queryResults();
    if (results.length === 0) return [];
    return Object.keys(results[0]);
  }

  loadPreset(preset: string): void {
    const query = this.presetQueries[preset];
    if (query) {
      this.executeQuery.emit(query);
    }
  }

  execute(): void {
    const textarea = document.querySelector('.sql-editor') as HTMLTextAreaElement;
    if (textarea && textarea.value.trim()) {
      this.executeQuery.emit(textarea.value.trim());
    }
  }
}
