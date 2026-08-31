import { Injectable, computed, inject } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';

/**
 * Locale-aware number, money and date formatting.
 *
 * This lives in one place on purpose. The Arabic rules below were each found by
 * inspecting rendered output, and duplicating them per feature is how they drift
 * back out of sync.
 */
@Injectable({ providedIn: 'root' })
export class FormatService {
  private readonly i18n = inject(I18nService);

  /**
   * Arabic uses `-u-nu-latn` so numerals stay Latin. Quantities, barcodes and
   * batch numbers elsewhere are plain interpolations and therefore Latin; letting
   * Intl switch to Arabic-Indic digits would put two digit systems side by side
   * in the same table row.
   */
  private readonly numberLocale = computed(() =>
    this.i18n.lang() === 'ar' ? 'ar-JO-u-nu-latn' : 'en-JO',
  );
  private readonly dateLocale = computed(() =>
    this.i18n.lang() === 'ar' ? 'ar-JO-u-nu-latn' : 'en-GB',
  );

  /** The Jordanian dinar subdivides into 1000 fils, so money always shows 3 decimals. */
  private readonly moneyFormat = computed(
    () =>
      new Intl.NumberFormat(this.numberLocale(), {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      }),
  );
  private readonly integerFormat = computed(
    () => new Intl.NumberFormat(this.numberLocale(), { maximumFractionDigits: 0 }),
  );
  private readonly dateFormat = computed(
    () => new Intl.DateTimeFormat(this.dateLocale(), { dateStyle: 'medium' }),
  );
  private readonly dateTimeFormat = computed(
    () => new Intl.DateTimeFormat(this.dateLocale(), { dateStyle: 'short', timeStyle: 'short' }),
  );

  /** Amount followed by the currency name, kept on one line. */
  readonly money = (value: number): string =>
    // Non-breaking space keeps the amount and the currency from splitting.
    `${this.moneyFormat().format(value)}\u00A0${this.i18n.t('unit.jod')}`;

  /** Bare amount with no currency, for use in columns that carry their own header. */
  readonly amount = (value: number): string => this.moneyFormat().format(value);

  readonly integer = (value: number): string => this.integerFormat().format(value);

  readonly date = (iso: string): string => stripBidi(this.dateFormat().format(new Date(iso)));

  readonly dateTime = (iso: string): string =>
    stripBidi(this.dateTimeFormat().format(new Date(iso)));

  /** Keeps the sign visible on deltas, and isolates it from surrounding RTL text. */
  readonly signed = (value: number): string => (value > 0 ? `+${value}` : String(value));
}

/**
 * Arabic date patterns embed U+200F (RLM) between the segments. Inside a cell
 * isolated to LTR for its numerals, those marks reorder the parts and render
 * 22/04/2028 as "222028/04/". Stripping the bidi controls leaves the segment
 * order the format already specifies.
 */
function stripBidi(text: string): string {
  return text.replace(/[\u200E\u200F\u061C]/g, '');
}
