import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MedicinesService, Medicine } from './medicines.service';
import { MedicinesFormComponent } from './medicines-form.component';

@Component({
  selector: 'app-medicines-list',
  standalone: true,
  imports: [FormsModule, MedicinesFormComponent],
  template: `
    <div class="medicines-page">
      <div class="page-header">
        <h1>إدارة الأدوية</h1>
        <button class="btn btn-primary" (click)="showForm()">+ دواء جديد</button>
      </div>

      <div class="filters card">
        <input type="text" class="form-input" placeholder="بحث بالاسم أو الباركود..." [(ngModel)]="searchTerm" (input)="onSearch()" />
      </div>

      @if (loading()) { <div class="loading">جاري التحميل...</div> }
      @else if (error()) { <div class="error">{{ error() }}</div> }
      @else {
        <div class="table-container card">
          <table class="table">
            <thead>
              <tr>
                <th>الاسم العربي</th><th>الاسم الإنجليزي</th><th>الباركود</th><th>الشكل الدوائي</th><th>الضريبة</th><th>مخدر</th><th>حالة</th><th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              @for (medicine of medicines().items; track medicine.id) {
                <tr>
                  <td>{{ medicine.nameAr }}</td>
                  <td>{{ medicine.nameEn }}</td>
                  <td>{{ medicine.barcode }}</td>
                  <td>{{ medicine.form }}</td>
                  <td>{{ medicine.taxRate }}%</td>
                  <td>{{ medicine.isControlled ? '✓' : '✗' }}</td>
                  <td><span [class.active-badge]="medicine.isActive">{{ medicine.isActive ? 'نشط' : 'غير نشط' }}</span></td>
                  <td><button class="btn btn-secondary" (click)="editMedicine(medicine)">تعديل</button></td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="no-data">لا توجد أدوية</td></tr>
              }
            </tbody>
          </table>
        </div>

        @if (medicines().totalPages > 1) {
          <div class="pagination">
            <button class="btn btn-secondary" [disabled]="medicines().page <= 1" (click)="changePage(medicines().page - 1)">السابق</button>
            <span>صفحة {{ medicines().page }} من {{ medicines().totalPages }}</span>
            <button class="btn btn-secondary" [disabled]="medicines().page >= medicines().totalPages" (click)="changePage(medicines().page + 1)">التالي</button>
          </div>
        }
      }

      @if (isFormVisible()) {
        <app-medicines-form [medicine]="selectedMedicine()" (close)="hideForm()" (saved)="onSaved()" />
      }
    </div>
  `,
  styles: [`
    .medicines-page { max-width: 1400px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-6); }
    .page-header h1 { font-size: 1.75rem; color: var(--color-primary); }
    .filters { margin-bottom: var(--space-6); }
    .table-container { overflow-x: auto; }
    .no-data { text-align: center; color: var(--color-text-muted); padding: var(--space-6); }
    .pagination { display: flex; justify-content: center; align-items: center; gap: var(--space-4); margin-top: var(--space-6); }
    .active-badge { background: #437a22; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.875rem; }
  `]
})
export class MedicinesListComponent implements OnInit {
  private medicinesService = inject(MedicinesService);
  readonly medicines = this.medicinesService.medicines;
  readonly loading = this.medicinesService.loading;
  readonly error = this.medicinesService.error;
  searchTerm = '';
  isFormVisible = signal(false);
  selectedMedicine = signal<Medicine | null>(null);

  ngOnInit() { this.medicinesService.loadMedicines(); }
  onSearch() { this.medicinesService.loadMedicines(this.searchTerm || undefined); }
  changePage(page: number) { this.medicinesService.loadMedicines(this.searchTerm || undefined, page); }
  showForm() { this.selectedMedicine.set(null); this.isFormVisible.set(true); }
  editMedicine(medicine: Medicine) { this.selectedMedicine.set(medicine); this.isFormVisible.set(true); }
  hideForm() { this.isFormVisible.set(false); this.selectedMedicine.set(null); }
  onSaved() { this.hideForm(); this.medicinesService.loadMedicines(this.searchTerm || undefined); }
}
