import { Routes } from '@angular/router';

export const POS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pos-terminal.component').then(m => m.PosTerminalComponent),
  },
  {
    path: 'sales',
    loadComponent: () => import('./sales-list.component').then(m => m.SalesListComponent),
  },
];
