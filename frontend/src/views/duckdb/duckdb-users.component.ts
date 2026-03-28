import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent, DataTableConfig } from '../shared/data-table.component';

@Component({
  selector: 'app-duckdb-users',
  standalone: true,
  imports: [CommonModule, DataTableComponent],
  template: `
    <app-data-table
      [config]="userConfig"
      [items]="items"
      (statsChange)="onStatsUpdate($event)"
    ></app-data-table>
  `
})
export class DuckdbUsersComponent {
  @Input() items: any[] = [];
  @Output() statsChange = new EventEmitter<{ type: string; count: number }>();

  userConfig: DataTableConfig = {
    entityName: 'User',
    entityNamePlural: 'Users',
    icon: '👥',
    columns: [
      { key: 'id', label: 'ID', width: '60px' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'created_at', label: 'Created', type: 'date' },
      { key: 'actions', label: 'Actions', type: 'actions' }
    ],
    formFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'role', label: 'Role', type: 'select', options: [
        { value: 'User', label: 'User' },
        { value: 'Admin', label: 'Admin' },
        { value: 'Manager', label: 'Manager' }
      ]},
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'Active', label: 'Active' },
        { value: 'Inactive', label: 'Inactive' }
      ]}
    ]
  };

  onStatsUpdate(event: { type: string; count: number }): void {
    this.statsChange.emit(event);
  }
}
