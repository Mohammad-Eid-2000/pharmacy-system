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
  'medicine.reorderLevel': 'حد إعادة الطلب',
  'medicine.reorderLevelHint': 'ينبّهك النظام عند وصول المخزون لهذا الحد',

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

  // Inventory — tabs & headings
  'inventory.stockTab': 'المخزون حسب الدواء',
  'inventory.batchesTab': 'الدفعات',
  'inventory.movementsTab': 'سجل الحركات',
  'inventory.receiveStock': 'استلام دفعة',
  'inventory.searchPlaceholder': 'بحث بالاسم أو الباركود...',
  'inventory.loadFailed': 'فشل تحميل بيانات المخزون',
  'inventory.emptyStock': 'لا توجد أدوية في المخزون',
  'inventory.emptyBatches': 'لا توجد دفعات',
  'inventory.emptyMovements': 'لا توجد حركات مخزون',

  // Inventory — summary cards
  'inventory.summaryUnits': 'إجمالي الوحدات',
  'inventory.summaryValue': 'قيمة المخزون',
  'inventory.summaryBatches': 'الدفعات النشطة',
  'inventory.summaryLow': 'مخزون منخفض',
  'inventory.summaryOut': 'نفذ من المخزون',
  'inventory.summaryExpiring': 'قارب على الانتهاء',
  'inventory.summaryExpired': 'منتهي الصلاحية',
  'inventory.summaryMedicines': 'الأدوية النشطة',

  // Inventory — stock table
  'inventory.quantity': 'الكمية',
  'inventory.reorderLevel': 'حد إعادة الطلب',
  'inventory.batchCount': 'عدد الدفعات',
  'inventory.nearestExpiry': 'أقرب انتهاء صلاحية',
  'inventory.stockValue': 'القيمة',
  'inventory.viewBatches': 'عرض الدفعات',

  // Inventory — stock status
  'stockStatus.OutOfStock': 'نفذ',
  'stockStatus.Low': 'منخفض',
  'stockStatus.Ok': 'متوفر',
  'stockStatus.all': 'كل الحالات',

  // Inventory — batch table
  'batch.batchNo': 'رقم الدفعة',
  'batch.medicine': 'الدواء',
  'batch.expiryDate': 'تاريخ الانتهاء',
  'batch.quantity': 'الكمية',
  'batch.initialQuantity': 'الكمية الأصلية',
  'batch.purchasePrice': 'سعر الشراء',
  'batch.sellingPrice': 'سعر البيع',
  'batch.supplier': 'المورّد',
  'batch.receivedDate': 'تاريخ الاستلام',
  'batch.daysLeft': 'الأيام المتبقية',
  'batch.adjust': 'تعديل الكمية',
  'batch.showDepleted': 'إظهار الدفعات المنتهية',
  'batch.clearFilter': 'إلغاء التصفية',
  'batch.filteredBy': 'الدفعات لـ: {name}',

  // Inventory — expiry status
  'expiryStatus.Expired': 'منتهي',
  'expiryStatus.ExpiringSoon': 'قارب على الانتهاء',
  'expiryStatus.Valid': 'صالح',
  'expiryStatus.all': 'كل الصلاحيات',
  'expiry.daysAgo': 'منذ {n} يوم',
  'expiry.inDays': 'بعد {n} يوم',

  // Inventory — movements table
  'movement.date': 'التاريخ',
  'movement.type': 'نوع الحركة',
  'movement.change': 'التغيير',
  'movement.before': 'قبل',
  'movement.after': 'بعد',
  'movement.reason': 'السبب',
  'movement.reference': 'المرجع',

  // Movement types
  'movementType.Receipt': 'استلام',
  'movementType.Dispense': 'صرف',
  'movementType.Adjustment': 'تسوية جرد',
  'movementType.Disposal': 'إتلاف',
  'movementType.ReturnToSupplier': 'إرجاع للمورّد',
  'movementType.CustomerReturn': 'إرجاع من العميل',

  // Receive stock form
  'receive.title': 'استلام دفعة جديدة',
  'receive.medicine': 'الدواء',
  'receive.medicinePlaceholder': 'اختر الدواء',
  'receive.submit': 'تسجيل الاستلام',
  'receive.duplicateBatch': 'رقم الدفعة مستخدم لهذا الدواء',
  'receive.invalid': 'تحقق من البيانات المدخلة',
  'receive.failed': 'فشل تسجيل الاستلام',
  'receive.expiryHint': 'يجب أن يكون تاريخ الانتهاء في المستقبل',

  // Adjust stock form
  'adjust.title': 'تعديل كمية الدفعة',
  'adjust.currentQuantity': 'الكمية الحالية',
  'adjust.newQuantity': 'الكمية الجديدة',
  'adjust.movementType': 'نوع الحركة',
  'adjust.reason': 'السبب',
  'adjust.reasonPlaceholder': 'مثال: تسوية جرد فعلي',
  'adjust.reference': 'المرجع (اختياري)',
  'adjust.submit': 'حفظ التعديل',
  'adjust.maxHint': 'الحد الأقصى {n} وحدة',
  'adjust.invalid': 'تحقق من البيانات المدخلة',
  'adjust.failed': 'فشل تعديل الكمية',
  'adjust.delta': 'الفرق',

  // Units
  'unit.jod': 'د.أ',
  'unit.units': 'وحدة',
  'unit.day': 'يوم',
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
  'medicine.reorderLevel': 'Reorder Level',
  'medicine.reorderLevelHint': 'You are alerted when stock reaches this level',

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

  // Inventory — tabs & headings
  'inventory.stockTab': 'Stock by Medicine',
  'inventory.batchesTab': 'Batches',
  'inventory.movementsTab': 'Movement Log',
  'inventory.receiveStock': 'Receive Stock',
  'inventory.searchPlaceholder': 'Search by name or barcode...',
  'inventory.loadFailed': 'Failed to load inventory data',
  'inventory.emptyStock': 'No medicines in inventory',
  'inventory.emptyBatches': 'No batches found',
  'inventory.emptyMovements': 'No stock movements recorded',

  // Inventory — summary cards
  'inventory.summaryUnits': 'Total Units',
  'inventory.summaryValue': 'Stock Value',
  'inventory.summaryBatches': 'Active Batches',
  'inventory.summaryLow': 'Low Stock',
  'inventory.summaryOut': 'Out of Stock',
  'inventory.summaryExpiring': 'Expiring Soon',
  'inventory.summaryExpired': 'Expired',
  'inventory.summaryMedicines': 'Active Medicines',

  // Inventory — stock table
  'inventory.quantity': 'Quantity',
  'inventory.reorderLevel': 'Reorder Level',
  'inventory.batchCount': 'Batches',
  'inventory.nearestExpiry': 'Nearest Expiry',
  'inventory.stockValue': 'Value',
  'inventory.viewBatches': 'View Batches',

  // Inventory — stock status
  'stockStatus.OutOfStock': 'Out',
  'stockStatus.Low': 'Low',
  'stockStatus.Ok': 'In Stock',
  'stockStatus.all': 'All Statuses',

  // Inventory — batch table
  'batch.batchNo': 'Batch No',
  'batch.medicine': 'Medicine',
  'batch.expiryDate': 'Expiry Date',
  'batch.quantity': 'Quantity',
  'batch.initialQuantity': 'Received Qty',
  'batch.purchasePrice': 'Purchase Price',
  'batch.sellingPrice': 'Selling Price',
  'batch.supplier': 'Supplier',
  'batch.receivedDate': 'Received Date',
  'batch.daysLeft': 'Days Left',
  'batch.adjust': 'Adjust Quantity',
  'batch.showDepleted': 'Show depleted batches',
  'batch.clearFilter': 'Clear filter',
  'batch.filteredBy': 'Batches for: {name}',

  // Inventory — expiry status
  'expiryStatus.Expired': 'Expired',
  'expiryStatus.ExpiringSoon': 'Expiring Soon',
  'expiryStatus.Valid': 'Valid',
  'expiryStatus.all': 'All Expiry States',
  'expiry.daysAgo': '{n} days ago',
  'expiry.inDays': 'in {n} days',

  // Inventory — movements table
  'movement.date': 'Date',
  'movement.type': 'Movement Type',
  'movement.change': 'Change',
  'movement.before': 'Before',
  'movement.after': 'After',
  'movement.reason': 'Reason',
  'movement.reference': 'Reference',

  // Movement types
  'movementType.Receipt': 'Receipt',
  'movementType.Dispense': 'Dispense',
  'movementType.Adjustment': 'Stock Adjustment',
  'movementType.Disposal': 'Disposal',
  'movementType.ReturnToSupplier': 'Return to Supplier',
  'movementType.CustomerReturn': 'Customer Return',

  // Receive stock form
  'receive.title': 'Receive New Batch',
  'receive.medicine': 'Medicine',
  'receive.medicinePlaceholder': 'Select a medicine',
  'receive.submit': 'Record Receipt',
  'receive.duplicateBatch': 'This batch number already exists for this medicine',
  'receive.invalid': 'Please check the values you entered',
  'receive.failed': 'Failed to record the receipt',
  'receive.expiryHint': 'Expiry date must be in the future',

  // Adjust stock form
  'adjust.title': 'Adjust Batch Quantity',
  'adjust.currentQuantity': 'Current Quantity',
  'adjust.newQuantity': 'New Quantity',
  'adjust.movementType': 'Movement Type',
  'adjust.reason': 'Reason',
  'adjust.reasonPlaceholder': 'e.g. physical count correction',
  'adjust.reference': 'Reference (optional)',
  'adjust.submit': 'Save Adjustment',
  'adjust.maxHint': 'Maximum {n} units',
  'adjust.invalid': 'Please check the values you entered',
  'adjust.failed': 'Failed to adjust the quantity',
  'adjust.delta': 'Difference',

  // Units
  'unit.jod': 'JOD',
  'unit.units': 'units',
  'unit.day': 'day',
};

export const DICTIONARIES = { ar, en } as const;
