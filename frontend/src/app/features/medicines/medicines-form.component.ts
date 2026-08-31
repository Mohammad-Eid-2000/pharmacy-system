import { Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { Medicine, MedicineSaveError, MedicinesService } from './medicines.service';

/** Dosage-form codes stored on the API; labels are translated at render time. */
const DOSAGE_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Suspension',
  'Injection',
  'Cream',
  'Ointment',
  'Drops',
  'Inhaler',
  'Suppository',
] as const;

interface MedicineForm {
  nameAr: string;
  nameEn: string;
  barcode: string;
  jfdaRegistrationNo: string;
  form: string;
  strength: string;
  manufacturer: string;
  taxRate: number;
  isControlled: boolean;
  controlledLevel: number;
  isActive: boolean;
  reorderLevel: number;
}

function emptyForm(): MedicineForm {
  return {
    nameAr: '',
    nameEn: '',
    barcode: '',
    jfdaRegistrationNo: '',
    form: '',
    strength: '',
    manufacturer: '',
    // Jordan standard sales tax rate.
    taxRate: 16,
    isControlled: false,
    controlledLevel: 0,
    isActive: true,
    // Default low-stock threshold; matches the domain default on the API.
    reorderLevel: 10,
  };
}

function toForm(medicine: Medicine | null): MedicineForm {
  if (!medicine) return emptyForm();
  return {
    nameAr: medicine.nameAr,
    nameEn: medicine.nameEn,
    barcode: medicine.barcode,
    jfdaRegistrationNo: medicine.jfdaRegistrationNo ?? '',
    form: medicine.form,
    strength: medicine.strength ?? '',
    manufacturer: medicine.manufacturer ?? '',
    taxRate: medicine.taxRate,
    isControlled: medicine.isControlled,
    controlledLevel: medicine.controlledLevel,
    isActive: medicine.isActive,
    reorderLevel: medicine.reorderLevel,
  };
}

