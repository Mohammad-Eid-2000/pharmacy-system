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
  { path: '**', redirectTo: 'medicines' },
];
