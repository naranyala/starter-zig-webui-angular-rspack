import { Routes } from '@angular/router';
import { DocsHomeComponent } from './docs-home.component';
import { DocsViewerComponent } from './docs-viewer.component';

export const DOCS_ROUTES: Routes = [
  {
    path: '',
    component: DocsHomeComponent,
    title: 'Documentation Home'
  },
  {
    path: ':groupId/:sectionId',
    component: DocsViewerComponent,
    title: 'Documentation Viewer'
  }
];