@Component({
  selector: 'app-medicines-form',
  imports: [FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-content" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ i18n.t(medicine() ? 'medicineForm.editTitle' : 'medicineForm.addTitle') }}</h2>
          <button class="btn-close" type="button" [attr.aria-label]="i18n.t('action.close')" (click)="close.emit()">
            ✕
          </button>
        </div>

        <form (ngSubmit)="onSubmit()" class="medicine-form">
          @if (errorKey()) {
            <p class="form-error">{{ i18n.t(errorKey()!) }}</p>
          }

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="nameAr">{{ i18n.t('medicine.nameAr') }} *</label>
              <input id="nameAr" type="text" class="form-input" name="nameAr" [(ngModel)]="form().nameAr" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="nameEn">{{ i18n.t('medicine.nameEn') }} *</label>
              <input id="nameEn" type="text" class="form-input" name="nameEn" [(ngModel)]="form().nameEn" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="barcode">{{ i18n.t('medicine.barcode') }} *</label>
              <input id="barcode" type="text" class="form-input" name="barcode" [(ngModel)]="form().barcode" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="jfda">{{ i18n.t('medicine.jfda') }}</label>
              <input id="jfda" type="text" class="form-input" name="jfda" [(ngModel)]="form().jfdaRegistrationNo" />
            </div>
            <div class="form-group">
              <label class="form-label" for="form">{{ i18n.t('medicine.form') }} *</label>
              <select id="form" class="form-input" name="form" [(ngModel)]="form().form" required>
                <option value="">{{ i18n.t('medicine.formPlaceholder') }}</option>
                @for (code of dosageForms; track code) {
                  <option [value]="code">{{ dosageFormLabel(code) }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="strength">{{ i18n.t('medicine.strength') }}</label>
              <input
                id="strength"
                type="text"
                class="form-input"
                name="strength"
                [(ngModel)]="form().strength"
                [placeholder]="i18n.t('medicine.strengthPlaceholder')"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="manufacturer">{{ i18n.t('medicine.manufacturer') }}</label>
              <input
                id="manufacturer"
                type="text"
                class="form-input"
                name="manufacturer"
                [(ngModel)]="form().manufacturer"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="taxRate">{{ i18n.t('medicine.taxRate') }}</label>
              <input
                id="taxRate"
                type="number"
                class="form-input"
                name="taxRate"
                [(ngModel)]="form().taxRate"
                min="0"
                max="100"
                step="0.01"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="reorderLevel">{{ i18n.t('medicine.reorderLevel') }}</label>
              <input
                id="reorderLevel"
                type="number"
                class="form-input"
                name="reorderLevel"
                [(ngModel)]="form().reorderLevel"
                min="0"
                step="1"
              />
              <span class="form-hint">{{ i18n.t('medicine.reorderLevelHint') }}</span>
            </div>
            <div class="form-group">
              <label class="form-label checkbox-label">
                <input type="checkbox" name="isControlled" [(ngModel)]="form().isControlled" />
                {{ i18n.t('medicine.controlled') }}
              </label>
            </div>
            @if (form().isControlled) {
              <div class="form-group">
                <label class="form-label" for="controlledLevel">{{ i18n.t('medicine.controlledLevel') }}</label>
                <select id="controlledLevel" class="form-input" name="controlledLevel" [(ngModel)]="form().controlledLevel">
                  @for (level of controlLevels; track level) {
                    <option [ngValue]="level">{{ i18n.t('medicine.level', { n: level }) }}</option>
                  }
                </select>
              </div>
            }
            <div class="form-group">
              <label class="form-label checkbox-label">
                <input type="checkbox" name="isActive" [(ngModel)]="form().isActive" />
                {{ i18n.t('medicine.active') }}
              </label>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="close.emit()">
              {{ i18n.t('action.cancel') }}
            </button>
            <button type="submit" class="btn btn-primary" [disabled]="saving()">
              @if (saving()) {
                {{ i18n.t('state.saving') }}
              } @else {
                {{ i18n.t(medicine() ? 'action.update' : 'action.add') }}
              }
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
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-4);
        z-index: 1000;
      }
      .modal-content {
        background: var(--color-surface);
        border-radius: var(--radius-lg);
        width: 100%;
        max-width: 800px;
        max-height: 90vh;
        overflow-y: auto;
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-4);
        padding: var(--space-6);
        border-bottom: 1px solid var(--color-border);
      }
      .form-hint {
        display: block;
        font-size: 0.8125rem;
        color: var(--color-text-muted);
        margin-top: var(--space-1);
      }
      .modal-header h2 {
        font-size: 1.25rem;
        color: var(--color-primary);
      }
      .btn-close {
        background: none;
        border: none;
        font-size: 1.25rem;
        line-height: 1;
        cursor: pointer;
        color: var(--color-text-muted);
      }
      .medicine-form {
        padding: var(--space-6);
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: var(--space-4);
      }
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        cursor: pointer;
      }
      .form-error {
        margin-bottom: var(--space-4);
        padding: var(--space-3) var(--space-4);
        border: 1px solid var(--color-danger);
        border-radius: var(--radius-md);
        color: var(--color-danger);
        background: #fdf3f2;
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-4);
        margin-top: var(--space-6);
        padding-top: var(--space-6);
        border-top: 1px solid var(--color-border);
      }
    `,
  ],
})
export class MedicinesFormComponent {
  protected readonly i18n = inject(I18nService);
  private readonly service = inject(MedicinesService);

  readonly medicine = input<Medicine | null>(null);
  readonly close = output<void>();
  readonly saved = output<void>();

  /**
   * Derived from the input rather than the constructor: input signals are not
   * populated at construction time, so reading `medicine()` there would always
   * yield null and silently break edit mode.
   */
  protected readonly form = linkedSignal<MedicineForm>(() => toForm(this.medicine()));

  protected readonly saving = signal(false);
  protected readonly errorKey = signal<TranslationKey | null>(null);

  protected readonly dosageForms = DOSAGE_FORMS;
  protected readonly controlLevels = [1, 2, 3] as const;

  protected dosageFormLabel(code: string): string {
    return this.i18n.t(`form.${code}` as TranslationKey);
  }

  protected onSubmit(): void {
    if (this.saving()) return;

    const value = this.form();
    const existing = this.medicine();

    this.saving.set(true);
    this.errorKey.set(null);

    const request: Observable<unknown> = existing
      ? this.service.updateMedicine({ ...value, id: existing.id })
      : this.service.createMedicine(value);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: (err: MedicineSaveError) => {
        this.saving.set(false);
        this.errorKey.set(err.reason === 'duplicateBarcode' ? 'medicines.duplicateBarcode' : 'medicines.saveFailed');
      },
    });
  }
}
