import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent, DataTableConfig } from '../shared/data-table.component';

@Component({
  selector: 'app-duckdb-orders',
  standalone: true,
  imports: [CommonModule, DataTableComponent],
  template: `
    <app-data-table
      [config]="orderConfig"
      [items]="items"
      (statsChange)="onStatsUpdate($event)"
    ></app-data-table>
  `
})
export class DuckdbOrdersComponent {
  @Input() items: any[] = [];
  @Output() statsChange = new EventEmitter<{ type: string; count: number }>();

  orderConfig: DataTableConfig = {
    entityName: 'Order',
    entityNamePlural: 'Orders',
    icon: '🛒',
    columns: [
      { key: 'id', label: 'ID', width: '60px' },
      { key: 'customer_name', label: 'Customer' },
      { key: 'product_name', label: 'Product' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'total', label: 'Total' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'created_at', label: 'Created', type: 'date' },
      { key: 'actions', label: 'Actions', type: 'actions' }
    ],
    formFields: [
      { key: 'customer_name', label: 'Customer Name', type: 'text' },
      { key: 'customer_email', label: 'Customer Email', type: 'text' },
      { key: 'product_name', label: 'Product Name', type: 'text' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'total', label: 'Total', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'pending', label: 'Pending' },
        { value: 'processing', label: 'Processing' },
        { value: 'shipped', label: 'Shipped' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancelled', label: 'Cancelled' }
      ]}
    ]
  };

  onStatsUpdate(event: { type: string; count: number }): void {
    this.statsChange.emit(event);
  }
}
