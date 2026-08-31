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
  SellableProduct,
} from './pos.service';
import { ReceiptComponent } from './receipt.component';

interface CartLine {
  product: SellableProduct;
  quantity: number;
}

@Component({
  selector: 'app-pos-terminal',
  imports: [FormsModule, ReceiptComponent],
  template: `
    <div class="page-header">
      <h1>{{ i18n.t('pos.title') }}</h1>
      <div class="today-strip">
        <span class="today-label">{{ i18n.t('pos.todaySales') }}</span>
        <span class="today-value numeric">{{ summary().salesCount }}</span>
        <span class="today-sep" aria-hidden="true">·</span>
        <span class="today-label">{{ i18n.t('pos.todayRevenue') }}</span>
        <span class="today-value numeric">{{ fmt.money(summary().revenue) }}</span>
      </div>
    </div>

    <div class="pos-layout">
      <!-- Left: find a product and put it in the basket. -->
      <section class="pos-search" aria-labelledby="pos-search-heading">
        <h2 id="pos-search-heading" class="section-title">{{ i18n.t('pos.findProduct') }}</h2>

        <input
          #searchBox
          type="search"
          class="form-input"
          [placeholder]="i18n.t('pos.searchPlaceholder')"
          [ngModel]="searchTerm()"
          (ngModelChange)="onSearch($event)"
          (keydown.enter)="addFirstMatch()"
          autocomplete="off"
        />
        <p class="form-hint">{{ i18n.t('pos.searchHint') }}</p>

        @if (loading()) {
          <p class="state-msg">{{ i18n.t('state.loading') }}</p>
        } @else if (error()) {
          <p class="state-msg error">{{ error() }}</p>
        } @else if (products().length === 0) {
          <p class="state-msg">{{ i18n.t('pos.noProducts') }}</p>
        } @else {
          <ul class="product-list">
            @for (p of products(); track p.medicineId) {
              <li>
                <button
                  type="button"
                  class="product-btn"
                  [disabled]="remainingFor(p) <= 0"
                  (click)="addToCart(p)"
                >
                  <span class="product-main">
                    <span class="product-name">{{ i18n.localized(p.nameAr, p.nameEn) }}</span>
                    @if (p.isControlled) {
                      <span class="badge badge-danger">{{ i18n.t('pos.controlled') }}</span>
                    }
                  </span>
                  <span class="product-meta">
                    <span class="numeric">{{ p.barcode }}</span>
                    <span class="product-form">{{ p.form }}</span>
                  </span>
                  <span class="product-figures">
                    <span class="numeric product-price">{{ fmt.money(p.unitPrice) }}</span>
                    <span class="numeric product-stock" [class.stock-none]="remainingFor(p) <= 0">
                      {{ i18n.t('pos.available', { n: remainingFor(p) }) }}
                    </span>
                  </span>
                </button>
              </li>
            }
          </ul>
        }
      </section>

      <!-- Right: the basket and the money. -->
      <section class="pos-cart" aria-labelledby="pos-cart-heading">
        <h2 id="pos-cart-heading" class="section-title">{{ i18n.t('pos.cart') }}</h2>

        @if (cart().length === 0) {
          <p class="state-msg">{{ i18n.t('pos.cartEmpty') }}</p>
        } @else {
          <ul class="cart-list">
            @for (line of cart(); track line.product.medicineId) {
              <li class="cart-line">
                <div class="cart-line-head">
                  <span class="cart-name">{{
                    i18n.localized(line.product.nameAr, line.product.nameEn)
                  }}</span>
                  <button
                    type="button"
                    class="btn-icon"
                    [attr.aria-label]="i18n.t('pos.removeLine')"
                    (click)="removeLine(line)"
                  >
                    ×
                  </button>
                </div>
                <div class="cart-line-body">
                  <div class="qty-group">
                    <button
                      type="button"
                      class="qty-btn"
                      [attr.aria-label]="i18n.t('pos.decrease')"
                      (click)="changeQty(line, -1)"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      class="form-input qty-input numeric"
                      min="1"
                      [max]="line.product.availableQuantity"
                      [ngModel]="line.quantity"
                      (ngModelChange)="setQty(line, $event)"
                      [attr.aria-label]="i18n.t('pos.quantity')"
                    />
                    <button
                      type="button"
                      class="qty-btn"
                      [attr.aria-label]="i18n.t('pos.increase')"
                      [disabled]="line.quantity >= line.product.availableQuantity"
                      (click)="changeQty(line, 1)"
                    >
                      +
                    </button>
                  </div>
                  <span class="cart-line-total numeric">{{ fmt.money(lineEstimate(line)) }}</span>
                </div>
                @if (line.quantity >= line.product.availableQuantity) {
                  <p class="cart-line-hint">
                    {{ i18n.t('pos.maxReached', { n: line.product.availableQuantity }) }}
                  </p>
                }
              </li>
            }
          </ul>

          <!-- Totals. The server prices the sale from its own batch prices, so
               what is shown here is an estimate until the invoice comes back. -->
          <dl class="totals">
            <div class="total-row">
              <dt>{{ i18n.t('pos.subtotal') }}</dt>
              <dd class="numeric">{{ fmt.money(estSubtotal()) }}</dd>
            </div>
            <div class="total-row">
              <dt>{{ i18n.t('pos.tax') }}</dt>
              <dd class="numeric">{{ fmt.money(estTax()) }}</dd>
            </div>
            <div class="total-row">
              <dt>{{ i18n.t('pos.discount') }}</dt>
              <dd>
                <input
                  type="number"
                  class="form-input money-input numeric"
                  min="0"
                  step="0.001"
                  [ngModel]="discount()"
                  (ngModelChange)="onDiscount($event)"
                  [attr.aria-label]="i18n.t('pos.discount')"
                />
              </dd>
            </div>
            <div class="total-row grand">
              <dt>{{ i18n.t('pos.estimatedTotal') }}</dt>
              <dd class="numeric">{{ fmt.money(estTotal()) }}</dd>
            </div>
          </dl>
          <p class="form-hint">{{ i18n.t('pos.estimateNote') }}</p>

          <div class="form-group">
            <label class="form-label" for="pos-payment">{{ i18n.t('pos.paymentMethod') }}</label>
            <select
              id="pos-payment"
              class="form-input"
              [ngModel]="paymentMethod()"
              (ngModelChange)="onPaymentMethod($event)"
            >
              @for (m of paymentMethods; track m) {
                <option [value]="m">{{ i18n.t(paymentKey(m)) }}</option>
              }
            </select>
          </div>

          <!-- Only a cash sale has a tendered amount and change to give back. -->
          @if (paymentMethod() === 'Cash') {
            <div class="form-group">
              <label class="form-label" for="pos-paid">{{ i18n.t('pos.amountPaid') }}</label>
              <input
                id="pos-paid"
                type="number"
                class="form-input numeric"
                min="0"
                step="0.001"
                [ngModel]="amountPaid()"
                (ngModelChange)="onAmountPaid($event)"
              />
              @if (shortfall() > 0) {
                <p class="form-error">
                  {{ i18n.t('pos.shortfall', { amount: fmt.money(shortfall()) }) }}
                </p>
              } @else {
                <p class="form-hint">
                  {{ i18n.t('pos.changeDue') }}:
                  <span class="numeric">{{ fmt.money(estChange()) }}</span>
                </p>
              }
            </div>
          }

          @if (requiresPrescription()) {
            <div class="form-group">
              <label class="form-label" for="pos-rx">
                {{ i18n.t('pos.prescriptionNo') }}
                <span class="required" aria-hidden="true">*</span>
              </label>
              <input
                id="pos-rx"
                type="text"
                class="form-input"
                [ngModel]="prescriptionNo()"
                (ngModelChange)="prescriptionNo.set($event)"
              />
              <p class="form-hint">{{ i18n.t('pos.prescriptionRequired') }}</p>
            </div>
          }

          <div class="form-group">
            <label class="form-label" for="pos-customer">{{ i18n.t('pos.customerName') }}</label>
            <input
              id="pos-customer"
              type="text"
              class="form-input"
              [ngModel]="customerName()"
              (ngModelChange)="customerName.set($event)"
            />
          </div>

          @if (saveError()) {
            <div class="form-error" role="alert">
              <p>{{ saveErrorMessage() }}</p>
              @if (saveError()?.detail) {
                <p class="error-detail">{{ saveError()!.detail }}</p>
              }
            </div>
          }

          <div class="cart-actions">
            <button
              type="button"
              class="btn btn-primary btn-checkout"
              [disabled]="!canCheckout()"
              (click)="checkout()"
            >
              {{ saving() ? i18n.t('pos.saving') : i18n.t('pos.checkout') }}
            </button>
            <button type="button" class="btn btn-secondary" (click)="clearCart()">
              {{ i18n.t('pos.clearCart') }}
            </button>
          </div>
        }
      </section>
    </div>

    @if (completed()) {
      <app-receipt [sale]="completed()!" (closed)="dismissReceipt()" />
    }
  `,
  styles: [
    `
      .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        flex-wrap: wrap;
        margin-block-end: var(--space-4);
      }
      .page-header h1 {
        margin: 0;
        font-size: 1.5rem;
      }
      .today-strip {
        display: flex;
        align-items: baseline;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-3);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        font-size: 0.875rem;
      }
      .today-label {
        color: var(--color-text-muted);
      }
      .today-value {
        font-weight: 600;
      }
      .today-sep {
        color: var(--color-border);
      }

      /* Search on one side, basket on the other. The basket keeps a fixed width so
         the amounts do not shift around as names of different lengths arrive. */
      .pos-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 24rem;
        gap: var(--space-4);
        align-items: start;
      }
      @media (max-width: 60rem) {
        .pos-layout {
          grid-template-columns: minmax(0, 1fr);
        }
      }

      .pos-search,
      .pos-cart {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: var(--space-4);
      }
      /*
       * The checkout fields are stacked directly in this panel, so each needs its
       * own leading space; without it a field's hint text collides with the next
       * field's label.
       */
      .pos-cart > .form-group,
      .pos-cart > .form-hint {
        margin-block-start: var(--space-4);
      }

      .section-title {
        margin: 0 0 var(--space-3);
        font-size: 1rem;
        font-weight: 600;
      }

      .state-msg {
        margin: var(--space-4) 0;
        color: var(--color-text-muted);
        text-align: center;
      }
      .state-msg.error {
        color: var(--color-danger);
      }

      .product-list,
      .cart-list {
        list-style: none;
        margin: var(--space-3) 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }

      .product-btn {
        inline-size: 100%;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        grid-template-areas: 'main figures' 'meta figures';
        gap: 0 var(--space-3);
        padding: var(--space-3);
        background: var(--color-bg);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        cursor: pointer;
        text-align: start;
        font: inherit;
        color: inherit;
      }
      .product-btn:hover:not(:disabled) {
        border-color: var(--color-primary);
      }
      .product-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .product-main {
        grid-area: main;
        display: flex;
        align-items: center;
        gap: var(--space-2);
        min-inline-size: 0;
      }
      .product-name {
        font-weight: 600;
      }
      .product-meta {
        grid-area: meta;
        display: flex;
        gap: var(--space-2);
        font-size: 0.8125rem;
        color: var(--color-text-muted);
      }
      .product-figures {
        grid-area: figures;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
        white-space: nowrap;
      }
      .product-price {
        font-weight: 600;
      }
      .product-form {
        color: var(--color-text-muted);
      }

      .product-stock {
        font-size: 0.8125rem;
        color: var(--color-text-muted);
      }
      .product-stock.stock-none {
        color: var(--color-danger);
      }

      .cart-line {
        padding: var(--space-2) var(--space-3);
        background: var(--color-bg);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
      }
      .cart-line-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-2);
      }
      .cart-name {
        font-weight: 600;
        font-size: 0.9375rem;
      }
      .btn-icon {
        flex: none;
        inline-size: 1.5rem;
        block-size: 1.5rem;
        display: grid;
        place-items: center;
        background: none;
        border: none;
        border-radius: var(--radius-sm);
        color: var(--color-text-muted);
        font-size: 1.125rem;
        line-height: 1;
        cursor: pointer;
      }
      .btn-icon:hover {
        background: var(--color-border);
        color: var(--color-danger);
      }
      .cart-line-body {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
        margin-block-start: var(--space-2);
      }
      .cart-line-total {
        font-weight: 600;
        white-space: nowrap;
      }
      .cart-line-hint {
        margin: var(--space-1) 0 0;
        font-size: 0.75rem;
        color: var(--color-warning);
      }

      /* The stepper is laid out LTR so minus sits left of plus in both languages,
         matching how a numeric keypad is read. */
      .qty-group {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        direction: ltr;
      }
      .qty-btn {
        inline-size: 1.75rem;
        block-size: 1.75rem;
        flex: none;
        display: grid;
        place-items: center;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        font-size: 1rem;
        line-height: 1;
        cursor: pointer;
        color: var(--color-text);
      }
      .qty-btn:hover:not(:disabled) {
        border-color: var(--color-primary);
        color: var(--color-primary);
      }
      .qty-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .qty-input {
        inline-size: 3.5rem;
        text-align: center;
        padding-inline: var(--space-1);
      }
      .money-input {
        inline-size: 7rem;
      }

      .totals {
        margin: var(--space-4) 0 var(--space-2);
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
        padding-block-start: var(--space-2);
        border-block-start: 1px solid var(--color-border);
      }
      .total-row.grand dt {
        color: var(--color-text);
        font-weight: 600;
        font-size: 1rem;
      }
      .total-row.grand dd {
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--color-primary);
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

      .cart-actions {
        display: flex;
        gap: var(--space-2);
        margin-block-start: var(--space-4);
      }
      .btn-checkout {
        flex: 1;
      }
    `,
  ],
})
export class PosTerminalComponent implements OnInit {
  private readonly pos = inject(PosService);
  readonly i18n = inject(I18nService);
  readonly fmt = inject(FormatService);

