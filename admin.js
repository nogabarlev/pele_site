/* =========================================
   ממשק ניהול: גרפיקות וסרטונים
   נטען אחרי code.js
========================================= */
(() => {
    const sb = window.supabaseClient;
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    const BUCKET = "media";
    const DEFAULT_THUMB = "media/graphics-bg-clean.png";

    let tab = "graphics";
    let editing = null;
    const rows = { graphics: [], videos: [] };

    /* ---------- עזרים ---------- */

    const ytId = (s) => {
        s = (s || "").trim();
        const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
        if (m) return m[1];
        return /^[A-Za-z0-9_-]{11}$/.test(s) ? s : null;
    };

    const msg = (text, isErr) => {
        const el = $("adminMsg");
        if (!el) return;
        el.textContent = text || "";
        el.classList.toggle("err", !!isErr);
    };

    const uploadFile = async (file, folder) => {
        const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (error) throw error;
        return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    };

    // מוחק מהאחסון רק קבצים שהועלו דרך הממשק (לא את הקבצים שבתיקיית media באתר)
    const removeFile = async (url) => {
        const marker = `/object/public/${BUCKET}/`;
        const i = url ? url.indexOf(marker) : -1;
        if (i < 0) return;
        const path = decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
        try { await sb.storage.from(BUCKET).remove([path]); } catch (e) { console.error("remove file:", e); }
    };

    const load = async () => {
        const [g, v] = await Promise.all([
            sb.from("graphics").select("*").order("sort", { ascending: true }).order("created_at", { ascending: true }),
            sb.from("videos").select("*").order("sort", { ascending: true }).order("created_at", { ascending: true })
        ]);
        if (g.error) throw g.error;
        if (v.error) throw v.error;
        rows.graphics = g.data || [];
        rows.videos = v.data || [];
    };

    const nextSort = (list) => list.reduce((m, r) => Math.max(m, r.sort || 0), 0) + 1;

    const refresh = async (okText) => {
        await load();
        render();
        if (window.PeleSite) await window.PeleSite.reload();
        if (okText) msg(okText);
    };

    /* ---------- תצוגה ---------- */

    const listHTML = () => {
        const list = rows[tab];
        if (!list.length) return `<p class="adm-empty">אין עדיין פריטים. אפשר להוסיף בטופס שמתחת.</p>`;
        return list.map((r) => {
            const img = tab === "graphics"
                ? (r.thumb_url || DEFAULT_THUMB)
                : `https://i.ytimg.com/vi/${encodeURIComponent(r.youtube_id)}/hqdefault.jpg`;
            const sub = tab === "graphics" ? (r.description || "") : r.grp;
            return `
            <div class="adm-row">
                <img src="${esc(img)}" alt="" loading="lazy">
                <div class="adm-info"><strong>${esc(r.title)}</strong><small>${esc(sub)}</small></div>
                <div class="adm-btns">
                    <button type="button" data-edit="${esc(r.id)}">עריכה</button>
                    <button type="button" class="danger" data-del="${esc(r.id)}">מחיקה</button>
                </div>
            </div>`;
        }).join("");
    };

    const formHTML = () => {
        const e = editing;
        if (tab === "graphics") {
            return `
            <form id="admForm" class="adm-form" novalidate>
                <h3>${e ? "עריכת גרפיקה" : "הוספת גרפיקה"}</h3>
                <input type="text" name="title" placeholder="כותרת" value="${esc(e?.title)}">
                <input type="text" name="desc" placeholder="תיאור קצר" value="${esc(e?.description)}">
                <label>קובץ PDF ${e ? "(להשאיר ריק כדי לא להחליף)" : ""}<input type="file" name="file" accept="application/pdf"></label>
                <label>תמונת רקע לכרטיס, PNG או JPG (אופציונלי, בלי תמונה תוצג התמונה הרגילה)<input type="file" name="thumb" accept="image/*"></label>
                <div class="adm-btns">
                    <button type="submit" class="primary">${e ? "שמירת שינויים" : "הוספה"}</button>
                    ${e ? `<button type="button" id="admCancel">ביטול</button>` : ""}
                </div>
            </form>`;
        }
        const groups = [...new Set(rows.videos.map((r) => r.grp))];
        return `
        <form id="admForm" class="adm-form" novalidate>
            <h3>${e ? "עריכת סרטון" : "הוספת סרטון"}</h3>
            <input type="text" name="link" placeholder="קישור ליוטיוב (או ה-ID של הסרטון)" value="${esc(e ? e.youtube_id : "")}" dir="ltr">
            <input type="text" name="title" placeholder="כותרת" value="${esc(e?.title)}">
            <input type="text" name="group" placeholder="גדוד / קטגוריה" list="admGroups" value="${esc(e?.grp)}">
            <datalist id="admGroups">${groups.map((g) => `<option value="${esc(g)}">`).join("")}</datalist>
            <div class="adm-btns">
                <button type="submit" class="primary">${e ? "שמירת שינויים" : "הוספה"}</button>
                ${e ? `<button type="button" id="admCancel">ביטול</button>` : ""}
            </div>
        </form>`;
    };

    const render = () => {
        const body = $("adminBody");
        if (!body) return;
        document.querySelectorAll(".admin-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
        body.innerHTML = `<div class="adm-list">${listHTML()}</div>${formHTML()}`;
        $("admForm").addEventListener("submit", onSubmit);
        const cancel = $("admCancel");
        if (cancel) cancel.addEventListener("click", () => { editing = null; msg(""); render(); });
    };

    /* ---------- פעולות ---------- */

    const onSubmit = async (ev) => {
        ev.preventDefault();
        const form = ev.target;
        const btn = form.querySelector("button[type=submit]");
        const title = form.elements.title.value.trim();
        if (!title) return msg("נא למלא כותרת", true);

        btn.disabled = true;
        msg("שומרת...");
        const oldFiles = [];

        try {
            if (tab === "graphics") {
                const pdf = form.elements.file.files[0];
                const img = form.elements.thumb.files[0];
                if (!editing && !pdf) { btn.disabled = false; return msg("נא לבחור קובץ PDF", true); }

                const rec = { title, description: form.elements.desc.value.trim() };
                if (pdf) { rec.file_url = await uploadFile(pdf, "graphics"); if (editing) oldFiles.push(editing.file_url); }
                if (img) { rec.thumb_url = await uploadFile(img, "thumbs"); if (editing) oldFiles.push(editing.thumb_url); }

                const q = editing
                    ? sb.from("graphics").update(rec).eq("id", editing.id)
                    : sb.from("graphics").insert({ ...rec, sort: nextSort(rows.graphics) });
                const { error } = await q;
                if (error) throw error;
            } else {
                const id = ytId(form.elements.link.value);
                const grp = form.elements.group.value.trim();
                if (!id) { btn.disabled = false; return msg("הקישור ליוטיוב לא תקין", true); }
                if (!grp) { btn.disabled = false; return msg("נא למלא גדוד / קטגוריה", true); }

                const rec = { youtube_id: id, title, grp };
                const q = editing
                    ? sb.from("videos").update(rec).eq("id", editing.id)
                    : sb.from("videos").insert({ ...rec, sort: nextSort(rows.videos) });
                const { error } = await q;
                if (error) throw error;
            }

            const wasEditing = !!editing;
            editing = null;
            await refresh(wasEditing ? "השינויים נשמרו ✓" : "נוסף בהצלחה ✓");
            oldFiles.forEach(removeFile);
        } catch (err) {
            console.error("Admin save error:", err);
            msg("השמירה נכשלה: " + (err.message || "שגיאה לא ידועה"), true);
            btn.disabled = false;
        }
    };

    const onDelete = async (id) => {
        const r = rows[tab].find((x) => x.id === id);
        if (!r) return;
        if (!confirm(`למחוק את "${r.title}"? אי אפשר לשחזר.`)) return;
        try {
            const { error } = await sb.from(tab).delete().eq("id", id);
            if (error) throw error;
            if (tab === "graphics") { removeFile(r.file_url); removeFile(r.thumb_url); }
            if (editing && editing.id === id) editing = null;
            await refresh("נמחק ✓");
        } catch (err) {
            console.error("Admin delete error:", err);
            msg("המחיקה נכשלה: " + (err.message || "שגיאה לא ידועה"), true);
        }
    };

    const onLogout = async () => {
        try { await sb.auth.signOut(); } catch (err) { console.error("Logout error:", err); }
        const panel = $("adminPanel");
        if (panel) panel.remove();
        if (window.PeleSite) window.PeleSite.setAdmin(false);
    };

    /* ---------- פתיחה ---------- */

    const build = () => {
        const panel = document.createElement("div");
        panel.id = "adminPanel";
        panel.className = "admin-panel";
        panel.innerHTML = `
        <div class="admin-panel-content">
            <div class="admin-header">
                <div>
                    <span class="admin-label">אזור מנהלת</span>
                    <h2>ניהול התכנים</h2>
                </div>
                <div class="admin-head-btns">
                    <button type="button" id="adminClose" class="logout-button">סגירה</button>
                    <button type="button" id="logoutButton" class="logout-button">התנתקות</button>
                </div>
            </div>
            <div class="admin-tabs">
                <button type="button" data-tab="graphics">גרפיקות</button>
                <button type="button" data-tab="videos">סרטונים</button>
            </div>
            <div id="adminBody"></div>
            <p id="adminMsg" class="admin-msg"></p>
        </div>`;
        document.body.appendChild(panel);

        $("logoutButton").addEventListener("click", onLogout);
        $("adminClose").addEventListener("click", () => { panel.style.display = "none"; document.body.style.overflow = ""; });
        panel.addEventListener("click", (e) => { if (e.target === panel) panel.style.display = "none"; });
        panel.querySelectorAll(".admin-tabs button").forEach((b) => b.addEventListener("click", () => {
            tab = b.dataset.tab; editing = null; msg(""); render();
        }));
        $("adminBody").addEventListener("click", (e) => {
            const ed = e.target.closest("[data-edit]");
            const del = e.target.closest("[data-del]");
            if (ed) {
                editing = rows[tab].find((x) => x.id === ed.dataset.edit) || null;
                msg(""); render();
                $("admForm").scrollIntoView({ behavior: "smooth", block: "center" });
            }
            if (del) onDelete(del.dataset.del);
        });
    };

    const open = async () => {
        if (!$("adminPanel")) build();
        $("adminPanel").style.display = "flex";
        try {
            await load();
            render();
        } catch (err) {
            console.error("Admin load error:", err);
            render();
            msg("לא ניתן לטעון את הנתונים. ודאי שהרצת את setup.sql ב-Supabase.", true);
        }
    };

    window.PeleAdmin = { open };
})();