import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { Medicine, MedicinesService } from '../medicines/medicines.service';
import { InventoryService, StockSaveError } from './inventory.service';

interface ReceiveForm {
  medicineId: number | null;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  supplierName: string;
  reference: string;
}

function emptyForm(): ReceiveForm {
  return {
    medicineId: null,
    batchNo: '',
    expiryDate: '',
    quantity: 0,
    purchasePrice: 0,
    sellingPrice: 0,
    supplierName: '',
    reference: '',
  };
}

@Component({
  selector: 'app-receive-stock',
  imports: [FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-content" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ i18n.t('receive.title') }}</h2>
          <button class="btn btn-link" (click)="close.emit()" [attr.aria-label]="i18n.t('action.close')">✕</button>
        </div>

        <form (ngSubmit)="onSubmit()">
          <div class="form-grid">
            <div class="form-group span-2">
              <label class="form-label" for="rs-medicine">{{ i18n.t('receive.medicine') }} *</label>
              <select
                id="rs-medicine"
                class="form-input"
                required
                [ngModel]="form().medicineId"
                (ngModelChange)="patch({ medicineId: $event })"
                name="medicineId"
              >
                <option [ngValue]="null">{{ i18n.t('receive.medicinePlaceholder') }}</option>
                @for (m of medicines(); track m.id) {
                  <option [ngValue]="m.id">{{ i18n.localized(m.nameAr, m.nameEn) }} — {{ m.barcode }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="rs-batch">{{ i18n.t('batch.batchNo') }} *</label>
              <input
                id="rs-batch"
                class="form-input"
                required
                [ngModel]="form().batchNo"
                (ngModelChange)="patch({ batchNo: $event })"
                name="batchNo"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="rs-expiry">{{ i18n.t('batch.expiryDate') }} *</label>
              <input
                id="rs-expiry"
                type="date"
                class="form-input"
                required
                [min]="minExpiry"
                [ngModel]="form().expiryDate"
                (ngModelChange)="patch({ expiryDate: $event })"
                name="expiryDate"
              />
              <span class="form-hint">{{ i18n.t('receive.expiryHint') }}</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="rs-qty">{{ i18n.t('batch.quantity') }} *</label>
              <input
                id="rs-qty"
                type="number"
                min="1"
                step="1"
                class="form-input"
                required
                [ngModel]="form().quantity"
                (ngModelChange)="patch({ quantity: $event })"
                name="quantity"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="rs-supplier">{{ i18n.t('batch.supplier') }}</label>
              <input
                id="rs-supplier"
                class="form-input"
                [ngModel]="form().supplierName"
                (ngModelChange)="patch({ supplierName: $event })"
                name="supplierName"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="rs-purchase">{{ i18n.t('batch.purchasePrice') }} *</label>
              <input
                id="rs-purchase"
                type="number"
                min="0"
                step="0.001"
                class="form-input"
                required
                [ngModel]="form().purchasePrice"
                (ngModelChange)="patch({ purchasePrice: $event })"
                name="purchasePrice"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="rs-selling">{{ i18n.t('batch.sellingPrice') }} *</label>
              <input
                id="rs-selling"
                type="number"
                min="0"
                step="0.001"
                class="form-input"
                required
                [ngModel]="form().sellingPrice"
                (ngModelChange)="patch({ sellingPrice: $event })"
                name="sellingPrice"
              />
            </div>

            <div class="form-group span-2">
              <label class="form-label" for="rs-ref">{{ i18n.t('movement.reference') }}</label>
              <input
                id="rs-ref"
                class="form-input"
                [ngModel]="form().reference"
                (ngModelChange)="patch({ reference: $event })"
                name="reference"
              />
            </div>
          </div>

          @if (errorKey(); as key) {
            <p class="form-error">
              {{ i18n.t(key) }}
              @if (errorDetail(); as detail) {
                <span class="form-error-detail">{{ detail }}</span>
              }
            </p>
          }

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="close.emit()">
              {{ i18n.t('action.cancel') }}
            </button>
            <button type="submit" class="btn btn-primary" [disabled]="saving()">
              {{ saving() ? i18n.t('state.saving') : i18n.t('receive.submit') }}
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
        max-width: 640px;
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
export class ReceiveStockComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly service = inject(InventoryService);
  private readonly medicinesService = inject(MedicinesService);

  readonly close = output<void>();
  readonly saved = output<void>();

  protected readonly form = signal<ReceiveForm>(emptyForm());
  protected readonly saving = signal(false);
  protected readonly errorKey = signal<TranslationKey | null>(null);
  protected readonly errorDetail = signal<string | null>(null);

  /** Only medicines that can actually receive stock. */
  protected readonly medicines = computed(() =>
    this.medicinesService.medicines().items.filter((m: Medicine) => m.isActive),
  );

  /** Tomorrow — the API rejects an expiry date that is not in the future. */
  protected readonly minExpiry = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  ngOnInit(): void {
    // Load a generous page so the dropdown covers the catalogue.
    this.medicinesService.loadMedicines(undefined, 1, 100);
  }

  protected patch(changes: Partial<ReceiveForm>): void {
    this.form.update(current => ({ ...current, ...changes }));
  }

  protected onSubmit(): void {
    if (this.saving()) return;
    const value = this.form();
    if (value.medicineId === null) return;

    this.saving.set(true);
    this.errorKey.set(null);
    this.errorDetail.set(null);

    this.service
      .receiveStock({
        medicineId: value.medicineId,
        batchNo: value.batchNo.trim(),
        expiryDate: value.expiryDate,
        quantity: Number(value.quantity),
        purchasePrice: Number(value.purchasePrice),
        sellingPrice: Number(value.sellingPrice),
        supplierName: value.supplierName.trim() || null,
        reference: value.reference.trim() || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
        },
        error: (err: StockSaveError) => {
          this.saving.set(false);
          this.errorKey.set(
            err.reason === 'duplicateBatch'
              ? 'receive.duplicateBatch'
              : err.reason === 'invalid'
                ? 'receive.invalid'
                : 'receive.failed',
          );
          // A duplicate batch number is fully explained by the translated
          // message, so the server's English text would only add noise. Other
          // failures are generic, and there the detail names the actual cause.
          this.errorDetail.set(err.reason === 'duplicateBatch' ? null : (err.detail ?? null));
        },
      });
  }
}
