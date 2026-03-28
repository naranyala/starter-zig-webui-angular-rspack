import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent, DataTableConfig } from '../shared/data-table.component';

@Component({
  selector: 'app-duckdb-products',
  standalone: true,
  imports: [CommonModule, DataTableComponent],
  template: `
    <app-data-table
      [config]="productConfig"
      [items]="items"
      (statsChange)="onStatsUpdate($event)"
    ></app-data-table>
  `
})
export class DuckdbProductsComponent {
  @Input() items: any[] = [];
  @Output() statsChange = new EventEmitter<{ type: string; count: number }>();

  productConfig: DataTableConfig = {
    entityName: 'Product',
    entityNamePlural: 'Products',
    icon: '📦',
    columns: [
      { key: 'id', label: 'ID', width: '60px' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'price', label: 'Price' },
      { key: 'stock', label: 'Stock' },
      { key: 'category', label: 'Category' },
      { key: 'created_at', label: 'Created', type: 'date' },
      { key: 'actions', label: 'Actions', type: 'actions' }
    ],
    formFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'price', label: 'Price', type: 'number' },
      { key: 'stock', label: 'Stock', type: 'number' },
      { key: 'category', label: 'Category', type: 'select', options: [
        { value: 'Electronics', label: 'Electronics' },
        { value: 'Clothing', label: 'Clothing' },
        { value: 'Books', label: 'Books' },
        { value: 'Home', label: 'Home' },
        { value: 'Sports', label: 'Sports' },
        { value: 'Other', label: 'Other' }
      ]}
    ]
  };

  onStatsUpdate(event: { type: string; count: number }): void {
    this.statsChange.emit(event);
  }
}
