const appState = {
  teacher: null,
  settings: null,
  progress: null,
  admin: null
};

const pages = [
  ["dashboard.html", "لوحة التحكم", "dashboard"],
  ["criteria.html", "بنود الأداء الوظيفي", "criteria"],
  ["profile.html", "بيانات المعلم", "profile"],
  ["evidence.html", "الشواهد", "evidence"],
  ["progress.html", "التقدم", "progress"],
  ["alerts.html", "التنبيهات", "alerts"],
  ["summary.html", "ملخص العمل", "summary"]
];

let saveHandler = null;

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setToast(message, type = "ok") {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast is-visible ${type}`;
  clearTimeout(setToast.timer);
  setToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

async function api(path, options = {}) {
  const endpoint = path.startsWith("/api/")
    ? `/api/app?path=${encodeURIComponent(path)}`
    : path;
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "تعذر إتمام العملية");
  return data;
}

function teacherCode() {
  return localStorage.getItem("teacherEvidenceCode");
}

function adminCode() {
  return localStorage.getItem("teacherEvidenceAdminCode");
}

function updateShell() {
  if (!appState.teacher || !appState.settings) return;
  const teacher = appState.teacher;
  const progress = appState.progress || { percent: 0, completedItems: 0, totalItems: 11 };
  const page = document.body.dataset.page;

  $("#teacherName")?.replaceChildren(document.createTextNode(teacher.name));
  $("#teacherMeta")?.replaceChildren(document.createTextNode(`${teacher.subject} | ${teacher.school}`));
  $("#teacherEmail")?.replaceChildren(document.createTextNode(teacher.email));
  $("#miniProgressText")?.replaceChildren(document.createTextNode(`${progress.percent}%`));
  const miniBar = $("#miniProgressBar");
  if (miniBar) miniBar.style.width = `${progress.percent}%`;

  const nav = $("#mainNav");
  if (nav) {
    nav.innerHTML = pages.map(([href, label, key]) => `
      <a class="${page === key ? "active" : ""}" href="${href}">
        <span class="nav-dot"></span>
        <span>${label}</span>
      </a>
    `).join("");
  }

  const saveButton = $("#savePage");
  if (saveButton) {
    saveButton.onclick = async () => {
      if (!saveHandler) {
        setToast("لا توجد تعديلات معلقة في هذه الصفحة");
        return;
      }
      try {
        saveButton.disabled = true;
        await saveHandler();
        setToast("تم الحفظ بنجاح");
      } catch (error) {
        setToast(error.message, "error");
      } finally {
        saveButton.disabled = false;
      }
    };
  }

  $("#logout")?.addEventListener("click", () => {
    localStorage.removeItem("teacherEvidenceCode");
    location.href = "index.html";
  });
}

async function loadTeacherOrRedirect() {
  const code = teacherCode();
  if (!code) {
    location.href = "index.html";
    return false;
  }
  try {
    const data = await api(`/api/teacher/${encodeURIComponent(code)}`);
    appState.teacher = data.teacher;
    appState.settings = data.settings;
    appState.progress = data.progress;
    updateShell();
    return true;
  } catch (error) {
    localStorage.removeItem("teacherEvidenceCode");
    location.href = "index.html";
    return false;
  }
}

function criterionImages(id) {
  return appState.teacher?.evidence?.[id] || [];
}

function isCriterionDone(id) {
  return criterionImages(id).length > 0;
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function weekDate(week) {
  const base = new Date(`${appState.settings.semesterStart}T09:00:00`);
  base.setDate(base.getDate() + (Number(week || 1) - 1) * 7);
  return base;
}

function renderProgressRing(percent) {
  return `
    <div class="progress-ring" style="--value:${percent}">
      <strong>${percent}%</strong>
      <span>منجز</span>
    </div>
  `;
}

function statCard(label, value, sub = "") {
  return `
    <div class="stat-card">
      <span>${label}</span>
      <strong>${value}</strong>
      ${sub ? `<small>${sub}</small>` : ""}
    </div>
  `;
}

function dashboardPage() {
  const root = $("#pageRoot");
  const teacher = appState.teacher;
  const progress = appState.progress;
  const criteria = appState.settings.criteria;
  const next = criteria.find(item => !isCriterionDone(item.id)) || criteria[criteria.length - 1];
  const recent = criteria
    .flatMap(item => criterionImages(item.id).map(image => ({ ...image, itemTitle: item.title })))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);

  root.innerHTML = `
    <section class="workband dashboard-hero">
      <div>
        <p class="eyebrow">مرحبًا ${escapeHtml(teacher.roleLabel)}</p>
        <h1>${escapeHtml(teacher.name)}</h1>
        <p>${escapeHtml(teacher.subject)} | ${escapeHtml(teacher.stage)} | ${escapeHtml(teacher.school)}</p>
      </div>
      ${renderProgressRing(progress.percent)}
    </section>

    <section class="stats-grid">
      ${statCard("البنود المكتملة", `${progress.completedItems} من ${progress.totalItems}`, "يكتمل البند عند رفع شاهد واحد على الأقل")}
      ${statCard("نسبة الملف", `${progress.percent}%`, "محسوبة حسب أوزان البنود")}
      ${statCard("الشواهد المرفوعة", totalEvidenceCount(), "الحد الأقصى 4 صور لكل بند")}
      ${statCard("بند الأسبوع", escapeHtml(next.title), formatDate(weekDate(next.week)))}
    </section>

    <section class="two-column">
      <div class="panel">
        <div class="panel-head">
          <h2>الخطوة التالية</h2>
          <a class="text-link" href="evidence.html">رفع شاهد</a>
        </div>
        <div class="next-task">
          <strong>${escapeHtml(next.title)}</strong>
          <p>${escapeHtml(next.description)}</p>
          <small>${escapeHtml(next.evidenceHint)}</small>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <h2>آخر الشواهد</h2>
          <a class="text-link" href="summary.html">عرض الملخص</a>
        </div>
        <div class="recent-grid">
          ${recent.length ? recent.map(image => `
            <figure>
              <img src="${image.dataUrl}" alt="${escapeHtml(image.fileName)}">
              <figcaption>${escapeHtml(image.itemTitle)}</figcaption>
            </figure>
          `).join("") : `<p class="muted">لم يتم رفع شواهد بعد.</p>`}
        </div>
      </div>
    </section>
  `;

  saveHandler = async () => setToast("لوحة التحكم محدثة تلقائيًا");
}

function criteriaPage() {
  const root = $("#pageRoot");
  root.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">عناصر التقييم</p>
          <h1>بنود الأداء الوظيفي</h1>
        </div>
        <span class="pill">إجمالي الأوزان ${appState.settings.criteria.reduce((sum, item) => sum + Number(item.weight), 0)}%</span>
      </div>
      <div class="criteria-list">
        ${appState.settings.criteria.map((item, index) => `
          <article class="criterion-row">
            <div class="criterion-number">${index + 1}</div>
            <div>
              <div class="row-title">
                <h3>${escapeHtml(item.title)}</h3>
                <span>${item.weight}%</span>
              </div>
              <p>${escapeHtml(item.description)}</p>
              <small>${escapeHtml(item.evidenceHint)}</small>
              <label class="field mt">
                <span>ملاحظاتي على هذا البند</span>
                <textarea data-note-key="criteria-${item.id}" rows="2">${escapeHtml(appState.teacher.notes?.[`criteria-${item.id}`] || "")}</textarea>
              </label>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;

  saveHandler = saveNoteFields;
}

