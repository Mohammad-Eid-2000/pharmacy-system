import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { PagedResult } from '../medicines/medicines.service';

/**
 * Field names and enum spellings below were taken from the API's generated
 * swagger contract, not inferred — the backend serializes enums as names.
 */
export type StockStatus = 'OutOfStock' | 'Low' | 'Ok';
export type ExpiryStatus = 'Expired' | 'ExpiringSoon' | 'Valid';
export type StockMovementType =
  | 'Receipt'
  | 'Dispense'
  | 'Adjustment'
  | 'Disposal'
  | 'ReturnToSupplier'
  | 'CustomerReturn';

/** Movement types a pharmacist may pick when correcting a batch. `Receipt` is
 *  excluded on purpose: receiving stock creates a batch and has its own screen. */
export const ADJUSTMENT_TYPES: readonly StockMovementType[] = [
  'Dispense',
  'Adjustment',
  'Disposal',
  'ReturnToSupplier',
  'CustomerReturn',
];

export interface InventoryItem {
  medicineId: number;
  nameAr: string;
  nameEn: string;
  barcode: string;
  form: string;
  strength?: string | null;
  isControlled: boolean;
  reorderLevel: number;
  totalQuantity: number;
  batchCount: number;
  nearestExpiryDate?: string | null;
  expiredBatchCount: number;
  expiringSoonBatchCount: number;
  stockValue: number;
  stockStatus: StockStatus;
}

export interface Batch {
  id: number;
  medicineId: number;
  medicineNameAr: string;
  medicineNameEn: string;
  barcode: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  initialQuantity: number;
  purchasePrice: number;
  sellingPrice: number;
  supplierName?: string | null;
  receivedDate: string;
  isActive: boolean;
  daysUntilExpiry: number;
  expiryStatus: ExpiryStatus;
}

export interface StockMovement {
  id: number;
  batchId: number;
  batchNo: string;
  medicineId: number;
  medicineNameAr: string;
  medicineNameEn: string;
  movementType: StockMovementType;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  reason?: string | null;
  reference?: string | null;
  performedBy?: string | null;
  createdAt: string;
}

export interface InventorySummary {
  totalMedicines: number;
  totalBatches: number;
  totalUnits: number;
  totalStockValue: number;
  outOfStockCount: number;
  lowStockCount: number;
  expiredBatchCount: number;
  expiringSoonBatchCount: number;
  expiredStockValue: number;
}

/** Mirrors ReceiveStockCommand on the API. */
export interface ReceiveStockPayload {
  medicineId: number;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  supplierName?: string | null;
  reference?: string | null;
}

/** Mirrors AdjustStockRequest — the batch id travels in the URL, not the body. */
export interface AdjustStockPayload {
  newQuantity: number;
  movementType: StockMovementType;
  reason: string;
  reference?: string | null;
}

/**
 * Typed reason the UI can translate, derived from the API's ProblemDetails status.
 * `detail` carries the server's own explanation, which is English-only, so it is
 * shown as a secondary hint rather than as the primary translated message.
 */
export interface StockSaveError {
  status: number;
  reason: 'duplicateBatch' | 'invalid' | 'unknown';
  detail?: string;
}

