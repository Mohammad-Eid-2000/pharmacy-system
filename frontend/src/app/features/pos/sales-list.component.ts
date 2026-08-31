import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { FormatService } from '../../core/format/format.service';
import { TranslationKey } from '../../core/i18n/translations';
import {
  PAYMENT_METHODS,
  PaymentMethod,
  PosService,
  Sale,
  SaleError,
  SaleListItem,
  SaleStatus,
} from './pos.service';
import { ReceiptComponent } from './receipt.component';

const SALE_STATUSES: readonly SaleStatus[] = ['Completed', 'Returned'];

@Component({
  selector: 'app-sales-list',
  imports: [FormsModule, ReceiptComponent],
  template: `
    <div class="page-header">
      <h1>{{ i18n.t('sales.title') }}</h1>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <span class="summary-label">{{ i18n.t('sales.summaryCount') }}</span>
        <span class="summary-value numeric">{{ summary().salesCount }}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ i18n.t('sales.summaryRevenue') }}</span>
        <span class="summary-value numeric">{{ fmt.money(summary().revenue) }}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ i18n.t('sales.summaryUnits') }}</span>
        <span class="summary-value numeric">{{ summary().unitsSold }}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ i18n.t('sales.summaryAverage') }}</span>
        <span class="summary-value numeric">{{ fmt.money(summary().averageBasket) }}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ i18n.t('sales.summaryTax') }}</span>
        <span class="summary-value numeric">{{ fmt.money(summary().taxCollected) }}</span>
      </div>
      <div class="summary-card" [class.alert-danger]="summary().returnedCount > 0">
        <span class="summary-label">{{ i18n.t('sales.summaryReturned') }}</span>
        <span class="summary-value numeric">{{ summary().returnedCount }}</span>
      </div>
    </div>

    <div class="toolbar">
      <input
        type="search"
        class="form-input search-input"
        [placeholder]="i18n.t('sales.searchPlaceholder')"
        [ngModel]="searchTerm()"
        (ngModelChange)="onSearch($event)"
      />
      <select class="form-input filter-select" [ngModel]="status()" (ngModelChange)="onStatus($event)">
        <option value="">{{ i18n.t('saleStatus.all') }}</option>
        @for (s of statuses; track s) {
          <option [value]="s">{{ i18n.t(statusKey(s)) }}</option>
        }
      </select>
      <select
        class="form-input filter-select"
        [ngModel]="paymentMethod()"
        (ngModelChange)="onPaymentMethod($event)"
      >
        <option value="">{{ i18n.t('payment.all') }}</option>
        @for (m of paymentMethods; track m) {
          <option [value]="m">{{ i18n.t(paymentKey(m)) }}</option>
        }
      </select>
    </div>

    @if (loading()) {
      <p class="state-msg">{{ i18n.t('state.loading') }}</p>
    } @else if (error()) {
      <p class="state-msg error">{{ error() }}</p>
    } @else if (sales().length === 0) {
      <p class="state-msg">{{ i18n.t('sales.empty') }}</p>
    } @else {
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th scope="col" class="nowrap">{{ i18n.t('sales.invoiceNo') }}</th>
              <th scope="col" class="nowrap">{{ i18n.t('receipt.date') }}</th>
              <th scope="col">{{ i18n.t('pos.customerName') }}</th>
              <th scope="col" class="nowrap">{{ i18n.t('sales.lines') }}</th>
              <th scope="col" class="nowrap">{{ i18n.t('sales.units') }}</th>
              <th scope="col" class="nowrap">{{ i18n.t('pos.paymentMethod') }}</th>
              <th scope="col" class="nowrap">{{ i18n.t('receipt.total') }}</th>
              <th scope="col" class="nowrap">{{ i18n.t('sales.status') }}</th>
              <th scope="col" class="col-actions">{{ i18n.t('medicine.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (sale of sales(); track sale.id) {
              <tr>
                <td class="numeric nowrap">{{ sale.invoiceNo }}</td>
                <td class="numeric nowrap">{{ fmt.dateTime(sale.saleDate) }}</td>
                <td>{{ sale.customerName || '—' }}</td>
                <td class="numeric nowrap">{{ sale.lineCount }}</td>
                <td class="numeric nowrap">{{ sale.totalUnits }}</td>
                <td class="nowrap">{{ i18n.t(paymentKey(sale.paymentMethod)) }}</td>
                <td class="numeric nowrap">{{ fmt.money(sale.totalAmount) }}</td>
                <td class="nowrap">
                  <span class="badge" [class]="statusBadge(sale.status)">
                    {{ i18n.t(statusKey(sale.status)) }}
                  </span>
                </td>
                <td class="col-actions">
                  <div class="actions">
                    <button class="btn btn-link" (click)="viewReceipt(sale)">
                      {{ i18n.t('sales.view') }}
                    </button>
                    @if (sale.status === 'Completed') {
                      <button class="btn btn-link danger" (click)="askReturn(sale)">
                        {{ i18n.t('sales.return') }}
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (totalPages() > 1) {
        <div class="pager">
          <button class="btn btn-secondary" [disabled]="page() <= 1" (click)="goTo(page() - 1)">
            {{ i18n.t('pagination.previous') }}
          </button>
          <span class="pager-info numeric">{{ page() }} / {{ totalPages() }}</span>
          <button
            class="btn btn-secondary"
            [disabled]="page() >= totalPages()"
            (click)="goTo(page() + 1)"
          >
            {{ i18n.t('pagination.next') }}
          </button>
        </div>
      }
    }

    <!-- Returning a sale reverses stock, so it asks for a reason first. -->
    @if (returning()) {
      <div class="overlay" (click)="cancelReturn()">
        <div
          class="dialog"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="i18n.t('sales.returnTitle')"
          (click)="$event.stopPropagation()"
        >
          <h2>{{ i18n.t('sales.returnTitle') }}</h2>
          <p class="dialog-text">
            {{ i18n.t('sales.returnConfirm', { invoice: returning()!.invoiceNo }) }}
          </p>
          <div class="form-group">
            <label class="form-label" for="return-reason">
              {{ i18n.t('sales.returnReason') }}
              <span class="required" aria-hidden="true">*</span>
            </label>
            <input
              id="return-reason"
              type="text"
              class="form-input"
              [ngModel]="returnReason()"
              (ngModelChange)="returnReason.set($event)"
            />
          </div>
          @if (returnError()) {
            <div class="form-error" role="alert">
              <p>{{ returnErrorMessage() }}</p>
              @if (returnError()?.detail) {
                <p class="error-detail">{{ returnError()!.detail }}</p>
              }
            </div>
          }
          <div class="dialog-actions">
            <button class="btn btn-secondary" (click)="cancelReturn()">
              {{ i18n.t('action.cancel') }}
            </button>
            <button
              class="btn btn-primary"
              [disabled]="!returnReason().trim() || submittingReturn()"
              (click)="confirmReturn()"
            >
              {{ submittingReturn() ? i18n.t('pos.saving') : i18n.t('sales.confirmReturn') }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (viewing()) {
      <app-receipt [sale]="viewing()!" (closed)="viewing.set(null)" />
    }
  `,
  styles: [
    `
      .page-header {
        margin-block-end: var(--space-4);
      }
      .page-header h1 {
        margin: 0;
        font-size: 1.5rem;
      }
      .toolbar {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        margin-block-end: var(--space-3);
      }
      .search-input {
        flex: 1;
        min-inline-size: 12rem;
      }
      .filter-select {
        inline-size: auto;
        min-inline-size: 10rem;
      }
      .state-msg {
        margin: var(--space-8) 0;
        text-align: center;
        color: var(--color-text-muted);
      }
      .state-msg.error {
        color: var(--color-danger);
      }
      /* Sticky so the buttons stay reachable when the table scrolls sideways. */
      .col-actions {
        position: sticky;
        inset-inline-end: 0;
        background: var(--color-surface);
      }
      .btn-link.danger {
        color: var(--color-danger);
      }
      .pager {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-3);
        margin-block-start: var(--space-4);
      }
      .pager-info {
        color: var(--color-text-muted);
      }

      .overlay {
        position: fixed;
        inset: 0;
        z-index: 50;
        display: grid;
        place-items: center;
        padding: var(--space-4);
        background: rgb(0 0 0 / 0.45);
      }
      .dialog {
        inline-size: min(26rem, 100%);
        background: var(--color-surface);
        border-radius: var(--radius-lg);
        padding: var(--space-4);
      }
      .dialog h2 {
        margin: 0 0 var(--space-2);
        font-size: 1.125rem;
      }
      .dialog-text {
        margin: 0 0 var(--space-3);
        color: var(--color-text-muted);
      }
      .required {
        color: var(--color-danger);
      }
      .error-detail {
        margin: var(--space-1) 0 0;
        font-size: 0.8125rem;
        opacity: 0.85;
        direction: ltr;
        unicode-bidi: isolate;
        text-align: start;
      }
      .dialog-actions {
        display: flex;
        gap: var(--space-2);
        margin-block-start: var(--space-4);
      }
      .dialog-actions .btn {
        flex: 1;
      }
    `,
  ],
})
export class SalesListComponent implements OnInit {
  private readonly pos = inject(PosService);
  readonly i18n = inject(I18nService);
  readonly fmt = inject(FormatService);

