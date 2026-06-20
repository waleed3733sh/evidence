const crypto = require("node:crypto");

const bucketName = process.env.SUPABASE_BUCKET || "teacher-evidence";
const signedUrlSeconds = Number(process.env.SUPABASE_SIGNED_URL_SECONDS || 60 * 60);
const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES || 4 * 1024 * 1024);
let cachedCreateClient = null;

const defaultCriteria = [
  {
    id: "item-1",
    title: "أداء الواجبات الوظيفية",
    weight: 10,
    week: 1,
    description: "الالتزام بالحضور، تنفيذ المهام، احترام الأنظمة، والمحافظة على سرية البيانات.",
    evidenceHint: "سجل حضور، تكليفات منفذة، تعاميم موقعة، أو تقرير إنجاز أسبوعي."
  },
  {
    id: "item-2",
    title: "التفاعل مع المجتمع المهني",
    weight: 10,
    week: 2,
    description: "المشاركة في مجتمعات التعلم المهنية والتعاون مع الزملاء وتبادل الخبرات.",
    evidenceHint: "محضر مجتمع تعلم، شهادة حضور، مبادرة مشتركة، أو زيارة تبادلية."
  },
  {
    id: "item-3",
    title: "التفاعل مع أولياء الأمور",
    weight: 10,
    week: 3,
    description: "بناء تواصل تربوي منظم مع الأسرة ومتابعة أثر ذلك على تعلم الطلاب.",
    evidenceHint: "سجل تواصل، دعوة اجتماع، رسالة متابعة، أو تقرير حالة طالب."
  },
  {
    id: "item-4",
    title: "التنويع في استراتيجيات التدريس",
    weight: 10,
    week: 4,
    description: "توظيف استراتيجيات متنوعة تراعي الفروق الفردية وتزيد مشاركة المتعلمين.",
    evidenceHint: "خطة درس، صور أنشطة، بطاقة ملاحظة، أو نماذج تعلم نشط."
  },
  {
    id: "item-5",
    title: "تحسين نتائج المتعلمين",
    weight: 10,
    week: 5,
    description: "تتبع مستوى الطلاب وتنفيذ إجراءات تساعد على رفع التحصيل وتحسين المخرجات.",
    evidenceHint: "مقارنة نتائج، خطة علاجية، أعمال طلاب، أو تقرير تحسن."
  },
  {
    id: "item-6",
    title: "إعداد وتنفيذ خطة التعلم",
    weight: 10,
    week: 6,
    description: "تخطيط التعلم وتنفيذ الدروس وفق أهداف واضحة ومؤشرات أداء قابلة للمتابعة.",
    evidenceHint: "تحضير درس، خطة وحدة، جدول تنفيذ، أو بطاقة هدف تعليمي."
  },
  {
    id: "item-7",
    title: "توظيف تقنيات ووسائل التعلم المناسبة",
    weight: 10,
    week: 7,
    description: "اختيار أدوات وتقنيات تعليمية مناسبة للمحتوى وتوظيفها في تعلم الطلاب.",
    evidenceHint: "رابط منصة، صورة نشاط رقمي، وسيلة تعليمية، أو تقرير استخدام أداة."
  },
  {
    id: "item-8",
    title: "تهيئة بيئة تعليمية",
    weight: 5,
    week: 8,
    description: "تهيئة بيئة تعلم جاذبة وآمنة ومنظمة تدعم مشاركة الطلاب.",
    evidenceHint: "صور الفصل، قواعد تعلم، ركن مادة، أو تنظيم مساحات تعلم."
  },
  {
    id: "item-9",
    title: "الإدارة الصفية",
    weight: 5,
    week: 9,
    description: "إدارة وقت الحصة وسلوك الطلاب والتفاعل الصفي بطريقة داعمة للتعلم.",
    evidenceHint: "قواعد صفية، سجل متابعة، بطاقة تعزيز، أو خطة إدارة صفية."
  },
  {
    id: "item-10",
    title: "تحليل نتائج المتعلمين وتشخيص مستوياتهم",
    weight: 10,
    week: 10,
    description: "تحليل البيانات التعليمية وتشخيص مستويات الطلاب لاختيار تدخلات مناسبة.",
    evidenceHint: "جدول تحليل، رسوم نتائج، قائمة مستويات، أو تقرير تشخيص."
  },
  {
    id: "item-11",
    title: "استثمار نتائج التقويم",
    weight: 10,
    week: 11,
    description: "تحويل نتائج التقويم إلى قرارات تعليمية وخطط علاجية وإثرائية.",
    evidenceHint: "خطة علاجية، أنشطة إثرائية، متابعة بعدية، أو قياس أثر."
  }
];

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    const error = new Error("إعدادات Supabase غير مكتملة. أضف SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في Vercel.");
    error.statusCode = 500;
    throw error;
  }

  if (!cachedCreateClient) {
    try {
      cachedCreateClient = require("@supabase/supabase-js").createClient;
    } catch {
      const error = new Error("تعذر تحميل مكتبة Supabase. تأكد أن ملف package.json مرفوع مع المشروع ثم أعد النشر في Vercel.");
      error.statusCode = 500;
      throw error;
    }
  }

  return cachedCreateClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(body);
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

