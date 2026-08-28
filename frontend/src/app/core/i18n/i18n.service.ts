import { Injectable, computed, effect, signal } from '@angular/core';
import { DICTIONARIES, TranslationKey } from './translations';

export type Lang = 'ar' | 'en';

const STORAGE_KEY = 'pharmacy.lang';
const DEFAULT_LANG: Lang = 'ar';

/**
 * Signal-based runtime i18n.
 *
 * Switching language is instant (no page reload and no per-locale build) and also
 * flips the document direction, which matters because Arabic is RTL and English is LTR.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly _lang = signal<Lang>(readStoredLang());

  /** Currently active language. */
  readonly lang = this._lang.asReadonly();

  /** 'rtl' for Arabic, 'ltr' for English. */
  readonly dir = computed<'rtl' | 'ltr'>(() => (this._lang() === 'ar' ? 'rtl' : 'ltr'));

  /** True when Arabic is active. */
  readonly isArabic = computed(() => this._lang() === 'ar');

  private readonly dictionary = computed(() => DICTIONARIES[this._lang()]);

  constructor() {
    // Keep <html lang> and <html dir> in sync so native browser behaviour
    // (text direction, form controls, scrollbars, spellcheck) follows the language.
    effect(() => {
      const lang = this._lang();
      const dir = this.dir();
      if (typeof document === 'undefined') return;
      document.documentElement.lang = lang;
      document.documentElement.dir = dir;
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        /* storage unavailable (private mode) — language still applies for this session */
      }
    });
  }

  setLang(lang: Lang): void {
    this._lang.set(lang);
  }

  toggle(): void {
    this._lang.update(l => (l === 'ar' ? 'en' : 'ar'));
  }

  /**
   * Translate a key, optionally interpolating `{placeholder}` values.
   * Declared as an arrow property so it can be used unbound in templates.
   */
  readonly t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let text: string = this.dictionary()[key];
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  };

  /**
   * Pick the field matching the active language for bilingual records
   * (e.g. a medicine stored with both nameAr and nameEn), falling back
   * to the other language when one side is empty.
   */
  readonly localized = (arabic: string | null | undefined, english: string | null | undefined): string => {
    return (this.isArabic() ? arabic || english : english || arabic) ?? '';
  };
}

function readStoredLang(): Lang {
  if (typeof localStorage === 'undefined') return DEFAULT_LANG;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'ar' || stored === 'en' ? stored : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}
