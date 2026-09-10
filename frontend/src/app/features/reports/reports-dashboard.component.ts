import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { FormatService } from '../../core/format/format.service';
import { TranslationKey } from '../../core/i18n/translations';
import { PaymentMethod } from '../pos/pos.service';
import { DailyReportPoint, ReportsDashboard, ReportsService } from './reports.service';

function dateInput(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-reports-dashboard',
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ i18n.t('reports.title') }}</h1>
        @if (dashboard(); as report) {
          <p class="period-label">
            {{ fmt.date(report.fromDate) }} — {{ fmt.date(report.toDate) }}
          </p>
        }
      </div>
      <button class="btn btn-secondary print-button" type="button" (click)="print()">
        <span aria-hidden="true">⎙</span> {{ i18n.t('reports.print') }}
      </button>
    </div>

    <div class="toolbar report-filters">
      <div class="filter-group">
        <label class="form-label" for="report-from">{{ i18n.t('reports.from') }}</label>
        <input
          id="report-from"
          type="date"
          class="form-input"
          [ngModel]="fromDate()"
          (ngModelChange)="fromDate.set($event)"
        />
      </div>
      <div class="filter-group">
        <label class="form-label" for="report-to">{{ i18n.t('reports.to') }}</label>
        <input
          id="report-to"
          type="date"
          class="form-input"
          [ngModel]="toDate()"
          (ngModelChange)="toDate.set($event)"
        />
      </div>
      <button class="btn btn-primary filter-action" type="button" [disabled]="loading()" (click)="load()">
        {{ loading() ? i18n.t('state.loading') : i18n.t('reports.apply') }}
      </button>
    </div>

    @if (loading() && !dashboard()) {
      <p class="state-message">{{ i18n.t('state.loading') }}</p>
    } @else if (error()) {
      <div class="state-message error">
        <span>{{ error() }}</span>
        <button class="btn btn-secondary" type="button" (click)="load()">{{ i18n.t('action.retry') }}</button>
      </div>
    } @else if (dashboard(); as report) {
      <section class="summary-grid" aria-label="{{ i18n.t('reports.summary') }}">
        <div class="summary-card accent-primary">
          <span class="summary-label">{{ i18n.t('reports.salesRevenue') }}</span>
          <span class="summary-value numeric">{{ fmt.money(report.summary.revenue) }}</span>
          <span class="summary-meta">{{ report.summary.salesCount }} {{ i18n.t('reports.invoices') }}</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">{{ i18n.t('reports.unitsSold') }}</span>
          <span class="summary-value numeric">{{ report.summary.unitsSold }}</span>
          <span class="summary-meta">{{ i18n.t('reports.averageBasket') }}: {{ fmt.money(report.summary.averageBasket) }}</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">{{ i18n.t('reports.purchaseCost') }}</span>
          <span class="summary-value numeric">{{ fmt.money(report.summary.purchaseCost) }}</span>
          <span class="summary-meta">{{ report.summary.receivedOrdersCount }} {{ i18n.t('reports.receivedOrders') }}</span>
        </div>
        <div class="summary-card" [class.alert-danger]="report.summary.returnedSalesCount > 0">
          <span class="summary-label">{{ i18n.t('reports.returns') }}</span>
          <span class="summary-value numeric">{{ report.summary.returnedSalesCount }}</span>
          <span class="summary-meta">{{ i18n.t('reports.taxCollected') }}: {{ fmt.money(report.summary.taxCollected) }}</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">{{ i18n.t('reports.discounts') }}</span>
          <span class="summary-value numeric">{{ fmt.money(report.summary.discountsGiven) }}</span>
          <span class="summary-meta">{{ report.summary.activeSuppliersCount }} {{ i18n.t('reports.activeSuppliers') }}</span>
        </div>
      </section>

      <section class="report-grid trend-section">
        <div class="report-panel trend-panel">
          <div class="panel-heading">
            <div>
              <h2>{{ i18n.t('reports.dailyTrend') }}</h2>
              <p>{{ i18n.t('reports.dailyTrendHint') }}</p>
            </div>
          </div>
          <div class="trend-chart">
            @for (point of visibleDaily(report.daily); track point.date) {
              <div class="trend-column" [title]="trendTitle(point)">
                <div class="trend-bars">
                  <span class="bar revenue-bar" [style.height.%]="barHeight(point.revenue, maxDailyRevenue(report.daily))"></span>
                  <span class="bar purchase-bar" [style.height.%]="barHeight(point.purchaseCost, maxDailyPurchase(report.daily))"></span>
                </div>
                <span class="trend-date">{{ fmt.date(point.date) }}</span>
              </div>
            }
          </div>
          <div class="legend">
            <span><i class="legend-dot revenue-dot"></i>{{ i18n.t('reports.salesRevenue') }}</span>
            <span><i class="legend-dot purchase-dot"></i>{{ i18n.t('reports.purchaseCost') }}</span>
          </div>
        </div>

        <div class="report-panel inventory-panel">
          <div class="panel-heading">
            <div>
              <h2>{{ i18n.t('reports.inventoryHealth') }}</h2>
              <p>{{ i18n.t('reports.inventoryHealthHint') }}</p>
            </div>
          </div>
          <div class="inventory-total">
            <span class="inventory-total-value numeric">{{ fmt.money(report.inventory.totalStockValue) }}</span>
            <span>{{ i18n.t('reports.currentStockValue') }}</span>
          </div>
          <div class="health-list">
            <div><span>{{ i18n.t('reports.totalUnits') }}</span><strong class="numeric">{{ report.inventory.totalUnits }}</strong></div>
            <div><span>{{ i18n.t('reports.lowStock') }}</span><strong class="numeric warning-text">{{ report.inventory.lowStockCount }}</strong></div>
            <div><span>{{ i18n.t('reports.outOfStock') }}</span><strong class="numeric danger-text">{{ report.inventory.outOfStockCount }}</strong></div>
            <div><span>{{ i18n.t('reports.expiringSoon') }}</span><strong class="numeric warning-text">{{ report.inventory.expiringSoonBatchCount }}</strong></div>
            <div><span>{{ i18n.t('reports.expiredStock') }}</span><strong class="numeric danger-text">{{ fmt.money(report.inventory.expiredStockValue) }}</strong></div>
          </div>
        </div>
      </section>

      <section class="report-grid lower-grid">
        <div class="report-panel">
          <div class="panel-heading">
            <div>
              <h2>{{ i18n.t('reports.topMedicines') }}</h2>
              <p>{{ i18n.t('reports.topMedicinesHint') }}</p>
            </div>
          </div>
          @if (report.topMedicines.length === 0) {
            <p class="empty-inline">{{ i18n.t('reports.noData') }}</p>
          } @else {
            <div class="rank-list">
              @for (medicine of report.topMedicines; track medicine.medicineId; let rank = $index) {
                <div class="rank-row">
                  <span class="rank-number numeric">{{ rank + 1 }}</span>
                  <span class="rank-name">{{ i18n.localized(medicine.nameAr, medicine.nameEn) }}</span>
                  <span class="rank-units numeric">{{ medicine.unitsSold }} {{ i18n.t('unit.units') }}</span>
                  <span class="rank-amount numeric">{{ fmt.money(medicine.revenue) }}</span>
                </div>
              }
            </div>
          }
        </div>

        <div class="report-panel">
          <div class="panel-heading">
            <div>
              <h2>{{ i18n.t('reports.paymentMix') }}</h2>
              <p>{{ i18n.t('reports.paymentMixHint') }}</p>
            </div>
          </div>
          @if (report.payments.length === 0) {
            <p class="empty-inline">{{ i18n.t('reports.noData') }}</p>
          } @else {
            <div class="payment-list">
              @for (payment of report.payments; track payment.paymentMethod) {
                <div class="payment-row">
                  <div class="payment-label">
                    <span>{{ i18n.t(paymentKey(payment.paymentMethod)) }}</span>
                    <strong class="numeric">{{ fmt.money(payment.revenue) }}</strong>
                  </div>
                  <div class="meter"><span [style.width.%]="paymentWidth(payment.revenue, report.summary.revenue)"></span></div>
                  <small>{{ payment.salesCount }} {{ i18n.t('reports.invoices') }}</small>
                </div>
              }
            </div>
          }
        </div>

        <div class="report-panel supplier-panel">
          <div class="panel-heading">
            <div>
              <h2>{{ i18n.t('reports.supplierSpend') }}</h2>
              <p>{{ i18n.t('reports.supplierSpendHint') }}</p>
            </div>
          </div>
          @if (report.supplierSpend.length === 0) {
            <p class="empty-inline">{{ i18n.t('reports.noData') }}</p>
          } @else {
            <div class="supplier-list">
              @for (supplier of report.supplierSpend; track supplier.supplierId) {
                <div class="supplier-row">
                  <span>{{ i18n.localized(supplier.nameAr, supplier.nameEn) }}</span>
                  <span class="numeric">{{ fmt.money(supplier.totalAmount) }}</span>
                </div>
              }
            </div>
          }
        </div>
      </section>
    }
  `,
  styles: [
    `
      .page-header { display:flex; justify-content:space-between; align-items:flex-start; gap:var(--space-4); margin-bottom:var(--space-5); }
      .page-header h1 { margin:0; font-size:1.5rem; color:var(--color-primary); }
      .period-label { margin:var(--space-1) 0 0; color:var(--color-text-muted); font-size:.875rem; }
      .print-button { white-space:nowrap; }
      .report-filters { align-items:flex-end; padding:var(--space-4); background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); margin-bottom:var(--space-5); }
      .filter-group { display:flex; flex-direction:column; gap:var(--space-1); min-width:12rem; }
      .filter-action { height:2.5rem; }
      .summary-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:var(--space-3); margin-bottom:var(--space-5); }
      .summary-card { display:flex; flex-direction:column; gap:var(--space-1); padding:var(--space-4); background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); }
      .summary-card.accent-primary { border-top:3px solid var(--color-primary); }
      .summary-card.alert-danger { border-color:var(--color-danger); }
      .summary-label { color:var(--color-text-muted); font-size:.8125rem; }
      .summary-value { font-size:1.25rem; font-weight:700; }
      .summary-meta { color:var(--color-text-muted); font-size:.75rem; }
      .report-grid { display:grid; gap:var(--space-4); }
      .trend-section { grid-template-columns:minmax(0,1.65fr) minmax(18rem,1fr); margin-bottom:var(--space-4); }
      .lower-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .supplier-panel { grid-column:1 / -1; }
      .report-panel { min-width:0; padding:var(--space-5); background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); }
      .panel-heading { display:flex; justify-content:space-between; gap:var(--space-3); margin-bottom:var(--space-4); }
      .panel-heading h2 { margin:0; font-size:1.05rem; }
      .panel-heading p { margin:var(--space-1) 0 0; color:var(--color-text-muted); font-size:.8125rem; }
      .trend-chart { display:flex; align-items:flex-end; gap:var(--space-2); min-height:13rem; overflow-x:auto; padding-top:var(--space-3); }
      .trend-column { flex:1 0 2.25rem; min-width:2.25rem; display:flex; flex-direction:column; align-items:center; gap:var(--space-2); }
      .trend-bars { height:10rem; width:100%; display:flex; align-items:flex-end; justify-content:center; gap:2px; border-bottom:1px solid var(--color-border); }
      .bar { display:block; width:35%; min-height:2px; border-radius:3px 3px 0 0; transition:height .2s ease; }
      .revenue-bar { background:var(--color-primary); }
      .purchase-bar { background:var(--color-warning); }
      .trend-date { color:var(--color-text-muted); font-size:.68rem; white-space:nowrap; transform:rotate(-35deg); transform-origin:top center; margin-top:var(--space-2); }
      .legend { display:flex; gap:var(--space-4); margin-top:var(--space-5); color:var(--color-text-muted); font-size:.75rem; }
      .legend-dot { display:inline-block; width:.55rem; height:.55rem; border-radius:50%; margin-inline-end:var(--space-1); }
      .revenue-dot { background:var(--color-primary); }
      .purchase-dot { background:var(--color-warning); }
      .inventory-total { padding:var(--space-3); margin-bottom:var(--space-3); background:var(--color-bg); border-radius:var(--radius-md); color:var(--color-text-muted); }
      .inventory-total-value { display:block; color:var(--color-text); font-size:1.35rem; font-weight:700; }
      .health-list { display:flex; flex-direction:column; gap:var(--space-2); }
      .health-list div,.supplier-row { display:flex; justify-content:space-between; gap:var(--space-3); padding-bottom:var(--space-2); border-bottom:1px solid var(--color-border); }
      .health-list span { color:var(--color-text-muted); }
      .warning-text { color:var(--color-warning); }
      .danger-text { color:var(--color-danger); }
      .rank-list,.payment-list,.supplier-list { display:flex; flex-direction:column; gap:var(--space-2); }
      .rank-row { display:grid; grid-template-columns:2rem minmax(0,1fr) auto auto; gap:var(--space-2); align-items:center; padding:var(--space-2) 0; border-bottom:1px solid var(--color-border); }
      .rank-number { color:var(--color-primary); font-weight:700; }
      .rank-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600; }
      .rank-units,.payment-row small { color:var(--color-text-muted); font-size:.75rem; }
      .payment-row { display:flex; flex-direction:column; gap:var(--space-1); }
      .payment-label { display:flex; justify-content:space-between; gap:var(--space-3); }
      .meter { height:.45rem; overflow:hidden; background:var(--color-bg); border-radius:999px; }
      .meter span { display:block; height:100%; background:var(--color-primary); border-radius:inherit; }
      .empty-inline { color:var(--color-text-muted); text-align:center; padding:var(--space-5); }
      .state-message { padding:var(--space-6); background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); color:var(--color-text-muted); display:flex; align-items:center; gap:var(--space-4); }
      .state-message.error { color:var(--color-danger); border-color:var(--color-danger); }
      @media (max-width:800px) { .trend-section,.lower-grid { grid-template-columns:1fr; } .supplier-panel { grid-column:auto; } }
      @media print { .report-filters,.print-button { display:none; } .report-panel,.summary-card { break-inside:avoid; } }
    `,
  ],
})
export class ReportsDashboardComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  protected readonly fmt = inject(FormatService);
  private readonly service = inject(ReportsService);

  protected readonly dashboard = this.service.dashboard;
  protected readonly loading = this.service.loading;
  protected readonly error = this.service.error;
  protected readonly fromDate = signal(dateInput(new Date(Date.now() - 29 * 86400000)));
  protected readonly toDate = signal(dateInput(new Date()));

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    if (!this.fromDate() || !this.toDate()) return;
    this.service.load(this.fromDate(), this.toDate());
  }

  protected print(): void {
    window.print();
  }

  protected visibleDaily(points: DailyReportPoint[]): DailyReportPoint[] {
    // Keep long reports readable without hiding detail from the API response.
    return points.length > 31 ? points.filter((_, index) => index % 3 === 0) : points;
  }

  protected maxDailyRevenue(points: DailyReportPoint[]): number {
    return Math.max(...points.map(p => p.revenue), 0);
  }

  protected maxDailyPurchase(points: DailyReportPoint[]): number {
    return Math.max(...points.map(p => p.purchaseCost), 0);
  }

  protected barHeight(value: number, max: number): number {
    return max <= 0 ? 0 : Math.max(3, (value / max) * 100);
  }

  protected paymentWidth(value: number, total: number): number {
    return total <= 0 ? 0 : Math.max(2, (value / total) * 100);
  }

  protected trendTitle(point: DailyReportPoint): string {
    return `${this.fmt.date(point.date)}: ${this.fmt.money(point.revenue)}`;
  }

  protected paymentKey(method: PaymentMethod): TranslationKey {
    const key = method === 'MobileWallet' ? 'mobileWallet' : method.toLowerCase();
    return `payment.${key}` as TranslationKey;
  }
}