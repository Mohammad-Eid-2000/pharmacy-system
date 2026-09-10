import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { PagedResult } from '../medicines/medicines.service';

/**
 * Enum spellings mirror the API, which serializes enums as names rather than
 * numbers. Adding a member here without adding it on the server produces a
 * request the server rejects, so these lists stay deliberately short.
 */
export type PurchaseStatus = 'Draft' | 'Ordered' | 'Received' | 'Cancelled';

export const PURCHASE_STATUSES: readonly PurchaseStatus[] = [
  'Draft',
  'Ordered',
  'Received',
  'Cancelled',
];

/** Statuses the UI can act on: receiving still makes sense and is not final. */
export const RECEIVABLE_STATUSES: readonly PurchaseStatus[] = ['Draft', 'Ordered'];

export interface Supplier {
  id: number;
  nameAr: string;
  nameEn: string;
  taxId?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
  isActive: boolean;
  purchaseOrderCount: number;
  createdAt: string;
}

/** Payload for creating a supplier — mirrors CreateSupplierCommand on the API. */
export type CreateSupplierPayload = Omit<
  Supplier,
  'id' | 'purchaseOrderCount' | 'createdAt' | 'isActive'
>;

/** Payload for updating a supplier — mirrors UpdateSupplierCommand (requires Id). */
export type UpdateSupplierPayload = Omit<Supplier, 'purchaseOrderCount' | 'createdAt'>;

export interface PurchaseOrderItem {
  id: number;
  medicineId: number;
  medicineNameAr: string;
  medicineNameEn: string;
  barcode: string;
  taxRate: number;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: number;
  orderNo: string;
  supplierId: number;
  supplierNameAr: string;
  supplierNameEn: string;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  status: PurchaseStatus;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string | null;
  receivedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  totalUnits: number;
  items: PurchaseOrderItem[];
}

/** Order without its lines, for the order list. */
export interface PurchaseOrderListItem {
  id: number;
  orderNo: string;
  supplierId: number;
  supplierNameAr: string;
  supplierNameEn: string;
  orderDate: string;
  status: PurchaseStatus;
  totalAmount: number;
  lineCount: number;
  totalUnits: number;
  unitsReceived: number;
}

export interface PurchasesSummary {
  draftCount: number;
  outstandingCount: number;
  receivedCount: number;
  cancelledCount: number;
  /** Total amount of goods actually received this calendar year. */
  receivedCost: number;
  activeSuppliersCount: number;
}

// ── Payloads (mirror the API commands / request records) ────────────────────

export interface PurchaseLinePayload {
  medicineId: number;
  quantity: number;
  unitPrice: number;
}

/** Mirrors CreatePurchaseOrderCommand — the server recomputes all money totals. */
export interface CreateOrderPayload {
  supplierId: number;
  items: PurchaseLinePayload[];
  expectedDeliveryDate?: string | null;
  discountAmount?: number;
  notes?: string | null;
}

/** Mirrors UpdatePurchaseOrderCommand — the order id travels in the URL and the body. */
export interface UpdateOrderPayload {
  id: number;
  supplierId: number;
  items: PurchaseLinePayload[];
  expectedDeliveryDate?: string | null;
  discountAmount?: number;
  notes?: string | null;
}

/** Mirrors ReceiveOrderLineRequest — one line actually arriving now. */
export interface ReceiveLinePayload {
  purchaseOrderItemId: number;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  sellingPrice: number;
}

/**
 * Typed reason the UI can translate, derived from the API's ProblemDetails status.
 * `detail` carries the server's own English explanation, shown as a secondary hint
 * under the translated message rather than in place of it.
 */
export interface PurchaseSaveError {
  status: number;
  reason: 'duplicateSupplier' | 'duplicateBatch' | 'conflict' | 'invalid' | 'notFound' | 'unknown';
  detail?: string;
}