  readonly statuses = SALE_STATUSES;
  readonly paymentMethods = PAYMENT_METHODS;

  readonly loading = this.pos.loading;
  readonly error = this.pos.error;
  readonly summary = this.pos.summary;
  readonly sales = computed(() => this.pos.sales().items);
  readonly page = computed(() => this.pos.sales().page);
  readonly totalPages = computed(() => this.pos.sales().totalPages);

  readonly searchTerm = signal('');
  readonly status = signal<SaleStatus | ''>('');
  readonly paymentMethod = signal<PaymentMethod | ''>('');

  readonly viewing = signal<Sale | null>(null);
  readonly returning = signal<SaleListItem | null>(null);
  readonly returnReason = signal('');
  readonly submittingReturn = signal(false);
  readonly returnError = signal<SaleError | null>(null);

  private searchTimer?: ReturnType<typeof setTimeout>;

  readonly returnErrorMessage = computed(() => {
    const err = this.returnError();
    if (!err) return null;
    const key: TranslationKey =
      err.reason === 'alreadyReturned'
        ? 'sales.alreadyReturned'
        : err.reason === 'invalid'
          ? 'sales.returnInvalid'
          : err.reason === 'notFound'
            ? 'pos.saveNotFound'
            : 'sales.returnFailed';
    return this.i18n.t(key);
  });

