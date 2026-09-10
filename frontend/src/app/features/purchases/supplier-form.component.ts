import { Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import {
  CreateSupplierPayload,
  PurchaseSaveError,
  PurchasesService,
  Supplier,
  UpdateSupplierPayload,
} from './purchases.service';

interface SupplierForm {
  nameAr: string;
  nameEn: string;
  taxId: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  notes: string;
  isActive: boolean;
}

function emptyForm(): SupplierForm {
  return {
    nameAr: '',
    nameEn: '',
    taxId: '',
    phone: '',
    mobile: '',
    email: '',
    address: '',
    city: '',
    notes: '',
    isActive: true,
  };
}

function toForm(supplier: Supplier | null): SupplierForm {
  if (!supplier) return emptyForm();
  return {
    nameAr: supplier.nameAr,
    nameEn: supplier.nameEn,
    taxId: supplier.taxId ?? '',
    phone: supplier.phone ?? '',
    mobile: supplier.mobile ?? '',
    email: supplier.email ?? '',
    address: supplier.address ?? '',
    city: supplier.city ?? '',
    notes: supplier.notes ?? '',
    isActive: supplier.isActive,
  };
}

@Component({
  selector: 'app-supplier-form',
  imports: [FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-content" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ i18n.t(supplier() ? 'supplierForm.editTitle' : 'supplierForm.addTitle') }}</h2>
          <button class="btn btn-link" (click)="close.emit()" [attr.aria-label]="i18n.t('action.close')">✕</button>
        </div>

        <form (ngSubmit)="onSubmit()">
          @if (errorKey(); as key) {
            <p class="form-error">
              {{ i18n.t(key) }}
              @if (errorDetail(); as detail) {
                <span class="form-error-detail">{{ detail }}</span>
              }
            </p>
          }

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="sp-name-ar">{{ i18n.t('supplier.nameAr') }} *</label>
              <input
                id="sp-name-ar"
                type="text"
                class="form-input"
                required
                [ngModel]="form().nameAr"
                (ngModelChange)="patch({ nameAr: $event })"
                name="nameAr"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="sp-name-en">{{ i18n.t('supplier.nameEn') }}</label>
              <input
                id="sp-name-en"
                type="text"
                class="form-input"
                [ngModel]="form().nameEn"
                (ngModelChange)="patch({ nameEn: $event })"
                name="nameEn"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="sp-tax">{{ i18n.t('supplier.taxId') }}</label>
              <input
                id="sp-tax"
                type="text"
                class="form-input"
                [ngModel]="form().taxId"
                (ngModelChange)="patch({ taxId: $event })"
                name="taxId"
              />
              <span class="form-hint">{{ i18n.t('supplier.taxIdHint') }}</span>
            </div>
            <div class="form-group">
              <label class="form-label" for="sp-mobile">{{ i18n.t('supplier.mobile') }}</label>
              <input
                id="sp-mobile"
                type="tel"
                class="form-input"
                [ngModel]="form().mobile"
                (ngModelChange)="patch({ mobile: $event })"
                name="mobile"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="sp-phone">{{ i18n.t('supplier.phone') }}</label>
              <input
                id="sp-phone"
                type="tel"
                class="form-input"
                [ngModel]="form().phone"
                (ngModelChange)="patch({ phone: $event })"
                name="phone"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="sp-email">{{ i18n.t('supplier.email') }}</label>
              <input
                id="sp-email"
                type="email"
                class="form-input"
                [ngModel]="form().email"
                (ngModelChange)="patch({ email: $event })"
                name="email"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="sp-city">{{ i18n.t('supplier.city') }}</label>
              <input
                id="sp-city"
                type="text"
                class="form-input"
                [ngModel]="form().city"
                (ngModelChange)="patch({ city: $event })"
                name="city"
              />
            </div>
            <div class="form-group span-2">
              <label class="form-label" for="sp-address">{{ i18n.t('supplier.address') }}</label>
              <input
                id="sp-address"
                type="text"
                class="form-input"
                [ngModel]="form().address"
                (ngModelChange)="patch({ address: $event })"
                name="address"
              />
            </div>
            <div class="form-group span-2">
              <label class="form-label" for="sp-notes">{{ i18n.t('supplier.notes') }}</label>
              <textarea
                id="sp-notes"
                rows="3"
                class="form-input"
                [ngModel]="form().notes"
                (ngModelChange)="patch({ notes: $event })"
                name="notes"
              ></textarea>
            </div>
            @if (supplier()) {
              <div class="form-group">
                <label class="form-label checkbox-label">
                  <input
                    type="checkbox"
                    name="isActive"
                    [ngModel]="form().isActive"
                    (ngModelChange)="patch({ isActive: $event })"
                  />
                  {{ i18n.t('supplier.active') }}
                </label>
              </div>
            }
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="close.emit()">
              {{ i18n.t('action.cancel') }}
            </button>
            <button type="submit" class="btn btn-primary" [disabled]="saving()">
              {{ saving() ? i18n.t('state.saving') : i18n.t(supplier() ? 'action.update' : 'action.add') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-4);
        z-index: 50;
      }
      .modal-content {
        background: var(--color-surface);
        border-radius: var(--radius-lg);
        width: 100%;
        max-width: 720px;
        max-height: 90vh;
        overflow-y: auto;
        padding: var(--space-6);
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-4);
        margin-bottom: var(--space-6);
      }
      .modal-header h2 {
        font-size: 1.25rem;
        color: var(--color-primary);
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-4);
      }
      .span-2 {
        grid-column: 1 / -1;
      }
      @media (max-width: 560px) {
        .form-grid {
          grid-template-columns: 1fr;
        }
      }
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        cursor: pointer;
      }
      .form-hint {
        font-size: 0.8125rem;
        color: var(--color-text-muted);
        margin-top: var(--space-1);
      }
      .form-error {
        margin-top: var(--space-4);
        padding: var(--space-3);
        border: 1px solid var(--color-danger);
        border-radius: var(--radius-md);
        color: var(--color-danger);
        background: #fdeceb;
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }
      .form-error-detail {
        font-size: 0.8125rem;
        opacity: 0.85;
        /* Server details are English. Isolating them keeps trailing punctuation
           from jumping to the front when the UI is right-to-left. */
        direction: ltr;
        unicode-bidi: isolate;
        text-align: start;
      }
      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-3);
        margin-top: var(--space-6);
      }
    `,
  ],
})
export class SupplierFormComponent {
  protected readonly i18n = inject(I18nService);
  private readonly service = inject(PurchasesService);

  readonly supplier = input<Supplier | null>(null);
  readonly close = output<void>();
  readonly saved = output<void>();

  /**
   * Derived from the input rather than the constructor: input signals are not
   * populated at construction time, so reading `supplier()` there would always
   * yield null and silently break edit mode.
   */
  protected readonly form = linkedSignal<SupplierForm>(() => toForm(this.supplier()));

  protected readonly saving = signal(false);
  protected readonly errorKey = signal<TranslationKey | null>(null);
  protected readonly errorDetail = signal<string | null>(null);

  protected onSubmit(): void {
    const form = this.form();
    if (!form.nameAr.trim()) return;
    if (this.saving()) return;

    this.saving.set(true);
    this.errorKey.set(null);
    this.errorDetail.set(null);

    // A union of Observable<number> and Observable<void> cannot be subscribed,
    // so the result is widened to a single observable type the callback ignores.
    const result: Observable<unknown> = this.supplier()
      ? this.service.updateSupplier(toUpdatePayload(this.supplier()!.id, form))
      : this.service.createSupplier(toCreatePayload(form));

    result.subscribe({
      next: () => this.saved.emit(),
      error: (err: PurchaseSaveError) => {
        this.saving.set(false);
        this.errorKey.set(errorKeyFor(err));
        this.errorDetail.set(err.detail ?? null);
      },
    });
  }

  protected patch(patch: Partial<SupplierForm>): void {
    this.form.update(f => ({ ...f, ...patch }));
  }
}

function toCreatePayload(form: SupplierForm): CreateSupplierPayload {
  return {
    // The API treats a blank English name as absent (Trim → empty), so a plain
    // string is safe here; only the truly optional free-text fields go to null.
    nameAr: form.nameAr.trim(),
    nameEn: form.nameEn.trim(),
    taxId: blankToNull(form.taxId),
    phone: blankToNull(form.phone),
    mobile: blankToNull(form.mobile),
    email: blankToNull(form.email),
    address: blankToNull(form.address),
    city: blankToNull(form.city),
    notes: blankToNull(form.notes),
  };
}

function toUpdatePayload(id: number, form: SupplierForm): UpdateSupplierPayload {
  return { id, isActive: form.isActive, ...toCreatePayload(form) };
}

function blankToNull(value: string): string | null {
  return value.trim() ? value.trim() : null;
}

function errorKeyFor(err: PurchaseSaveError): TranslationKey {
  switch (err.reason) {
    case 'duplicateSupplier':
      return 'supplierForm.duplicate';
    case 'invalid':
      return 'supplierForm.invalid';
    default:
      return 'supplierForm.failed';
  }
}