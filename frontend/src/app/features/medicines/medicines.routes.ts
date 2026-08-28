import { Routes } from '@angular/router';

export const MEDICINES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./medicines-list.component').then(m => m.MedicinesListComponent),
  },
];
