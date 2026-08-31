import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import {
  Batch,
  ExpiryStatus,
  InventoryItem,
  InventoryService,
  StockStatus,
} from './inventory.service';
import { ReceiveStockComponent } from './receive-stock.component';
import { AdjustStockComponent } from './adjust-stock.component';

type Tab = 'stock' | 'batches' | 'movements';

@Component({
  selector: 'app-inventory-list',
  imports: [FormsModule, ReceiveStockComponent, AdjustStockComponent],
  template: `
    <div class="page-header">
      <h1>{{ i18n.t('inventory.title') }}</h1>
      <button class="btn btn-primary" (click)="openReceive()">+ {{ i18n.t('inventory.receiveStock') }}</button>
    </div>

    <!-- Summary cards: the numbers a pharmacist checks before anything else. -->
    <div class="summary-grid">
      <div class="summary-card">
        <span class="summary-label">{{ i18n.t('inventory.summaryUnits') }}</span>
        <span class="summary-value numeric">{{ summary().totalUnits }}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ i18n.t('inventory.summaryValue') }}</span>
        <span class="summary-value numeric">{{ money(summary().totalStockValue) }}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">{{ i18n.t('inventory.summaryBatches') }}</span>
        <span class="summary-value numeric">{{ summary().totalBatches }}</span>
      </div>
      <div class="summary-card" [class.alert-warning]="summary().lowStockCount > 0">
        <span class="summary-label">{{ i18n.t('inventory.summaryLow') }}</span>
        <span class="summary-value numeric">{{ summary().lowStockCount }}</span>
      </div>
      <div class="summary-card" [class.alert-danger]="summary().outOfStockCount > 0">
        <span class="summary-label">{{ i18n.t('inventory.summaryOut') }}</span>
        <span class="summary-value numeric">{{ summary().outOfStockCount }}</span>
      </div>
      <div class="summary-card" [class.alert-warning]="summary().expiringSoonBatchCount > 0">
        <span class="summary-label">{{ i18n.t('inventory.summaryExpiring') }}</span>
        <span class="summary-value numeric">{{ summary().expiringSoonBatchCount }}</span>
      </div>
      <div class="summary-card" [class.alert-danger]="summary().expiredBatchCount > 0">
        <span class="summary-label">{{ i18n.t('inventory.summaryExpired') }}</span>
        <span class="summary-value numeric">{{ summary().expiredBatchCount }}</span>
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
        [placeholder]="i18n.t('inventory.searchPlaceholder')"
        [ngModel]="searchTerm()"
        (ngModelChange)="onSearch($event)"
      />

      @if (tab() === 'stock') {
        <select class="form-input filter-select" [ngModel]="stockStatus()" (ngModelChange)="onStockStatus($event)">
          <option value="">{{ i18n.t('stockStatus.all') }}</option>
          @for (s of stockStatuses; track s) {
            <option [value]="s">{{ i18n.t(stockStatusKey(s)) }}</option>
          }
        </select>
      }

      @if (tab() === 'batches') {
        <select class="form-input filter-select" [ngModel]="expiryStatus()" (ngModelChange)="onExpiryStatus($event)">
          <option value="">{{ i18n.t('expiryStatus.all') }}</option>
          @for (s of expiryStatuses; track s) {
            <option [value]="s">{{ i18n.t(expiryStatusKey(s)) }}</option>
          }
        </select>
        <label class="checkbox-inline">
          <input type="checkbox" [ngModel]="showDepleted()" (ngModelChange)="onShowDepleted($event)" />
          <span>{{ i18n.t('batch.showDepleted') }}</span>
        </label>
      }

      @if (medicineFilter(); as filtered) {
        <div class="active-filter">
          <span>{{ i18n.t('batch.filteredBy', { name: filtered.name }) }}</span>
          <button class="btn btn-link" (click)="clearMedicineFilter()">{{ i18n.t('batch.clearFilter') }}</button>
        </div>
      }
    </div>

    @if (service.loading()) {
      <p class="state-message">{{ i18n.t('state.loading') }}</p>
    } @else if (service.error()) {
      <div class="state-message error">
        <span>{{ service.error() }}</span>
        <button class="btn btn-secondary" (click)="reload()">{{ i18n.t('action.retry') }}</button>
      </div>
    } @else if (tab() === 'stock') {
      @if (stock().items.length === 0) {
        <p class="state-message">{{ i18n.t('inventory.emptyStock') }}</p>
      } @else {
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>{{ i18n.t('medicine.name') }}</th>
                <th>{{ i18n.t('medicine.barcode') }}</th>
                <th>{{ i18n.t('inventory.quantity') }}</th>
                <th>{{ i18n.t('inventory.reorderLevel') }}</th>
                <th>{{ i18n.t('inventory.batchCount') }}</th>
                <th>{{ i18n.t('inventory.nearestExpiry') }}</th>
                <th>{{ i18n.t('inventory.stockValue') }}</th>
                <th>{{ i18n.t('medicine.status') }}</th>
                <th class="actions">{{ i18n.t('medicine.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (item of stock().items; track item.medicineId) {
                <tr>
                  <td>
                    <span class="medicine-name">{{ i18n.localized(item.nameAr, item.nameEn) }}</span>
                    @if (item.isControlled) {
                      <span class="badge badge-warning">{{ i18n.t('medicine.controlledShort') }}</span>
                    }
                  </td>
                  <td class="numeric">{{ item.barcode }}</td>
                  <td class="numeric strong">{{ item.totalQuantity }}</td>
                  <td class="numeric muted">{{ item.reorderLevel }}</td>
                  <td class="numeric">{{ item.batchCount }}</td>
                  <td class="numeric expiry-cell">
                    @if (item.nearestExpiryDate) {
                      <span>{{ date(item.nearestExpiryDate) }}</span>
                      @if (item.expiredBatchCount > 0) {
                        <span class="badge badge-danger">{{ i18n.t('expiryStatus.Expired') }}</span>
                      } @else if (item.expiringSoonBatchCount > 0) {
                        <span class="badge badge-warning">{{ i18n.t('expiryStatus.ExpiringSoon') }}</span>
                      }
                    } @else {
                      —
                    }
                  </td>
                  <td class="numeric">{{ money(item.stockValue) }}</td>
                  <td>
                    <span class="badge" [class]="stockBadgeClass(item.stockStatus)">
                      {{ i18n.t(stockStatusKey(item.stockStatus)) }}
                    </span>
                  </td>
                  <td class="actions nowrap">
                    <button class="btn btn-link" (click)="showBatchesFor(item)">
                      {{ i18n.t('inventory.viewBatches') }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (stock().totalPages > 1) {
          <div class="pagination">
            <span class="pagination-info">{{ i18n.t('pagination.total', { count: stock().totalCount }) }}</span>
            <div class="pagination-controls">
              <button class="btn btn-secondary" [disabled]="stock().page <= 1" (click)="goToPage(stock().page - 1)">
                {{ i18n.t('pagination.previous') }}
              </button>
              <span class="pagination-info">
                {{ i18n.t('pagination.page', { page: stock().page, total: stock().totalPages || 1 }) }}
              </span>
              <button
                class="btn btn-secondary"
                [disabled]="stock().page >= stock().totalPages"
                (click)="goToPage(stock().page + 1)"
              >
                {{ i18n.t('pagination.next') }}
              </button>
            </div>
          </div>
        }
      }
    } @else if (tab() === 'batches') {
      @if (batches().items.length === 0) {
        <p class="state-message">{{ i18n.t('inventory.emptyBatches') }}</p>
      } @else {
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>{{ i18n.t('batch.batchNo') }}</th>
                <th>{{ i18n.t('batch.medicine') }}</th>
                <th>{{ i18n.t('batch.expiryDate') }}</th>
                <th>{{ i18n.t('batch.daysLeft') }}</th>
                <th>{{ i18n.t('batch.quantity') }}</th>
                <th>{{ i18n.t('batch.purchasePrice') }}</th>
                <th>{{ i18n.t('batch.sellingPrice') }}</th>
                <th>{{ i18n.t('batch.supplier') }}</th>
                <th class="actions">{{ i18n.t('medicine.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (batch of batches().items; track batch.id) {
                <tr [class.row-expired]="batch.expiryStatus === 'Expired'">
                  <td class="numeric strong">{{ batch.batchNo }}</td>
                  <td>{{ i18n.localized(batch.medicineNameAr, batch.medicineNameEn) }}</td>
                  <td class="numeric expiry-cell">
                    <span>{{ date(batch.expiryDate) }}</span>
                    <span class="badge" [class]="expiryBadgeClass(batch.expiryStatus)">
                      {{ i18n.t(expiryStatusKey(batch.expiryStatus)) }}
                    </span>
                  </td>
                  <td class="numeric">{{ daysLabel(batch.daysUntilExpiry) }}</td>
                  <td class="numeric strong">
                    {{ batch.quantity }}
                    <span class="muted">/ {{ batch.initialQuantity }}</span>
                  </td>
                  <td class="numeric">{{ money(batch.purchasePrice) }}</td>
                  <td class="numeric">{{ money(batch.sellingPrice) }}</td>
                  <td>{{ batch.supplierName || '—' }}</td>
                  <td class="actions nowrap">
                    <button class="btn btn-link" (click)="openAdjust(batch)">{{ i18n.t('batch.adjust') }}</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (batches().totalPages > 1) {
          <div class="pagination">
            <span class="pagination-info">{{ i18n.t('pagination.total', { count: batches().totalCount }) }}</span>
            <div class="pagination-controls">
              <button class="btn btn-secondary" [disabled]="batches().page <= 1" (click)="goToPage(batches().page - 1)">
                {{ i18n.t('pagination.previous') }}
              </button>
              <span class="pagination-info">
                {{ i18n.t('pagination.page', { page: batches().page, total: batches().totalPages || 1 }) }}
              </span>
              <button
                class="btn btn-secondary"
                [disabled]="batches().page >= batches().totalPages"
                (click)="goToPage(batches().page + 1)"
              >
                {{ i18n.t('pagination.next') }}
              </button>
            </div>
          </div>
        }
      }
    } @else {
      @if (movements().items.length === 0) {
        <p class="state-message">{{ i18n.t('inventory.emptyMovements') }}</p>
      } @else {
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>{{ i18n.t('movement.date') }}</th>
                <th>{{ i18n.t('batch.medicine') }}</th>
                <th>{{ i18n.t('batch.batchNo') }}</th>
                <th>{{ i18n.t('movement.type') }}</th>
                <th>{{ i18n.t('movement.change') }}</th>
                <th>{{ i18n.t('movement.before') }}</th>
                <th>{{ i18n.t('movement.after') }}</th>
                <th>{{ i18n.t('movement.reason') }}</th>
                <th>{{ i18n.t('movement.reference') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (move of movements().items; track move.id) {
                <tr>
                  <td class="numeric">{{ dateTime(move.createdAt) }}</td>
                  <td>{{ i18n.localized(move.medicineNameAr, move.medicineNameEn) }}</td>
                  <td class="numeric">{{ move.batchNo }}</td>
                  <td>
                    <span class="badge badge-muted">{{ i18n.t(movementTypeKey(move.movementType)) }}</span>
                  </td>
                  <td class="numeric strong" [class.positive]="move.quantityChange > 0" [class.negative]="move.quantityChange < 0">
                    {{ signed(move.quantityChange) }}
                  </td>
                  <td class="numeric muted">{{ move.quantityBefore }}</td>
                  <td class="numeric">{{ move.quantityAfter }}</td>
                  <td>{{ move.reason || '—' }}</td>
                  <td class="numeric">{{ move.reference || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (movements().totalPages > 1) {
          <div class="pagination">
            <span class="pagination-info">{{ i18n.t('pagination.total', { count: movements().totalCount }) }}</span>
            <div class="pagination-controls">
              <button class="btn btn-secondary" [disabled]="movements().page <= 1" (click)="goToPage(movements().page - 1)">
                {{ i18n.t('pagination.previous') }}
              </button>
              <span class="pagination-info">
                {{ i18n.t('pagination.page', { page: movements().page, total: movements().totalPages || 1 }) }}
              </span>
              <button
                class="btn btn-secondary"
                [disabled]="movements().page >= movements().totalPages"
                (click)="goToPage(movements().page + 1)"
              >
                {{ i18n.t('pagination.next') }}
              </button>
            </div>
          </div>
        }
      }
    }

    @if (receiveOpen()) {
      <app-receive-stock (close)="receiveOpen.set(false)" (saved)="onSaved()" />
    }
    @if (adjusting(); as batch) {
      <app-adjust-stock [batch]="batch" (close)="adjusting.set(null)" (saved)="onSaved()" />
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

      .summary-grid {
        display: grid;
        /* 120px lets all seven cards share one row on a desktop width instead of
           orphaning the last card onto a row of its own. */
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: var(--space-3);
        margin-bottom: var(--space-6);
      }
      .summary-card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: var(--space-4);
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }
      .summary-label {
        font-size: 0.8125rem;
        color: var(--color-text-muted);
        line-height: 1.35;
      }
      .summary-value {
        font-size: 1.375rem;
        font-weight: 700;
        color: var(--color-text);
      }
      /* Border-and-tint only: keeps text on a light background so contrast holds. */
      .summary-card.alert-warning {
        border-color: var(--color-warning);
        background: #fdf6e8;
      }
      .summary-card.alert-warning .summary-value {
        color: var(--color-warning);
      }
      .summary-card.alert-danger {
        border-color: var(--color-danger);
        background: #fdeceb;
      }
      .summary-card.alert-danger .summary-value {
        color: var(--color-danger);
      }

      .tabs {
        display: flex;
        gap: var(--space-1);
        border-bottom: 1px solid var(--color-border);
        margin-bottom: var(--space-4);
        flex-wrap: wrap;
      }
      .tab {
        appearance: none;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        padding: var(--space-3) var(--space-4);
        font: inherit;
        color: var(--color-text-muted);
        cursor: pointer;
        white-space: nowrap;
      }
      .tab:hover {
        color: var(--color-text);
      }
      .tab.active {
        color: var(--color-primary);
        border-bottom-color: var(--color-primary);
        font-weight: 600;
      }

      .toolbar {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        flex-wrap: wrap;
        margin-bottom: var(--space-4);
      }
      .search-input {
        max-width: 320px;
      }
      .filter-select {
        max-width: 220px;
      }
      .checkbox-inline {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        color: var(--color-text-muted);
        font-size: 0.9375rem;
        white-space: nowrap;
      }
      .active-filter {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: var(--space-1) var(--space-3);
        font-size: 0.9375rem;
      }

      .table-wrapper {
        overflow-x: auto;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
      }
      /* These tables carry many columns. Keep the cells compact and stop values
         breaking mid-token ("AMX-" / "2024-X" on separate lines). */
      .table-wrapper .table th,
      .table-wrapper .table td {
        padding: var(--space-3);
      }
      /* Two-word headers like "Purchase Price" may wrap; forcing them onto one
         line is what pushed this table past the viewport. The values below them
         still never wrap. */
      .table-wrapper .table th {
        white-space: normal;
      }
      .table-wrapper .table .numeric,
      .table-wrapper .table .nowrap {
        white-space: nowrap;
      }
      /* The action column must stay reachable even when the table scrolls. */
      .table-wrapper .table th.actions,
      .table-wrapper .table td.actions {
        position: sticky;
        inset-inline-end: 0;
        background: var(--color-surface);
        /* Separates the pinned column from the cells scrolling beneath it. */
        box-shadow: -1px 0 0 var(--color-border);
      }
      .table-wrapper .table th.actions {
        background: var(--color-bg);
      }
      .table-wrapper .table tbody tr:hover td.actions {
        background: var(--color-bg);
      }
      .table-wrapper .table tbody tr.row-expired td.actions {
        background: #fdeeec;
      }
      /* Stacking the badge under the date keeps this column from dominating the
         table — inline they measured over 200px wide. The badge is made a block
         rather than the cell a flex container: a flex display on a <td> replaces
         table-cell and makes the row border render at content width instead of
         column width. */
      .expiry-cell .badge {
        display: block;
        width: fit-content;
        margin-top: 2px;
      }
      .medicine-name {
        font-weight: 600;
      }
      .strong {
        font-weight: 600;
      }
      .muted {
        color: var(--color-text-muted);
      }
      .positive {
        color: var(--color-success);
      }
      .negative {
        color: var(--color-danger);
      }
      .row-expired {
        background: #fdeceb;
      }
      /* Badges sit next to text, so give them breathing room on the leading edge. */
      .badge {
        margin-inline-start: var(--space-2);
      }
      .badge-danger {
        background: #fdeceb;
        color: var(--color-danger);
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
export class InventoryListComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  protected readonly service = inject(InventoryService);

  protected readonly stock = this.service.stock;
  protected readonly batches = this.service.batches;
  protected readonly movements = this.service.movements;
  protected readonly summary = this.service.summary;

  protected readonly tabs: readonly Tab[] = ['stock', 'batches', 'movements'];
  protected readonly stockStatuses: readonly StockStatus[] = ['OutOfStock', 'Low', 'Ok'];
  protected readonly expiryStatuses: readonly ExpiryStatus[] = ['Expired', 'ExpiringSoon', 'Valid'];

  protected readonly tab = signal<Tab>('stock');
  protected readonly searchTerm = signal('');
  protected readonly stockStatus = signal<StockStatus | ''>('');
  protected readonly expiryStatus = signal<ExpiryStatus | ''>('');
  protected readonly showDepleted = signal(false);
  protected readonly medicineFilter = signal<{ id: number; name: string } | null>(null);

  protected readonly receiveOpen = signal(false);
  protected readonly adjusting = signal<Batch | null>(null);

  /**
   * Arabic uses `-u-nu-latn` so numerals stay Latin. Quantities, barcodes and
   * prices elsewhere in the app are plain interpolations and therefore Latin;
   * letting Intl switch to Arabic-Indic digits here would put two different
   * digit systems side by side in the same table row.
   */
  private readonly numberLocale = computed(() => (this.i18n.lang() === 'ar' ? 'ar-JO-u-nu-latn' : 'en-JO'));
  private readonly dateLocale = computed(() => (this.i18n.lang() === 'ar' ? 'ar-JO-u-nu-latn' : 'en-GB'));

  /** Formats money with the 3 decimals the Jordanian dinar uses. */
  private readonly moneyFormat = computed(
    () =>
      new Intl.NumberFormat(this.numberLocale(), {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      }),
  );
  private readonly dateFormat = computed(
    () => new Intl.DateTimeFormat(this.dateLocale(), { dateStyle: 'medium' }),
  );
  private readonly dateTimeFormat = computed(
    () =>
      new Intl.DateTimeFormat(this.dateLocale(), {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
  );

  private searchDebounce?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.service.loadSummary();
    this.reload();
  }

  protected reload(page = 1): void {
    switch (this.tab()) {
      case 'stock':
        this.service.loadStock(
          {
            searchTerm: this.searchTerm() || undefined,
            status: this.stockStatus() || undefined,
          },
          page,
        );
        break;
      case 'batches':
        this.service.loadBatches(
          {
            medicineId: this.medicineFilter()?.id,
            searchTerm: this.searchTerm() || undefined,
            expiryStatus: this.expiryStatus() || undefined,
            includeDepleted: this.showDepleted(),
          },
          page,
        );
        break;
      case 'movements':
        this.service.loadMovements({ medicineId: this.medicineFilter()?.id }, page);
        break;
    }
  }

  protected switchTab(tab: Tab): void {
    if (this.tab() === tab) return;
    this.tab.set(tab);
    this.reload();
  }

  protected onSearch(term: string): void {
    this.searchTerm.set(term);
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.reload(), 300);
  }

  protected onStockStatus(value: StockStatus | ''): void {
    this.stockStatus.set(value);
    this.reload();
  }

  protected onExpiryStatus(value: ExpiryStatus | ''): void {
    this.expiryStatus.set(value);
    this.reload();
  }

  protected onShowDepleted(value: boolean): void {
    this.showDepleted.set(value);
    this.reload();
  }

  /** Jumps from a medicine row to that medicine's batches. */
  protected showBatchesFor(item: InventoryItem): void {
    this.medicineFilter.set({ id: item.medicineId, name: this.i18n.localized(item.nameAr, item.nameEn) });
    this.expiryStatus.set('');
    this.searchTerm.set('');
    this.tab.set('batches');
    this.reload();
  }

  protected clearMedicineFilter(): void {
    this.medicineFilter.set(null);
    this.reload();
  }

  protected goToPage(page: number): void {
    this.reload(page);
  }

  protected openReceive(): void {
    this.receiveOpen.set(true);
  }

  protected openAdjust(batch: Batch): void {
    this.adjusting.set(batch);
  }

  /** A stock change alters totals, batches and the audit log, so refresh all of it. */
  protected onSaved(): void {
    this.receiveOpen.set(false);
    this.adjusting.set(null);
    this.service.loadSummary();
    this.reload(this.currentPage());
  }

  private currentPage(): number {
    switch (this.tab()) {
      case 'stock':
        return this.stock().page;
      case 'batches':
        return this.batches().page;
      case 'movements':
        return this.movements().page;
    }
  }

  protected tabLabel(tab: Tab): TranslationKey {
    const map: Record<Tab, TranslationKey> = {
      stock: 'inventory.stockTab',
      batches: 'inventory.batchesTab',
      movements: 'inventory.movementsTab',
    };
    return map[tab];
  }

  protected stockStatusKey(status: StockStatus): TranslationKey {
    return `stockStatus.${status}` as TranslationKey;
  }

  protected expiryStatusKey(status: ExpiryStatus): TranslationKey {
    return `expiryStatus.${status}` as TranslationKey;
  }

  protected movementTypeKey(type: string): TranslationKey {
    return `movementType.${type}` as TranslationKey;
  }

  protected stockBadgeClass(status: StockStatus): string {
    switch (status) {
      case 'OutOfStock':
        return 'badge-danger';
      case 'Low':
        return 'badge-warning';
      case 'Ok':
        return 'badge-success';
    }
  }

  protected expiryBadgeClass(status: ExpiryStatus): string {
    switch (status) {
      case 'Expired':
        return 'badge-danger';
      case 'ExpiringSoon':
        return 'badge-warning';
      case 'Valid':
        return 'badge-success';
    }
  }

  protected money(value: number): string {
    // Non-breaking space keeps the amount and the currency on one line.
    return `${this.moneyFormat().format(value)}\u00A0${this.i18n.t('unit.jod')}`;
  }

  /**
   * Arabic date patterns embed U+200F (RLM) between the segments. Inside a cell
   * that is isolated to LTR for its numerals, those marks reorder the parts and
   * render 22/04/2028 as "222028/04/". Stripping the bidi controls leaves the
   * segment order the format already specifies.
   */
  private stripBidi(text: string): string {
    return text.replace(/[\u200E\u200F\u061C]/g, '');
  }

  protected date(iso: string): string {
    return this.stripBidi(this.dateFormat().format(new Date(iso)));
  }

  protected dateTime(iso: string): string {
    return this.stripBidi(this.dateTimeFormat().format(new Date(iso)));
  }

  /** Expired batches report negative days, so phrase them as "N days ago". */
  protected daysLabel(days: number): string {
    return days < 0
      ? this.i18n.t('expiry.daysAgo', { n: Math.abs(days) })
      : this.i18n.t('expiry.inDays', { n: days });
  }

  /** Keeps the sign visible on stock deltas, including in Arabic numerals. */
  protected signed(value: number): string {
    return value > 0 ? `+${value}` : String(value);
  }
}