function emptyPage<T>(): PagedResult<T> {
  return { items: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
}

const EMPTY_SUMMARY: InventorySummary = {
  totalMedicines: 0,
  totalBatches: 0,
  totalUnits: 0,
  totalStockValue: 0,
  outOfStockCount: 0,
  lowStockCount: 0,
  expiredBatchCount: 0,
  expiringSoonBatchCount: 0,
  expiredStockValue: 0,
};

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly endpoint = '/inventory';

  private readonly _stock = signal<PagedResult<InventoryItem>>(emptyPage<InventoryItem>());
  private readonly _batches = signal<PagedResult<Batch>>(emptyPage<Batch>());
  private readonly _movements = signal<PagedResult<StockMovement>>(emptyPage<StockMovement>());
  private readonly _summary = signal<InventorySummary>(EMPTY_SUMMARY);
  private readonly _loading = signal(false);
  /** Holds a translation key, so the message re-translates when language changes. */
  private readonly _errorKey = signal<'inventory.loadFailed' | null>(null);

  readonly stock = this._stock.asReadonly();
  readonly batches = this._batches.asReadonly();
  readonly movements = this._movements.asReadonly();
  readonly summary = this._summary.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = computed(() => {
    const key = this._errorKey();
    return key ? this.i18n.t(key) : null;
  });

  loadSummary(): void {
    this.http.get<InventorySummary>(`${this.endpoint}/summary`).subscribe({
      next: data => this._summary.set(data),
      error: (err: HttpErrorResponse) => console.error('Failed to load inventory summary', err),
    });
  }

  loadStock(
    filters: { searchTerm?: string; status?: StockStatus; isControlled?: boolean } = {},
    page = 1,
    pageSize = 10,
  ): void {
    const params: Record<string, string | number | boolean> = { page, pageSize };
    if (filters.searchTerm) params['searchTerm'] = filters.searchTerm;
    if (filters.status) params['status'] = filters.status;
    if (filters.isControlled !== undefined) params['isControlled'] = filters.isControlled;
    this.fetch<InventoryItem>(this.endpoint, params, this._stock);
  }

  loadBatches(
    filters: {
      medicineId?: number;
      searchTerm?: string;
      expiryStatus?: ExpiryStatus;
      includeDepleted?: boolean;
    } = {},
    page = 1,
    pageSize = 10,
  ): void {
    const params: Record<string, string | number | boolean> = { page, pageSize };
    if (filters.medicineId) params['medicineId'] = filters.medicineId;
    if (filters.searchTerm) params['searchTerm'] = filters.searchTerm;
    if (filters.expiryStatus) params['expiryStatus'] = filters.expiryStatus;
    if (filters.includeDepleted !== undefined) params['includeDepleted'] = filters.includeDepleted;
    this.fetch<Batch>(`${this.endpoint}/batches`, params, this._batches);
  }

  loadMovements(
    filters: { batchId?: number; medicineId?: number } = {},
    page = 1,
    pageSize = 20,
  ): void {
    const params: Record<string, string | number | boolean> = { page, pageSize };
    if (filters.batchId) params['batchId'] = filters.batchId;
    if (filters.medicineId) params['medicineId'] = filters.medicineId;
    this.fetch<StockMovement>(`${this.endpoint}/movements`, params, this._movements);
  }

  receiveStock(payload: ReceiveStockPayload): Observable<number> {
    return this.http
      .post<number>(`${this.endpoint}/batches`, payload)
      .pipe(catchError(toStockError));
  }

  adjustStock(batchId: number, payload: AdjustStockPayload): Observable<void> {
    return this.http
      .put<void>(`${this.endpoint}/batches/${batchId}/quantity`, payload)
      .pipe(catchError(toStockError));
  }

  private fetch<T>(
    url: string,
    params: Record<string, string | number | boolean>,
    target: { set: (value: PagedResult<T>) => void },
  ): void {
    this._loading.set(true);
    this._errorKey.set(null);
    this.http.get<PagedResult<T>>(url, { params }).subscribe({
      next: data => {
        target.set(data);
        this._loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error(`Failed to load ${url}`, err);
        this._errorKey.set('inventory.loadFailed');
        this._loading.set(false);
      },
    });
  }
}

function toStockError(err: HttpErrorResponse) {
  const reason: StockSaveError['reason'] =
    err.status === 409 ? 'duplicateBatch' : err.status === 400 ? 'invalid' : 'unknown';
  const detail = typeof err.error?.detail === 'string' ? err.error.detail : undefined;
  return throwError(() => ({ status: err.status, reason, detail }) satisfies StockSaveError);
}
