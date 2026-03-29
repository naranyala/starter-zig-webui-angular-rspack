import { Routes } from '@angular/router';
import { DashboardComponent } from './views/dashboard/dashboard.component';
import { DocsHomeComponent } from './views/docs/docs-home.component';
import { DocsViewerComponent } from './views/docs/docs-viewer.component';

export const APP_ROUTES: Routes = [
  {
    path: '',
    component: DashboardComponent,
    title: 'Dashboard'
  },
  {
    path: 'docs',
    children: [
      {
        path: '',
        component: DocsHomeComponent,
        title: 'Documentation'
      },
      {
        path: ':groupId/:sectionId',
        component: DocsViewerComponent,
        title: 'Documentation Viewer'
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