  ngOnInit(): void {
    this.reload();
    this.pos.loadSummary();
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.reload(), 250);
  }

  onStatus(value: SaleStatus | ''): void {
    this.status.set(value);
    this.reload();
  }

  onPaymentMethod(value: PaymentMethod | ''): void {
    this.paymentMethod.set(value);
    this.reload();
  }

  goTo(page: number): void {
    this.reload(page);
  }

  viewReceipt(sale: SaleListItem): void {
    this.pos.getSale(sale.id).subscribe({
      next: full => this.viewing.set(full),
      error: (err: SaleError) => console.error('Failed to load invoice', err),
    });
  }

  askReturn(sale: SaleListItem): void {
    this.returning.set(sale);
    this.returnReason.set('');
    this.returnError.set(null);
  }

  cancelReturn(): void {
    this.returning.set(null);
    this.returnError.set(null);
  }

  confirmReturn(): void {
    const sale = this.returning();
    const reason = this.returnReason().trim();
    if (!sale || !reason) return;

    this.submittingReturn.set(true);
    this.returnError.set(null);
    this.pos.returnSale(sale.id, reason).subscribe({
      next: () => {
        this.submittingReturn.set(false);
        this.returning.set(null);
        // Stock went back and the day's takings changed, so both are refreshed.
        this.reload(this.page());
        this.pos.loadSummary();
      },
      error: (err: SaleError) => {
        this.submittingReturn.set(false);
        this.returnError.set(err);
      },
    });
  }

  statusKey(status: SaleStatus): TranslationKey {
    return `saleStatus.${status.charAt(0).toLowerCase()}${status.slice(1)}` as TranslationKey;
  }

  paymentKey(method: PaymentMethod): TranslationKey {
    return `payment.${method.charAt(0).toLowerCase()}${method.slice(1)}` as TranslationKey;
  }

  statusBadge(status: SaleStatus): string {
    return status === 'Returned' ? 'badge-danger' : 'badge-success';
  }

  private reload(page = 1): void {
    this.pos.loadSales(
      {
        searchTerm: this.searchTerm().trim() || undefined,
        status: this.status() || undefined,
        paymentMethod: this.paymentMethod() || undefined,
      },
      page,
    );
  }
}