function sanitizeText(value, fallback = "") {
  return String(value ?? fallback).trim().slice(0, 500);
}

function sanitizeTeacherPatch(body) {
  return {
    name: sanitizeText(body.name),
    email: sanitizeText(body.email),
    subject: sanitizeText(body.subject),
    school: sanitizeText(body.school),
    stage: sanitizeText(body.stage),
    phone: sanitizeText(body.phone),
    role_label: sanitizeText(body.roleLabel || body.role_label || "معلم"),
    enabled: body.enabled !== false
  };
}

function toClientTeacher(row, evidence = {}) {
  return {
    code: row.code,
    name: row.name,
    email: row.email,
    subject: row.subject,
    school: row.school,
    stage: row.stage,
    phone: row.phone,
    roleLabel: row.role_label,
    enabled: row.enabled,
    evidence,
    notes: row.notes || {},
    preferences: row.preferences || { weeklyAlerts: true },
    updatedAt: row.updated_at
  };
}

function toSettings(row) {
  return {
    adminCode: row.admin_code,
    semesterStart: row.semester_start,
    reminderDay: row.reminder_day,
    reminderChannel: row.reminder_channel,
    reminderTemplate: row.reminder_template,
    criteria: row.criteria || defaultCriteria
  };
}

function safeSettings(settings) {
  const { adminCode, ...safe } = settings;
  return safe;
}

function progressFor(teacher, settings) {
  const done = settings.criteria.filter(item => (teacher.evidence?.[item.id] || []).length > 0);
  const score = done.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  return {
    completedItems: done.length,
    totalItems: settings.criteria.length,
    percent: Math.min(100, score),
    missingItems: settings.criteria.length - done.length
  };
}

function requireMethod(req, res, methods) {
  if (methods.includes(req.method)) return true;
  sendJson(res, 405, { error: "طريقة الطلب غير مدعومة" });
  return false;
}

async function getSettings(supabase) {
  const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).single();
  if (error) throw new Error(`تعذر قراءة إعدادات الموقع: ${error.message}`);
  return toSettings(data);
}

async function getTeacherRow(supabase, code) {
  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .ilike("code", String(code || ""))
    .maybeSingle();
  if (error) throw new Error(`تعذر قراءة بيانات المعلم: ${error.message}`);
  return data;
}

async function getEvidenceMap(supabase, teacherCode) {
  const { data, error } = await supabase
    .from("evidence_files")
    .select("*")
    .eq("teacher_code", teacherCode)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`تعذر قراءة الشواهد: ${error.message}`);

  const map = {};
  for (const file of data || []) {
    const { data: signed, error: signedError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(file.storage_path, signedUrlSeconds);

    if (signedError) throw new Error(`تعذر إنشاء رابط آمن للشاهد: ${signedError.message}`);

    if (!map[file.criterion_id]) map[file.criterion_id] = [];
    map[file.criterion_id].push({
      id: file.id,
      fileName: file.file_name,
      type: file.mime_type,
      dataUrl: signed.signedUrl,
      createdAt: file.created_at
    });
  }
  return map;
}

