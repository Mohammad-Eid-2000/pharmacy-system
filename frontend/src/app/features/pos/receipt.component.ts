import { Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { FormatService } from '../../core/format/format.service';
import { TranslationKey } from '../../core/i18n/translations';
import { PaymentMethod, Sale } from './pos.service';

/**
 * The invoice as the customer receives it. Every figure here comes from the
 * server's stored snapshot rather than being recomputed, because a receipt is a
 * record of what was charged, not a fresh calculation.
 */
@Component({
  selector: 'app-receipt',
  template: `
    <div class="overlay" (click)="closed.emit()">
      <div
        class="receipt"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="i18n.t('receipt.title')"
        (click)="$event.stopPropagation()"
      >
        <header class="receipt-head">
          <div>
            <h2>{{ i18n.t('receipt.title') }}</h2>
            <p class="invoice-no numeric">{{ sale().invoiceNo }}</p>
          </div>
          <button
            type="button"
            class="btn-close"
            [attr.aria-label]="i18n.t('action.close')"
            (click)="closed.emit()"
          >
            ×
          </button>
        </header>

        @if (sale().status === 'Returned') {
          <p class="returned-banner">{{ i18n.t('receipt.returnedBanner') }}</p>
        }

        <dl class="meta">
          <div>
            <dt>{{ i18n.t('receipt.date') }}</dt>
            <dd class="numeric">{{ fmt.dateTime(sale().saleDate) }}</dd>
          </div>
          @if (sale().customerName) {
            <div>
              <dt>{{ i18n.t('pos.customerName') }}</dt>
              <dd>{{ sale().customerName }}</dd>
            </div>
          }
          @if (sale().prescriptionNo) {
            <div>
              <dt>{{ i18n.t('pos.prescriptionNo') }}</dt>
              <dd class="numeric">{{ sale().prescriptionNo }}</dd>
            </div>
          }
          <div>
            <dt>{{ i18n.t('pos.paymentMethod') }}</dt>
            <dd>{{ i18n.t(paymentKey()) }}</dd>
          </div>
        </dl>

        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th scope="col">{{ i18n.t('receipt.item') }}</th>
                <th scope="col" class="nowrap">{{ i18n.t('receipt.batch') }}</th>
                <th scope="col" class="nowrap">{{ i18n.t('pos.quantity') }}</th>
                <th scope="col" class="nowrap">{{ i18n.t('receipt.unitPrice') }}</th>
                <th scope="col" class="nowrap">{{ i18n.t('receipt.lineSubtotal') }}</th>
                <th scope="col" class="nowrap">{{ i18n.t('pos.tax') }}</th>
                <th scope="col" class="nowrap">{{ i18n.t('receipt.lineTotal') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (item of sale().items; track item.id) {
                <tr>
                  <td>{{ i18n.localized(item.medicineNameAr, item.medicineNameEn) }}</td>
                  <td class="numeric nowrap">
                    <span class="batch-no">{{ item.batchNo }}</span>
                    <span class="expiry">{{ fmt.date(item.expiryDate) }}</span>
                  </td>
                  <td class="numeric nowrap">{{ item.quantity }}</td>
                  <td class="numeric nowrap">{{ fmt.amount(item.unitPrice) }}</td>
                  <!-- Unit price times quantity is shown explicitly so the reader can
                       check the arithmetic; the tax-inclusive total alone does not
                       multiply out from the unit price. -->
                  <td class="numeric nowrap">{{ fmt.amount(item.lineSubtotal) }}</td>
                  <td class="numeric nowrap">{{ fmt.amount(item.lineTax) }}</td>
                  <td class="numeric nowrap">{{ fmt.amount(item.lineTotal) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <dl class="totals">
          <div class="total-row">
            <dt>{{ i18n.t('pos.subtotal') }}</dt>
            <dd class="numeric">{{ fmt.money(sale().subtotal) }}</dd>
          </div>
          <div class="total-row">
            <dt>{{ i18n.t('pos.tax') }}</dt>
            <dd class="numeric">{{ fmt.money(sale().taxAmount) }}</dd>
          </div>
          @if (sale().discountAmount > 0) {
            <div class="total-row">
              <dt>{{ i18n.t('pos.discount') }}</dt>
              <dd class="numeric">−{{ fmt.money(sale().discountAmount) }}</dd>
            </div>
          }
          <div class="total-row grand">
            <dt>{{ i18n.t('receipt.total') }}</dt>
            <dd class="numeric">{{ fmt.money(sale().totalAmount) }}</dd>
          </div>
          <div class="total-row">
            <dt>{{ i18n.t('pos.amountPaid') }}</dt>
            <dd class="numeric">{{ fmt.money(sale().amountPaid) }}</dd>
          </div>
          @if (sale().changeDue > 0) {
            <div class="total-row change">
              <dt>{{ i18n.t('pos.changeDue') }}</dt>
              <dd class="numeric">{{ fmt.money(sale().changeDue) }}</dd>
            </div>
          }
        </dl>

        <p class="units">{{ i18n.t('receipt.unitsSold', { n: sale().totalUnits }) }}</p>

        <div class="receipt-actions">
          <button type="button" class="btn btn-secondary" (click)="print()">
            {{ i18n.t('receipt.print') }}
          </button>
          <button type="button" class="btn btn-primary" (click)="closed.emit()">
            {{ i18n.t('receipt.newSale') }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .overlay {
        position: fixed;
        inset: 0;
        z-index: 50;
        display: grid;
        place-items: center;
        padding: var(--space-4);
        background: rgb(0 0 0 / 0.45);
        overflow-y: auto;
      }
      .receipt {
        inline-size: min(56rem, 100%);
        max-block-size: 90vh;
        overflow-y: auto;
        background: var(--color-surface);
        border-radius: var(--radius-lg);
        padding: var(--space-4);
      }
      .receipt-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-3);
        padding-block-end: var(--space-3);
        border-block-end: 1px solid var(--color-border);
      }
      .receipt-head h2 {
        margin: 0;
        font-size: 1.125rem;
      }
      .invoice-no {
        margin: var(--space-1) 0 0;
        font-weight: 600;
        color: var(--color-primary);
      }
      .btn-close {
        flex: none;
        inline-size: 2rem;
        block-size: 2rem;
        display: grid;
        place-items: center;
        background: none;
        border: none;
        border-radius: var(--radius-sm);
        font-size: 1.5rem;
        line-height: 1;
        color: var(--color-text-muted);
        cursor: pointer;
      }
      .btn-close:hover {
        background: var(--color-bg);
        color: var(--color-text);
      }

      .returned-banner {
        margin: var(--space-3) 0 0;
        padding: var(--space-2) var(--space-3);
        background: color-mix(in srgb, var(--color-danger) 10%, transparent);
        color: var(--color-danger);
        border-radius: var(--radius-sm);
        font-weight: 600;
        text-align: center;
      }

      .meta {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
        gap: var(--space-2) var(--space-3);
        margin: var(--space-3) 0;
      }
      .meta div {
        min-inline-size: 0;
      }
      .meta dt {
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }
      .meta dd {
        margin: 2px 0 0;
        font-weight: 500;
        font-size: 0.875rem;
      }

      .batch-no {
        display: block;
        white-space: nowrap;
      }

      .expiry {
        display: block;
        white-space: nowrap;
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }

      .totals {
        margin: var(--space-3) 0 0;
        padding-block-start: var(--space-3);
        border-block-start: 1px solid var(--color-border);
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .total-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
      }
      .total-row dt {
        color: var(--color-text-muted);
        font-size: 0.875rem;
      }
      .total-row dd {
        margin: 0;
        font-weight: 500;
      }
      .total-row.grand {
        padding-block: var(--space-2);
        border-block: 1px solid var(--color-border);
      }
      .total-row.grand dt {
        color: var(--color-text);
        font-weight: 600;
        font-size: 1rem;
      }
      .total-row.grand dd {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--color-primary);
      }
      .total-row.change dd {
        color: var(--color-success);
        font-weight: 700;
      }

      .units {
        margin: var(--space-3) 0 0;
        font-size: 0.8125rem;
        color: var(--color-text-muted);
        text-align: center;
      }

      .receipt-actions {
        display: flex;
        gap: var(--space-2);
        margin-block-start: var(--space-4);
      }
      .receipt-actions .btn {
        flex: 1;
      }

      @media print {
        .overlay {
          position: static;
          background: none;
          padding: 0;
        }
        .btn-close,
        .receipt-actions {
          display: none;
        }
      }
    `,
  ],
})
export class ReceiptComponent {
  readonly sale = input.required<Sale>();
  readonly closed = output<void>();

  readonly i18n = inject(I18nService);
  readonly fmt = inject(FormatService);

  readonly paymentKey = computed<TranslationKey>(() => {
    const method: PaymentMethod = this.sale().paymentMethod;
    return `payment.${method.charAt(0).toLowerCase()}${method.slice(1)}` as TranslationKey;
  });

  print(): void {
    window.print();
  }
}
