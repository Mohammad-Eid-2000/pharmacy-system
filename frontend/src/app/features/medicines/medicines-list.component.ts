import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { Medicine, MedicinesService } from './medicines.service';
import { MedicinesFormComponent } from './medicines-form.component';

@Component({
  selector: 'app-medicines-list',
  imports: [FormsModule, MedicinesFormComponent],
  template: `
    <div class="page-header">
      <h1>{{ i18n.t('medicines.title') }}</h1>
      <button class="btn btn-primary" (click)="openCreate()">+ {{ i18n.t('medicines.new') }}</button>
    </div>

    <div class="toolbar">
      <input
        type="search"
        class="form-input search-input"
        [placeholder]="i18n.t('medicines.searchPlaceholder')"
        [ngModel]="searchTerm()"
        (ngModelChange)="onSearch($event)"
      />
    </div>

    @if (service.loading()) {
      <p class="state-message">{{ i18n.t('state.loading') }}</p>
    } @else if (service.error()) {
      <div class="state-message error">
        <span>{{ service.error() }}</span>
        <button class="btn btn-secondary" (click)="reload()">{{ i18n.t('action.retry') }}</button>
      </div>
    } @else if (page().items.length === 0) {
      <p class="state-message">{{ i18n.t('medicines.empty') }}</p>
    } @else {
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>{{ i18n.t('medicine.name') }}</th>
              <th>{{ i18n.t('medicine.barcode') }}</th>
              <th>{{ i18n.t('medicine.form') }}</th>
              <th>{{ i18n.t('medicine.strength') }}</th>
              <th>{{ i18n.t('medicine.manufacturer') }}</th>
              <th>{{ i18n.t('medicine.status') }}</th>
              <th>{{ i18n.t('medicine.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (medicine of page().items; track medicine.id) {
              <tr>
                <td>
                  <span class="medicine-name">{{ i18n.localized(medicine.nameAr, medicine.nameEn) }}</span>
                  @if (medicine.isControlled) {
                    <span class="badge badge-warning">{{ i18n.t('medicine.controlledShort') }}</span>
                  }
                </td>
                <td class="numeric">{{ medicine.barcode }}</td>
                <td>{{ dosageForm(medicine.form) }}</td>
                <td class="numeric">{{ medicine.strength || '—' }}</td>
                <td>{{ medicine.manufacturer || '—' }}</td>
                <td>
                  <span class="badge" [class.badge-success]="medicine.isActive" [class.badge-muted]="!medicine.isActive">
                    {{ medicine.isActive ? i18n.t('medicine.active') : i18n.t('medicine.inactive') }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-link" (click)="openEdit(medicine)">{{ i18n.t('action.edit') }}</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <span class="pagination-info">{{ i18n.t('pagination.total', { count: page().totalCount }) }}</span>
        <div class="pagination-controls">
          <button class="btn btn-secondary" [disabled]="page().page <= 1" (click)="goToPage(page().page - 1)">
            {{ i18n.t('pagination.previous') }}
          </button>
          <span class="pagination-info">
            {{ i18n.t('pagination.page', { page: page().page, total: page().totalPages || 1 }) }}
          </span>
          <button
            class="btn btn-secondary"
            [disabled]="page().page >= page().totalPages"
            (click)="goToPage(page().page + 1)"
          >
            {{ i18n.t('pagination.next') }}
          </button>
        </div>
      </div>
    }

    @if (formOpen()) {
      <app-medicines-form
        [medicine]="selected()"
        (close)="closeForm()"
        (saved)="onSaved()"
      />
    }
  `,
  styles: [
    `
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-4);
        flex-wrap: wrap;
        margin-bottom: var(--space-6);
      }
      .page-header h1 {
        font-size: 1.5rem;
        color: var(--color-primary);
      }
      .toolbar {
        margin-bottom: var(--space-4);
      }
      .search-input {
        max-width: 380px;
      }
      .table-wrapper {
        overflow-x: auto;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
      }
      .medicine-name {
        font-weight: 600;
      }
      .state-message {
        padding: var(--space-6);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        color: var(--color-text-muted);
        display: flex;
        align-items: center;
        gap: var(--space-4);
        flex-wrap: wrap;
      }
      .state-message.error {
        color: var(--color-danger);
        border-color: var(--color-danger);
      }
      .pagination {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-4);
        flex-wrap: wrap;
        margin-top: var(--space-4);
      }
      .pagination-controls {
        display: flex;
        align-items: center;
        gap: var(--space-3);
      }
      .pagination-info {
        color: var(--color-text-muted);
        font-size: 0.9375rem;
      }
    `,
  ],
})
export class MedicinesListComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  protected readonly service = inject(MedicinesService);

  protected readonly page = this.service.medicines;
  protected readonly searchTerm = signal('');
  protected readonly formOpen = signal(false);
  protected readonly selected = signal<Medicine | null>(null);

  private searchDebounce?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.reload();
  }

  protected reload(page = 1): void {
    this.service.loadMedicines(this.searchTerm() || undefined, page);
  }

  protected onSearch(term: string): void {
    this.searchTerm.set(term);
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.reload(), 300);
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.page().totalPages) return;
    this.reload(page);
  }

  /** Translates the stored English dosage-form code into the active language. */
  protected dosageForm(form: string): string {
    if (!form) return '—';
    const key = `form.${form}` as TranslationKey;
    const translated = this.i18n.t(key);
    return translated ?? form;
  }

  protected openCreate(): void {
    this.selected.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(medicine: Medicine): void {
    this.selected.set(medicine);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.selected.set(null);
  }

  protected onSaved(): void {
    this.closeForm();
    this.reload(this.page().page);
  }
}
