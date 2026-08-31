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
export type PaymentMethod = 'Cash' | 'Card' | 'Insurance' | 'MobileWallet';
export type SaleStatus = 'Completed' | 'Returned';

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  'Cash',
  'Card',
  'Insurance',
  'MobileWallet',
];

export interface SellableProduct {
  medicineId: number;
  nameAr: string;
  nameEn: string;
  barcode: string;
  form: string;
  strength?: string | null;
  isControlled: boolean;
  controlledLevel: number;
  taxRate: number;
  unitPrice: number;
  availableQuantity: number;
  nearestExpiryDate?: string | null;
}

export interface SaleItem {
  id: number;
  medicineId: number;
  batchId: number;
  medicineNameAr: string;
  medicineNameEn: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
}

export interface Sale {
  id: number;
  invoiceNo: string;
  saleDate: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeDue: number;
  status: SaleStatus;
  customerName?: string | null;
  prescriptionNo?: string | null;
  cashierName?: string | null;
  notes?: string | null;
  returnedAt?: string | null;
  returnReason?: string | null;
  totalUnits: number;
  items: SaleItem[];
}

export interface SaleListItem {
  id: number;
  invoiceNo: string;
  saleDate: string;
  totalAmount: number;
  discountAmount: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  customerName?: string | null;
  prescriptionNo?: string | null;
  lineCount: number;
  totalUnits: number;
}

export interface SalesSummary {
  date: string;
  salesCount: number;
  returnedCount: number;
  unitsSold: number;
  revenue: number;
  taxCollected: number;
  discountsGiven: number;
  averageBasket: number;
  cashRevenue: number;
  nonCashRevenue: number;
}

/**
 * What the till sends. Note the absence of any price: the server prices the sale
 * from its own stored batch prices, so a tampered client cannot name its own.
 */
export interface CreateSalePayload {
  items: { medicineId: number; quantity: number }[];
  paymentMethod: PaymentMethod;
  amountPaid: number;
  discountAmount?: number;
  customerName?: string | null;
  prescriptionNo?: string | null;
  cashierName?: string | null;
  notes?: string | null;
}

/**
 * Typed reason the UI can translate. `detail` carries the server's own English
 * explanation, shown as a secondary hint under the translated message rather
 * than in place of it.
 */
export interface SaleError {
  status: number;
  reason: 'alreadyReturned' | 'invalid' | 'notFound' | 'unknown';
  detail?: string;
}

function emptyPage<T>(): PagedResult<T> {
  return { items: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
}

const EMPTY_SUMMARY: SalesSummary = {
  date: new Date().toISOString(),
  salesCount: 0,
  returnedCount: 0,
  unitsSold: 0,
  revenue: 0,
  taxCollected: 0,
  discountsGiven: 0,
  averageBasket: 0,
  cashRevenue: 0,
  nonCashRevenue: 0,
};

@Injectable({ providedIn: 'root' })
export class PosService {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly endpoint = '/sales';

  private readonly _products = signal<PagedResult<SellableProduct>>(emptyPage<SellableProduct>());
  private readonly _sales = signal<PagedResult<SaleListItem>>(emptyPage<SaleListItem>());
  private readonly _summary = signal<SalesSummary>(EMPTY_SUMMARY);
  private readonly _loading = signal(false);
  private readonly _errorKey = signal<'pos.loadFailed' | null>(null);

  readonly products = this._products.asReadonly();
  readonly sales = this._sales.asReadonly();
  readonly summary = this._summary.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = computed(() => {
    const key = this._errorKey();
    return key ? this.i18n.t(key) : null;
  });

  loadSummary(): void {
    this.http.get<SalesSummary>(`${this.endpoint}/summary`).subscribe({
      next: data => this._summary.set(data),
      error: (err: HttpErrorResponse) => console.error('Failed to load sales summary', err),
    });
  }

  loadProducts(searchTerm = '', page = 1, pageSize = 20): void {
    const params: Record<string, string | number | boolean> = { page, pageSize };
    if (searchTerm) params['searchTerm'] = searchTerm;
    this.fetch<SellableProduct>(`${this.endpoint}/products`, params, this._products);
  }

  loadSales(
    filters: {
      searchTerm?: string;
      status?: SaleStatus;
      paymentMethod?: PaymentMethod;
    } = {},
    page = 1,
    pageSize = 10,
  ): void {
    const params: Record<string, string | number | boolean> = { page, pageSize };
    if (filters.searchTerm) params['searchTerm'] = filters.searchTerm;
    if (filters.status) params['status'] = filters.status;
    if (filters.paymentMethod) params['paymentMethod'] = filters.paymentMethod;
    this.fetch<SaleListItem>(this.endpoint, params, this._sales);
  }

  getSale(id: number): Observable<Sale> {
    return this.http.get<Sale>(`${this.endpoint}/${id}`).pipe(catchError(toSaleError));
  }

  createSale(payload: CreateSalePayload): Observable<Sale> {
    return this.http.post<Sale>(this.endpoint, payload).pipe(catchError(toSaleError));
  }

  returnSale(id: number, reason: string): Observable<Sale> {
    return this.http
      .post<Sale>(`${this.endpoint}/${id}/return`, { reason })
      .pipe(catchError(toSaleError));
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
        this._errorKey.set('pos.loadFailed');
        this._loading.set(false);
      },
    });
  }
}

function toSaleError(err: HttpErrorResponse) {
  const reason: SaleError['reason'] =
    err.status === 409
      ? 'alreadyReturned'
      : err.status === 400
        ? 'invalid'
        : err.status === 404
          ? 'notFound'
          : 'unknown';
  const detail = typeof err.error?.detail === 'string' ? err.error.detail : undefined;
  return throwError(() => ({ status: err.status, reason, detail }) satisfies SaleError);
}
