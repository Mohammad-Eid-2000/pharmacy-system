import { Component, OnInit, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { FormatService } from '../../core/format/format.service';
import { TranslationKey } from '../../core/i18n/translations';
import { Medicine, MedicinesService } from '../medicines/medicines.service';
import {
  CreateOrderPayload,
  PurchaseLinePayload,
  PurchaseOrder,
  PurchaseSaveError,
  PurchasesService,
  UpdateOrderPayload,
} from './purchases.service';

interface OrderForm {
  supplierId: number | null;
  expectedDeliveryDate: string;
  discount: number;
  notes: string;
}

/** One editable order line. `key` is only for the table's track expression. */
interface OrderLineForm {
  key: number;
  medicineId: number | null;
  quantity: number;
  unitPrice: number;
}

/** JOD money has 3 decimals; the server rounds authoritatively, this is just the preview. */
function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function emptyForm(): OrderForm {
  return { supplierId: null, expectedDeliveryDate: '', discount: 0, notes: '' };
}

function emptyLine(nextKey: number): OrderLineForm {
  return { key: nextKey, medicineId: null, quantity: 0, unitPrice: 0 };
}

function toForm(order: PurchaseOrder | null): OrderForm {
  if (!order) return emptyForm();
  return {
    supplierId: order.supplierId,
    expectedDeliveryDate: order.expectedDeliveryDate ?? '',
    discount: order.discountAmount,
    notes: order.notes ?? '',
  };
}

function toLines(order: PurchaseOrder | null): OrderLineForm[] {
  if (!order) return [];
  return order.items.map((item, index) => ({
    key: index + 1,
    medicineId: item.medicineId,
    quantity: item.quantityOrdered,
    unitPrice: item.unitPrice,
  }));
}

@Component({
  selector: 'app-purchase-order-form',
  imports: [FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-content" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ i18n.t(order() ? 'orderForm.editTitle' : 'orderForm.addTitle') }}</h2>
          <button class="btn btn-link" (click)="close.emit()" [attr.aria-label]="i18n.t('action.close')">✕</button>
        </div>

        <form (ngSubmit)="onSubmit()">
          @if (errorKey(); as key) {
            <p class="form-error">
              {{ i18n.t(key) }}
              @if (errorDetail(); as detail) {
                <span class="form-error-detail">{{ detail }}</span>
              }
            </p>
          }

          <div class="form-grid">
            <div class="form-group span-2">
              <label class="form-label" for="po-supplier">{{ i18n.t('orderForm.supplier') }} *</label>
              <select
                id="po-supplier"
                class="form-input"
                required
                [ngModel]="form().supplierId"
                (ngModelChange)="patch({ supplierId: $event })"
                name="supplierId"
              >
                <option [ngValue]="null">{{ i18n.t('orderForm.supplierPlaceholder') }}</option>
                @for (s of suppliers(); track s.id) {
                  <option [ngValue]="s.id">
                    {{ i18n.localized(s.nameAr, s.nameEn) }}@if (s.taxId) { — {{ s.taxId }} }
                  </option>
                }
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="po-delivery">{{ i18n.t('orderForm.expectedDelivery') }}</label>
              <input
                id="po-delivery"
                type="date"
                class="form-input"
                [ngModel]="form().expectedDeliveryDate"
                (ngModelChange)="patch({ expectedDeliveryDate: $event })"
                name="expectedDeliveryDate"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="po-discount">{{ i18n.t('pos.discount') }}</label>
              <input
                id="po-discount"
                type="number"
                min="0"
                step="0.001"
                class="form-input"
                [ngModel]="form().discount"
                (ngModelChange)="patch({ discount: $event })"
                name="discount"
              />
            </div>
          </div>

          <div class="lines-heading">
            <h3>{{ i18n.t('orderForm.lines') }}</h3>
            <button type="button" class="btn btn-secondary" (click)="addLine()">
              + {{ i18n.t('orderForm.addLine') }}
            </button>
          </div>

          @if (lines().length === 0) {
            <p class="state-msg">{{ i18n.t('orderForm.noLines') }}</p>
          } @else {
            <div class="table-wrapper">
              <table class="table lines-table">
                <thead>
                  <tr>
                    <th scope="col">{{ i18n.t('orderForm.medicine') }}</th>
                    <th scope="col" class="numeric nowrap">{{ i18n.t('pos.quantity') }}</th>
                    <th scope="col" class="numeric nowrap">{{ i18n.t('orderForm.unitPrice') }}</th>
                    <th scope="col" class="numeric nowrap">{{ i18n.t('orderForm.lineEstimate') }}</th>
                    <th scope="col" class="col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (line of lines(); track line.key; let i = $index) {
                    <tr>
                      <td>
                        <select
                          class="form-input"
                          [ngModel]="line.medicineId"
                          (ngModelChange)="patchLine(i, { medicineId: $event })"
                          [name]="'line-' + line.key + '-medicine'"
                        >
                          <option [ngValue]="null">{{ i18n.t('orderForm.medicinePlaceholder') }}</option>
                          @for (m of medicines(); track m.id) {
                            <option [ngValue]="m.id">
                              {{ i18n.localized(m.nameAr, m.nameEn) }} — {{ m.barcode }}
                            </option>
                          }
                        </select>
                      </td>
                      <td class="numeric">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          class="form-input line-input"
                          [ngModel]="line.quantity"
                          (ngModelChange)="patchLine(i, { quantity: $event })"
                          [name]="'line-' + line.key + '-qty'"
                        />
                      </td>
                      <td class="numeric">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          class="form-input line-input"
                          [ngModel]="line.unitPrice"
                          (ngModelChange)="patchLine(i, { unitPrice: $event })"
                          [name]="'line-' + line.key + '-price'"
                        />
                      </td>
                      <td class="numeric nowrap">{{ fmt.amount(lineEstimate(line)) }}</td>
                      <td class="col-actions">
                        <button
                          type="button"
                          class="btn btn-link danger"
                          [attr.aria-label]="i18n.t('orderForm.removeLine')"
                          (click)="removeLine(i)"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="totals">
              <div class="total-row">
                <span>{{ i18n.t('pos.subtotal') }}</span>
                <span class="numeric">{{ fmt.money(subtotalEstimate()) }}</span>
              </div>
              <div class="total-row">
                <span>{{ i18n.t('pos.tax') }}</span>
                <span class="numeric">{{ fmt.money(taxEstimate()) }}</span>
              </div>
              <div class="total-row">
                <span>{{ i18n.t('pos.discount') }}</span>
                <span class="numeric">- {{ fmt.money(form().discount || 0) }}</span>
              </div>
              <div class="total-row total">
                <span>{{ i18n.t('orderForm.estimatedTotal') }}</span>
                <span class="numeric">{{ fmt.money(totalEstimate()) }}</span>
              </div>
              <p class="estimate-note">{{ i18n.t('orderForm.estimateNote') }}</p>
            </div>
          }

          <div class="form-group span-full">
            <label class="form-label" for="po-notes">{{ i18n.t('orderForm.notes') }}</label>
            <textarea
              id="po-notes"
              rows="2"
              class="form-input"
              [ngModel]="form().notes"
              (ngModelChange)="patch({ notes: $event })"
              name="notes"
            ></textarea>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="close.emit()">
              {{ i18n.t('action.cancel') }}
            </button>
            <button type="submit" class="btn btn-primary" [disabled]="saving() || !canSubmit()">
              {{ saving() ? i18n.t('state.saving') : i18n.t(order() ? 'action.update' : 'orderForm.create') }}
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
        max-width: 960px;
        max-height: 92vh;
        overflow-y: auto;
        padding: var(--space-6);
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-4);
        margin-bottom: var(--space-6);
      }
      .modal-header h2 {
        font-size: 1.25rem;
        color: var(--color-primary);
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-4);
        margin-bottom: var(--space-5);
      }
      .span-2 {
        grid-column: 1 / -1;
      }
      .lines-heading {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-3);
        margin-bottom: var(--space-3);
      }
      .lines-heading h3 {
        margin: 0;
        font-size: 1.0625rem;
      }
      .table-wrapper {
        overflow-x: auto;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
      }
      .lines-table {
        min-inline-size: 30rem;
      }
      .lines-table th {
        color: var(--color-text-muted);
      }
      .lines-table .form-input {
        inline-size: 100%;
        padding-inline: var(--space-2);
      }
      .line-input {
        max-inline-size: 7rem;
      }
      .col-actions {
        text-align: center;
      }
      .btn-link.danger {
        color: var(--color-danger);
      }
      .state-msg {
        margin: var(--space-4);
        color: var(--color-text-muted);
        text-align: center;
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
      .estimate-note {
        grid-column: 1 / -1;
        font-size: 0.8125rem;
        color: var(--color-text-muted);
        margin: 0;
      }
      .span-full {
        margin-block-start: var(--space-4);
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
        padding-top: var(--space-5);
        border-top: 1px solid var(--color-border);
      }
    `,
  ],
})
export class PurchaseOrderFormComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  protected readonly fmt = inject(FormatService);
  private readonly service = inject(PurchasesService);
  private readonly medicinesService = inject(MedicinesService);

  readonly order = input<PurchaseOrder | null>(null);
  readonly close = output<void>();
  readonly saved = output<void>();

  protected readonly medicines = computed(() => this.medicinesService.medicines().items);
  protected readonly suppliers = computed(() => this.service.suppliers().items);

  protected readonly form = linkedSignal<OrderForm>(() => toForm(this.order()));

  private nextKey = 1000;
  protected readonly lines = linkedSignal<OrderLineForm[]>(() => {
    this.nextKey = 1000;
    return toLines(this.order());
  });

  protected readonly saving = signal(false);
  protected readonly errorKey = signal<TranslationKey | null>(null);
  protected readonly errorDetail = signal<string | null>(null);

  protected readonly subtotalEstimate = computed(() =>
    round3(this.lines().reduce((sum, l) => sum + (l.quantity || 0) * (l.unitPrice || 0), 0)),
  );
  protected readonly taxEstimate = computed(() =>
    round3(this.lines().reduce(
      (sum, l) => sum + (l.quantity || 0) * (l.unitPrice || 0) * this.taxRateOf(l.medicineId) / 100,
      0,
    )),
  );
  protected readonly totalEstimate = computed(() =>
    round3(this.subtotalEstimate() + this.taxEstimate() - (this.form().discount || 0)),
  );
  protected readonly canSubmit = computed(() => {
    if (!this.form().supplierId) return false;
    return this.lines().some(l => l.medicineId && l.quantity > 0 && l.unitPrice >= 0);
  });

  ngOnInit(): void {
    this.medicinesService.loadMedicines('', 1, 200);
    this.service.loadSuppliers('', 1, 200);
  }

  protected taxRateOf(medicineId: number | null): number {
    const medicine = this.medicines().find(m => m.id === medicineId);
    return medicine?.taxRate ?? 16;
  }

  /** Estimated line total (already rounded) for the editable rows. */
  protected lineEstimate(line: OrderLineForm): number {
    const subtotal = (line.quantity || 0) * (line.unitPrice || 0);
    const tax = subtotal * this.taxRateOf(line.medicineId) / 100;
    return round3(subtotal + tax);
  }

  protected addLine(): void {
    this.lines.update(lines => [...lines, emptyLine(this.nextKey++)]);
  }

  protected removeLine(index: number): void {
    this.lines.update(lines => lines.filter((_, i) => i !== index));
  }

  protected patch(patch: Partial<OrderForm>): void {
    this.form.update(f => ({ ...f, ...patch }));
  }

  protected patchLine(index: number, patch: Partial<OrderLineForm>): void {
    this.lines.update(lines => lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  protected onSubmit(): void {
    if (!this.canSubmit() || this.saving()) return;

    this.saving.set(true);
    this.errorKey.set(null);
    this.errorDetail.set(null);

    const items = this.lines()
      .filter(l => l.medicineId && l.quantity > 0)
      .map(l => ({
        medicineId: l.medicineId!,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })) as PurchaseLinePayload[];

    const common = {
      items,
      supplierId: this.form().supplierId!,
      expectedDeliveryDate: this.form().expectedDeliveryDate || null,
      discountAmount: this.form().discount || 0,
      notes: this.form().notes.trim() || null,
    };

    const result = this.order()
      ? this.service.updateOrder(toUpdatePayload(this.order()!.id, common))
      : this.service.createOrder(common);

    result.subscribe({
      next: () => this.saved.emit(),
      error: (err: PurchaseSaveError) => {
        this.saving.set(false);
        this.errorKey.set(errorKeyFor(err));
        this.errorDetail.set(err.detail ?? null);
      },
    });
  }
}

function toUpdatePayload(
  id: number,
  common: Omit<CreateOrderPayload, 'items' | 'supplierId'> & {
    items: PurchaseLinePayload[];
    supplierId: number;
  },
): UpdateOrderPayload {
  return { id, ...common };
}

function errorKeyFor(err: PurchaseSaveError): TranslationKey {
  switch (err.reason) {
    case 'conflict':
      return 'orderForm.conflict';
    case 'invalid':
      return 'orderForm.invalid';
    case 'notFound':
      return 'orderForm.notFound';
    default:
      return 'orderForm.failed';
  }
}