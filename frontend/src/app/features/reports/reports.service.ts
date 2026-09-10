import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { I18nService } from '../../core/i18n/i18n.service';
import { PaymentMethod } from '../pos/pos.service';

export interface ReportsDashboard {
  fromDate: string;
  toDate: string;
  summary: ReportSummary;
  daily: DailyReportPoint[];
  topMedicines: TopMedicineReport[];
  payments: PaymentBreakdown[];
  supplierSpend: SupplierSpend[];
  inventory: InventoryReport;
}

export interface ReportSummary {
  salesCount: number;
  returnedSalesCount: number;
  unitsSold: number;
  revenue: number;
  taxCollected: number;
  discountsGiven: number;
  averageBasket: number;
  receivedOrdersCount: number;
  purchaseCost: number;
  activeSuppliersCount: number;
}

export interface DailyReportPoint {
  date: string;
  salesCount: number;
  unitsSold: number;
  revenue: number;
  purchaseCost: number;
}

export interface TopMedicineReport {
  medicineId: number;
  nameAr: string;
  nameEn: string;
  unitsSold: number;
  revenue: number;
  saleLines: number;
}

export interface PaymentBreakdown {
  paymentMethod: PaymentMethod;
  salesCount: number;
  revenue: number;
}

export interface SupplierSpend {
  supplierId: number;
  nameAr: string;
  nameEn: string;
  ordersCount: number;
  totalAmount: number;
}

export interface InventoryReport {
  totalMedicines: number;
  totalBatches: number;
  totalUnits: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringSoonBatchCount: number;
  expiredBatchCount: number;
  expiredStockValue: number;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly endpoint = '/reports';

  private readonly _dashboard = signal<ReportsDashboard | null>(null);
  private readonly _loading = signal(false);
  private readonly _errorKey = signal<'reports.loadFailed' | null>(null);

  readonly dashboard = this._dashboard.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = computed(() => {
    const key = this._errorKey();
    return key ? this.i18n.t(key) : null;
  });

  load(fromDate: string, toDate: string): void {
    this._loading.set(true);
    this._errorKey.set(null);

    this.http
      .get<ReportsDashboard>(this.endpoint, { params: { fromDate, toDate } })
      .subscribe({
        next: data => {
          this._dashboard.set(data);
          this._loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          console.error('Failed to load reports', err);
          this._errorKey.set('reports.loadFailed');
          this._loading.set(false);
        },
      });
  }
}