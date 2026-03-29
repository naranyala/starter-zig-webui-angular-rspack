import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  template: `
    <router-outlet />
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
    console.log('Application Initialized');
  }
}