async function getPublicTeacher(supabase, teacherCode) {
  const row = await getTeacherRow(supabase, teacherCode);
  if (!row) return null;
  const evidence = await getEvidenceMap(supabase, row.code);
  return toClientTeacher(row, evidence);
}

function isAdmin(req, settings, body = {}, routeUrl = null) {
  const query = (routeUrl || new URL(req.url, `https://${req.headers.host || "localhost"}`)).searchParams;
  return [
    req.headers["x-admin-code"],
    query.get("adminCode"),
    body.adminCode
  ].some(code => String(code || "") === String(settings.adminCode || process.env.ADMIN_CODE || ""));
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(String(dataUrl || ""));
  if (!match) {
    const error = new Error("يرجى رفع صورة فقط");
    error.statusCode = 400;
    throw error;
  }
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > maxUploadBytes) {
    const error = new Error("حجم الصورة كبير. قلّل حجم الصورة أو جرب صورة أخرى.");
    error.statusCode = 413;
    throw error;
  }
  return { mimeType: match[1], buffer };
}

function extensionForMime(mimeType) {
  return {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif"
  }[mimeType] || "jpg";
}

async function teacherResponse(supabase, code, settings) {
  const teacher = await getPublicTeacher(supabase, code);
  if (!teacher) return null;
  return { teacher, progress: progressFor(teacher, settings) };
}

