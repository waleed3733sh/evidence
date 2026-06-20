# نشر موقع ملف الشواهد على Vercel

هذه النسخة معدة للنشر على Vercel، مع حفظ البيانات والصور في Supabase.

## 1. إنشاء Supabase

1. ادخل إلى https://supabase.com
2. أنشئ مشروعًا جديدًا.
3. افتح SQL Editor.
4. انسخ محتوى الملف `supabase/schema.sql` وشغله.
5. من Project Settings > API انسخ:
   - Project URL
   - service_role key

لا تنشر `service_role key` في GitHub أو في أي مكان عام.

## 2. رفع المشروع إلى GitHub

ارفع مجلد `teacher-evidence-app` إلى مستودع GitHub جديد. لا ترفع ملف `.env`.

مهم: لا ترفع ملف `server.js` ولا مجلد `data` إلى Vercel. هذه ملفات تجربة محلية فقط، ووجود `server.js` في Vercel قد يجعل الموقع يتعطل برسالة `Serverless Function has crashed`.

## 3. ربط GitHub مع Vercel

1. ادخل إلى https://vercel.com
2. اختر Add New > Project.
3. اختر مستودع GitHub الخاص بالموقع.
4. Framework Preset: اختر Other.
5. Build Command: اكتب `echo no-build`.
6. Output Directory: اتركه فارغًا.
7. أضف متغيرات البيئة قبل الضغط على Deploy.

## 4. متغيرات البيئة في Vercel

من Project Settings > Environment Variables أضف:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_BUCKET
SUPABASE_SIGNED_URL_SECONDS
MAX_UPLOAD_BYTES
```

القيم المقترحة:

```text
SUPABASE_BUCKET=teacher-evidence
SUPABASE_SIGNED_URL_SECONDS=3600
MAX_UPLOAD_BYTES=4194304
```

## 5. روابط الاستخدام

بعد النشر سيعطيك Vercel رابطًا مثل:

```text
https://your-project.vercel.app
```

لوحة الإدارة:

```text
https://your-project.vercel.app/admin.html
```

كود الإدارة الافتراضي:

```text
ADMIN-2030
```

يمكنك تغييره لاحقًا من جدول `app_settings` في Supabase.

## إذا ظهرت رسالة Serverless Function has crashed

إذا كان سجل Vercel يحتوي على:

```text
mkdir '/var/task/data'
server.cjs
```

فهذا يعني أن Vercel يشغل ملف التجربة المحلي `server.js`. الحل: احذف `server.js` من مستودع GitHub أو ارفع النسخة النظيفة `teacher-evidence-app-vercel.zip` ثم اعمل Redeploy.

افتح هذا الرابط بعد استبدال اسم مشروعك:

```text
https://your-project.vercel.app/api/health
```

إذا ظهرت قيمة `false` أمام `SUPABASE_URL` أو `SUPABASE_SERVICE_ROLE_KEY` فهذا يعني أن متغيرات البيئة لم تضف في Vercel أو أنك لم تعمل Redeploy بعد إضافتها.

بعد إضافة أو تعديل متغيرات البيئة في Vercel، افتح:

```text
Deployments > آخر نشر > Redeploy
```

ثم جرب:

```text
https://your-project.vercel.app/api/diagnostics
```

إذا عمل هذا الرابط فالاتصال بقاعدة البيانات سليم.

## ملاحظة مهمة عن الحفظ الدائم

Vercel يشغل الموقع، لكنه لا يحفظ ملفات المستخدمين على القرص بشكل دائم. لذلك تم نقل حفظ بيانات المعلمين والصور إلى Supabase. للحفظ طويل المدى، استخدم خطة مدفوعة مناسبة وفعّل النسخ الاحتياطية الدورية.
