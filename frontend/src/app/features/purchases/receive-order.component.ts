import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { FormatService } from '../../core/format/format.service';
import { TranslationKey } from '../../core/i18n/translations';
import {
  PurchaseOrder,
  PurchaseSaveError,
  PurchasesService,
  ReceiveLinePayload,
} from './purchases.service';

/** One line of goods actually arriving now. */
interface ReceiveLineForm {
  purchaseOrderItemId: number;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  sellingPrice: number;
}

@Component({
  selector: 'app-receive-order',
  imports: [FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-content" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ i18n.t('receiveOrder.title') }}</h2>
          <button class="btn btn-link" (click)="close.emit()" [attr.aria-label]="i18n.t('action.close')">✕</button>
        </div>

        <p class="order-ref">
          {{ order().orderNo }} —
          {{ i18n.localized(order().supplierNameAr, order().supplierNameEn) }}
        </p>

        <form (ngSubmit)="onSubmit()">
          @if (errorKey(); as key) {
            <p class="form-error">
              {{ i18n.t(key) }}
              @if (errorDetail(); as detail) {
                <span class="form-error-detail">{{ detail }}</span>
              }
            </p>
          }

          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">{{ i18n.t('orderForm.medicine') }}</th>
                  <th scope="col" class="numeric nowrap">{{ i18n.t('batch.batchNo') }} *</th>
                  <th scope="col" class="numeric nowrap">{{ i18n.t('batch.expiryDate') }} *</th>
                  <th scope="col" class="numeric nowrap">{{ i18n.t('pos.quantity') }} *</th>
                  <th scope="col" class="numeric nowrap">{{ i18n.t('batch.sellingPrice') }} *</th>
                </tr>
              </thead>
              <tbody>
                @for (line of lines(); track line.purchaseOrderItemId) {
                  <tr>
                    <td>
                      <span class="medicine-name">
                        {{ i18n.localized(getItem(line.purchaseOrderItemId)?.medicineNameAr, getItem(line.purchaseOrderItemId)?.medicineNameEn) }}
                      </span>
                      <span class="price-hint">
                        {{ i18n.t('receiveOrder.unitPrice', { price: fmt.amount(getItem(line.purchaseOrderItemId)?.unitPrice ?? 0) }) }}
                      </span>
                    </td>
                    <td>
                      <input
                        type="text"
                        class="form-input line-input"
                        [ngModel]="line.batchNo"
                        (ngModelChange)="patchLine(line.purchaseOrderItemId, { batchNo: $event })"
                        [name]="'rcv-batch-' + line.purchaseOrderItemId"
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        class="form-input line-input"
                        [min]="today"
                        [ngModel]="line.expiryDate"
                        (ngModelChange)="patchLine(line.purchaseOrderItemId, { expiryDate: $event })"
                        [name]="'rcv-expiry-' + line.purchaseOrderItemId"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        max="{{ remainingOf(line.purchaseOrderItemId) }}"
                        step="1"
                        class="form-input line-input"
                        [ngModel]="line.quantity"
                        (ngModelChange)="patchLine(line.purchaseOrderItemId, { quantity: $event })"
                        [name]="'rcv-qty-' + line.purchaseOrderItemId"
                      />
                      <span class="price-hint">
                        {{ i18n.t('receiveOrder.remaining', { n: remainingOf(line.purchaseOrderItemId) }) }}
                      </span>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        class="form-input line-input"
                        [ngModel]="line.sellingPrice"
                        (ngModelChange)="patchLine(line.purchaseOrderItemId, { sellingPrice: $event })"
                        [name]="'rcv-price-' + line.purchaseOrderItemId"
                      />
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="state-cell">
                      {{ i18n.t('receiveOrder.nothingToReceive') }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <p class="expiry-hint">{{ i18n.t('receive.expiryHint') }}</p>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="close.emit()">
              {{ i18n.t('action.cancel') }}
            </button>
            <button type="submit" class="btn btn-primary" [disabled]="saving()">
              {{ saving() ? i18n.t('state.saving') : i18n.t('receiveOrder.submit') }}
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
        max-width: 1080px;
        max-height: 92vh;
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
      .order-ref {
        margin: 0 0 var(--space-4);
        color: var(--color-text-muted);
        font-weight: 600;
      }
      .table-wrapper {
        overflow-x: auto;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        margin-bottom: var(--space-3);
      }
      .medicine-name {
        display: block;
        font-weight: 600;
        white-space: nowrap;
      }
      .price-hint {
        display: block;
        font-size: 0.8125rem;
        color: var(--color-text-muted);
        margin-top: var(--space-1);
      }
      .line-input {
        inline-size: 8.5rem;
      }
      .state-cell {
        text-align: center;
        color: var(--color-text-muted);
        padding: var(--space-4);
      }
      .expiry-hint {
        margin: 0 0 var(--space-4);
        font-size: 0.8125rem;
        color: var(--color-text-muted);
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
        direction: ltr;
        unicode-bidi: isolate;
        text-align: start;
      }
      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-3);
        margin-top: var(--space-5);
      }
    `,
  ],
})
export class ReceiveOrderComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly fmt = inject(FormatService);
  private readonly service = inject(PurchasesService);

  readonly order = input<PurchaseOrder>(null!);
  readonly close = output<void>();
  readonly saved = output<void>();

  protected readonly today = new Date().toISOString().slice(0, 10);

  /**
   * One editable line per order line that still has units left to receive, with
   * the quantity defaulted to the remaining amount — receiving "the rest" is the
   * common case, and typing a different figure is still possible.
   */
  protected readonly lines = linkedSignal<ReceiveLineForm[]>(() => {
    const order = this.order();
    if (!order) return [];
    return order.items
      .filter(i => i.quantityReceived < i.quantityOrdered)
      .map(i => ({
        purchaseOrderItemId: i.id,
        batchNo: '',
        expiryDate: '',
        quantity: i.quantityOrdered - i.quantityReceived,
        sellingPrice: i.unitPrice,
      }));
  });

  protected readonly saving = signal(false);
  protected readonly errorKey = signal<TranslationKey | null>(null);
  protected readonly errorDetail = signal<string | null>(null);

  /** Remaining units for an order line (the maximum that can be typed now). */
  remainingOf(purchaseOrderItemId: number): number {
    const item = this.order().items.find(i => i.id === purchaseOrderItemId);
    if (!item) return 0;
    return item.quantityOrdered - item.quantityReceived;
  }

  getItem(purchaseOrderItemId: number) {
    return this.order().items.find(i => i.id === purchaseOrderItemId);
  }

  protected patchLine(purchaseOrderItemId: number, patch: Partial<ReceiveLineForm>): void {
    this.lines.update(lines =>
      lines.map(line => (line.purchaseOrderItemId === purchaseOrderItemId ? { ...line, ...patch } : line)),
    );
  }

  protected onSubmit(): void {
    if (this.saving()) return;

    const payload = this.lines()
      .filter(l => l.batchNo.trim() && l.expiryDate && l.quantity > 0)
      .map(l => ({
        purchaseOrderItemId: l.purchaseOrderItemId,
        batchNo: l.batchNo.trim(),
        expiryDate: l.expiryDate,
        quantity: l.quantity,
        sellingPrice: l.sellingPrice,
      }) as ReceiveLinePayload);

    if (payload.length === 0) {
      this.errorKey.set('receiveOrder.invalid');
      this.errorDetail.set(null);
      return;
    }

    this.saving.set(true);
    this.errorKey.set(null);
    this.errorDetail.set(null);

    this.service.receiveOrder(this.order().id, payload).subscribe({
      next: () => this.saved.emit(),
      error: (err: PurchaseSaveError) => {
        this.saving.set(false);
        this.errorKey.set(errorKeyFor(err));
        this.errorDetail.set(err.detail ?? null);
      },
    });
  }
}

function errorKeyFor(err: PurchaseSaveError): TranslationKey {
  switch (err.reason) {
    case 'conflict':
      return 'receiveOrder.conflict';
    case 'invalid':
      return 'receiveOrder.invalid';
    case 'notFound':
      return 'receiveOrder.notFound';
    default:
      return 'receiveOrder.failed';
  }
}