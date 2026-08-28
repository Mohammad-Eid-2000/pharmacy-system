import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { I18nService, Lang } from '../core/i18n/i18n.service';

@Component({
  selector: 'app-layout',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="app-layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <span class="logo-mark" aria-hidden="true">🏥</span>
          <h1>{{ i18n.t('app.title') }}</h1>
        </div>
        <nav class="sidebar-nav">
          <a routerLink="/medicines" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">💊</span>{{ i18n.t('nav.medicines') }}
          </a>
          <a routerLink="/inventory" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">📦</span>{{ i18n.t('nav.inventory') }}
          </a>
          <a routerLink="/pos" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">🛒</span>{{ i18n.t('nav.pos') }}
          </a>
          <a routerLink="/purchases" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">📋</span>{{ i18n.t('nav.purchases') }}
          </a>
          <a routerLink="/reports" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">📊</span>{{ i18n.t('nav.reports') }}
          </a>
        </nav>
      </aside>

      <main class="main-content">
        <header class="top-bar">
          <h2>{{ i18n.t('app.subtitle') }}</h2>
          <div class="top-bar-actions">
            <div class="lang-switch" role="group" [attr.aria-label]="i18n.t('app.language')">
              @for (option of languages; track option.code) {
                <button
                  type="button"
                  class="lang-btn"
                  [class.active]="i18n.lang() === option.code"
                  [attr.aria-pressed]="i18n.lang() === option.code"
                  (click)="i18n.setLang(option.code)"
                >
                  {{ option.label }}
                </button>
              }
            </div>
            <span class="user-info">{{ i18n.t('app.greeting') }}</span>
          </div>
        </header>
        <div class="content">
          <ng-content />
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      .app-layout {
        display: flex;
        min-height: 100vh;
      }
      .sidebar {
        width: 280px;
        flex-shrink: 0;
        background: var(--color-surface);
        /* Logical property: sits on the correct side in both RTL and LTR. */
        border-inline-end: 1px solid var(--color-border);
        padding: var(--space-6);
      }
      .sidebar-header {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin-bottom: var(--space-6);
      }
      .logo-mark {
        font-size: 1.5rem;
      }
      .sidebar-header h1 {
        font-size: 1.25rem;
        color: var(--color-primary);
      }
      .sidebar-nav {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .nav-item {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-md);
        text-decoration: none;
        color: var(--color-text);
        transition: background 0.18s ease;
      }
      .nav-item:hover {
        background: var(--color-bg);
      }
      .nav-item.active {
        background: var(--color-primary);
        color: #fff;
      }
      .nav-icon {
        font-size: 1.05rem;
      }
      .main-content {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .top-bar {
        background: var(--color-surface);
        padding: var(--space-4) var(--space-6);
        border-bottom: 1px solid var(--color-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-4);
        flex-wrap: wrap;
      }
      .top-bar h2 {
        font-size: 1.125rem;
      }
      .top-bar-actions {
        display: flex;
        align-items: center;
        gap: var(--space-4);
      }
      .user-info {
        color: var(--color-text-muted);
        font-size: 0.9375rem;
      }
      .lang-switch {
        display: inline-flex;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        overflow: hidden;
      }
      .lang-btn {
        padding: 0.375rem 0.875rem;
        border: none;
        background: var(--color-surface);
        color: var(--color-text-muted);
        font: inherit;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.18s ease, color 0.18s ease;
      }
      .lang-btn:not(:last-child) {
        border-inline-end: 1px solid var(--color-border);
      }
      .lang-btn:hover {
        background: var(--color-bg);
      }
      .lang-btn.active {
        background: var(--color-primary);
        color: #fff;
      }
      .content {
        flex: 1;
        padding: var(--space-6);
        overflow-y: auto;
      }
      @media (max-width: 720px) {
        .app-layout {
          flex-direction: column;
        }
        .sidebar {
          width: 100%;
          border-inline-end: none;
          border-block-end: 1px solid var(--color-border);
        }
      }
    `,
  ],
})
export class LayoutComponent {
  protected readonly i18n = inject(I18nService);

  protected readonly languages: ReadonlyArray<{ code: Lang; label: string }> = [
    { code: 'ar', label: 'العربية' },
    { code: 'en', label: 'English' },
  ];
}
