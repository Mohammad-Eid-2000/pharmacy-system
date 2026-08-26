import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MedicinesService, Medicine } from './medicines.service';

@Component({
  selector: 'app-medicines-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ medicine() ? 'تعديل دواء' : 'إضافة دواء جديد' }}</h2>
          <button class="btn-close" (click)="close.emit()">✕</button>
        </div>
        <form (ngSubmit)="onSubmit()" class="medicine-form">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">الاسم العربي *</label>
              <input type="text" class="form-input" name="nameAr" [(ngModel)]="formData.nameAr" required />
            </div>
            <div class="form-group">
              <label class="form-label">الاسم الإنجليزي *</label>
              <input type="text" class="form-input" name="nameEn" [(ngModel)]="formData.nameEn" required />
            </div>
            <div class="form-group">
              <label class="form-label">الباركود *</label>
              <input type="text" class="form-input" name="barcode" [(ngModel)]="formData.barcode" required />
            </div>
            <div class="form-group">
              <label class="form-label">رقم تسجيل JFDA</label>
              <input type="text" class="form-input" name="jFDARegistrationNo" [(ngModel)]="formData.jFDARegistrationNo" />
            </div>
            <div class="form-group">
              <label class="form-label">الشكل الدوائي *</label>
              <select class="form-input" name="form" [(ngModel)]="formData.form" required>
                <option value="">اختر الشكل الدوائي</option>
                <option value="Tablet">أقراص (Tablet)</option>
                <option value="Capsule">كبسولات (Capsule)</option>
                <option value="Syrup">شراب (Syrup)</option>
                <option value="Suspension">معلق (Suspension)</option>
                <option value="Injection">حقن (Injection)</option>
                <option value="Cream">كريم (Cream)</option>
                <option value="Ointment">مرهم (Ointment)</option>
                <option value="Drops">قطرات (Drops)</option>
                <option value="Inhaler">بخاخ (Inhaler)</option>
                <option value="Suppository">تحاميل (Suppository)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">التركيز (Strength)</label>
              <input type="text" class="form-input" name="strength" [(ngModel)]="formData.strength" placeholder="مثال: 500mg, 10mg/ml" />
            </div>
            <div class="form-group">
              <label class="form-label">الشركة المصنعة</label>
              <input type="text" class="form-input" name="manufacturer" [(ngModel)]="formData.manufacturer" />
            </div>
            <div class="form-group">
              <label class="form-label">نسبة الضريبة (%)</label>
              <input type="number" class="form-input" name="taxRate" [(ngModel)]="formData.taxRate" min="0" max="100" />
            </div>
            <div class="form-group">
              <label class="form-label"><input type="checkbox" name="isControlled" [(ngModel)]="formData.isControlled" /> دواء مخدر/مراقب</label>
            </div>
            @if (formData.isControlled) {
              <div class="form-group">
                <label class="form-label">مستوى المراقبة</label>
                <select class="form-input" name="controlledLevel" [(ngModel)]="formData.controlledLevel">
                  <option [ngValue]="1">مستوى 1</option>
                  <option [ngValue]="2">مستوى 2</option>
                  <option [ngValue]="3">مستوى 3</option>
                </select>
              </div>
            }
            <div class="form-group">
              <label class="form-label"><input type="checkbox" name="isActive" [(ngModel)]="formData.isActive" /> نشط</label>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="close.emit()">إلغاء</button>
            <button type="submit" class="btn btn-primary">{{ medicine() ? 'تحديث' : 'إضافة' }}</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay { position: fixed; top: 0; right: 0; left: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: white; border-radius: var(--radius-lg); width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: var(--space-6); border-bottom: 1px solid var(--color-border); }
    .modal-header h2 { font-size: 1.5rem; color: var(--color-primary); }
    .btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--color-text-muted); }
    .medicine-form { padding: var(--space-6); }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--space-4); }
    .form-actions { display: flex; justify-content: flex-end; gap: var(--space-4); margin-top: var(--space-6); padding-top: var(--space-6); border-top: 1px solid var(--color-border); }
  `]
})
export class MedicinesFormComponent {
  private medicinesService = inject(MedicinesService);
  readonly medicine = input<Medicine | null>(null);
  readonly close = output<void>();
  readonly saved = output<void>();

  formData: Omit<Medicine, 'id' | 'createdAt'> = {
    nameAr: '', nameEn: '', barcode: '', jFDARegistrationNo: '',
    form: '', strength: '', manufacturer: '',
    taxRate: 16, isControlled: false, controlledLevel: 0, isActive: true
  };

  constructor() {
    const med = this.medicine();
    if (med) this.formData = { ...med };
  }

  onSubmit() {
    if (this.medicine()) {
      this.medicinesService.updateMedicine(this.medicine()!.id, this.formData).subscribe(() => this.saved.emit());
    } else {
      this.medicinesService.createMedicine(this.formData).subscribe(() => this.saved.emit());
    }
  }
}
