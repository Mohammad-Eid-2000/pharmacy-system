/**
 * Bilingual dictionaries (Arabic / English).
 *
 * `ar` is the source of truth: its keys define `TranslationKey`, and `en` is typed
 * as `Record<TranslationKey, string>` so the build FAILS if a key is missing or
 * misspelled in either language. Translations can never silently drift apart.
 */

export const ar = {
  // App shell
  'app.title': 'نظام الصيدلية',
  'app.subtitle': 'نظام إدارة الصيدلية',
  'app.greeting': 'مرحباً، صيدلي',
  'app.language': 'اللغة',

  // Navigation
  'nav.medicines': 'الأدوية',
  'nav.inventory': 'المخزون',
  'nav.pos': 'نقطة البيع',
  'nav.purchases': 'المشتريات',
  'nav.reports': 'التقارير',

  // Shared actions
  'action.add': 'إضافة',
  'action.edit': 'تعديل',
  'action.update': 'تحديث',
  'action.cancel': 'إلغاء',
  'action.save': 'حفظ',
  'action.close': 'إغلاق',
  'action.retry': 'إعادة المحاولة',

  // Shared states
  'state.loading': 'جاري التحميل...',
  'state.saving': 'جاري الحفظ...',
  'state.noData': 'لا توجد بيانات',
  'state.comingSoon': 'قريباً',
  'state.required': 'هذا الحقل مطلوب',

  // Pagination
  'pagination.previous': 'السابق',
  'pagination.next': 'التالي',
  'pagination.page': 'صفحة {page} من {total}',
  'pagination.total': 'الإجمالي: {count}',

  // Medicines page
  'medicines.title': 'إدارة الأدوية',
  'medicines.new': 'دواء جديد',
  'medicines.searchPlaceholder': 'بحث بالاسم أو الباركود...',
  'medicines.empty': 'لا توجد أدوية',
  'medicines.loadFailed': 'فشل تحميل الأدوية',
  'medicines.saveFailed': 'فشل حفظ الدواء',
  'medicines.duplicateBarcode': 'هذا الباركود مستخدم لدواء آخر',

  // Medicine fields
  'medicine.nameAr': 'الاسم العربي',
  'medicine.nameEn': 'الاسم الإنجليزي',
  'medicine.name': 'اسم الدواء',
  'medicine.barcode': 'الباركود',
  'medicine.jfda': 'رقم تسجيل JFDA',
  'medicine.form': 'الشكل الدوائي',
  'medicine.formPlaceholder': 'اختر الشكل الدوائي',
  'medicine.strength': 'التركيز',
  'medicine.strengthPlaceholder': 'مثال: 500mg، 10mg/ml',
  'medicine.manufacturer': 'الشركة المصنعة',
  'medicine.taxRate': 'نسبة الضريبة (%)',
  'medicine.controlled': 'دواء مخدر/مراقب',
  'medicine.controlledShort': 'مراقب',
  'medicine.controlledLevel': 'مستوى المراقبة',
  'medicine.level': 'مستوى {n}',
  'medicine.status': 'الحالة',
  'medicine.active': 'نشط',
  'medicine.inactive': 'غير نشط',
  'medicine.actions': 'إجراءات',

  // Medicine form
  'medicineForm.addTitle': 'إضافة دواء جديد',
  'medicineForm.editTitle': 'تعديل دواء',

  // Dosage forms
  'form.Tablet': 'أقراص',
  'form.Capsule': 'كبسولات',
  'form.Syrup': 'شراب',
  'form.Suspension': 'معلق',
  'form.Injection': 'حقن',
  'form.Cream': 'كريم',
  'form.Ointment': 'مرهم',
  'form.Drops': 'قطرات',
  'form.Inhaler': 'بخاخ',
  'form.Suppository': 'تحاميل',

  // Inventory page
  'inventory.title': 'إدارة المخزون',
} as const;

export type TranslationKey = keyof typeof ar;

export const en: Record<TranslationKey, string> = {
  // App shell
  'app.title': 'Pharmacy System',
  'app.subtitle': 'Pharmacy Management System',
  'app.greeting': 'Welcome, Pharmacist',
  'app.language': 'Language',

  // Navigation
  'nav.medicines': 'Medicines',
  'nav.inventory': 'Inventory',
  'nav.pos': 'Point of Sale',
  'nav.purchases': 'Purchases',
  'nav.reports': 'Reports',

  // Shared actions
  'action.add': 'Add',
  'action.edit': 'Edit',
  'action.update': 'Update',
  'action.cancel': 'Cancel',
  'action.save': 'Save',
  'action.close': 'Close',
  'action.retry': 'Retry',

  // Shared states
  'state.loading': 'Loading...',
  'state.saving': 'Saving...',
  'state.noData': 'No data available',
  'state.comingSoon': 'Coming soon',
  'state.required': 'This field is required',

  // Pagination
  'pagination.previous': 'Previous',
  'pagination.next': 'Next',
  'pagination.page': 'Page {page} of {total}',
  'pagination.total': 'Total: {count}',

  // Medicines page
  'medicines.title': 'Medicines Management',
  'medicines.new': 'New Medicine',
  'medicines.searchPlaceholder': 'Search by name or barcode...',
  'medicines.empty': 'No medicines found',
  'medicines.loadFailed': 'Failed to load medicines',
  'medicines.saveFailed': 'Failed to save medicine',
  'medicines.duplicateBarcode': 'This barcode is already used by another medicine',

  // Medicine fields
  'medicine.nameAr': 'Arabic Name',
  'medicine.nameEn': 'English Name',
  'medicine.name': 'Medicine Name',
  'medicine.barcode': 'Barcode',
  'medicine.jfda': 'JFDA Registration No.',
  'medicine.form': 'Dosage Form',
  'medicine.formPlaceholder': 'Select dosage form',
  'medicine.strength': 'Strength',
  'medicine.strengthPlaceholder': 'e.g. 500mg, 10mg/ml',
  'medicine.manufacturer': 'Manufacturer',
  'medicine.taxRate': 'Tax Rate (%)',
  'medicine.controlled': 'Controlled / Narcotic',
  'medicine.controlledShort': 'Controlled',
  'medicine.controlledLevel': 'Control Level',
  'medicine.level': 'Level {n}',
  'medicine.status': 'Status',
  'medicine.active': 'Active',
  'medicine.inactive': 'Inactive',
  'medicine.actions': 'Actions',

  // Medicine form
  'medicineForm.addTitle': 'Add New Medicine',
  'medicineForm.editTitle': 'Edit Medicine',

  // Dosage forms
  'form.Tablet': 'Tablet',
  'form.Capsule': 'Capsule',
  'form.Syrup': 'Syrup',
  'form.Suspension': 'Suspension',
  'form.Injection': 'Injection',
  'form.Cream': 'Cream',
  'form.Ointment': 'Ointment',
  'form.Drops': 'Drops',
  'form.Inhaler': 'Inhaler',
  'form.Suppository': 'Suppository',

  // Inventory page
  'inventory.title': 'Inventory Management',
};

export const DICTIONARIES = { ar, en } as const;
