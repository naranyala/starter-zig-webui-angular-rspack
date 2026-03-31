/**
 * Vega Charts Demo - Main Container Component
 * 
 * Professional chart gallery showcasing various Vega-Lite visualizations
 */

import { Component, signal, inject, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import embed from 'vega-embed';
import type { TopLevelSpec } from 'vega-lite';

interface ChartSpec {
  id: string;
  title: string;
  icon: string;
  description: string;
  spec: TopLevelSpec;
  category: 'basic' | 'advanced' | 'interactive';
}

@Component({
  selector: 'app-vega-charts-demo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="charts-demo-container">
      <!-- Header -->
      <header class="charts-header">
        <div class="header-content">
          <div class="header-icon">📊</div>
          <div class="header-info">
            <h1>Vega Charts Integration</h1>
            <p>Professional data visualization with Vega-Lite</p>
          </div>
        </div>
        <div class="header-stats">
          <div class="stat-badge">
            <span class="stat-value">{{ charts().length }}</span>
            <span class="stat-label">Chart Types</span>
          </div>
        </div>
      </header>

      <!-- Feature Highlights -->
      <div class="feature-bar">
        <div class="feature-item">
          <span class="feature-icon">🎨</span>
          <span class="feature-text">Declarative</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">📈</span>
          <span class="feature-text">Interactive</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">🔧</span>
          <span class="feature-text">Customizable</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">📱</span>
          <span class="feature-text">Responsive</span>
        </div>
      </div>

      <!-- Category Filter -->
      <div class="category-filter">
        <button
          class="filter-btn"
          [class.active]="selectedCategory() === 'all'"
          (click)="selectedCategory.set('all')">
          All Charts
        </button>
        <button
          class="filter-btn"
          [class.active]="selectedCategory() === 'basic'"
          (click)="selectedCategory.set('basic')">
          📊 Basic
        </button>
        <button
          class="filter-btn"
          [class.active]="selectedCategory() === 'advanced'"
          (click)="selectedCategory.set('advanced')">
          📈 Advanced
        </button>
        <button
          class="filter-btn"
          [class.active]="selectedCategory() === 'interactive'"
          (click)="selectedCategory.set('interactive')">
          🖱️ Interactive
        </button>
      </div>

      <!-- Charts Grid -->
      <div class="charts-grid">
        @for (chart of filteredCharts(); track chart.id) {
          <div class="chart-card" [id]="'chart-' + chart.id">
            <div class="chart-header">
              <div class="chart-title">
                <span class="chart-icon">{{ chart.icon }}</span>
                <h3>{{ chart.title }}</h3>
              </div>
              <span class="chart-category">{{ chart.category }}</span>
            </div>
            <p class="chart-description">{{ chart.description }}</p>
            <div class="chart-container" [id]="'viz-' + chart.id"></div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .charts-demo-container {
      padding: 24px;
      max-width: 1600px;
      margin: 0 auto;
      color: #e2e8f0;
    }

    .charts-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
      border: 2px solid rgba(59, 130, 246, 0.3);
      border-radius: 16px;
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon {
      font-size: 48px;
    }

    .header-info h1 {
      font-size: 24px;
      font-weight: 700;
      color: #fff;
      margin: 0 0 4px;
    }

    .header-info p {
      font-size: 14px;
      color: #94a3b8;
      margin: 0;
    }

    .header-stats {
      display: flex;
      gap: 16px;
    }

    .stat-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 20px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 12px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #3b82f6;
    }

    .stat-label {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 4px;
    }

    .feature-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      font-size: 13px;
      color: #94a3b8;
    }

    .category-filter {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .filter-btn {
      padding: 10px 20px;
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      color: #94a3b8;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .filter-btn:hover {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
      color: #fff;
    }

    .filter-btn.active {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-color: transparent;
      color: #fff;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
      gap: 24px;
    }

    .chart-card {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 16px;
      padding: 20px;
      transition: all 0.3s;
    }

    .chart-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
      border-color: rgba(59, 130, 246, 0.3);
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .chart-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .chart-icon {
      font-size: 24px;
    }

    .chart-title h3 {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }

    .chart-category {
      padding: 4px 12px;
      background: rgba(59, 130, 246, 0.2);
      border-radius: 12px;
      color: #3b82f6;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .chart-description {
      font-size: 13px;
      color: #94a3b8;
      margin: 0 0 16px;
    }

    .chart-container {
      width: 100%;
      height: 300px;
      background: rgba(15, 23, 42, 0.6);
      border-radius: 12px;
      overflow: hidden;
    }

    .chart-container :deep(vega-embed) {
      width: 100%;
      height: 100%;
    }

    .chart-container :deep(vega-embed summary) {
      display: none;
    }

    @media (max-width: 768px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class VegaChartsDemoComponent implements OnInit, AfterViewInit {
  readonly selectedCategory = signal<'all' | 'basic' | 'advanced' | 'interactive'>('all');
  readonly charts = signal<ChartSpec[]>([]);
  readonly filteredCharts = signal<ChartSpec[]>([]);

  private chartsInitialized = false;

  ngOnInit(): void {
    this.initializeCharts();
  }

  ngAfterViewInit(): void {
    this.renderCharts();
  }

  private initializeCharts(): void {
    const sampleData = {
      values: [
        { category: 'A', value: 28 },
        { category: 'B', value: 55 },
        { category: 'C', value: 43 },
        { category: 'D', value: 91 },
        { category: 'E', value: 81 },
        { category: 'F', value: 53 },
        { category: 'G', value: 19 },
        { category: 'H', value: 87 },
      ],
    };

    const timeSeriesData = {
      values: [
        { date: '2024-01', value: 100 },
        { date: '2024-02', value: 120 },
        { date: '2024-03', value: 85 },
        { date: '2024-04', value: 145 },
        { date: '2024-05', value: 165 },
        { date: '2024-06', value: 130 },
        { date: '2024-07', value: 190 },
        { date: '2024-08', value: 210 },
      ],
    };

    const multiSeriesData = {
      values: [
        { date: '2024-01', series: 'A', value: 100 },
        { date: '2024-01', series: 'B', value: 80 },
        { date: '2024-02', series: 'A', value: 120 },
        { date: '2024-02', series: 'B', value: 95 },
        { date: '2024-03', series: 'A', value: 85 },
        { date: '2024-03', series: 'B', value: 110 },
        { date: '2024-04', series: 'A', value: 145 },
        { date: '2024-04', series: 'B', value: 125 },
      ],
    };

    const chartSpecs: ChartSpec[] = [
      // Basic Charts
      {
        id: 'bar-chart',
        title: 'Bar Chart',
        icon: '📊',
        description: 'Simple vertical bar chart for categorical data',
        category: 'basic',
        spec: {
          $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
          data: sampleData,
          mark: { type: 'bar', cornerRadius: 4 },
          encoding: {
            x: { field: 'category', type: 'ordinal', axis: { labelAngle: 0 } },
            y: { field: 'value', type: 'quantitative', axis: { grid: true } },
            color: { field: 'value', type: 'quantitative', scale: { scheme: 'blues' } },
            tooltip: [{ field: 'category' }, { field: 'value' }],
          },
        },
      },
      {
        id: 'line-chart',
        title: 'Line Chart',
        icon: '📈',
        description: 'Time series line chart with smooth curves',
        category: 'basic',
        spec: {
          $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
          data: timeSeriesData,
          mark: { type: 'line', strokeWidth: 3, point: true },
          encoding: {
            x: { field: 'date', type: 'temporal', axis: { format: '%Y-%m' } },
            y: { field: 'value', type: 'quantitative', axis: { grid: true } },
            color: { value: '#3b82f6' },
            tooltip: [{ field: 'date' }, { field: 'value' }],
          },
        },
      },
      {
        id: 'scatter-plot',
        title: 'Scatter Plot',
        icon: '⚬',
        description: 'Scatter plot for correlation analysis',
        category: 'basic',
        spec: {
          $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
          data: {
            values: [
              { x: 1, y: 5 }, { x: 2, y: 8 }, { x: 3, y: 12 },
              { x: 4, y: 15 }, { x: 5, y: 18 }, { x: 6, y: 22 },
              { x: 7, y: 25 }, { x: 8, y: 28 }, { x: 9, y: 32 },
            ],
          },
          mark: { type: 'point', filled: true, size: 100 },
          encoding: {
            x: { field: 'x', type: 'quantitative', axis: { grid: true } },
            y: { field: 'y', type: 'quantitative', axis: { grid: true } },
            color: { field: 'y', type: 'quantitative', scale: { scheme: 'viridis' } },
            tooltip: [{ field: 'x' }, { field: 'y' }],
          },
        },
      },
      {
        id: 'pie-chart',
        title: 'Pie Chart',
        icon: '🥧',
        description: 'Pie chart for proportion visualization',
        category: 'basic',
        spec: {
          $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
          data: sampleData,
          mark: { type: 'arc', innerRadius: 50, stroke: '#1e293b', strokeWidth: 2 },
          encoding: {
            theta: { field: 'value', type: 'quantitative', scale: { domain: [0, 100] } },
            color: { field: 'category', type: 'nominal', scale: { scheme: 'category10' } },
            tooltip: [{ field: 'category' }, { field: 'value' }],
          },
        },
      },
      // Advanced Charts
      {
        id: 'area-chart',
        title: 'Area Chart',
        icon: '📊',
        description: 'Stacked area chart for cumulative trends',
        category: 'advanced',
        spec: {
          $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
          data: multiSeriesData,
          mark: { type: 'area', line: true },
          encoding: {
            x: { field: 'date', type: 'temporal', axis: { format: '%Y-%m' } },
            y: { field: 'value', type: 'quantitative', stack: 'zero' },
            color: { field: 'series', type: 'nominal', scale: { scheme: 'set2' } },
            tooltip: [{ field: 'date' }, { field: 'series' }, { field: 'value' }],
          },
        },
      },
      {
        id: 'heatmap',
        title: 'Heat Map',
        icon: '🔥',
        description: 'Heat map for matrix data visualization',
        category: 'advanced',
        spec: {
          $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
          data: {
            values: [
              { x: 'A', y: 1, value: 10 }, { x: 'A', y: 2, value: 20 }, { x: 'A', y: 3, value: 30 },
              { x: 'B', y: 1, value: 15 }, { x: 'B', y: 2, value: 25 }, { x: 'B', y: 3, value: 35 },
              { x: 'C', y: 1, value: 20 }, { x: 'C', y: 2, value: 30 }, { x: 'C', y: 3, value: 40 },
              { x: 'D', y: 1, value: 25 }, { x: 'D', y: 2, value: 35 }, { x: 'D', y: 3, value: 45 },
            ],
          },
          mark: 'rect',
          encoding: {
            x: { field: 'x', type: 'ordinal' },
            y: { field: 'y', type: 'ordinal' },
            color: { field: 'value', type: 'quantitative', scale: { scheme: 'oranges' } },
            tooltip: [{ field: 'x' }, { field: 'y' }, { field: 'value' }],
          },
        },
      },
      {
        id: 'histogram',
        title: 'Histogram',
        icon: '📊',
        description: 'Histogram for distribution analysis',
        category: 'advanced',
        spec: {
          $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
          data: {
            values: Array.from({ length: 100 }, () => ({
              value: Math.floor(Math.random() * 100),
            })),
          },
          mark: { type: 'bar', cornerRadius: 2 },
          encoding: {
            x: {
              field: 'value',
              type: 'quantitative',
              bin: { maxbins: 20 },
              axis: { grid: true },
            },
            y: { field: '*', type: 'quantitative', aggregate: 'count', axis: { grid: true } },
            color: { value: '#8b5cf6' },
            tooltip: [{ field: 'value', bin: true }, { field: '*', aggregate: 'count' }],
          },
        },
      },
      {
        id: 'box-plot',
        title: 'Box Plot',
        icon: '📦',
        description: 'Box plot for statistical distribution',
        category: 'advanced',
        spec: {
          $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
          data: {
            values: Array.from({ length: 200 }, () => ({
              category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
              value: Math.random() * 100,
            })),
          },
          mark: 'boxplot',
          encoding: {
            x: { field: 'category', type: 'ordinal' },
            y: { field: 'value', type: 'quantitative' },
            color: { field: 'category', type: 'nominal' },
            tooltip: [{ field: 'category' }, { field: 'value' }],
          },
        },
      },
      // Interactive Charts
      {
        id: 'interactive-bar',
        title: 'Interactive Bar',
        icon: '🖱️',
        description: 'Bar chart with hover and selection',
        category: 'interactive',
        spec: {
          $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
          data: sampleData,
          mark: { type: 'bar', cornerRadius: 4 },
          params: [
            {
              name: 'highlight',
              select: { type: 'point', fields: ['category'], on: 'mouseover' },
            },
          ],
          encoding: {
            x: { field: 'category', type: 'ordinal', axis: { labelAngle: 0 } },
            y: { field: 'value', type: 'quantitative' },
            color: {
              condition: { param: 'highlight', field: 'value', type: 'quantitative' },
              value: '#cbd5e1',
            },
            tooltip: [{ field: 'category' }, { field: 'value' }],
          },
        },
      },
      {
        id: 'brush-select',
        title: 'Brush Selection',
        icon: '🖌️',
        description: 'Scatter plot with brush selection',
        category: 'interactive',
        spec: {
          $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
          data: {
            values: Array.from({ length: 100 }, () => ({
              x: Math.random() * 100,
              y: Math.random() * 100,
            })),
          },
          mark: { type: 'point', filled: true },
          params: [
            {
              name: 'brush',
              select: { type: 'interval', encodings: ['x', 'y'] },
            },
          ],
          encoding: {
            x: { field: 'x', type: 'quantitative' },
            y: { field: 'y', type: 'quantitative' },
            color: {
              condition: { param: 'brush', value: '#3b82f6' },
              value: '#cbd5e1',
            },
            tooltip: [{ field: 'x' }, { field: 'y' }],
          },
        },
      },
      {
        id: 'zoom-pan',
        title: 'Zoom & Pan',
        icon: '🔍',
        description: 'Line chart with zoom and pan',
        category: 'interactive',
        spec: {
          $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
          data: timeSeriesData,
          mark: { type: 'line', strokeWidth: 3 },
          params: [
            {
              name: 'grid',
              select: 'interval',
              bind: 'scales',
            },
          ],
          encoding: {
            x: { field: 'date', type: 'temporal', axis: { format: '%Y-%m' } },
            y: { field: 'value', type: 'quantitative' },
            color: { value: '#10b981' },
            tooltip: [{ field: 'date' }, { field: 'value' }],
          },
        },
      },
      {
        id: 'tooltip-chart',
        title: 'Rich Tooltips',
        icon: '💬',
        description: 'Chart with enhanced tooltips',
        category: 'interactive',
        spec: {
          $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
          data: multiSeriesData,
          mark: { type: 'line', point: true },
          encoding: {
            x: { field: 'date', type: 'temporal' },
            y: { field: 'value', type: 'quantitative' },
            color: { field: 'series', type: 'nominal' },
            tooltip: [
              { field: 'date', type: 'temporal', format: '%Y-%m' },
              { field: 'series', type: 'nominal' },
              { field: 'value', type: 'quantitative', format: '.2f' },
            ],
          },
        },
      },
    ];

    this.charts.set(chartSpecs);
    this.filterCharts();
  }

  private filterCharts(): void {
    const category = this.selectedCategory();
    const allCharts = this.charts();

    if (category === 'all') {
      this.filteredCharts.set(allCharts);
    } else {
      this.filteredCharts.set(allCharts.filter(c => c.category === category));
    }
  }

  private async renderCharts(): Promise<void> {
    if (this.chartsInitialized) return;
    this.chartsInitialized = true;

    // Wait for DOM to be ready
    await new Promise(resolve => setTimeout(resolve, 100));

    const charts = this.filteredCharts();
    for (const chart of charts) {
      const container = document.getElementById(`viz-${chart.id}`);
      if (container) {
        try {
          await embed(container, chart.spec, {
            actions: { export: true, source: false, compiled: false },
            renderer: 'svg',
          });
        } catch (error) {
          console.error(`Failed to render chart ${chart.id}:`, error);
        }
      }
    }
  }
}