function emptyPage<T>(): PagedResult<T> {
  return { items: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
}

const EMPTY_SUMMARY: PurchasesSummary = {
  draftCount: 0,
  outstandingCount: 0,
  receivedCount: 0,
  cancelledCount: 0,
  receivedCost: 0,
  activeSuppliersCount: 0,
};

@Injectable({ providedIn: 'root' })
export class PurchasesService {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly endpoint = '/purchases';
  private readonly suppliersEndpoint = '/suppliers';

  private readonly _suppliers = signal<PagedResult<Supplier>>(emptyPage<Supplier>());
  private readonly _orders = signal<PagedResult<PurchaseOrderListItem>>(emptyPage<PurchaseOrderListItem>());
  private readonly _summary = signal<PurchasesSummary>(EMPTY_SUMMARY);
  private readonly _loading = signal(false);
  /** Holds a translation key, so the message re-translates when language changes. */
  private readonly _errorKey = signal<'purchases.loadFailed' | null>(null);

  readonly suppliers = this._suppliers.asReadonly();
  readonly orders = this._orders.asReadonly();
  readonly summary = this._summary.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = computed(() => {
    const key = this._errorKey();
    return key ? this.i18n.t(key) : null;
  });

  // ── Suppliers ───────────────────────────────────────────────────────────

  loadSuppliers(searchTerm = '', page = 1, pageSize = 10, isActive?: boolean): void {
    const params: Record<string, string | number | boolean> = { page, pageSize };
    if (searchTerm) params['searchTerm'] = searchTerm;
    if (isActive !== undefined) params['isActive'] = isActive;
    this.fetch<Supplier>(this.suppliersEndpoint, params, this._suppliers);
  }

  createSupplier(payload: CreateSupplierPayload): Observable<number> {
    return this.http
      .post<number>(this.suppliersEndpoint, payload)
      .pipe(catchError(toSupplierError));
  }

  updateSupplier(payload: UpdateSupplierPayload): Observable<void> {
    return this.http
      .put<void>(`${this.suppliersEndpoint}/${payload.id}`, payload)
      .pipe(catchError(toSupplierError));
  }

  // ── Purchase orders ─────────────────────────────────────────────────────

  loadSummary(): void {
    this.http.get<PurchasesSummary>(`${this.endpoint}/summary`).subscribe({
      next: data => this._summary.set(data),
      error: (err: HttpErrorResponse) => console.error('Failed to load purchases summary', err),
    });
  }

  loadOrders(
    filters: { searchTerm?: string; supplierId?: number; status?: PurchaseStatus } = {},
    page = 1,
    pageSize = 10,
  ): void {
    const params: Record<string, string | number | boolean> = { page, pageSize };
    if (filters.searchTerm) params['searchTerm'] = filters.searchTerm;
    if (filters.supplierId) params['supplierId'] = filters.supplierId;
    if (filters.status) params['status'] = filters.status;
    this.fetch<PurchaseOrderListItem>(this.endpoint, params, this._orders);
  }

  getOrder(id: number): Observable<PurchaseOrder> {
    return this.http.get<PurchaseOrder>(`${this.endpoint}/${id}`).pipe(catchError(toPurchaseError));
  }

  createOrder(payload: CreateOrderPayload): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(this.endpoint, payload).pipe(catchError(toPurchaseError));
  }

  updateOrder(payload: UpdateOrderPayload): Observable<PurchaseOrder> {
    return this.http
      .put<PurchaseOrder>(`${this.endpoint}/${payload.id}`, payload)
      .pipe(catchError(toPurchaseError));
  }

  placeOrder(id: number): Observable<PurchaseOrder> {
    return this.http
      .post<PurchaseOrder>(`${this.endpoint}/${id}/place`, null)
      .pipe(catchError(toPurchaseError));
  }

  cancelOrder(id: number, reason: string): Observable<PurchaseOrder> {
    return this.http
      .post<PurchaseOrder>(`${this.endpoint}/${id}/cancel`, { reason })
      .pipe(catchError(toPurchaseError));
  }

  receiveOrder(id: number, lines: ReceiveLinePayload[]): Observable<PurchaseOrder> {
    return this.http
      .post<PurchaseOrder>(`${this.endpoint}/${id}/receive`, { lines })
      .pipe(catchError(toPurchaseError));
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
        this._errorKey.set('purchases.loadFailed');
        this._loading.set(false);
      },
    });
  }
}

function toSupplierError(err: HttpErrorResponse) {
  const reason: PurchaseSaveError['reason'] =
    err.status === 409 ? 'duplicateSupplier' : err.status === 400 ? 'invalid' : 'unknown';
  const detail = typeof err.error?.detail === 'string' ? err.error.detail : undefined;
  return throwError(() => ({ status: err.status, reason, detail }) satisfies PurchaseSaveError);
}

function toPurchaseError(err: HttpErrorResponse) {
  const reason: PurchaseSaveError['reason'] =
    err.status === 409
      ? 'conflict'
      : err.status === 400
        ? 'invalid'
        : err.status === 404
          ? 'notFound'
          : 'unknown';
  const detail = typeof err.error?.detail === 'string' ? err.error.detail : undefined;
  return throwError(() => ({ status: err.status, reason, detail }) satisfies PurchaseSaveError);
}