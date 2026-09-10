import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'medicines', pathMatch: 'full' },
  {
    path: 'medicines',
    loadChildren: () => import('./features/medicines/medicines.routes').then(m => m.MEDICINES_ROUTES),
  },
  {
    path: 'inventory',
    loadChildren: () => import('./features/inventory/inventory.routes').then(m => m.INVENTORY_ROUTES),
  },
  {
    path: 'pos',
    loadChildren: () => import('./features/pos/pos.routes').then(m => m.POS_ROUTES),
  },
  {
    path: 'purchases',
    loadChildren: () => import('./features/purchases/purchases.routes').then(m => m.PURCHASES_ROUTES),
  },
  {
    path: 'reports',
    loadChildren: () => import('./features/reports/reports.routes').then(m => m.REPORTS_ROUTES),
  },
  { path: '**', redirectTo: 'medicines' },
];
