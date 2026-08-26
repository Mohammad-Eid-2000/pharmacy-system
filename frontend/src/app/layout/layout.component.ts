import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="app-layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <h1>🏥 نظام الصيدلية</h1>
        </div>
        <nav class="sidebar-nav">
          <a routerLink="/medicines" routerLinkActive="active" class="nav-item">💊 الأدوية</a>
          <a routerLink="/inventory" routerLinkActive="active" class="nav-item">📦 المخزون</a>
          <a routerLink="/pos" routerLinkActive="active" class="nav-item">🛒 نقطة البيع</a>
          <a routerLink="/purchases" routerLinkActive="active" class="nav-item">📋 المشتريات</a>
          <a routerLink="/reports" routerLinkActive="active" class="nav-item">📊 التقارير</a>
        </nav>
      </aside>
      <main class="main-content">
        <header class="top-bar">
          <h2>نظام إدارة الصيدلية</h2>
          <div class="user-info"><span>مرحباً، صيدلي</span></div>
        </header>
        <div class="content"><ng-content></ng-content></div>
      </main>
    </div>
  `,
  styles: [`
    .app-layout { display: flex; min-height: 100vh; }
    .sidebar { width: 280px; background: white; border-left: 1px solid #d4d1ca; padding: var(--space-6); }
    .sidebar-header h1 { font-size: 1.25rem; margin-bottom: var(--space-6); color: var(--color-primary); }
    .sidebar-nav { display: flex; flex-direction: column; gap: var(--space-2); }
    .nav-item { padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); text-decoration: none; color: var(--color-text); transition: background 0.18s; }
    .nav-item:hover { background: var(--color-bg); }
    .nav-item.active { background: var(--color-primary); color: white; }
    .main-content { flex: 1; display: flex; flex-direction: column; }
    .top-bar { background: white; padding: var(--space-4) var(--space-6); border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; }
    .content { flex: 1; padding: var(--space-6); overflow-y: auto; }
  `]
})
export class LayoutComponent {}
