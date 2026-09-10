import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { FormatService } from '../../core/format/format.service';
import { TranslationKey } from '../../core/i18n/translations';
import {
  PURCHASE_STATUSES,
  PurchaseOrder,
  PurchaseOrderListItem,
  PurchaseSaveError,
  PurchaseStatus,
  PurchasesService,
  RECEIVABLE_STATUSES,
  Supplier,
} from './purchases.service';
import { SupplierFormComponent } from './supplier-form.component';
import { PurchaseOrderFormComponent } from './purchase-order-form.component';
import { ReceiveOrderComponent } from './receive-order.component';

type Tab = 'orders' | 'suppliers';

const TABS: readonly Tab[] = ['orders', 'suppliers'];

/**
 * Minimal order identity used by the confirm/cancel dialogs. Both the list rows
 * (PurchaseOrderListItem) and the full detail (PurchaseOrder) carry these two
 * fields, so the dialogs can be fed from either.
 */
interface OrderReference {
  id: number;
  orderNo: string;
}

@Component({
  selector: 'app-purchases-list',
  imports: [FormsModule, SupplierFormComponent, PurchaseOrderFormComponent, ReceiveOrderComponent],
  template: `
    <div class="page-header">
      <h1>{{ i18n.t('purchases.title') }}</h1>
      <button class="btn btn-primary" (click)="openCreate()">
        + {{ tab() === 'orders' ? i18n.t('purchases.newOrder') : i18n.t('purchases.newSupplier') }}
      </button>
    </div>

    <!-- Headline figures: what is outstanding is the first thing a buyer checks. -->
    <div class="summary-grid">
      <div class="summary-card" [class.alert-warning]="summary().draftCount > 0">
        <span class="summary-label">{{ i18n.t('purchases.summaryDrafts') }}</span>
        <span class="summary-value numeric">{{ summary().draftCount }}</span>
      </div>
      <div class="summary-card" [class.alert-warning]="summary().outstandingCount > 0">
        <span class="summary-label">{{ i18n.t('purchases.summaryOutstanding') }}</span>
        <span class="summary-value numeric">{{ summary().outstandingCount }}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ i18n.t('purchases.summaryReceived') }}</span>
        <span class="summary-value numeric">{{ summary().receivedCount }}</span>
      </div>
      <div class="summary-card" [class.alert-danger]="summary().cancelledCount > 0">
        <span class="summary-label">{{ i18n.t('purchases.summaryCancelled') }}</span>
        <span class="summary-value numeric">{{ summary().cancelledCount }}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ i18n.t('purchases.summaryCost') }}</span>
        <span class="summary-value numeric">{{ fmt.money(summary().receivedCost) }}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ i18n.t('purchases.summarySuppliers') }}</span>
        <span class="summary-value numeric">{{ summary().activeSuppliersCount }}</span>
      </div>
    </div>

    <div class="tabs" role="tablist">
      @for (t of tabs; track t) {
        <button
          class="tab"
          role="tab"
          [class.active]="tab() === t"
          [attr.aria-selected]="tab() === t"
          (click)="switchTab(t)"
        >
          {{ i18n.t(tabLabel(t)) }}
        </button>
      }
    </div>

    <div class="toolbar">
      <input
        type="search"
        class="form-input search-input"
        [placeholder]="i18n.t('purchases.searchPlaceholder')"
        [ngModel]="searchTerm()"
        (ngModelChange)="onSearch($event)"
      />

      @if (tab() === 'orders') {
        <select class="form-input filter-select" [ngModel]="statusFilter()" (ngModelChange)="onStatus($event)">
          <option value="">{{ i18n.t('purchaseStatus.all') }}</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ i18n.t(statusKey(s)) }}</option>
          }
        </select>
        <select class="form-input filter-select" [ngModel]="supplierFilter()" (ngModelChange)="onSupplier($event)">
          <option [ngValue]="null">{{ i18n.t('purchases.allSuppliers') }}</option>
          @for (s of suppliersPage().items; track s.id) {
            <option [ngValue]="s.id">{{ i18n.localized(s.nameAr, s.nameEn) }}</option>
          }
        </select>
      } @else {
        <select class="form-input filter-select" [ngModel]="activeFilter()" (ngModelChange)="onActive($event)">
          <option value="">{{ i18n.t('supplier.allActive') }}</option>
          <option value="true">{{ i18n.t('supplier.active') }}</option>
          <option value="false">{{ i18n.t('supplier.inactive') }}</option>
        </select>
      }
    </div>

    @if (service.loading()) {
      <p class="state-message">{{ i18n.t('state.loading') }}</p>
    } @else if (service.error()) {
      <div class="state-message error">
        <span>{{ service.error() }}</span>
        <button class="btn btn-secondary" (click)="reload()">{{ i18n.t('action.retry') }}</button>
      </div>
    } @else if (tab() === 'orders') {
      @if (orderList().length === 0) {
        <p class="state-message">{{ i18n.t('purchases.emptyOrders') }}</p>
      } @else {
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th scope="col" class="nowrap">{{ i18n.t('purchases.orderNo') }}</th>
                <th scope="col">{{ i18n.t('purchases.supplier') }}</th>
                <th scope="col" class="nowrap">{{ i18n.t('receipt.date') }}</th>
                <th scope="col" class="nowrap">{{ i18n.t('purchases.lines') }}</th>
                <th scope="col" class="nowrap">{{ i18n.t('purchases.progress') }}</th>
                <th scope="col" class="nowrap">{{ i18n.t('receipt.total') }}</th>
                <th scope="col" class="nowrap">{{ i18n.t('purchases.status') }}</th>
                <th scope="col" class="col-actions">{{ i18n.t('medicine.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (order of orderList(); track order.id) {
                <tr>
                  <td class="numeric nowrap">{{ order.orderNo }}</td>
                  <td>{{ i18n.localized(order.supplierNameAr, order.supplierNameEn) }}</td>
                  <td class="numeric nowrap">{{ fmt.date(order.orderDate) }}</td>
                  <td class="numeric nowrap">{{ order.lineCount }}</td>
                  <td class="numeric nowrap">
                    <span class="progress-text">
                      {{ order.unitsReceived }}/{{ order.totalUnits }}
                    </span>
                  </td>
                  <td class="numeric nowrap">{{ fmt.money(order.totalAmount) }}</td>
                  <td class="nowrap">
                    <span class="badge" [class]="statusBadge(order.status)">
                      {{ i18n.t(statusKey(order.status)) }}
                    </span>
                  </td>
                  <td class="col-actions">
                    <div class="actions">
                      <button class="btn btn-link" (click)="viewOrder(order)">{{ i18n.t('sales.view') }}</button>
                      @if (order.status === 'Draft') {
                        <button class="btn btn-link" (click)="editOrder(order)">{{ i18n.t('action.edit') }}</button>
                        <button class="btn btn-link" (click)="askPlace(order)">{{ i18n.t('purchases.place') }}</button>
                      }
                      @if (receivable(order.status)) {
                        <button class="btn btn-link" (click)="openReceive(order)">{{ i18n.t('purchases.receive') }}</button>
                        <button class="btn btn-link danger" (click)="askCancel(order)">{{ i18n.t('purchases.cancel') }}</button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (ordersPage().totalPages > 1) {
          <div class="pagination">
            <span class="pagination-info">{{ i18n.t('pagination.total', { count: ordersPage().totalCount }) }}</span>
            <div class="pagination-controls">
              <button
                class="btn btn-secondary"
                [disabled]="ordersPage().page <= 1"
                (click)="reload(ordersPage().page - 1)"
              >
                {{ i18n.t('pagination.previous') }}
              </button>
              <span class="pagination-info">
                {{ i18n.t('pagination.page', { page: ordersPage().page, total: ordersPage().totalPages || 1 }) }}
              </span>
              <button
                class="btn btn-secondary"
                [disabled]="ordersPage().page >= ordersPage().totalPages"
                (click)="reload(ordersPage().page + 1)"
              >
                {{ i18n.t('pagination.next') }}
              </button>
            </div>
          </div>
        }
      }
    } @else {
      @if (supplierList().length === 0) {
        <p class="state-message">{{ i18n.t('purchases.emptySuppliers') }}</p>
      } @else {
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th scope="col">{{ i18n.t('supplier.name') }}</th>
                <th scope="col" class="nowrap">{{ i18n.t('supplier.taxId') }}</th>
                <th scope="col">{{ i18n.t('supplier.city') }}</th>
                <th scope="col" class="nowrap">{{ i18n.t('supplier.mobile') }}</th>
                <th scope="col" class="numeric nowrap">{{ i18n.t('supplier.ordersCount') }}</th>
                <th scope="col" class="nowrap">{{ i18n.t('medicine.status') }}</th>
                <th scope="col" class="col-actions">{{ i18n.t('medicine.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (supplier of supplierList(); track supplier.id) {
                <tr>
                  <td>
                    <span class="supplier-name">{{ i18n.localized(supplier.nameAr, supplier.nameEn) }}</span>
                  </td>
                  <td class="numeric nowrap">{{ supplier.taxId || '—' }}</td>
                  <td>{{ supplier.city || '—' }}</td>
                  <td class="numeric" dir="ltr">{{ supplier.mobile || '—' }}</td>
                  <td class="numeric nowrap">{{ supplier.purchaseOrderCount }}</td>
                  <td class="nowrap">
                    <span class="badge" [class.badge-success]="supplier.isActive" [class.badge-muted]="!supplier.isActive">
                      {{ supplier.isActive ? i18n.t('supplier.active') : i18n.t('supplier.inactive') }}
                    </span>
                  </td>
                  <td class="col-actions">
                    <button class="btn btn-link" (click)="editSupplier(supplier)">{{ i18n.t('action.edit') }}</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (suppliersPage().totalPages > 1) {
          <div class="pagination">
            <span class="pagination-info">{{ i18n.t('pagination.total', { count: suppliersPage().totalCount }) }}</span>
            <div class="pagination-controls">
              <button
                class="btn btn-secondary"
                [disabled]="suppliersPage().page <= 1"
                (click)="loadSuppliersPage(suppliersPage().page - 1)"
              >
                {{ i18n.t('pagination.previous') }}
              </button>
              <span class="pagination-info">
                {{ i18n.t('pagination.page', { page: suppliersPage().page, total: suppliersPage().totalPages || 1 }) }}
              </span>
              <button
                class="btn btn-secondary"
                [disabled]="suppliersPage().page >= suppliersPage().totalPages"
                (click)="loadSuppliersPage(suppliersPage().page + 1)"
              >
                {{ i18n.t('pagination.next') }}
              </button>
            </div>
          </div>
        }
      }
    }

    @if (viewing(); as order) {
      <div class="overlay" (click)="closeView()">
        <div class="dialog dialog-wide" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h2>{{ order.orderNo }}</h2>
            <span class="badge" [class]="statusBadge(order.status)">{{ i18n.t(statusKey(order.status)) }}</span>
          </div>
          <div class="dialog-meta">
            <span>{{ i18n.t('purchases.supplier') }}: {{ i18n.localized(order.supplierNameAr, order.supplierNameEn) }}</span>
            <span>{{ i18n.t('receipt.date') }}: {{ fmt.date(order.orderDate) }}</span>
            @if (order.expectedDeliveryDate) {
              <span>{{ i18n.t('orderForm.expectedDelivery') }}: {{ fmt.date(order.expectedDeliveryDate) }}</span>
            }
            @if (order.receivedAt) {
              <span>{{ i18n.t('purchases.receivedAt') }}: {{ fmt.dateTime(order.receivedAt) }}</span>
            }
          </div>

          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">{{ i18n.t('receipt.item') }}</th>
                  <th scope="col" class="numeric nowrap">{{ i18n.t('pos.quantity') }}</th>
                  <th scope="col" class="numeric nowrap">{{ i18n.t('orderForm.unitPrice') }}</th>
                  <th scope="col" class="numeric nowrap">{{ i18n.t('pos.subtotal') }}</th>
                  <th scope="col" class="numeric nowrap">{{ i18n.t('pos.tax') }}</th>
                  <th scope="col" class="numeric nowrap">{{ i18n.t('receipt.lineTotal') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of order.items; track item.id) {
                  <tr>
                    <td>{{ i18n.localized(item.medicineNameAr, item.medicineNameEn) }}</td>
                    <td class="numeric nowrap">
                      {{ item.quantityReceived }}/{{ item.quantityOrdered }}
                    </td>
                    <td class="numeric nowrap">{{ fmt.amount(item.unitPrice) }}</td>
                    <td class="numeric nowrap">{{ fmt.amount(item.lineSubtotal) }}</td>
                    <td class="numeric nowrap">{{ fmt.amount(item.lineTax) }}</td>
                    <td class="numeric nowrap">{{ fmt.amount(item.lineTotal) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="totals">
            <div class="total-row">
              <span>{{ i18n.t('pos.subtotal') }}</span>
              <span class="numeric">{{ fmt.money(order.subtotal) }}</span>
            </div>
            <div class="total-row">
              <span>{{ i18n.t('pos.tax') }}</span>
              <span class="numeric">{{ fmt.money(order.taxAmount) }}</span>
            </div>
            <div class="total-row">
              <span>{{ i18n.t('pos.discount') }}</span>
              <span class="numeric">- {{ fmt.money(order.discountAmount) }}</span>
            </div>
            <div class="total-row total">
              <span>{{ i18n.t('receipt.total') }}</span>
              <span class="numeric">{{ fmt.money(order.totalAmount) }}</span>
            </div>
          </div>

          <div class="dialog-actions">
            <button class="btn btn-secondary" (click)="closeView()">{{ i18n.t('action.close') }}</button>
            @if (order.status === 'Draft') {
              <button class="btn btn-secondary" (click)="editFromView(order)">{{ i18n.t('action.edit') }}</button>
              <button class="btn btn-primary" (click)="placeFromView(order)">{{ i18n.t('purchases.place') }}</button>
            }
            @if (receivable(order.status)) {
              <button class="btn btn-primary" (click)="receiveFromView(order)">{{ i18n.t('purchases.receive') }}</button>
              <button class="btn btn-danger" (click)="cancelFromView(order)">{{ i18n.t('purchases.cancel') }}</button>
            }
          </div>
        </div>
      </div>
    }

    @if (placing(); as order) {
      <div class="overlay" (click)="cancelPlace()">
        <div class="dialog" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <h2>{{ i18n.t('purchases.placeTitle') }}</h2>
          <p class="dialog-text">{{ i18n.t('purchases.placeConfirm', { order: order.orderNo }) }}</p>
          @if (actionError()) {
            <div class="form-error" role="alert">
              <p>{{ actionErrorMessage() }}</p>
              @if (actionError()?.detail) {
                <p class="error-detail">{{ actionError()!.detail }}</p>
              }
            </div>
          }
          <div class="dialog-actions">
            <button class="btn btn-secondary" (click)="cancelPlace()">{{ i18n.t('action.cancel') }}</button>
            <button class="btn btn-primary" [disabled]="submittingAction()" (click)="confirmPlace()">
              {{ submittingAction() ? i18n.t('state.saving') : i18n.t('purchases.place') }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (cancelling(); as order) {
      <div class="overlay" (click)="cancelCancel()">
        <div class="dialog" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <h2>{{ i18n.t('purchases.cancelTitle') }}</h2>
          <p class="dialog-text">{{ i18n.t('purchases.cancelConfirm', { order: order.orderNo }) }}</p>
          <div class="form-group">
            <label class="form-label" for="cancel-reason">
              {{ i18n.t('sales.returnReason') }}
              <span class="required" aria-hidden="true">*</span>
            </label>
            <input
              id="cancel-reason"
              type="text"
              class="form-input"
              [ngModel]="cancelReason()"
              (ngModelChange)="cancelReason.set($event)"
            />
          </div>
          @if (actionError()) {
            <div class="form-error" role="alert">
              <p>{{ actionErrorMessage() }}</p>
              @if (actionError()?.detail) {
                <p class="error-detail">{{ actionError()!.detail }}</p>
              }
            </div>
          }
          <div class="dialog-actions">
            <button class="btn btn-secondary" (click)="cancelCancel()">{{ i18n.t('action.cancel') }}</button>
            <button
              class="btn btn-danger"
              [disabled]="!cancelReason().trim() || submittingAction()"
              (click)="confirmCancel()"
            >
              {{ submittingAction() ? i18n.t('state.saving') : i18n.t('purchases.cancel') }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (supplierOpen()) {
      <app-supplier-form
        [supplier]="supplierSelected()"
        (close)="closeSupplierForm()"
        (saved)="onSupplierSaved()"
      />
    }

    @if (orderOpen()) {
      <app-purchase-order-form
        [order]="orderSelected()"
        (close)="closeOrderForm()"
        (saved)="onOrderSaved()"
      />
    }

    @if (receiveOpen(); as order) {
      <app-receive-order [order]="order" (close)="receiveOpen.set(null)" (saved)="onReceived()" />
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
        margin-bottom: var(--space-5);
      }
      .page-header h1 {
        font-size: 1.5rem;
        color: var(--color-primary);
        margin: 0;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: var(--space-3);
        margin-bottom: var(--space-5);
      }
      .summary-card {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        padding: var(--space-3);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
      }
      .summary-label {
        font-size: 0.8125rem;
        color: var(--color-text-muted);
      }
      .summary-value {
        font-size: 1.375rem;
        font-weight: 700;
      }
      .summary-card.alert-warning {
        border-color: var(--color-warning);
      }
      .summary-card.alert-danger {
        border-color: var(--color-danger);
      }
      .tabs {
        display: flex;
        gap: var(--space-1);
        margin-bottom: var(--space-4);
        border-bottom: 1px solid var(--color-border);
      }
      .tab {
        padding: var(--space-2) var(--space-4);
        border: none;
        border-bottom: 2px solid transparent;
        background: transparent;
        font: inherit;
        font-size: 0.9375rem;
        color: var(--color-text-muted);
        cursor: pointer;
      }
      .tab.active {
        color: var(--color-primary);
        border-bottom-color: var(--color-primary);
        font-weight: 600;
      }
      .toolbar {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        margin-bottom: var(--space-4);
      }
      .search-input {
        flex: 1;
        min-inline-size: 12rem;
      }
      .filter-select {
        inline-size: auto;
        min-inline-size: 9rem;
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
      .table-wrapper {
        overflow-x: auto;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
      }
      .supplier-name {
        font-weight: 600;
      }
      .progress-text {
        color: var(--color-text-muted);
      }
      .btn-link.danger {
        color: var(--color-danger);
      }
      .actions {
        display: flex;
        gap: var(--space-1);
        white-space: nowrap;
      }
      .col-actions {
        position: sticky;
        inset-inline-end: 0;
        background: var(--color-surface);
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
      .dialog-wide {
        inline-size: min(56rem, 100%);
        max-height: 92vh;
        overflow-y: auto;
      }
      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-3);
      }
      .dialog-header h2 {
        margin: 0;
        font-size: 1.125rem;
      }
      .dialog-meta {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        margin: var(--space-2) 0 var(--space-3);
        color: var(--color-text-muted);
        font-size: 0.875rem;
      }
      .dialog-text {
        margin: 0 0 var(--space-3);
        color: var(--color-text-muted);
      }
      .required {
        color: var(--color-danger);
      }
      .form-error {
        margin-top: var(--space-3);
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--color-danger);
        border-radius: var(--radius-md);
        color: var(--color-danger);
        background: #fdeceb;
      }
      .error-detail {
        margin: var(--space-1) 0 0;
        font-size: 0.8125rem;
        opacity: 0.85;
        direction: ltr;
        unicode-bidi: isolate;
        text-align: start;
      }
      .form-error p {
        margin: 0;
      }
      .totals {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: var(--space-1) var(--space-3);
        margin-block-start: var(--space-3);
      }
      .total-row {
        display: contents;
      }
      .total-row span:first-child {
        color: var(--color-text-muted);
        font-size: 0.875rem;
      }
      .total-row.total span {
        font-weight: 700;
        font-size: 1rem;
      }
      .dialog-actions {
        display: flex;
        gap: var(--space-2);
        margin-block-start: var(--space-4);
        flex-wrap: wrap;
      }
    `,
  ],
})
export class PurchasesListComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  protected readonly fmt = inject(FormatService);
  protected readonly service = inject(PurchasesService);

  protected readonly tabs = TABS;
  protected readonly statuses = PURCHASE_STATUSES;

  protected readonly summary = this.service.summary;
  protected readonly ordersPage = this.service.orders;
  protected readonly suppliersPage = this.service.suppliers;
  protected readonly orderList = computed(() => this.service.orders().items);
  protected readonly supplierList = computed(() => this.service.suppliers().items);

  protected readonly tab = signal<Tab>('orders');
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<PurchaseStatus | ''>('');
  protected readonly supplierFilter = signal<number | null>(null);
  protected readonly activeFilter = signal<'' | 'true' | 'false'>('');

  protected readonly viewing = signal<PurchaseOrder | null>(null);
  protected readonly placing = signal<OrderReference | null>(null);
  protected readonly cancelling = signal<OrderReference | null>(null);
  protected readonly cancelReason = signal('');
  protected readonly submittingAction = signal(false);
  protected readonly actionError = signal<PurchaseSaveError | null>(null);

  protected readonly supplierOpen = signal(false);
  protected readonly supplierSelected = signal<Supplier | null>(null);
  protected readonly orderOpen = signal(false);
  protected readonly orderSelected = signal<PurchaseOrder | null>(null);
  protected readonly receiveOpen = signal<PurchaseOrder | null>(null);

  private searchTimer?: ReturnType<typeof setTimeout>;

  protected readonly actionErrorMessage = computed(() => {
    const err = this.actionError();
    if (!err) return null;
    const key: TranslationKey =
      err.reason === 'conflict' || err.reason === 'invalid'
        ? 'purchases.actionRejected'
        : err.reason === 'notFound'
          ? 'purchases.actionNotFound'
          : 'purchases.actionFailed';
    return this.i18n.t(key);
  });

  ngOnInit(): void {
    this.reload();
    this.service.loadSummary();
    // The supplier filter and the order form's picker read from the same page.
    this.service.loadSuppliers('', 1, 200);
  }

  protected onSearch(term: string): void {
    this.searchTerm.set(term);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.reload(), 250);
  }

  protected onStatus(status: PurchaseStatus | ''): void {
    this.statusFilter.set(status);
    this.reload();
  }

  protected onSupplier(id: number | null): void {
    this.supplierFilter.set(id);
    this.reload();
  }

  protected onActive(value: '' | 'true' | 'false'): void {
    this.activeFilter.set(value);
    this.loadSuppliersPage(1);
  }

  protected switchTab(tab: Tab): void {
    this.tab.set(tab);
    this.reload();
  }

  protected reload(page = 1): void {
    if (this.tab() === 'orders') {
      this.service.loadOrders(
        {
          searchTerm: this.searchTerm().trim() || undefined,
          supplierId: this.supplierFilter() || undefined,
          status: this.statusFilter() || undefined,
        },
        page,
      );
    } else {
      this.loadSuppliersPage(page);
    }
  }

  protected loadSuppliersPage(page: number): void {
    const isActive = this.activeFilter() === '' ? undefined : this.activeFilter() === 'true';
    this.service.loadSuppliers(this.searchTerm().trim(), page, 10, isActive);
  }

  // ── Order actions ───────────────────────────────────────────────────────

  protected viewOrder(item: PurchaseOrderListItem): void {
    this.service.getOrder(item.id).subscribe({
      next: order => this.viewing.set(order),
      error: (err: PurchaseSaveError) => console.error('Failed to load order', err),
    });
  }

  protected editOrder(item: PurchaseOrderListItem): void {
    this.service.getOrder(item.id).subscribe({
      next: order => {
        this.orderSelected.set(order);
        this.orderOpen.set(true);
      },
      error: (err: PurchaseSaveError) => console.error('Failed to load order', err),
    });
  }

  protected openReceive(item: PurchaseOrderListItem): void {
    this.service.getOrder(item.id).subscribe({
      next: order => this.receiveOpen.set(order),
      error: (err: PurchaseSaveError) => console.error('Failed to load order', err),
    });
  }

  protected askPlace(order: PurchaseOrderListItem): void {
    this.placing.set(order);
    this.actionError.set(null);
  }

  protected cancelPlace(): void {
    this.placing.set(null);
    this.actionError.set(null);
  }

  protected confirmPlace(): void {
    const order = this.placing();
    if (!order || this.submittingAction()) return;
    this.submittingAction.set(true);
    this.actionError.set(null);
    this.service.placeOrder(order.id).subscribe({
      next: () => {
        this.submittingAction.set(false);
        this.placing.set(null);
        this.viewing.set(null);
        this.refreshAfterChange();
      },
      error: (err: PurchaseSaveError) => {
        this.submittingAction.set(false);
        this.actionError.set(err);
      },
    });
  }

  protected askCancel(order: PurchaseOrderListItem): void {
    this.cancelling.set(order);
    this.cancelReason.set('');
    this.actionError.set(null);
  }

  protected cancelCancel(): void {
    this.cancelling.set(null);
    this.actionError.set(null);
  }

  protected confirmCancel(): void {
    const order = this.cancelling();
    const reason = this.cancelReason().trim();
    if (!order || !reason || this.submittingAction()) return;
    this.submittingAction.set(true);
    this.actionError.set(null);
    this.service.cancelOrder(order.id, reason).subscribe({
      next: () => {
        this.submittingAction.set(false);
        this.cancelling.set(null);
        this.viewing.set(null);
        this.refreshAfterChange();
      },
      error: (err: PurchaseSaveError) => {
        this.submittingAction.set(false);
        this.actionError.set(err);
      },
    });
  }

  protected receivable(status: PurchaseStatus): boolean {
    return RECEIVABLE_STATUSES.includes(status);
  }

  // ── Detail-dialog shortcuts (arrive from the table via the same fetchers) ──

  protected editFromView(order: PurchaseOrder): void {
    this.viewing.set(null);
    this.orderSelected.set(order);
    this.orderOpen.set(true);
  }

  protected placeFromView(order: PurchaseOrder): void {
    this.viewing.set(null);
    this.placing.set(order);
    this.actionError.set(null);
  }

  protected receiveFromView(order: PurchaseOrder): void {
    this.viewing.set(null);
    this.receiveOpen.set(order);
  }

  protected cancelFromView(order: PurchaseOrder): void {
    this.viewing.set(null);
    this.cancelling.set(order);
    this.cancelReason.set('');
    this.actionError.set(null);
  }

  protected closeView(): void {
    this.viewing.set(null);
  }

  // ── Modal lifecycle ─────────────────────────────────────────────────────

  protected openCreate(): void {
    if (this.tab() === 'orders') {
      this.orderSelected.set(null);
      this.orderOpen.set(true);
    } else {
      this.supplierSelected.set(null);
      this.supplierOpen.set(true);
    }
  }

  protected closeSupplierForm(): void {
    this.supplierOpen.set(false);
    this.supplierSelected.set(null);
  }

  protected onSupplierSaved(): void {
    this.closeSupplierForm();
    this.loadSuppliersPage(this.suppliersPage().page);
  }

  protected editSupplier(supplier: Supplier): void {
    this.supplierSelected.set(supplier);
    this.supplierOpen.set(true);
  }

  protected closeOrderForm(): void {
    this.orderOpen.set(false);
    this.orderSelected.set(null);
  }

  protected onOrderSaved(): void {
    this.closeOrderForm();
    this.refreshAfterChange();
  }

  protected onReceived(): void {
    this.receiveOpen.set(null);
    this.viewing.set(null);
    this.refreshAfterChange();
  }

  /** Stock and money changed in the background, so both lists refresh. */
  private refreshAfterChange(): void {
    this.reload(this.tab() === 'orders' ? this.ordersPage().page : this.suppliersPage().page);
    this.service.loadSummary();
  }

  // ── Labels ──────────────────────────────────────────────────────────────

  protected tabLabel(tab: Tab): TranslationKey {
    return tab === 'orders' ? 'purchases.ordersTab' : 'purchases.suppliersTab';
  }

  protected statusKey(status: PurchaseStatus): TranslationKey {
    return `purchaseStatus.${status}` as TranslationKey;
  }

  protected statusBadge(status: PurchaseStatus): string {
    switch (status) {
      case 'Received':
        return 'badge-success';
      case 'Cancelled':
        return 'badge-danger';
      case 'Ordered':
        return 'badge-warning';
      default:
        return 'badge-muted';
    }
  }
}