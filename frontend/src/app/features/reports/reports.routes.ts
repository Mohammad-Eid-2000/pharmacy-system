import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./reports-dashboard.component').then(m => m.ReportsDashboardComponent),
  },
];