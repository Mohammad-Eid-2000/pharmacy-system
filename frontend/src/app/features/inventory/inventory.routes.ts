import { Routes } from '@angular/router';
import { Component } from '@angular/core';

export const INVENTORY_ROUTES: Routes = [
  { path: '', component: InventoryListComponent }
];

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  template: `<h1>إدارة المخزون - قريباً</h1>`
})
export class InventoryListComponent {}
