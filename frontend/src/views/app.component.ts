import { Component, OnInit } from '@angular/core';
import { DashboardComponent } from './dashboard/dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DashboardComponent],
  template: `
    <app-dashboard />
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100%;
      overflow: hidden;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    }
  `]
})
export class AppComponent implements OnInit {
  ngOnInit(): void {
    console.log('DuckDB Dashboard Application Initialized');
  }
}
