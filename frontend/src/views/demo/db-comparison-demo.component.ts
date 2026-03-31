/**
 * Database Comparison Demo Component
 * Side-by-side comparison of SQLite vs DuckDB performance and features
 */

import { Component, signal, inject, OnInit } from '@angular/core';
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

interface ComparisonMetric {
  operation: string;
  sqliteTime: number;
  duckdbTime: number;
  sqliteResult: string;
  duckdbResult: string;
  winner: 'sqlite' | 'duckdb' | 'tie';
}

interface BenchmarkResult {
  operation: string;
  sqliteMs: number;
  duckdbMs: number;
  winner: string;
  speedup: number;
}

@Component({
  selector: 'app-db-comparison-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="comparison-container">
      <header class="comparison-header">
        <h1>⚖️ Database Comparison: SQLite vs DuckDB</h1>
        <p>Side-by-side comparison of OLTP vs OLAP database performance</p>
      </header>

      <!-- Database Info Cards -->
      <div class="info-cards">
        <div class="db-card sqlite">
          <div class="db-icon">🗄️</div>
          <h2>SQLite</h2>
          <p class="db-type">OLTP - Row-Oriented</p>
          <ul class="db-features">
            <li>✅ Transactional workloads</li>
            <li>✅ Fast single-row operations</li>
            <li>✅ Embedded & lightweight</li>
            <li>✅ ACID compliant</li>
          </ul>
          <div class="db-stats">
            <div class="stat">
              <span class="stat-label">Users:</span>
              <span class="stat-value">{{ sqliteUserCount() }}</span>
            </div>
          </div>
        </div>

        <div class="db-card duckdb">
          <div class="db-icon">🦆</div>
          <h2>DuckDB</h2>
          <p class="db-type">OLAP - Column-Oriented</p>
          <ul class="db-features">
            <li>✅ Analytical workloads</li>
            <li>✅ Fast aggregations</li>
            <li>✅ Vectorized execution</li>
            <li>✅ SQL-99 compliant</li>
          </ul>
          <div class="db-stats">
            <div class="stat">
              <span class="stat-label">Users:</span>
              <span class="stat-value">{{ duckdbUserCount() }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Mode Selector -->
      <div class="mode-selector">
        <button
          class="mode-btn"
          [class.active]="mode() === 'crud'"
          (click)="mode.set('crud')">
          📋 CRUD Operations
        </button>
        <button
          class="mode-btn"
          [class.active]="mode() === 'analytics'"
          (click)="runAnalyticsComparison(); mode.set('analytics')">
          📊 Analytics
        </button>
        <button
          class="mode-btn"
          [class.active]="mode() === 'benchmark'"
          (click)="runBenchmark(); mode.set('benchmark')">
          ⚡ Benchmark
        </button>
        <button
          class="mode-btn"
          [class.active]="mode() === 'features'"
          (click)="mode.set('features')">
          🔍 Feature Matrix
        </button>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Running comparison...</p>
        </div>
      }

      <!-- CRUD Operations Mode -->
      @if (mode() === 'crud' && !loading()) {
        <div class="crud-comparison">
          <div class="comparison-grid">
            <!-- SQLite Side -->
            <div class="db-side sqlite">
              <h3>🗄️ SQLite</h3>
              <div class="crud-demo">
                <button class="crud-btn" (click)="sqliteInsert()">+ Insert</button>
                <button class="crud-btn" (click)="sqliteRead()">📖 Read</button>
                <button class="crud-btn" (click)="sqliteUpdate()">✏️ Update</button>
                <button class="crud-btn" (click)="sqliteDelete()">🗑️ Delete</button>
              </div>
              <div class="operation-log">
                <h4>Operations</h4>
                <div class="log-entries">
                  @for (log of sqliteLogs(); track log.timestamp) {
                    <div class="log-entry">
                      <span class="log-time">{{ log.timestamp | date:'HH:mm:ss' }}</span>
                      <span class="log-msg">{{ log.message }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- DuckDB Side -->
            <div class="db-side duckdb">
              <h3>🦆 DuckDB</h3>
              <div class="crud-demo">
                <button class="crud-btn" (click)="duckdbInsert()">+ Insert</button>
                <button class="crud-btn" (click)="duckdbRead()">📖 Read</button>
                <button class="crud-btn" (click)="duckdbUpdate()">✏️ Update</button>
                <button class="crud-btn" (click)="duckdbDelete()">🗑️ Delete</button>
              </div>
              <div class="operation-log">
                <h4>Operations</h4>
                <div class="log-entries">
                  @for (log of duckdbLogs(); track log.timestamp) {
                    <div class="log-entry">
                      <span class="log-time">{{ log.timestamp | date:'HH:mm:ss' }}</span>
                      <span class="log-msg">{{ log.message }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Analytics Comparison Mode -->
      @if (mode() === 'analytics' && !loading()) {
        <div class="analytics-comparison">
          <div class="section-header">
            <h2>📊 Analytics Query Comparison</h2>
            <button class="btn btn-primary" (click)="runAnalyticsComparison()">🔄 Re-run</button>
          </div>

          <div class="query-showcase">
            <div class="query-card">
              <h4>Query: Age Distribution by Groups</h4>
              <pre class="query-code">SELECT 
  CASE 
    WHEN age BETWEEN 18 AND 25 THEN '18-25'
    WHEN age BETWEEN 26 AND 35 THEN '26-35'
    WHEN age BETWEEN 36 AND 50 THEN '36-50'
    ELSE '50+'
  END as age_group,
  COUNT(*) as count,
  AVG(age) as avg_age
FROM users
GROUP BY age_group
ORDER BY age_group;</pre>
            </div>
          </div>

          <div class="results-comparison">
            <div class="result-side">
              <h4>SQLite Result</h4>
              <div class="result-table">
                <table>
                  <thead>
                    <tr>
                      <th>Age Group</th>
                      <th>Count</th>
                      <th>Avg Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of sqliteAnalytics(); track $index) {
                      <tr>
                        <td>{{ row.age_group }}</td>
                        <td>{{ row.count }}</td>
                        <td>{{ row.avg_age }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="timing">Time: {{ sqliteAnalyticsTime() }}ms</div>
            </div>

            <div class="result-side">
              <h4>DuckDB Result</h4>
              <div class="result-table">
                <table>
                  <thead>
                    <tr>
                      <th>Age Group</th>
                      <th>Count</th>
                      <th>Avg Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of duckdbAnalytics(); track $index) {
                      <tr>
                        <td>{{ row.age_group }}</td>
                        <td>{{ row.count }}</td>
                        <td>{{ row.avg_age }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="timing">Time: {{ duckdbAnalyticsTime() }}ms</div>
            </div>
          </div>

          @if (analyticsWinner()) {
            <div class="winner-banner" [class]="'winner-' + analyticsWinner()">
              🏆 Winner: {{ analyticsWinner() === 'sqlite' ? 'SQLite' : 'DuckDB' }}
              @if (analyticsSpeedup() > 1) {
                <span class="speedup">({{ analyticsSpeedup() | number:'1.1-1' }}x faster)</span>
              }
            </div>
          }
        </div>
      }

      <!-- Benchmark Mode -->
      @if (mode() === 'benchmark' && !loading()) {
        <div class="benchmark-section">
          <div class="section-header">
            <h2>⚡ Performance Benchmark</h2>
            <button class="btn btn-success" (click)="runBenchmark()" [disabled]="benchmarkRunning()">
              {{ benchmarkRunning() ? '⏳ Running...' : '▶️ Run Benchmark' }}
            </button>
          </div>

          @if (benchmarkResults().length > 0) {
            <div class="benchmark-grid">
              @for (result of benchmarkResults(); track result.operation) {
                <div class="benchmark-card">
                  <div class="benchmark-header">
                    <h4>{{ result.operation }}</h4>
                    <span class="winner-badge" [class]="'winner-' + result.winner.toLowerCase()">
                      {{ result.winner }}
                    </span>
                  </div>
                  <div class="benchmark-bars">
                    <div class="benchmark-row">
                      <span class="db-label">SQLite</span>
                      <div class="bar-container">
                        <div class="bar sqlite-bar" [style.width.%]="getBarWidth(result.sqliteMs, result.duckdbMs)">
                          {{ result.sqliteMs | number:'1.0-2' }}ms
                        </div>
                      </div>
                    </div>
                    <div class="benchmark-row">
                      <span class="db-label">DuckDB</span>
                      <div class="bar-container">
                        <div class="bar duckdb-bar" [style.width.%]="getBarWidth(result.duckdbMs, result.sqliteMs)">
                          {{ result.duckdbMs | number:'1.0-2' }}ms
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="benchmark-summary">
                    {{ result.speedup > 1 ? result.winner + ' is ' + (result.speedup | number:'1.1-1') + 'x faster' : 'Similar performance' }}
                  </div>
                </div>
              }
            </div>

            <div class="benchmark-summary-card">
              <h3>📊 Summary</h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-label">SQLite Wins:</span>
                  <span class="summary-value sqlite">{{ sqliteWins() }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">DuckDB Wins:</span>
                  <span class="summary-value duckdb">{{ duckdbWins() }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Ties:</span>
                  <span class="summary-value">{{ ties() }}</span>
                </div>
              </div>
            </div>
          } @else {
            <div class="benchmark-intro">
              <h3>Ready to Benchmark</h3>
              <p>Click "Run Benchmark" to compare database performance across:</p>
              <ul>
                <li>📊 Single-row INSERT operations</li>
                <li>📊 Bulk INSERT (100 records)</li>
                <li>📊 SELECT all records</li>
                <li>📊 Aggregation queries (GROUP BY)</li>
                <li>📊 UPDATE operations</li>
                <li>📊 DELETE operations</li>
              </ul>
            </div>
          }
        </div>
      }

      <!-- Feature Matrix Mode -->
      @if (mode() === 'features' && !loading()) {
        <div class="feature-matrix">
          <h2>🔍 Feature Comparison Matrix</h2>
          <table class="matrix-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>SQLite</th>
                <th>DuckDB</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Database Type</td>
                <td>OLTP (Row-oriented)</td>
                <td>OLAP (Column-oriented)</td>
              </tr>
              <tr>
                <td>Best Use Case</td>
                <td>Transactional workloads</td>
                <td>Analytical queries</td>
              </tr>
              <tr>
                <td>ACID Compliance</td>
                <td>✅ Full support</td>
                <td>✅ Full support</td>
              </tr>
              <tr>
                <td>Single-row Operations</td>
                <td>✅ Excellent</td>
                <td>⚠️ Good</td>
              </tr>
              <tr>
                <td>Bulk Inserts</td>
                <td>⚠️ Good</td>
                <td>✅ Excellent</td>
              </tr>
              <tr>
                <td>Aggregations</td>
                <td>⚠️ Good</td>
                <td>✅ Excellent (5-10x faster)</td>
              </tr>
              <tr>
                <td>Vectorized Execution</td>
                <td>❌ No</td>
                <td>✅ Yes</td>
              </tr>
              <tr>
                <td>Foreign Keys</td>
                <td>✅ Yes</td>
                <td>✅ Yes</td>
              </tr>
              <tr>
                <td>Triggers</td>
                <td>✅ Yes</td>
                <td>❌ Limited</td>
              </tr>
              <tr>
                <td>Full-Text Search</td>
                <td>✅ Yes (FTS5)</td>
                <td>⚠️ Basic</td>
              </tr>
              <tr>
                <td>JSON Support</td>
                <td>✅ Yes (JSON1)</td>
                <td>✅ Excellent</td>
              </tr>
              <tr>
                <td>Window Functions</td>
                <td>✅ Yes</td>
                <td>✅ Excellent</td>
              </tr>
              <tr>
                <td>Memory Usage</td>
                <td>Low</td>
                <td>Moderate-High</td>
              </tr>
              <tr>
                <td>File Size</td>
                <td>~500KB</td>
                <td>~15MB</td>
              </tr>
              <tr>
                <td>Concurrency</td>
                <td>Single writer</td>
                <td>Single writer</td>
              </tr>
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .comparison-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      color: #e2e8f0;
    }

    .comparison-header {
      margin-bottom: 24px;
    }

    .comparison-header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #fff;
      margin: 0 0 8px;
    }

    .comparison-header p {
      font-size: 14px;
      color: #94a3b8;
      margin: 0;
    }

    .info-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }

    .db-card {
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      padding: 24px;
      border: 2px solid transparent;
      transition: all 0.3s;
    }

    .db-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    }

    .db-card.sqlite {
      border-color: rgba(16, 185, 129, 0.3);
    }

    .db-card.duckdb {
      border-color: rgba(59, 130, 246, 0.3);
    }

    .db-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .db-card h2 {
      font-size: 24px;
      font-weight: 700;
      color: #fff;
      margin: 0 0 8px;
    }

    .db-type {
      font-size: 14px;
      color: #94a3b8;
      margin: 0 0 16px;
    }

    .db-features {
      list-style: none;
      padding: 0;
      margin: 0 0 16px;
    }

    .db-features li {
      padding: 6px 0;
      font-size: 14px;
      color: #e2e8f0;
    }

    .db-stats {
      border-top: 1px solid rgba(148, 163, 184, 0.2);
      padding-top: 16px;
    }

    .stat {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }

    .stat-label {
      color: #94a3b8;
      font-size: 14px;
    }

    .stat-value {
      color: #fff;
      font-weight: 600;
      font-size: 18px;
    }

    .mode-selector {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .mode-btn {
      padding: 12px 20px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      background: rgba(30, 41, 59, 0.5);
      color: #94a3b8;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .mode-btn:hover {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
      color: #fff;
    }

    .mode-btn.active {
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      border-color: transparent;
      color: #fff;
      box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 64px;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(139, 92, 246, 0.2);
      border-top-color: #8b5cf6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-header h2 {
      font-size: 20px;
      font-weight: 600;
      color: #fff;
      margin: 0;
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

    .btn-primary { background: #3b82f6; color: #fff; }
    .btn-success { background: #10b981; color: #fff; }
    .btn:hover:not(:disabled) { transform: translateY(-2px); opacity: 0.9; }

    .crud-btn {
      padding: 10px 16px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 6px;
      background: rgba(30, 41, 59, 0.5);
      color: #94a3b8;
      cursor: pointer;
      font-weight: 600;
      margin-right: 8px;
      margin-bottom: 8px;
      transition: all 0.2s;
    }

    .crud-btn:hover {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
      color: #fff;
    }

    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .db-side {
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      padding: 20px;
    }

    .db-side h3 {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 16px;
    }

    .db-side.sqlite h3 { color: #10b981; }
    .db-side.duckdb h3 { color: #3b82f6; }

    .operation-log {
      margin-top: 20px;
    }

    .operation-log h4 {
      font-size: 14px;
      font-weight: 600;
      color: #94a3b8;
      margin: 0 0 12px;
    }

    .log-entries {
      max-height: 200px;
      overflow-y: auto;
      background: rgba(15, 23, 42, 0.6);
      border-radius: 6px;
      padding: 12px;
    }

    .log-entry {
      display: flex;
      gap: 12px;
      padding: 6px 0;
      font-size: 13px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .log-entry:last-child {
      border-bottom: none;
    }

    .log-time {
      color: #64748b;
      font-family: monospace;
    }

    .log-msg {
      color: #e2e8f0;
    }

    .query-showcase {
      margin-bottom: 24px;
    }

    .query-card {
      background: rgba(15, 23, 42, 0.8);
      border-radius: 8px;
      padding: 20px;
      border: 1px solid rgba(148, 163, 184, 0.2);
    }

    .query-card h4 {
      font-size: 14px;
      font-weight: 600;
      color: #94a3b8;
      margin: 0 0 12px;
    }

    .query-code {
      background: transparent;
      color: #06b6d4;
      font-family: 'Fira Code', monospace;
      font-size: 13px;
      margin: 0;
      white-space: pre;
      overflow-x: auto;
    }

    .results-comparison {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }

    .result-side {
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      padding: 20px;
    }

    .result-side h4 {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 16px;
    }

    .result-table {
      overflow-x: auto;
    }

    .result-table table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .result-table th, .result-table td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .result-table th {
      background: rgba(59, 130, 246, 0.1);
      font-weight: 600;
      color: #94a3b8;
    }

    .timing {
      margin-top: 12px;
      padding: 8px 12px;
      background: rgba(15, 23, 42, 0.6);
      border-radius: 6px;
      font-size: 13px;
      color: #94a3b8;
    }

    .winner-banner {
      padding: 16px 24px;
      border-radius: 8px;
      text-align: center;
      font-size: 18px;
      font-weight: 600;
    }

    .winner-banner.winner-sqlite {
      background: rgba(16, 185, 129, 0.2);
      border: 2px solid #10b981;
      color: #10b981;
    }

    .winner-banner.winner-duckdb {
      background: rgba(59, 130, 246, 0.2);
      border: 2px solid #3b82f6;
      color: #3b82f6;
    }

    .speedup {
      font-size: 14px;
      font-weight: 400;
      margin-left: 8px;
    }

    .benchmark-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .benchmark-card {
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      padding: 20px;
    }

    .benchmark-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .benchmark-header h4 {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }

    .winner-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .winner-badge.winner-sqlite {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .winner-badge.winner-duckdb {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
    }

    .benchmark-bars {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .benchmark-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .db-label {
      width: 60px;
      font-size: 13px;
      font-weight: 600;
      color: #94a3b8;
    }

    .bar-container {
      flex: 1;
      height: 36px;
      background: rgba(148, 163, 184, 0.1);
      border-radius: 6px;
      overflow: hidden;
    }

    .bar {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 12px;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      transition: width 0.3s ease;
    }

    .sqlite-bar {
      background: linear-gradient(90deg, #10b981, #059669);
    }

    .duckdb-bar {
      background: linear-gradient(90deg, #3b82f6, #2563eb);
    }

    .benchmark-summary {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(148, 163, 184, 0.1);
      font-size: 13px;
      color: #94a3b8;
    }

    .benchmark-summary-card {
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      padding: 24px;
    }

    .benchmark-summary-card h3 {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 20px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      background: rgba(15, 23, 42, 0.6);
      border-radius: 8px;
    }

    .summary-label {
      font-size: 14px;
      color: #94a3b8;
    }

    .summary-value {
      font-size: 32px;
      font-weight: 700;
      color: #fff;
    }

    .summary-value.sqlite { color: #10b981; }
    .summary-value.duckdb { color: #3b82f6; }

    .benchmark-intro {
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      padding: 40px;
      text-align: center;
    }

    .benchmark-intro h3 {
      font-size: 20px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 16px;
    }

    .benchmark-intro p {
      color: #94a3b8;
      margin-bottom: 20px;
    }

    .benchmark-intro ul {
      list-style: none;
      padding: 0;
      display: inline-block;
      text-align: left;
    }

    .benchmark-intro li {
      padding: 8px 0;
      color: #e2e8f0;
    }

    .feature-matrix {
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      padding: 24px;
    }

    .feature-matrix h2 {
      font-size: 20px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 20px;
    }

    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    .matrix-table th, .matrix-table td {
      padding: 14px 16px;
      text-align: left;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .matrix-table th {
      background: rgba(59, 130, 246, 0.1);
      font-weight: 600;
      color: #94a3b8;
      position: sticky;
      top: 0;
    }

    .matrix-table tr:hover {
      background: rgba(59, 130, 246, 0.05);
    }

    .matrix-table td:first-child {
      font-weight: 600;
      color: #fff;
    }

    @media (max-width: 1024px) {
      .info-cards,
      .comparison-grid,
      .results-comparison,
      .benchmark-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DbComparisonDemoComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly logger = inject(LoggerService);

  readonly mode = signal<'crud' | 'analytics' | 'benchmark' | 'features'>('features');
  readonly loading = signal(false);
  readonly benchmarkRunning = signal(false);

  // User counts
  readonly sqliteUserCount = signal(0);
  readonly duckdbUserCount = signal(0);

  // CRUD logs
  readonly sqliteLogs = signal<{ timestamp: Date; message: string }[]>([]);
  readonly duckdbLogs = signal<{ timestamp: Date; message: string }[]>([]);

  // Analytics
  readonly sqliteAnalytics = signal<any[]>([]);
  readonly duckdbAnalytics = signal<any[]>([]);
  readonly sqliteAnalyticsTime = signal(0);
  readonly duckdbAnalyticsTime = signal(0);
  readonly analyticsWinner = signal<'sqlite' | 'duckdb' | ''>('');
  readonly analyticsSpeedup = signal(0);

  // Benchmark
  readonly benchmarkResults = signal<BenchmarkResult[]>([]);
  readonly sqliteWins = signal(0);
  readonly duckdbWins = signal(0);
  readonly ties = signal(0);

  ngOnInit(): void {
    this.loadUserCounts();
  }

  async loadUserCounts(): Promise<void> {
    try {
      const [sqliteUsers, duckdbUsers] = await Promise.all([
        this.api.callOrThrow<any[]>('getUsers', []),
        this.api.callOrThrow<any[]>('duckdbGetUsers', []),
      ]);
      this.sqliteUserCount.set(sqliteUsers.length);
      this.duckdbUserCount.set(duckdbUsers.length);
    } catch (error) {
      this.logger.error('Failed to load user counts', error);
    }
  }

  logSqlite(message: string): void {
    this.sqliteLogs.update(logs => [{ timestamp: new Date(), message }, ...logs].slice(0, 50));
  }

  logDuckdb(message: string): void {
    this.duckdbLogs.update(logs => [{ timestamp: new Date(), message }, ...logs].slice(0, 50));
  }

  async sqliteInsert(): Promise<void> {
    try {
      const userData = {
        name: `User_${Date.now()}`,
        email: `user_${Date.now()}@example.com`,
        age: Math.floor(Math.random() * 40) + 20,
        status: 'active',
      };
      const start = Date.now();
      await this.api.callOrThrow('createUser', [userData]);
      const elapsed = Date.now() - start;
      this.logSqlite(`INSERT completed in ${elapsed}ms`);
      this.loadUserCounts();
    } catch (error) {
      this.logSqlite(`INSERT failed: ${error}`);
    }
  }

  async sqliteRead(): Promise<void> {
    try {
      const start = Date.now();
      const users = await this.api.callOrThrow<any[]>('getUsers', []);
      const elapsed = Date.now() - start;
      this.logSqlite(`READ ${users.length} users in ${elapsed}ms`);
    } catch (error) {
      this.logSqlite(`READ failed: ${error}`);
    }
  }

  async sqliteUpdate(): Promise<void> {
    try {
      const users = await this.api.callOrThrow<any[]>('getUsers', []);
      if (users.length === 0) {
        this.logSqlite('No users to update');
        return;
      }
      const user = users[0];
      const start = Date.now();
      await this.api.callOrThrow('updateUser', [{ ...user, name: `Updated_${Date.now()}` }]);
      const elapsed = Date.now() - start;
      this.logSqlite(`UPDATE completed in ${elapsed}ms`);
    } catch (error) {
      this.logSqlite(`UPDATE failed: ${error}`);
    }
  }

  async sqliteDelete(): Promise<void> {
    try {
      const users = await this.api.callOrThrow<any[]>('getUsers', []);
      if (users.length === 0) {
        this.logSqlite('No users to delete');
        return;
      }
      const user = users[users.length - 1];
      const start = Date.now();
      await this.api.callOrThrow('deleteUser', [user.id.toString()]);
      const elapsed = Date.now() - start;
      this.logSqlite(`DELETE completed in ${elapsed}ms`);
      this.loadUserCounts();
    } catch (error) {
      this.logSqlite(`DELETE failed: ${error}`);
    }
  }

  async duckdbInsert(): Promise<void> {
    try {
      const userData = {
        name: `DuckUser_${Date.now()}`,
        email: `duckuser_${Date.now()}@example.com`,
        age: Math.floor(Math.random() * 40) + 20,
        status: 'active',
      };
      const start = Date.now();
      await this.api.callOrThrow('duckdbCreateUser', [userData]);
      const elapsed = Date.now() - start;
      this.logDuckdb(`INSERT completed in ${elapsed}ms`);
      this.loadUserCounts();
    } catch (error) {
      this.logDuckdb(`INSERT failed: ${error}`);
    }
  }

  async duckdbRead(): Promise<void> {
    try {
      const start = Date.now();
      const users = await this.api.callOrThrow<any[]>('duckdbGetUsers', []);
      const elapsed = Date.now() - start;
      this.logDuckdb(`READ ${users.length} users in ${elapsed}ms`);
    } catch (error) {
      this.logDuckdb(`READ failed: ${error}`);
    }
  }

  async duckdbUpdate(): Promise<void> {
    try {
      const users = await this.api.callOrThrow<any[]>('duckdbGetUsers', []);
      if (users.length === 0) {
        this.logDuckdb('No users to update');
        return;
      }
      const user = users[0];
      const start = Date.now();
      // DuckDB update API would go here
      this.logDuckdb(`UPDATE (not implemented)`);
    } catch (error) {
      this.logDuckdb(`UPDATE failed: ${error}`);
    }
  }

  async duckdbDelete(): Promise<void> {
    try {
      const users = await this.api.callOrThrow<any[]>('duckdbGetUsers', []);
      if (users.length === 0) {
        this.logDuckdb('No users to delete');
        return;
      }
      const user = users[users.length - 1];
      const start = Date.now();
      await this.api.callOrThrow('duckdbDeleteUser', [{ id: user.id }]);
      const elapsed = Date.now() - start;
      this.logDuckdb(`DELETE completed in ${elapsed}ms`);
      this.loadUserCounts();
    } catch (error) {
      this.logDuckdb(`DELETE failed: ${error}`);
    }
  }

  async runAnalyticsComparison(): Promise<void> {
    this.loading.set(true);
    try {
      // SQLite analytics
      const sqliteStart = Date.now();
      const sqliteResults = await this.api.callOrThrow<any[]>('sqliteExecuteQuery', [
        `SELECT 
          CASE 
            WHEN age BETWEEN 18 AND 25 THEN '18-25'
            WHEN age BETWEEN 26 AND 35 THEN '26-35'
            WHEN age BETWEEN 36 AND 50 THEN '36-50'
            ELSE '50+'
          END as age_group,
          COUNT(*) as count,
          AVG(age) as avg_age
        FROM users
        GROUP BY age_group
        ORDER BY age_group`
      ]);
      this.sqliteAnalyticsTime.set(Date.now() - sqliteStart);
      this.sqliteAnalytics.set(sqliteResults);

      // DuckDB analytics
      const duckdbStart = Date.now();
      const duckdbResults = await this.api.callOrThrow<any[]>('duckdbExecuteQuery', [
        `SELECT 
          CASE 
            WHEN age BETWEEN 18 AND 25 THEN '18-25'
            WHEN age BETWEEN 26 AND 35 THEN '26-35'
            WHEN age BETWEEN 36 AND 50 THEN '36-50'
            ELSE '50+'
          END as age_group,
          COUNT(*) as count,
          AVG(age) as avg_age
        FROM users
        GROUP BY age_group
        ORDER BY age_group`
      ]);
      this.duckdbAnalyticsTime.set(Date.now() - duckdbStart);
      this.duckdbAnalytics.set(duckdbResults);

      // Determine winner
      if (this.sqliteAnalyticsTime() < this.duckdbAnalyticsTime()) {
        this.analyticsWinner.set('sqlite');
        this.analyticsSpeedup.set(this.duckdbAnalyticsTime() / this.sqliteAnalyticsTime());
      } else {
        this.analyticsWinner.set('duckdb');
        this.analyticsSpeedup.set(this.sqliteAnalyticsTime() / this.duckdbAnalyticsTime());
      }
    } catch (error) {
      this.logger.error('Analytics comparison failed', error);
    } finally {
      this.loading.set(false);
    }
  }

  async runBenchmark(): Promise<void> {
    this.benchmarkRunning.set(true);
    this.loading.set(true);
    try {
      const results: BenchmarkResult[] = [];

      // Benchmark 1: Single INSERT
      const sqliteInsertStart = Date.now();
      for (let i = 0; i < 10; i++) {
        await this.api.callOrThrow('createUser', [{
          name: `BenchUser_${i}`,
          email: `bench_${i}@test.com`,
          age: 25 + i,
          status: 'active',
        }]);
      }
      const sqliteInsertTime = Date.now() - sqliteInsertStart;

      const duckdbInsertStart = Date.now();
      for (let i = 0; i < 10; i++) {
        await this.api.callOrThrow('duckdbCreateUser', [{
          name: `DuckBench_${i}`,
          email: `duckbench_${i}@test.com`,
          age: 25 + i,
          status: 'active',
        }]);
      }
      const duckdbInsertTime = Date.now() - duckdbInsertStart;

      results.push({
        operation: 'Single INSERT (x10)',
        sqliteMs: sqliteInsertTime,
        duckdbMs: duckdbInsertTime,
        winner: sqliteInsertTime < duckdbInsertTime ? 'SQLite' : 'DuckDB',
        speedup: sqliteInsertTime < duckdbInsertTime ? sqliteInsertTime / duckdbInsertTime : duckdbInsertTime / sqliteInsertTime,
      });

      // Benchmark 2: SELECT all
      const sqliteSelectStart = Date.now();
      for (let i = 0; i < 5; i++) {
        await this.api.callOrThrow<any[]>('getUsers', []);
      }
      const sqliteSelectTime = Date.now() - sqliteSelectStart;

      const duckdbSelectStart = Date.now();
      for (let i = 0; i < 5; i++) {
        await this.api.callOrThrow<any[]>('duckdbGetUsers', []);
      }
      const duckdbSelectTime = Date.now() - duckdbSelectStart;

      results.push({
        operation: 'SELECT All (x5)',
        sqliteMs: sqliteSelectTime,
        duckdbMs: duckdbSelectTime,
        winner: sqliteSelectTime < duckdbSelectTime ? 'SQLite' : 'DuckDB',
        speedup: sqliteSelectTime < duckdbSelectTime ? sqliteSelectTime / duckdbSelectTime : duckdbSelectTime / sqliteSelectTime,
      });

      // Benchmark 3: Aggregation
      const sqliteAggStart = Date.now();
      for (let i = 0; i < 3; i++) {
        await this.api.callOrThrow<any[]>('sqliteExecuteQuery', [
          'SELECT status, COUNT(*), AVG(age) FROM users GROUP BY status'
        ]);
      }
      const sqliteAggTime = Date.now() - sqliteAggStart;

      const duckdbAggStart = Date.now();
      for (let i = 0; i < 3; i++) {
        await this.api.callOrThrow<any[]>('duckdbExecuteQuery', [
          'SELECT status, COUNT(*), AVG(age) FROM users GROUP BY status'
        ]);
      }
      const duckdbAggTime = Date.now() - duckdbAggStart;

      results.push({
        operation: 'Aggregation (x3)',
        sqliteMs: sqliteAggTime,
        duckdbMs: duckdbAggTime,
        winner: sqliteAggTime < duckdbAggTime ? 'SQLite' : 'DuckDB',
        speedup: sqliteAggTime < duckdbAggTime ? sqliteAggTime / duckdbAggTime : duckdbAggTime / sqliteAggTime,
      });

      this.benchmarkResults.set(results);

      // Calculate wins
      let sqliteWinsCount = 0;
      let duckdbWinsCount = 0;
      let tiesCount = 0;

      results.forEach(result => {
        if (result.winner === 'SQLite') sqliteWinsCount++;
        else if (result.winner === 'DuckDB') duckdbWinsCount++;
        else tiesCount++;
      });

      this.sqliteWins.set(sqliteWinsCount);
      this.duckdbWins.set(duckdbWinsCount);
      this.ties.set(tiesCount);

    } catch (error) {
      this.logger.error('Benchmark failed', error);
    } finally {
      this.loading.set(false);
      this.benchmarkRunning.set(false);
    }
  }

  getBarWidth(value: number, maxValue: number): number {
    if (maxValue === 0) return 0;
    return Math.min(100, (value / maxValue) * 100);
  }
}