function profilePage() {
  const teacher = appState.teacher;
  $("#pageRoot").innerHTML = `
    <form class="panel form-grid" id="profileForm">
      <div class="panel-head full">
        <div>
          <p class="eyebrow">بيانات قابلة للتعديل</p>
          <h1>بيانات المعلم</h1>
        </div>
        <span class="pill">الكود ${escapeHtml(teacher.code)}</span>
      </div>
      ${inputField("name", "الاسم", teacher.name)}
      ${inputField("roleLabel", "الصفة", teacher.roleLabel)}
      ${inputField("subject", "المادة", teacher.subject)}
      ${inputField("school", "المدرسة", teacher.school)}
      ${inputField("stage", "المرحلة", teacher.stage)}
      ${inputField("phone", "رقم الجوال", teacher.phone)}
      ${inputField("email", "الإيميل", teacher.email, "email")}
    </form>
  `;

  saveHandler = async () => {
    const form = $("#profileForm");
    const payload = Object.fromEntries(new FormData(form).entries());
    const data = await api(`/api/teacher/${encodeURIComponent(teacher.code)}/profile`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    appState.teacher = data.teacher;
    appState.progress = data.progress;
    updateShell();
  };
}

function inputField(name, label, value, type = "text") {
  return `
    <label class="field">
      <span>${label}</span>
      <input name="${name}" type="${type}" value="${escapeHtml(value)}">
    </label>
  `;
}

function evidencePage() {
  $("#pageRoot").innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">رفع الصور وحفظها</p>
          <h1>الشواهد</h1>
        </div>
        <span class="pill">${totalEvidenceCount()} صورة محفوظة</span>
      </div>
      <div class="evidence-list">
        ${appState.settings.criteria.map((item, index) => evidenceBlock(item, index)).join("")}
      </div>
    </section>
  `;

  $$(".upload-input").forEach(input => {
    input.addEventListener("change", async event => {
      const criterionId = event.currentTarget.dataset.criterion;
      const files = Array.from(event.currentTarget.files || []);
      if (!files.length) return;
      await uploadEvidenceFiles(criterionId, files);
      event.currentTarget.value = "";
    });
  });

  $$(".delete-evidence").forEach(button => {
    button.addEventListener("click", async event => {
      const { criterion, image } = event.currentTarget.dataset;
      await deleteEvidence(criterion, image);
    });
  });

  saveHandler = async () => setToast("الشواهد محفوظة مباشرة بعد الرفع أو الحذف");
}

function evidenceBlock(item, index) {
  const images = criterionImages(item.id);
  const remaining = 4 - images.length;
  return `
    <article class="evidence-block ${images.length ? "is-complete" : ""}">
      <div class="criterion-number">${index + 1}</div>
      <div class="evidence-body">
        <div class="row-title">
          <h3>${escapeHtml(item.title)}</h3>
          <span>${images.length}/4</span>
        </div>
        <p>${escapeHtml(item.evidenceHint)}</p>
        <div class="thumb-grid">
          ${images.map(image => `
            <figure class="thumb">
              <img src="${image.dataUrl}" alt="${escapeHtml(image.fileName)}">
              <button class="icon-button danger delete-evidence" data-criterion="${item.id}" data-image="${image.id}" title="حذف الصورة" type="button">حذف</button>
            </figure>
          `).join("")}
          ${remaining > 0 ? `
            <label class="upload-tile">
              <input class="upload-input" data-criterion="${item.id}" type="file" accept="image/*" multiple>
              <span>إرفاق صورة</span>
              <small>المتبقي ${remaining}</small>
            </label>
          ` : ""}
        </div>
      </div>
    </article>
  `;
}

async function uploadEvidenceFiles(criterionId, files) {
  const existing = criterionImages(criterionId).length;
  const selected = files.slice(0, Math.max(0, 4 - existing));
  if (selected.length < files.length) setToast("تم تجاهل الصور الزائدة عن الحد الأقصى", "error");
  for (const file of selected) {
    if (!file.type.startsWith("image/")) {
      setToast("يرجى اختيار صور فقط", "error");
      continue;
    }
    const dataUrl = await resizeImage(file);
    const data = await api(`/api/teacher/${encodeURIComponent(appState.teacher.code)}/evidence/${criterionId}`, {
      method: "POST",
      body: JSON.stringify({ fileName: file.name, type: file.type, dataUrl })
    });
    appState.teacher = data.teacher;
    appState.progress = data.progress;
  }
  updateShell();
  evidencePage();
  setToast("تم رفع الشواهد وحفظها");
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذر قراءة الصورة"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("تعذر معالجة الصورة"));
      image.onload = () => {
        const maxSide = 1100;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function deleteEvidence(criterionId, imageId) {
  const data = await api(`/api/teacher/${encodeURIComponent(appState.teacher.code)}/evidence/${criterionId}/${imageId}`, {
    method: "DELETE"
  });
  appState.teacher = data.teacher;
  appState.progress = data.progress;
  updateShell();
  evidencePage();
  setToast("تم حذف الصورة");
}

function progressPage() {
  const progress = appState.progress;
  $("#pageRoot").innerHTML = `
    <section class="workband dashboard-hero">
      <div>
        <p class="eyebrow">حالة ملف الشواهد</p>
        <h1>${progress.percent}% مكتمل</h1>
        <p>${progress.completedItems} بنود مكتملة من أصل ${progress.totalItems}</p>
      </div>
      ${renderProgressRing(progress.percent)}
    </section>
    <section class="panel">
      <div class="progress-track"><span style="width:${progress.percent}%"></span></div>
      <div class="criteria-progress">
        ${appState.settings.criteria.map(item => `
          <div class="progress-row">
            <span class="${isCriterionDone(item.id) ? "status done" : "status pending"}"></span>
            <strong>${escapeHtml(item.title)}</strong>
            <small>${criterionImages(item.id).length ? `${criterionImages(item.id).length} شاهد` : "بانتظار الشاهد"}</small>
            <b>${item.weight}%</b>
          </div>
        `).join("")}
      </div>
      <label class="field mt">
        <span>ملاحظة التقدم</span>
        <textarea data-note-key="progress" rows="4">${escapeHtml(appState.teacher.notes?.progress || "")}</textarea>
      </label>
    </section>
  `;

  saveHandler = saveNoteFields;
}

function alertsPage() {
  const settings = appState.settings;
  const prefs = appState.teacher.preferences || {};
  $("#pageRoot").innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">خطة الفصل الدراسي</p>
          <h1>التنبيهات الأسبوعية</h1>
        </div>
        <span class="pill">${escapeHtml(settings.reminderDay)} | ${escapeHtml(settings.reminderChannel)}</span>
      </div>
      <div class="alert-settings">
        <label class="switch-line">
          <input id="weeklyAlerts" type="checkbox" ${prefs.weeklyAlerts !== false ? "checked" : ""}>
          <span>تفعيل التنبيه الأسبوعي</span>
        </label>
        <label class="field compact">
          <span>قناة التنبيه</span>
          <select id="preferredChannel">
            ${["البريد الإلكتروني", "رسالة نصية", "واتساب"].map(channel => `
              <option ${((prefs.preferredChannel || settings.reminderChannel) === channel) ? "selected" : ""}>${channel}</option>
            `).join("")}
          </select>
        </label>
      </div>
      <div class="alert-list">
        ${settings.criteria.map(item => alertRow(item)).join("")}
      </div>
    </section>
  `;

  saveHandler = async () => {
    const data = await api(`/api/teacher/${encodeURIComponent(appState.teacher.code)}/preferences`, {
      method: "PATCH",
      body: JSON.stringify({
        weeklyAlerts: $("#weeklyAlerts").checked,
        preferredChannel: $("#preferredChannel").value
      })
    });
    appState.teacher = data.teacher;
    appState.progress = data.progress;
    updateShell();
  };
}

function alertRow(item) {
  const percent = appState.progress.percent;
  const message = appState.settings.reminderTemplate
    .replace("{{criterion}}", item.title)
    .replace("{{progress}}", percent);
  return `
    <article class="alert-row">
      <div class="date-box">
        <strong>الأسبوع ${item.week}</strong>
        <span>${formatDate(weekDate(item.week))}</span>
      </div>
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(message)}</p>
      </div>
      <span class="${isCriterionDone(item.id) ? "badge done" : "badge"}">${isCriterionDone(item.id) ? "منجز" : "مجدول"}</span>
    </article>
  `;
}

function summaryPage() {
  $("#pageRoot").innerHTML = `
    <section class="summary-actions no-print">
      <button class="primary" id="exportPdf" type="button">تصدير PDF</button>
      <button class="secondary" id="exportWord" type="button">تصدير Word</button>
    </section>
    <section class="report-paper" id="reportPaper">
      ${reportHtml()}
    </section>
    <section class="panel no-print">
      <label class="field">
        <span>ملاحظة تظهر في ملخص العمل</span>
        <textarea data-note-key="summary" rows="4">${escapeHtml(appState.teacher.notes?.summary || "")}</textarea>
      </label>
    </section>
  `;

  $("#exportPdf").addEventListener("click", () => window.print());
  $("#exportWord").addEventListener("click", exportWord);
  saveHandler = async () => {
    await saveNoteFields();
    summaryPage();
  };
}

function reportHtml() {
  const teacher = appState.teacher;
  const progress = appState.progress;
  return `
    <div class="report-cover">
      <span>ملف شواهد الأداء الوظيفي</span>
      <h1>${escapeHtml(teacher.name)}</h1>
      <p>${escapeHtml(teacher.subject)} | ${escapeHtml(teacher.school)} | ${escapeHtml(teacher.stage)}</p>
    </div>
    <div class="report-section">
      <h2>بيانات المعلم</h2>
      <div class="report-grid">
        <p><strong>الاسم</strong><span>${escapeHtml(teacher.name)}</span></p>
        <p><strong>المادة</strong><span>${escapeHtml(teacher.subject)}</span></p>
        <p><strong>المدرسة</strong><span>${escapeHtml(teacher.school)}</span></p>
        <p><strong>المرحلة</strong><span>${escapeHtml(teacher.stage)}</span></p>
        <p><strong>الجوال</strong><span>${escapeHtml(teacher.phone)}</span></p>
        <p><strong>الإيميل</strong><span>${escapeHtml(teacher.email)}</span></p>
      </div>
    </div>
    <div class="report-section">
      <h2>نسبة الإنجاز</h2>
      <div class="report-progress"><span style="width:${progress.percent}%"></span></div>
      <p>${progress.completedItems} بنود مكتملة من ${progress.totalItems} | ${progress.percent}%</p>
    </div>
    ${appState.teacher.notes?.summary ? `
      <div class="report-section">
        <h2>ملخص مختصر</h2>
        <p>${escapeHtml(appState.teacher.notes.summary)}</p>
      </div>
    ` : ""}
    <div class="report-section">
      <h2>الشواهد حسب البنود</h2>
      ${appState.settings.criteria.map((item, index) => {
        const images = criterionImages(item.id);
        return `
          <article class="report-item">
            <h3>${index + 1}. ${escapeHtml(item.title)} <span>${item.weight}%</span></h3>
            <p>${escapeHtml(item.description)}</p>
            ${images.length ? `
              <div class="report-images">
                ${images.map(image => `<img src="${image.dataUrl}" alt="${escapeHtml(image.fileName)}">`).join("")}
              </div>
            ` : `<small>لم يتم إرفاق شاهد لهذا البند بعد.</small>`}
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function exportWord() {
  const teacher = appState.teacher;
  const html = `
    <!doctype html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <style>
        body{font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#172326}
        h1,h2,h3{color:#0f5c57}
        .report-cover{border-bottom:4px solid #0f8f86;padding:28px 0;margin-bottom:24px}
        .report-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .report-item{border-top:1px solid #d6e2df;padding:14px 0}
        .report-images{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        img{max-width:260px;height:auto;border:1px solid #d6e2df}
      </style>
    </head>
    <body>${reportHtml()}</body>
    </html>
  `;
  const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
  downloadBlob(blob, `${teacher.name}-ملف-الشواهد.doc`);
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function saveNoteFields() {
  const fields = $$("[data-note-key]");
  for (const field of fields) {
    const data = await api(`/api/teacher/${encodeURIComponent(appState.teacher.code)}/notes`, {
      method: "PATCH",
      body: JSON.stringify({ key: field.dataset.noteKey, value: field.value })
    });
    appState.teacher = data.teacher;
    appState.progress = data.progress;
  }
  updateShell();
}

function totalEvidenceCount() {
  return Object.values(appState.teacher?.evidence || {}).reduce((sum, list) => sum + list.length, 0);
}

async function loginPage() {
  const form = $("#loginForm");
  const preview = $("#loginPreview");
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const code = $("#teacherCode").value.trim();
    if (!code) return setToast("يرجى إدخال الكود", "error");
    try {
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ code })
      });
      preview.innerHTML = `
        <div class="login-result">
          <span class="success-mark"></span>
          <h2>${escapeHtml(data.teacher.name)}</h2>
          <p>${escapeHtml(data.teacher.email)}</p>
          <p>${escapeHtml(data.teacher.subject)} | ${escapeHtml(data.teacher.school)}</p>
          <button class="primary" id="enterDashboard" type="button">دخول لوحة التحكم</button>
        </div>
      `;
      $("#enterDashboard").addEventListener("click", () => {
        localStorage.setItem("teacherEvidenceCode", data.teacher.code);
        location.href = "dashboard.html";
      });
    } catch (error) {
      try {
        await api("/api/admin-login", { method: "POST", body: JSON.stringify({ code }) });
        localStorage.setItem("teacherEvidenceAdminCode", code);
        location.href = "admin.html";
      } catch {
        preview.innerHTML = `<div class="login-result error-text">${escapeHtml(error.message)}</div>`;
      }
    }
  });
}

