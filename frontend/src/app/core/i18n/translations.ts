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
  'nav.sales': 'سجل المبيعات',
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

  // Point of sale
  'pos.title': 'نقطة البيع',
  'pos.todaySales': 'فواتير اليوم',
  'pos.todayRevenue': 'إيراد اليوم',
  'pos.findProduct': 'البحث عن دواء',
  'pos.searchPlaceholder': 'الاسم أو الباركود...',
  'pos.searchHint': 'امسح الباركود أو اضغط Enter لإضافة أول نتيجة',
  'pos.noProducts': 'لا توجد أدوية متاحة للبيع',
  'pos.controlled': 'مراقب',
  'pos.available': 'متوفر {n}',
  'pos.cart': 'السلة',
  'pos.cartEmpty': 'السلة فارغة — اختر دواءً لبدء الفاتورة',
  'pos.removeLine': 'إزالة من السلة',
  'pos.decrease': 'تقليل الكمية',
  'pos.increase': 'زيادة الكمية',
  'pos.quantity': 'الكمية',
  'pos.maxReached': 'لا يتوفر أكثر من {n} وحدة',
  'pos.subtotal': 'المجموع قبل الضريبة',
  'pos.tax': 'الضريبة',
  'pos.discount': 'الخصم',
  'pos.estimatedTotal': 'الإجمالي التقديري',
  'pos.estimateNote': 'المبالغ تقديرية؛ يحسب النظام السعر النهائي من أسعار الدفعات عند إتمام البيع',
  'pos.paymentMethod': 'طريقة الدفع',
  'pos.amountPaid': 'المبلغ المدفوع',
  'pos.shortfall': 'المبلغ المدفوع أقل من المطلوب بـ {amount}',
  'pos.changeDue': 'المتبقي للعميل',
  'pos.prescriptionNo': 'رقم الوصفة',
  'pos.prescriptionRequired': 'السلة تحتوي دواءً مراقباً، ورقم الوصفة إلزامي',
  'pos.customerName': 'اسم العميل',
  'pos.checkout': 'إتمام البيع',
  'pos.saving': 'جاري الحفظ...',
  'pos.clearCart': 'إلغاء السلة',
  'pos.loadFailed': 'تعذر تحميل بيانات نقطة البيع',
  'pos.saveInvalid': 'تعذر إتمام البيع؛ راجع البيانات المدخلة',
  'pos.saveNotFound': 'الدواء أو الفاتورة غير موجودة',
  'pos.saveFailed': 'تعذر إتمام البيع',

  // Payment methods
  'payment.all': 'كل طرق الدفع',
  'payment.cash': 'نقداً',
  'payment.card': 'بطاقة',
  'payment.insurance': 'تأمين',
  'payment.mobileWallet': 'محفظة إلكترونية',

  // Receipt
  'receipt.title': 'فاتورة بيع',
  'receipt.returnedBanner': 'هذه الفاتورة مرتجعة',
  'receipt.date': 'التاريخ',
  'receipt.item': 'الدواء',
  'receipt.batch': 'الدفعة',
  'receipt.unitPrice': 'سعر الوحدة',
  'receipt.lineSubtotal': 'المجموع',
  'receipt.lineTotal': 'الإجمالي',
  'receipt.total': 'الإجمالي المستحق',
  'receipt.unitsSold': 'عدد الوحدات: {n}',
  'receipt.print': 'طباعة',
  'receipt.newSale': 'فاتورة جديدة',

  // Sales history
  'sales.title': 'سجل المبيعات',
  'sales.summaryCount': 'عدد الفواتير',
  'sales.summaryRevenue': 'الإيراد',
  'sales.summaryUnits': 'الوحدات المبيعة',
  'sales.summaryAverage': 'متوسط الفاتورة',
  'sales.summaryTax': 'الضريبة المحصلة',
  'sales.summaryReturned': 'المرتجعات',
  'sales.searchPlaceholder': 'رقم الفاتورة أو العميل أو الوصفة...',
  'sales.empty': 'لا توجد فواتير مطابقة',
  'sales.invoiceNo': 'رقم الفاتورة',
  'sales.lines': 'البنود',
  'sales.units': 'الوحدات',
  'sales.status': 'الحالة',
  'sales.view': 'عرض',
  'sales.return': 'إرجاع',
  'sales.returnTitle': 'إرجاع فاتورة',
  'sales.returnConfirm': 'سيتم إرجاع كامل الفاتورة {invoice} وإعادة الكميات إلى دفعاتها الأصلية',
  'sales.returnReason': 'سبب الإرجاع',
  'sales.confirmReturn': 'تأكيد الإرجاع',
  'sales.alreadyReturned': 'هذه الفاتورة مرتجعة مسبقاً',
  'sales.returnInvalid': 'تعذر الإرجاع؛ راجع سبب الإرجاع',
  'sales.returnFailed': 'تعذر إرجاع الفاتورة',

  // Sale status
  'saleStatus.all': 'كل الحالات',
  'saleStatus.completed': 'مكتملة',
  'saleStatus.returned': 'مرتجعة',
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
  'nav.sales': 'Sales History',
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

  // Point of sale
  'pos.title': 'Point of Sale',
  'pos.todaySales': "Today's invoices",
  'pos.todayRevenue': "Today's revenue",
  'pos.findProduct': 'Find a medicine',
  'pos.searchPlaceholder': 'Name or barcode...',
  'pos.searchHint': 'Scan a barcode or press Enter to add the first match',
  'pos.noProducts': 'No medicines available to sell',
  'pos.controlled': 'Controlled',
  'pos.available': '{n} available',
  'pos.cart': 'Cart',
  'pos.cartEmpty': 'Cart is empty — pick a medicine to start the invoice',
  'pos.removeLine': 'Remove from cart',
  'pos.decrease': 'Decrease quantity',
  'pos.increase': 'Increase quantity',
  'pos.quantity': 'Qty',
  'pos.maxReached': 'Only {n} unit(s) available',
  'pos.subtotal': 'Subtotal',
  'pos.tax': 'Tax',
  'pos.discount': 'Discount',
  'pos.estimatedTotal': 'Estimated total',
  'pos.estimateNote': 'Amounts are estimates; the final price is calculated from batch prices when the sale is completed',
  'pos.paymentMethod': 'Payment method',
  'pos.amountPaid': 'Amount paid',
  'pos.shortfall': 'Amount paid is {amount} short of the total',
  'pos.changeDue': 'Change due',
  'pos.prescriptionNo': 'Prescription no.',
  'pos.prescriptionRequired': 'The cart contains a controlled medicine, so a prescription number is required',
  'pos.customerName': 'Customer name',
  'pos.checkout': 'Complete sale',
  'pos.saving': 'Saving...',
  'pos.clearCart': 'Clear cart',
  'pos.loadFailed': 'Failed to load point-of-sale data',
  'pos.saveInvalid': 'The sale was rejected; please check the details',
  'pos.saveNotFound': 'The medicine or invoice was not found',
  'pos.saveFailed': 'Failed to complete the sale',

  // Payment methods
  'payment.all': 'All payment methods',
  'payment.cash': 'Cash',
  'payment.card': 'Card',
  'payment.insurance': 'Insurance',
  'payment.mobileWallet': 'Mobile wallet',

  // Receipt
  'receipt.title': 'Sales Invoice',
  'receipt.returnedBanner': 'This invoice has been returned',
  'receipt.date': 'Date',
  'receipt.item': 'Medicine',
  'receipt.batch': 'Batch',
  'receipt.unitPrice': 'Unit price',
  'receipt.lineSubtotal': 'Subtotal',
  'receipt.lineTotal': 'Line total',
  'receipt.total': 'Total due',
  'receipt.unitsSold': 'Units: {n}',
  'receipt.print': 'Print',
  'receipt.newSale': 'New sale',

  // Sales history
  'sales.title': 'Sales History',
  'sales.summaryCount': 'Invoices',
  'sales.summaryRevenue': 'Revenue',
  'sales.summaryUnits': 'Units sold',
  'sales.summaryAverage': 'Average basket',
  'sales.summaryTax': 'Tax collected',
  'sales.summaryReturned': 'Returns',
  'sales.searchPlaceholder': 'Invoice no., customer or prescription...',
  'sales.empty': 'No matching invoices',
  'sales.invoiceNo': 'Invoice no.',
  'sales.lines': 'Lines',
  'sales.units': 'Units',
  'sales.status': 'Status',
  'sales.view': 'View',
  'sales.return': 'Return',
  'sales.returnTitle': 'Return an invoice',
  'sales.returnConfirm': 'Invoice {invoice} will be returned in full and every unit put back into its original batch',
  'sales.returnReason': 'Reason for return',
  'sales.confirmReturn': 'Confirm return',
  'sales.alreadyReturned': 'This invoice has already been returned',
  'sales.returnInvalid': 'The return was rejected; please check the reason',
  'sales.returnFailed': 'Failed to return the invoice',

  // Sale status
  'saleStatus.all': 'All statuses',
  'saleStatus.completed': 'Completed',
  'saleStatus.returned': 'Returned',
};

export const DICTIONARIES = { ar, en } as const;
