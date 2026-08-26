import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../core/environment';

export interface Medicine {
  id: number;
  nameAr: string;
  nameEn: string;
  barcode: string;
  jFDARegistrationNo?: string;
  form: string;
  strength?: string;
  manufacturer?: string;
  taxRate: number;
  isControlled: boolean;
  controlledLevel: number;
  isActive: boolean;
  createdAt: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class MedicinesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/medicines`;

  private medicinesSignal = signal<PagedResult<Medicine>>({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0
  });

  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);

  readonly medicines = computed(() => this.medicinesSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly error = computed(() => this.errorSignal());

  loadMedicines(searchTerm?: string, page = 1, pageSize = 10) {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const params: any = { page, pageSize };
    if (searchTerm) params.searchTerm = searchTerm;

    this.http.get<PagedResult<Medicine>>(this.apiUrl, { params }).subscribe({
      next: (data) => {
        this.medicinesSignal.set(data);
        this.loadingSignal.set(false);
      },
      error: (err) => {
        this.errorSignal.set('فشل تحميل الأدوية');
        this.loadingSignal.set(false);
      }
    });
  }

  createMedicine(medicine: Omit<Medicine, 'id' | 'createdAt'>) {
    return this.http.post<number>(this.apiUrl, medicine);
  }

  updateMedicine(id: number, medicine: Partial<Medicine>) {
    return this.http.put(`${this.apiUrl}/${id}`, medicine);
  }
}
