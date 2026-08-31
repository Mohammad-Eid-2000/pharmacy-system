import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import {
  ADJUSTMENT_TYPES,
  Batch,
  InventoryService,
  StockMovementType,
  StockSaveError,
} from './inventory.service';

interface AdjustForm {
  newQuantity: number;
  movementType: StockMovementType;
  reason: string;
  reference: string;
}

@Component({
  selector: 'app-adjust-stock',
  imports: [FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-content" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ i18n.t('adjust.title') }}</h2>
          <button class="btn btn-link" (click)="close.emit()" [attr.aria-label]="i18n.t('action.close')">✕</button>
        </div>

        <div class="batch-summary">
          <div class="summary-row">
            <span class="summary-key">{{ i18n.t('batch.medicine') }}</span>
            <span class="summary-val">{{ i18n.localized(batch().medicineNameAr, batch().medicineNameEn) }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-key">{{ i18n.t('batch.batchNo') }}</span>
            <span class="summary-val numeric">{{ batch().batchNo }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-key">{{ i18n.t('adjust.currentQuantity') }}</span>
            <span class="summary-val numeric">{{ batch().quantity }}</span>
          </div>
        </div>

        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label" for="as-qty">{{ i18n.t('adjust.newQuantity') }} *</label>
            <input
              id="as-qty"
              type="number"
              min="0"
              [max]="batch().initialQuantity"
              step="1"
              class="form-input"
              required
              [ngModel]="form().newQuantity"
              (ngModelChange)="patch({ newQuantity: $event })"
              name="newQuantity"
            />
            <span class="form-hint">{{ i18n.t('adjust.maxHint', { n: batch().initialQuantity }) }}</span>
          </div>

          @if (delta() !== 0) {
            <p class="delta" [class.positive]="delta() > 0" [class.negative]="delta() < 0">
              {{ i18n.t('adjust.delta') }}: <span class="numeric">{{ signedDelta() }}</span>
            </p>
          }

          <div class="form-group">
            <label class="form-label" for="as-type">{{ i18n.t('adjust.movementType') }} *</label>
            <select
              id="as-type"
              class="form-input"
              required
              [ngModel]="form().movementType"
              (ngModelChange)="patch({ movementType: $event })"
              name="movementType"
            >
              @for (type of adjustmentTypes; track type) {
                <option [ngValue]="type">{{ i18n.t(movementTypeKey(type)) }}</option>
              }
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="as-reason">{{ i18n.t('adjust.reason') }} *</label>
            <input
              id="as-reason"
              class="form-input"
              required
              [placeholder]="i18n.t('adjust.reasonPlaceholder')"
              [ngModel]="form().reason"
              (ngModelChange)="patch({ reason: $event })"
              name="reason"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="as-ref">{{ i18n.t('adjust.reference') }}</label>
            <input
              id="as-ref"
              class="form-input"
              [ngModel]="form().reference"
              (ngModelChange)="patch({ reference: $event })"
              name="reference"
            />
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
            <button type="submit" class="btn btn-primary" [disabled]="saving() || delta() === 0">
              {{ saving() ? i18n.t('state.saving') : i18n.t('adjust.submit') }}
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
        max-width: 480px;
        max-height: 90vh;
        overflow-y: auto;
        padding: var(--space-6);
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-4);
        margin-bottom: var(--space-4);
      }
      .modal-header h2 {
        font-size: 1.25rem;
        color: var(--color-primary);
      }
      .batch-summary {
        background: var(--color-bg);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: var(--space-3);
        margin-bottom: var(--space-6);
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        gap: var(--space-4);
        font-size: 0.9375rem;
      }
      .summary-key {
        color: var(--color-text-muted);
      }
      .summary-val {
        font-weight: 600;
        text-align: end;
      }
      .form-group {
        margin-bottom: var(--space-4);
      }
      .form-hint {
        display: block;
        font-size: 0.8125rem;
        color: var(--color-text-muted);
        margin-top: var(--space-1);
      }
      .delta {
        font-weight: 600;
        margin-bottom: var(--space-4);
      }
      .delta.positive {
        color: var(--color-success);
      }
      .delta.negative {
        color: var(--color-danger);
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
export class AdjustStockComponent {
  protected readonly i18n = inject(I18nService);
  private readonly service = inject(InventoryService);

  readonly batch = input.required<Batch>();
  readonly close = output<void>();
  readonly saved = output<void>();

  protected readonly adjustmentTypes = ADJUSTMENT_TYPES;

  /**
   * Derived from the input rather than the constructor: input signals are not
   * populated at construction time, so the batch's quantity would read as
   * undefined there.
   */
  protected readonly form = linkedSignal<AdjustForm>(() => ({
    newQuantity: this.batch().quantity,
    movementType: 'Adjustment',
    reason: '',
    reference: '',
  }));

  protected readonly saving = signal(false);
  protected readonly errorKey = signal<TranslationKey | null>(null);
  protected readonly errorDetail = signal<string | null>(null);

  protected readonly delta = computed(() => Number(this.form().newQuantity) - this.batch().quantity);

  protected signedDelta(): string {
    const d = this.delta();
    return d > 0 ? `+${d}` : String(d);
  }

  protected movementTypeKey(type: StockMovementType): TranslationKey {
    return `movementType.${type}` as TranslationKey;
  }

  protected patch(changes: Partial<AdjustForm>): void {
    this.form.update(current => ({ ...current, ...changes }));
  }

  protected onSubmit(): void {
    if (this.saving() || this.delta() === 0) return;
    const value = this.form();

    this.saving.set(true);
    this.errorKey.set(null);
    this.errorDetail.set(null);

    this.service
      .adjustStock(this.batch().id, {
        newQuantity: Number(value.newQuantity),
        movementType: value.movementType,
        reason: value.reason.trim(),
        reference: value.reference.trim() || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
        },
        error: (err: StockSaveError) => {
          this.saving.set(false);
          this.errorKey.set(err.reason === 'invalid' ? 'adjust.invalid' : 'adjust.failed');
          this.errorDetail.set(err.detail ?? null);
        },
      });
  }
}