async function handler(req, res) {
  const requestUrl = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const originalPath = requestUrl.searchParams.get("path");
  const url = originalPath
    ? new URL(originalPath, `https://${req.headers.host || "localhost"}`)
    : requestUrl;
  const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);

  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, {
      ok: true,
      name: "teacher-evidence-app",
      storage: "supabase",
      env: {
        SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
        SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        SUPABASE_BUCKET: Boolean(process.env.SUPABASE_BUCKET)
      }
    });
  }

  const supabase = getSupabase();
  const settings = await getSettings(supabase);

  if (req.method === "GET" && url.pathname === "/api/diagnostics") {
    return sendJson(res, 200, {
      ok: true,
      settingsLoaded: true,
      bucket: bucketName,
      criteriaCount: settings.criteria.length
    });
  }

  if (req.method === "GET" && url.pathname === "/api/config") {
    return sendJson(res, 200, { settings: safeSettings(settings) });
  }

  if (req.method === "POST" && url.pathname === "/api/login") {
    const body = await readBody(req);
    const response = await teacherResponse(supabase, body.code, settings);
    if (!response || response.teacher.enabled === false) {
      return sendJson(res, 404, { error: "لم يتم العثور على معلم بهذا الكود" });
    }
    return sendJson(res, 200, response);
  }

  if (req.method === "POST" && url.pathname === "/api/admin-login") {
    const body = await readBody(req);
    if (String(body.code || "") !== String(settings.adminCode || process.env.ADMIN_CODE || "")) {
      return sendJson(res, 401, { error: "كود الإدارة غير صحيح" });
    }
    return sendJson(res, 200, { ok: true });
  }

  if (parts[1] === "teacher" && parts[2]) {
    const teacherCode = parts[2];
    const row = await getTeacherRow(supabase, teacherCode);
    if (!row) return sendJson(res, 404, { error: "المعلم غير موجود" });

    if (req.method === "GET" && parts.length === 3) {
      const response = await teacherResponse(supabase, row.code, settings);
      return sendJson(res, 200, { ...response, settings: safeSettings(settings) });
    }

    if (req.method === "PATCH" && parts[3] === "profile") {
      const body = await readBody(req);
      const patch = sanitizeTeacherPatch({ ...row, ...body });
      const { error } = await supabase
        .from("teachers")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("code", row.code);
      if (error) throw new Error(`تعذر حفظ بيانات المعلم: ${error.message}`);
      return sendJson(res, 200, await teacherResponse(supabase, row.code, settings));
    }

    if (req.method === "PATCH" && parts[3] === "notes") {
      const body = await readBody(req);
      const notes = { ...(row.notes || {}), [sanitizeText(body.key, "general")]: sanitizeText(body.value) };
      const { error } = await supabase
        .from("teachers")
        .update({ notes, updated_at: new Date().toISOString() })
        .eq("code", row.code);
      if (error) throw new Error(`تعذر حفظ الملاحظة: ${error.message}`);
      return sendJson(res, 200, await teacherResponse(supabase, row.code, settings));
    }

    if (req.method === "PATCH" && parts[3] === "preferences") {
      const body = await readBody(req);
      const preferences = {
        ...(row.preferences || {}),
        weeklyAlerts: body.weeklyAlerts !== false,
        preferredChannel: sanitizeText(body.preferredChannel || settings.reminderChannel)
      };
      const { error } = await supabase
        .from("teachers")
        .update({ preferences, updated_at: new Date().toISOString() })
        .eq("code", row.code);
      if (error) throw new Error(`تعذر حفظ التنبيهات: ${error.message}`);
      return sendJson(res, 200, await teacherResponse(supabase, row.code, settings));
    }

    if (req.method === "POST" && parts[3] === "evidence" && parts[4]) {
      const body = await readBody(req);
      const criterion = settings.criteria.find(item => item.id === parts[4]);
      if (!criterion) return sendJson(res, 404, { error: "البند غير موجود" });

      const { count, error: countError } = await supabase
        .from("evidence_files")
        .select("id", { count: "exact", head: true })
        .eq("teacher_code", row.code)
        .eq("criterion_id", criterion.id);
      if (countError) throw new Error(`تعذر التحقق من عدد الشواهد: ${countError.message}`);
      if (Number(count || 0) >= 4) return sendJson(res, 400, { error: "الحد الأقصى 4 صور لهذا البند" });

      const { mimeType, buffer } = parseDataUrl(body.dataUrl);
      const id = crypto.randomUUID();
      const fileName = sanitizeText(body.fileName || `evidence.${extensionForMime(mimeType)}`);
      const storagePath = `${row.code}/${criterion.id}/${id}.${extensionForMime(mimeType)}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, buffer, { contentType: mimeType, upsert: false });
      if (uploadError) throw new Error(`تعذر رفع الصورة: ${uploadError.message}`);

      const { error: insertError } = await supabase.from("evidence_files").insert({
        id,
        teacher_code: row.code,
        criterion_id: criterion.id,
        file_name: fileName,
        mime_type: mimeType,
        storage_path: storagePath
      });

      if (insertError) {
        await supabase.storage.from(bucketName).remove([storagePath]);
        throw new Error(`تعذر تسجيل الشاهد: ${insertError.message}`);
      }

      await supabase.from("teachers").update({ updated_at: new Date().toISOString() }).eq("code", row.code);
      return sendJson(res, 200, await teacherResponse(supabase, row.code, settings));
    }

    if (req.method === "DELETE" && parts[3] === "evidence" && parts[4] && parts[5]) {
      const { data: file, error: fileError } = await supabase
        .from("evidence_files")
        .select("*")
        .eq("teacher_code", row.code)
        .eq("criterion_id", parts[4])
        .eq("id", parts[5])
        .maybeSingle();
      if (fileError) throw new Error(`تعذر قراءة الشاهد: ${fileError.message}`);
      if (!file) return sendJson(res, 404, { error: "الشاهد غير موجود" });

      await supabase.storage.from(bucketName).remove([file.storage_path]);
      const { error } = await supabase.from("evidence_files").delete().eq("id", file.id);
      if (error) throw new Error(`تعذر حذف الشاهد: ${error.message}`);
      await supabase.from("teachers").update({ updated_at: new Date().toISOString() }).eq("code", row.code);
      return sendJson(res, 200, await teacherResponse(supabase, row.code, settings));
    }
  }

  if (parts[1] === "admin") {
    const body = ["POST", "PATCH", "PUT", "DELETE"].includes(req.method) ? await readBody(req) : {};
    if (!isAdmin(req, settings, body, url)) return sendJson(res, 401, { error: "صلاحية الإدارة مطلوبة" });

    if (req.method === "GET" && parts[2] === "overview") {
      const { data: rows, error } = await supabase.from("teachers").select("*").order("created_at", { ascending: true });
      if (error) throw new Error(`تعذر قراءة المستخدمين: ${error.message}`);
      const teachers = [];
      for (const row of rows || []) {
        const evidence = await getEvidenceMap(supabase, row.code);
        const teacher = toClientTeacher(row, evidence);
        teachers.push({ ...teacher, progress: progressFor(teacher, settings) });
      }
      return sendJson(res, 200, { settings: safeSettings(settings), teachers });
    }

    if (req.method === "PUT" && parts[2] === "settings") {
      const update = {
        semester_start: sanitizeText(body.semesterStart || settings.semesterStart),
        reminder_day: sanitizeText(body.reminderDay || settings.reminderDay),
        reminder_channel: sanitizeText(body.reminderChannel || settings.reminderChannel),
        reminder_template: sanitizeText(body.reminderTemplate || settings.reminderTemplate),
        criteria: Array.isArray(body.criteria)
          ? body.criteria.slice(0, 11).map((item, index) => ({
              id: sanitizeText(item.id || `item-${index + 1}`),
              title: sanitizeText(item.title || `البند ${index + 1}`),
              weight: Math.max(0, Math.min(100, Number(item.weight || 0))),
              week: Math.max(1, Number(item.week || index + 1)),
              description: sanitizeText(item.description || ""),
              evidenceHint: sanitizeText(item.evidenceHint || "")
            }))
          : settings.criteria
      };
      const { error } = await supabase.from("app_settings").update(update).eq("id", 1);
      if (error) throw new Error(`تعذر حفظ إعدادات الموقع: ${error.message}`);
      return sendJson(res, 200, { settings: safeSettings(toSettings({ ...update, admin_code: settings.adminCode })) });
    }

    if (req.method === "POST" && parts[2] === "teachers") {
      const code = sanitizeText(body.code || `T-${Math.floor(1000 + Math.random() * 9000)}`);
      const patch = sanitizeTeacherPatch(body);
      const { data, error } = await supabase.from("teachers").insert({ code, ...patch }).select("*").single();
      if (error) throw new Error(error.code === "23505" ? "الكود مستخدم مسبقًا" : `تعذر إضافة المستخدم: ${error.message}`);
      const teacher = toClientTeacher(data, {});
      return sendJson(res, 201, { teacher, progress: progressFor(teacher, settings) });
    }

    if ((req.method === "PATCH" || req.method === "DELETE") && parts[2] === "teachers" && parts[3]) {
      const row = await getTeacherRow(supabase, parts[3]);
      if (!row) return sendJson(res, 404, { error: "المعلم غير موجود" });

      if (req.method === "DELETE") {
        const { data: files } = await supabase.from("evidence_files").select("storage_path").eq("teacher_code", row.code);
        const storagePaths = (files || []).map(item => item.storage_path);
        if (storagePaths.length) await supabase.storage.from(bucketName).remove(storagePaths);
        const { error } = await supabase.from("teachers").delete().eq("code", row.code);
        if (error) throw new Error(`تعذر حذف المستخدم: ${error.message}`);
        return sendJson(res, 200, { ok: true, removed: storagePaths.length });
      }

      const patch = sanitizeTeacherPatch({ ...row, ...body });
      const { data, error } = await supabase
        .from("teachers")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("code", row.code)
        .select("*")
        .single();
      if (error) throw new Error(`تعذر حفظ المستخدم: ${error.message}`);
      const evidence = await getEvidenceMap(supabase, data.code);
      const teacher = toClientTeacher(data, evidence);
      return sendJson(res, 200, { teacher, progress: progressFor(teacher, settings) });
    }
  }

  return sendJson(res, 404, { error: "المسار غير موجود" });
}

module.exports = async function vercelHandler(req, res) {
  try {
    return await handler(req, res);
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message || "حدث خطأ غير متوقع" });
  }
};
