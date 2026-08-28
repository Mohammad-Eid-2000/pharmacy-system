import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';

export interface Medicine {
  id: number;
  nameAr: string;
  nameEn: string;
  barcode: string;
  jfdaRegistrationNo?: string | null;
  form: string;
  strength?: string | null;
  manufacturer?: string | null;
  taxRate: number;
  isControlled: boolean;
  controlledLevel: number;
  isActive: boolean;
  createdAt: string;
}

/** Payload for creating a medicine — mirrors CreateMedicineCommand on the API. */
export type CreateMedicinePayload = Omit<Medicine, 'id' | 'createdAt' | 'isActive'>;

/** Payload for updating a medicine — mirrors UpdateMedicineCommand (requires Id). */
export type UpdateMedicinePayload = Omit<Medicine, 'createdAt'>;

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const EMPTY_PAGE: PagedResult<Medicine> = {
  items: [],
  totalCount: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
};

@Injectable({ providedIn: 'root' })
export class MedicinesService {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly endpoint = '/medicines';

  private readonly _page = signal<PagedResult<Medicine>>(EMPTY_PAGE);
  private readonly _loading = signal(false);
  /** Stores a translation key so the message re-translates when the language changes. */
  private readonly _errorKey = signal<'medicines.loadFailed' | null>(null);

  readonly medicines = this._page.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = computed(() => {
    const key = this._errorKey();
    return key ? this.i18n.t(key) : null;
  });

  loadMedicines(searchTerm?: string, page = 1, pageSize = 10): void {
    this._loading.set(true);
    this._errorKey.set(null);

    const params: Record<string, string | number> = { page, pageSize };
    if (searchTerm) params['searchTerm'] = searchTerm;

    this.http.get<PagedResult<Medicine>>(this.endpoint, { params }).subscribe({
      next: data => {
        this._page.set(data);
        this._loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Failed to load medicines', err);
        this._errorKey.set('medicines.loadFailed');
        this._loading.set(false);
      },
    });
  }

  createMedicine(payload: CreateMedicinePayload): Observable<number> {
    return this.http.post<number>(this.endpoint, payload).pipe(catchError(toClientError));
  }

  updateMedicine(payload: UpdateMedicinePayload): Observable<void> {
    return this.http
      .put<void>(`${this.endpoint}/${payload.id}`, payload)
      .pipe(catchError(toClientError));
  }
}

/** Surfaces the API's ProblemDetails conflict (409) as a typed reason the UI can translate. */
export interface MedicineSaveError {
  status: number;
  reason: 'duplicateBarcode' | 'unknown';
}

function toClientError(err: HttpErrorResponse) {
  const reason: MedicineSaveError['reason'] = err.status === 409 ? 'duplicateBarcode' : 'unknown';
  return throwError(() => ({ status: err.status, reason }) satisfies MedicineSaveError);
}