async function adminPage() {
  const root = $("#adminRoot");
  const savedCode = adminCode();
  if (!savedCode) {
    renderAdminLogin(root);
    return;
  }
  await loadAdmin(root, savedCode);
}

function renderAdminLogin(root) {
  root.innerHTML = `
    <section class="admin-login">
      <form class="login-card" id="adminLoginForm">
        <p class="eyebrow">لوحة الإدارة</p>
        <h1>دخول إدارة الموقع</h1>
        <label class="field">
          <span>كود الإدارة</span>
          <input id="adminCodeInput" type="password" autocomplete="current-password">
        </label>
        <button class="primary" type="submit">دخول</button>
      </form>
    </section>
  `;
  $("#adminLoginForm").addEventListener("submit", async event => {
    event.preventDefault();
    const code = $("#adminCodeInput").value.trim();
    try {
      await api("/api/admin-login", { method: "POST", body: JSON.stringify({ code }) });
      localStorage.setItem("teacherEvidenceAdminCode", code);
      await loadAdmin(root, code);
    } catch (error) {
      setToast(error.message, "error");
    }
  });
}

async function loadAdmin(root, code) {
  try {
    const data = await api(`/api/admin/overview?adminCode=${encodeURIComponent(code)}`);
    appState.admin = data;
    renderAdminDashboard(root);
  } catch (error) {
    localStorage.removeItem("teacherEvidenceAdminCode");
    renderAdminLogin(root);
    setToast(error.message, "error");
  }
}

