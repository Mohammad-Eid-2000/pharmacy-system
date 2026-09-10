import { Routes } from '@angular/router';

export const PURCHASES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./purchases-list.component').then(m => m.PurchasesListComponent),
  },
];