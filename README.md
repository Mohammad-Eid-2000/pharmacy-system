# 💊 Pharmacy System — نظام إدارة صيدلية (الأردن)

نظام إدارة صيدلية متكامل مبني بـ **.NET 10** (Clean Architecture + CQRS) و **Angular 21** (Signals + Zoneless + Standalone)، مصمّم لمتطلبات السوق الأردني.

## 🧱 التقنيات

| الطبقة | التقنية |
|---|---|
| Backend | .NET 10, ASP.NET Core Web API, C# 14 |
| Architecture | Clean Architecture + CQRS (MediatR) |
| ORM | EF Core 10 |
| Database | SQL Server |
| Frontend | Angular 21 (Signals, Zoneless, Standalone Components) |
| API Docs | OpenAPI 3.1 / Swagger |
| UI | RTL عربي + Bilingual (AR/EN) |

## 📁 هيكلية المشروع

```
pharmacy-system/
├── backend/
│   ├── PharmacySystem.sln
│   └── src/
│       ├── PharmacySystem.Domain/          # Entities, Enums, Value Objects
│       │   └── Entities/                   # Medicine, Batch, Pharmacy, PharmacyBranch
│       ├── PharmacySystem.Application/     # CQRS Handlers, DTOs, Validators
│       │   └── Features/Medicines/
│       ├── PharmacySystem.Infrastructure/  # EF Core 10, AppDbContext
│       │   └── Data/
│       └── PharmacySystem.API/             # Controllers, Program.cs, Config
│           └── Controllers/
├── frontend/
│   ├── package.json
│   ├── angular.json
│   └── src/
│       ├── main.ts
│       ├── index.html
│       ├── styles.css
│       └── app/
│           ├── app.component.ts
│           ├── app.config.ts
│           ├── app.routes.ts
│           ├── core/                       # environment, http.interceptor
│           ├── layout/                     # layout.component
│           └── features/
│               ├── medicines/              # ✅ Module كامل (Service + List + Form)
│               └── inventory/
├── .gitignore
└── README.md
```

## 🚀 التشغيل

### 1. قاعدة البيانات

حدّث `ConnectionStrings:DefaultConnection` في `backend/src/PharmacySystem.API/appsettings.json` بما يناسب جهازك، ثم:

```bash
cd backend/src/PharmacySystem.API
dotnet restore
dotnet ef migrations add InitialCreate
dotnet ef database update
```

### 2. الباك إند

```bash
cd backend/src/PharmacySystem.API
dotnet run
```

الـ API على: `https://localhost:7001` — Swagger على: `https://localhost:7001/swagger`

### 3. الفرونت إند

```bash
cd frontend
npm install
ng serve
```

التطبيق على: `http://localhost:4200`

## ✅ الموديولات

| الموديول | الحالة |
|---|---|
| الأدوية (Medicines) | ✅ CRUD كامل — Backend + Frontend |
| المخزون (Inventory) | 🔄 قيد التطوير — Routes جاهزة |
| نقطة البيع (POS) | ⏳ مخطّط |
| المشتريات والموردين | ⏳ مخطّط |
| التأمين | ⏳ مخطّط |
| التقارير | ⏳ مخطّط |
| المستخدمون والصلاحيات | ⏳ مخطّط |

## 🇯🇴 خصوصية السوق الأردني

- رقم تسجيل **JFDA** لكل دواء (مؤسسة الغذاء والدواء الأردنية)
- ضريبة المبيعات العامة **16%**
- تصنيف الأدوية المراقبة والمخدرات حسب اشتراطات وزارة الصحة
- واجهة **RTL** عربية كاملة مع دعم ثنائي اللغة
- تحضير لدعم الدفع عبر **CliQ**

## 📝 المتطلبات

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 22+](https://nodejs.org)
- SQL Server 2019+ أو SQL Server Express / LocalDB
- Angular CLI 21: `npm i -g @angular/cli`

## 📄 الترخيص

MIT
