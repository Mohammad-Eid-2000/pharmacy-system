import { Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-inventory-list',
  template: `
    <div class="page-header">
      <h1>{{ i18n.t('inventory.title') }}</h1>
    </div>
    <p class="placeholder">{{ i18n.t('state.comingSoon') }}</p>
  `,
  styles: [`
    .page-header { margin-bottom: var(--space-6); }
    .page-header h1 { font-size: 1.5rem; color: var(--color-primary); }
    .placeholder {
      padding: var(--space-6);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      color: var(--color-text-muted);
    }
  `],
})
export class InventoryListComponent {
  protected readonly i18n = inject(I18nService);
}