function renderAdminDashboard(root) {
  const data = appState.admin;
  root.innerHTML = `
    <aside class="sidebar admin-sidebar">
      <div class="brand">
        <strong>إدارة الشواهد</strong>
        <span>لوحة تحكم الموقع</span>
      </div>
      <button class="secondary" id="adminLogout" type="button">خروج الإدارة</button>
    </aside>
    <main class="content">
      <header class="topbar">
        <div>
          <p class="eyebrow">نظرة عامة</p>
          <h1>إدارة المعلمين والبنود</h1>
        </div>
        <button class="primary" id="saveAdminSettings" type="button">حفظ الإعدادات</button>
      </header>

      <section class="stats-grid">
        ${statCard("عدد المستخدمين", data.teachers.length)}
        ${statCard("متوسط الإنجاز", `${averageProgress(data.teachers)}%`)}
        ${statCard("إجمالي الشواهد", data.teachers.reduce((sum, teacher) => sum + Object.values(teacher.evidence || {}).reduce((s, list) => s + list.length, 0), 0))}
      </section>

      <section class="panel">
        <div class="panel-head"><h2>إعدادات الفصل والتنبيهات</h2></div>
        <form class="form-grid" id="settingsForm">
          ${inputField("semesterStart", "بداية الفصل الدراسي", data.settings.semesterStart, "date")}
          ${inputField("reminderDay", "يوم التذكير", data.settings.reminderDay)}
          ${inputField("reminderChannel", "القناة الافتراضية", data.settings.reminderChannel)}
          <label class="field full">
            <span>نص رسالة التذكير</span>
            <textarea name="reminderTemplate" rows="3">${escapeHtml(data.settings.reminderTemplate)}</textarea>
          </label>
        </form>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>بنود الأداء الوظيفي</h2></div>
        <div class="admin-criteria">
          ${data.settings.criteria.map(item => `
            <div class="admin-criterion" data-id="${escapeHtml(item.id)}">
              <input name="title" value="${escapeHtml(item.title)}" aria-label="عنوان البند">
              <input name="weight" type="number" min="0" max="100" value="${item.weight}" aria-label="الوزن">
              <input name="week" type="number" min="1" value="${item.week}" aria-label="الأسبوع">
              <textarea name="description" rows="2" aria-label="الوصف">${escapeHtml(item.description)}</textarea>
              <textarea name="evidenceHint" rows="2" aria-label="أمثلة الشواهد">${escapeHtml(item.evidenceHint)}</textarea>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>إضافة مستخدم</h2></div>
        <form class="form-grid" id="newTeacherForm">
          ${inputField("code", "كود الدخول", "")}
          ${inputField("name", "الاسم", "")}
          ${inputField("roleLabel", "الصفة", "معلم")}
          ${inputField("subject", "المادة", "")}
          ${inputField("school", "المدرسة", "")}
          ${inputField("stage", "المرحلة", "")}
          ${inputField("phone", "الجوال", "")}
          ${inputField("email", "الإيميل", "", "email")}
          <button class="primary full" type="submit">إضافة وحفظ</button>
        </form>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>المستخدمون</h2></div>
        <div class="teacher-table">
          ${data.teachers.map(teacher => teacherAdminRow(teacher)).join("")}
        </div>
      </section>
    </main>
  `;

  $("#adminLogout").addEventListener("click", () => {
    localStorage.removeItem("teacherEvidenceAdminCode");
    location.reload();
  });
  $("#saveAdminSettings").addEventListener("click", saveAdminSettings);
  $("#newTeacherForm").addEventListener("submit", createTeacher);
  $$(".save-teacher").forEach(button => button.addEventListener("click", saveTeacherRow));
  $$(".delete-teacher").forEach(button => button.addEventListener("click", deleteTeacherRow));
}

function averageProgress(teachers) {
  if (!teachers.length) return 0;
  const total = teachers.reduce((sum, teacher) => sum + Number(teacher.progress?.percent || 0), 0);
  return Math.round(total / teachers.length);
}

function teacherAdminRow(teacher) {
  return `
    <form class="teacher-row" data-code="${escapeHtml(teacher.code)}">
      <strong>${escapeHtml(teacher.code)}</strong>
      <input name="name" value="${escapeHtml(teacher.name)}" aria-label="الاسم">
      <input name="email" value="${escapeHtml(teacher.email)}" aria-label="الإيميل">
      <input name="subject" value="${escapeHtml(teacher.subject)}" aria-label="المادة">
      <span class="mini-meter"><i style="width:${teacher.progress.percent}%"></i><b>${teacher.progress.percent}%</b></span>
      <button class="secondary save-teacher" type="button">حفظ</button>
      <button class="danger-button delete-teacher" type="button">حذف</button>
    </form>
  `;
}

async function saveAdminSettings() {
  const code = adminCode();
  const formPayload = Object.fromEntries(new FormData($("#settingsForm")).entries());
  const criteriaPayload = $$(".admin-criterion").map(row => ({
    id: row.dataset.id,
    title: row.querySelector('[name="title"]').value,
    weight: row.querySelector('[name="weight"]').value,
    week: row.querySelector('[name="week"]').value,
    description: row.querySelector('[name="description"]').value,
    evidenceHint: row.querySelector('[name="evidenceHint"]').value
  }));
  await api("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({ adminCode: code, ...formPayload, criteria: criteriaPayload })
  });
  setToast("تم حفظ إعدادات الإدارة");
  await loadAdmin($("#adminRoot"), code);
}

async function createTeacher(event) {
  event.preventDefault();
  const code = adminCode();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  await api("/api/admin/teachers", {
    method: "POST",
    body: JSON.stringify({ adminCode: code, ...payload })
  });
  setToast("تمت إضافة المستخدم");
  await loadAdmin($("#adminRoot"), code);
}

async function saveTeacherRow(event) {
  const code = adminCode();
  const row = event.currentTarget.closest(".teacher-row");
  const teacherCodeValue = row.dataset.code;
  const payload = Object.fromEntries(new FormData(row).entries());
  await api(`/api/admin/teachers/${encodeURIComponent(teacherCodeValue)}`, {
    method: "PATCH",
    body: JSON.stringify({ adminCode: code, ...payload })
  });
  setToast("تم حفظ بيانات المستخدم");
  await loadAdmin($("#adminRoot"), code);
}

async function deleteTeacherRow(event) {
  const code = adminCode();
  const row = event.currentTarget.closest(".teacher-row");
  await api(`/api/admin/teachers/${encodeURIComponent(row.dataset.code)}`, {
    method: "DELETE",
    body: JSON.stringify({ adminCode: code })
  });
  setToast("تم حذف المستخدم");
  await loadAdmin($("#adminRoot"), code);
}

async function boot() {
  const page = document.body.dataset.page;
  if (page === "login") return loginPage();
  if (page === "admin") return adminPage();

  const ok = await loadTeacherOrRedirect();
  if (!ok) return;

  ({
    dashboard: dashboardPage,
    criteria: criteriaPage,
    profile: profilePage,
    evidence: evidencePage,
    progress: progressPage,
    alerts: alertsPage,
    summary: summaryPage
  }[page] || dashboardPage)();
}

document.addEventListener("DOMContentLoaded", () => {
  boot().catch(error => setToast(error.message, "error"));
});