  readonly paymentMethods = PAYMENT_METHODS;

  readonly loading = this.pos.loading;
  readonly error = this.pos.error;
  readonly summary = this.pos.summary;
  readonly products = computed(() => this.pos.products().items);

  readonly searchTerm = signal('');
  readonly cart = signal<CartLine[]>([]);
  readonly discount = signal(0);
  readonly amountPaid = signal(0);
  readonly paymentMethod = signal<PaymentMethod>('Cash');
  readonly customerName = signal('');
  readonly prescriptionNo = signal('');
  readonly saving = signal(false);
  readonly saveError = signal<SaleError | null>(null);
  readonly completed = signal<Sale | null>(null);

  private searchTimer?: ReturnType<typeof setTimeout>;

  /**
   * The client cannot know the true price of a quantity that spans several
   * batches, because each batch carries its own price. These figures are an
   * estimate from the nearest-expiry price and are labelled as such; the invoice
   * returned by the server is the authoritative one.
   */
  readonly estSubtotal = computed(() =>
    round3(this.cart().reduce((sum, l) => sum + this.lineEstimate(l), 0)),
  );
  readonly estTax = computed(() =>
    round3(
      this.cart().reduce(
        (sum, l) => sum + (this.lineEstimate(l) * l.product.taxRate) / 100,
        0,
      ),
    ),
  );
  readonly estTotal = computed(() =>
    Math.max(0, round3(this.estSubtotal() + this.estTax() - this.discount())),
  );
  readonly estChange = computed(() => Math.max(0, round3(this.amountPaid() - this.estTotal())));

  /** How far short the tendered cash falls. Zero for non-cash payments. */
  readonly shortfall = computed(() =>
    this.paymentMethod() === 'Cash'
      ? Math.max(0, round3(this.estTotal() - this.amountPaid()))
      : 0,
  );

  readonly requiresPrescription = computed(() => this.cart().some(l => l.product.isControlled));

  readonly canCheckout = computed(() => {
    if (this.cart().length === 0 || this.saving()) return false;
    if (this.requiresPrescription() && !this.prescriptionNo().trim()) return false;
    if (this.paymentMethod() === 'Cash' && this.shortfall() > 0) return false;
    return true;
  });

  readonly saveErrorMessage = computed(() => {
    const err = this.saveError();
    if (!err) return null;
    const key: TranslationKey =
      err.reason === 'invalid'
        ? 'pos.saveInvalid'
        : err.reason === 'notFound'
          ? 'pos.saveNotFound'
          : 'pos.saveFailed';
    return this.i18n.t(key);
  });

  ngOnInit(): void {
    this.pos.loadProducts();
    this.pos.loadSummary();
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.pos.loadProducts(term.trim()), 250);
  }

  /**
   * Lets a barcode scanner work with no extra wiring: a scanner types the code
   * and sends Enter, which puts the single match straight into the basket.
   */
  addFirstMatch(): void {
    const first = this.products().find(p => this.remainingFor(p) > 0);
    if (!first) return;
    this.addToCart(first);
    this.searchTerm.set('');
    this.pos.loadProducts();
  }

  /** Stock left after what the basket has already claimed. */
  remainingFor(product: SellableProduct): number {
    const inCart = this.cart().find(l => l.product.medicineId === product.medicineId);
    return product.availableQuantity - (inCart?.quantity ?? 0);
  }

  addToCart(product: SellableProduct): void {
    this.saveError.set(null);
    const current = this.cart();
    const existing = current.find(l => l.product.medicineId === product.medicineId);
    if (existing) {
      if (existing.quantity >= product.availableQuantity) return;
      // Replace the line rather than mutating it: the old array still holds the
      // same object reference, and an in-place edit leaves every binding that
      // reads it comparing a value against itself.
      this.cart.set(
        current.map(l =>
          l.product.medicineId === product.medicineId ? { ...l, quantity: l.quantity + 1 } : l,
        ),
      );
    } else {
      this.cart.set([...current, { product, quantity: 1 }]);
    }
    this.syncCashToTotal();
  }

  changeQty(line: CartLine, delta: number): void {
    this.setQty(line, line.quantity + delta);
  }

  setQty(line: CartLine, quantity: number): void {
    const clamped = Math.max(1, Math.min(line.product.availableQuantity, Math.floor(quantity || 1)));
    this.cart.set(
      this.cart().map(l =>
        l.product.medicineId === line.product.medicineId ? { ...l, quantity: clamped } : l,
      ),
    );
    this.syncCashToTotal();
  }

  removeLine(line: CartLine): void {
    this.cart.set(this.cart().filter(l => l.product.medicineId !== line.product.medicineId));
    this.syncCashToTotal();
  }

  clearCart(): void {
    this.cart.set([]);
    this.discount.set(0);
    this.amountPaid.set(0);
    this.customerName.set('');
    this.prescriptionNo.set('');
    this.saveError.set(null);
  }

  onDiscount(value: number): void {
    this.discount.set(Math.max(0, Number(value) || 0));
    this.syncCashToTotal();
  }

  onAmountPaid(value: number): void {
    this.amountPaid.set(Math.max(0, Number(value) || 0));
  }

  onPaymentMethod(method: PaymentMethod): void {
    this.paymentMethod.set(method);
    this.syncCashToTotal();
  }

  lineEstimate(line: CartLine): number {
    return round3(line.quantity * line.product.unitPrice);
  }

  paymentKey(method: PaymentMethod): TranslationKey {
    return `payment.${method.charAt(0).toLowerCase()}${method.slice(1)}` as TranslationKey;
  }

  checkout(): void {
    if (!this.canCheckout()) return;
    this.saving.set(true);
    this.saveError.set(null);

    const cash = this.paymentMethod() === 'Cash';
    this.pos
      .createSale({
        // Only ids and quantities: the server prices the sale itself.
        items: this.cart().map(l => ({ medicineId: l.product.medicineId, quantity: l.quantity })),
        paymentMethod: this.paymentMethod(),
        // For non-cash the server captures the exact total, so what is sent here
        // is ignored; sending the estimate would only look like it mattered.
        amountPaid: cash ? this.amountPaid() : 0,
        discountAmount: this.discount(),
        customerName: this.customerName().trim() || null,
        prescriptionNo: this.prescriptionNo().trim() || null,
      })
      .subscribe({
        next: sale => {
          this.saving.set(false);
          this.completed.set(sale);
          this.clearCart();
          // Stock and takings have both moved, so refresh what is on screen.
          this.pos.loadProducts(this.searchTerm().trim());
          this.pos.loadSummary();
        },
        error: (err: SaleError) => {
          this.saving.set(false);
          this.saveError.set(err);
        },
      });
  }

  dismissReceipt(): void {
    this.completed.set(null);
  }

  /**
   * Keeps the tendered cash at least the amount owed as the basket changes, so a
   * cashier is not blocked by a stale figure they never typed. A larger amount
   * the cashier did type is left alone.
   */
  private syncCashToTotal(): void {
    if (this.paymentMethod() !== 'Cash') return;
    if (this.amountPaid() < this.estTotal()) this.amountPaid.set(this.estTotal());
  }
}

function round3(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}
