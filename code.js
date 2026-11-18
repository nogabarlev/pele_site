const sb = window.supabaseClient;
document.documentElement.classList.add("js");
const $ = (id) => document.getElementById(id);

/* =========================================
   תוכן לעריכה - סרטונים וצוות
========================================= */

// כדי להוסיף סרטון: מעתיקים את ה-ID מהקישור ביוטיוב
// (youtube.com/watch?v=XXXXXXXXXXX  <-  החלק XXXXXXXXXXX)
const VIDEOS = [
    { id: "ujhiMIdZ244", title: "בוחן כשג", group: "גדוד הבאח" },
    { id: "POpPhjAdYKs", title: "הו״ב קני - הוראות בטיחות בתומת", group: "גדוד הבאח" },
    { id: "037iTWzksPw", title: "הכרת הקמפוס הדיגיטלי לחניך", group: "גדוד הבאח" },
    { id: "NZzyb0ioeTg", title: "נוהל משקפת", group: "גדוד הפיקוד" },
    { id: "Ufex5zqdMD4", title: "פתיחת זיג", group: "גדוד הפיקוד" },
    { id: "d_YpTFLz4Pk", title: "שיעור מרגמות", group: "ענף הדרכה" }
];

// קבצי הגרפיקות: שימי את ה-PDF בתיקייה media/files ושני כאן את שם הקובץ והכותרת
const GRAPHICS = [
    { file: "media/files/מדבקה.pdf", title: "מדבקה", desc: "מדבקות ליום מפקדים" },
    { file: "media/files/עלון.pdf", title: "עלון למפקד", desc: "ברכה ממחט האש שבטה לסגלים" },
    { file: "media/files/פולדר.pdf", title: "פולדר", desc: "עיצוב כריכה למחברות וספרים" },
    { file: "media/files/פורמט תעודת הוקרה.pdf", title: "פורמט תעודת הוקרה", desc: "עיצוב תעודת הוקרה לחניך מצטיין, באפשרותכם להוסיף את שם החניך בהתאם" },
    { file: "media/files/שבטאון אוקטובר 2026.pdf", title: "שבטאון אוקטובר 2026", desc: "סיכום חודש אוקטובר- אירועים, טקסים והכשרות" },
    { file: "media/files/שבטאון יולי 26.pdf", title: "שבטאון יולי 2026", desc: "סיכומי חודש יולי- אירועים, טקסים והכשרות" }
];

// photo: אפשר להוסיף נתיב לתמונה, למשל "media/team/aya.jpg". בלי תמונה יוצג האות הראשונה
const TEAM = [
    { name: "נוגה בר-לב", role: "מפתחת לומדות", phone: "053-530-6899", photo: "" },
    { name: "איה ריבן", role: "גרפיקאית", phone: "050-642-4363", photo: "" },
    { name: "רעות עמאר", role: "צלמת", phone: "052-965-6356", photo: "" },
    { name: "דנה עוזרי", role: "עורכת וידאו", phone: "058-536-3613", photo: "" }
];
/* =========================================
   NAVBAR + MOBILE MENU
========================================= */

const navbar = $("navbar");
const navMenu = $("navMenu");
const burger = $("burger");
const navLinks = document.querySelectorAll(".nav-link");

const setMenu = (open) => {
    navMenu.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
};

burger.addEventListener("click", () => setMenu(!navMenu.classList.contains("open")));
navLinks.forEach((l) => l.addEventListener("click", () => setMenu(false)));

const onScroll = () => {
    navbar.classList.toggle("scrolled", window.scrollY > 10);
    const pos = window.scrollY + 160;
    navLinks.forEach((link) => {
        const sec = document.querySelector(link.getAttribute("href"));
        if (!sec) return;
        if (pos >= sec.offsetTop && pos < sec.offsetTop + sec.offsetHeight) {
            navLinks.forEach((i) => i.classList.remove("active"));
            link.classList.add("active");
        }
    });
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* =========================================
   REVEAL + COUNTERS
========================================= */

const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        io.unobserve(e.target);
    });
}, { threshold: 0.15 });

document.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 90 + "ms";
    io.observe(el);
});

const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target, end = +el.dataset.count, start = performance.now();
        const tick = (now) => {
            const p = Math.min((now - start) / 1400, 1);
            el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString("he-IL");
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        countIO.unobserve(el);
    });
}, { threshold: 0.6 });
document.querySelectorAll("[data-count]").forEach((el) => countIO.observe(el));

/* =========================================
   HERO PARALLAX (מחשב בלבד)
========================================= */

const collage = $("collage");
if (collage && window.matchMedia("(hover:hover)").matches) {
    const layers = collage.querySelectorAll("[data-depth]");
    collage.addEventListener("mousemove", (e) => {
        const r = collage.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        layers.forEach((l) => {
            const d = +l.dataset.depth;
            l.style.transform = `translate(${x * d}px, ${y * d}px)`;
        });
    });
    collage.addEventListener("mouseleave", () => layers.forEach((l) => (l.style.transform = "")));
}

/* =========================================
   VIDEOS (YouTube)
========================================= */

const player = $("player");
let currentVideo = 0;

const thumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

const setVideo = (i) => {
    currentVideo = i;
    const v = VIDEOS[i];
    player.style.backgroundImage = `url(${thumb(v.id)})`;
    player.innerHTML = `<button type="button" class="play" aria-label="נגן: ${v.title}"><span><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M7 5v14l11-7z" fill="#fff"/></svg></span></button>`;
    player.querySelector(".play").addEventListener("click", () => {
        player.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0" title="${v.title}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    });
    $("vTitle").textContent = v.title;
    $("vDesc").textContent = v.group;
    document.querySelectorAll(".vitem").forEach((el) => el.classList.toggle("active", +el.dataset.i === i));
};

const vList = $("vList");
const vTabs = $("vTabs");
const groups = ["הכל", ...new Set(VIDEOS.map((v) => v.group))];
let filter = "הכל";
const inFilter = (v) => filter === "הכל" || v.group === filter;

const renderList = () => {
    vList.innerHTML = VIDEOS.map((v, i) => inFilter(v)
        ? `<button type="button" class="vitem${i === currentVideo ? " active" : ""}" data-i="${i}"><img src="${thumb(v.id)}" alt="" loading="lazy"><span><strong>${v.title}</strong><small>${v.group}</small></span></button>`
        : "").join("");
    vList.querySelectorAll(".vitem").forEach((el) => el.addEventListener("click", () => setVideo(+el.dataset.i)));
};

vTabs.innerHTML = groups.map((g) => `<button type="button" class="vtab${g === filter ? " active" : ""}">${g}</button>`).join("");
vTabs.querySelectorAll(".vtab").forEach((t) => t.addEventListener("click", () => {
    filter = t.textContent;
    vTabs.querySelectorAll(".vtab").forEach((x) => x.classList.toggle("active", x === t));
    if (!inFilter(VIDEOS[currentVideo])) setVideo(VIDEOS.findIndex(inFilter));
    renderList();
}));

renderList();
if (VIDEOS.length) setVideo(0);

/* =========================================
   TEAM
========================================= */

$("teamGrid").innerHTML = TEAM.map((m) => `
    <article class="member reveal">
        <div class="avatar">${m.photo ? `<img src="${m.photo}" alt="${m.name}">` : m.name.charAt(0)}</div>
        <div>
            <small>${m.role}</small>
            <h3>${m.name}</h3>
            <a href="tel:${m.phone.replace(/-/g, "")}">${m.phone}</a>
        </div>
    </article>`).join("");
document.querySelectorAll(".member").forEach((el) => io.observe(el));

/* =========================================
   GRAPHICS GALLERY
========================================= */

const gfxModal = $("gfxModal");
const gfxViewer = $("gfxViewer");
const gfxFrame = $("gfxFrame");
const gfxCardEl = document.querySelector('[data-service="graphics"]').closest(".service-card");
gfxCardEl.classList.add("clickable");
let gfxIndex = 0;

const ICON_VIEW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICON_DL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12m0 0-5-5m5 5 5-5M5 20h14"/></svg>';

$("gfxGrid").innerHTML = GRAPHICS.map((g, i) => `
    <article class="gfx-card" style="--i:${i}">
        <div class="gfx-thumb"><img src="media/categories/graphic.png" alt=""><span>PDF</span></div>
        <h3>${g.title}</h3>
        <p>${g.desc}</p>
        <div class="gfx-actions">
            <button type="button" data-view="${i}">${ICON_VIEW}הצגה</button>
            <a href="${g.file}" download aria-label="הורדת ${g.title}">${ICON_DL}הורדה</a>
        </div>
    </article>`).join("");

// במסכים קטנים ובאייפון הדפדפן מציג רק עמוד ראשון בתוך מסגרת, אז פותחים בלשונית חדשה
const isSmallScreen = () => window.matchMedia("(max-width: 800px)").matches || /iPhone|iPad|iPod/.test(navigator.userAgent);

const viewGfx = (i) => {
    gfxIndex = (i + GRAPHICS.length) % GRAPHICS.length;
    const g = GRAPHICS[gfxIndex];
    if (isSmallScreen()) { window.open(g.file, "_blank", "noopener"); return; }
    $("gfxViewTitle").textContent = g.title;
    $("gfxDownload").href = g.file;
    gfxFrame.src = g.file + "#view=FitH";
    gfxViewer.hidden = false;
};
const closeViewer = () => { gfxViewer.hidden = true; gfxFrame.src = "about:blank"; };
const openGfx = () => { gfxModal.hidden = false; document.body.style.overflow = "hidden"; gfxModal.scrollTop = 0; };
const closeGfx = () => { closeViewer(); gfxModal.hidden = true; document.body.style.overflow = ""; };

gfxCardEl.addEventListener("click", openGfx);
$("gfxClose").addEventListener("click", closeGfx);
$("gfxBack").addEventListener("click", closeViewer);
$("gfxPrev").addEventListener("click", () => viewGfx(gfxIndex - 1));
$("gfxNext").addEventListener("click", () => viewGfx(gfxIndex + 1));
$("gfxGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-view]");
    if (b) viewGfx(+b.dataset.view);
});
gfxModal.addEventListener("click", (e) => { if (e.target === gfxModal || e.target.classList.contains("gfx-inner")) closeGfx(); });
document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || gfxModal.hidden) return;
    if (!gfxViewer.hidden) closeViewer(); else closeGfx();
});

/* =========================================
   LOMDOT SHOWCASE
========================================= */

const lomdotModal = $("lomdotModal");
const lomdotCard = document.querySelector('[data-service="learning"]').closest(".service-card");
lomdotCard.classList.add("clickable");

const openLomdot = () => {
    lomdotModal.hidden = false;
    document.body.style.overflow = "hidden";
    lomdotModal.scrollTop = 0;
    lomdotModal.querySelectorAll("iframe[data-src]").forEach((f) => {
        f.src = f.dataset.src;
        f.removeAttribute("data-src");
    });
};
const closeLomdot = () => {
    lomdotModal.hidden = true;
    document.body.style.overflow = "";
    lomdotModal.querySelectorAll(".phone").forEach((p) => p.classList.remove("live"));
};

lomdotCard.addEventListener("click", openLomdot);
$("lomdotClose").addEventListener("click", closeLomdot);
lomdotModal.addEventListener("click", (e) => { if (e.target === lomdotModal || e.target.classList.contains("lomdot-inner")) closeLomdot(); });
lomdotModal.querySelectorAll(".phone").forEach((p) => p.addEventListener("click", () => p.classList.add("live")));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !lomdotModal.hidden) closeLomdot(); });

/* =========================================
   LOGIN MODAL
========================================= */

const loginModal = $("loginModal");
const loginEmail = $("loginEmail");
const loginPassword = $("loginPassword");
const loginMessage = $("loginMessage");
const loginButton = $("loginButton");

const openLoginModal = () => {
    loginModal.classList.remove("hidden");
    setTimeout(() => loginEmail.focus(), 100);
};
const closeLoginModal = () => loginModal.classList.add("hidden");

const handleLogin = async () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
        loginMessage.textContent = "נא למלא אימייל וסיסמה";
        return;
    }

    loginMessage.textContent = "מתחברת...";
    loginButton.disabled = true;

    const fail = async (msg, signOut) => {
        loginMessage.textContent = msg;
        if (signOut) await sb.auth.signOut();
        loginButton.disabled = false;
    };

    try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) { console.error("Login error:", error); return fail("האימייל או הסיסמה שגויים"); }
        if (!data.user) return fail("לא נמצא משתמש");

        const { data: profile, error: profileError } = await sb
            .from("profiles").select("role").eq("id", data.user.id).single();

        if (profileError || !profile) {
            console.error("Profile error:", profileError);
            return fail("לא ניתן לבדוק את הרשאות המשתמש", true);
        }
        if (profile.role !== "admin") return fail("אין לך הרשאה להיכנס לאזור הניהול", true);

        loginMessage.textContent = "התחברת בהצלחה! 🎉";
        setTimeout(() => {
            closeLoginModal();
            showAdminPanel();
            loginButton.disabled = false;
            loginMessage.textContent = "";
        }, 700);
    } catch (err) {
        console.error("Unexpected login error:", err);
        fail("אירעה שגיאה. נסי שוב.");
    }
};

/* =========================================
   ADMIN PANEL
========================================= */

const showAdminPanel = () => {
    const existing = $("adminPanel");
    if (existing) { existing.style.display = "flex"; return; }

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
                <button type="button" id="logoutButton" class="logout-button">התנתקות</button>
            </div>
            <div class="admin-actions">
                <button type="button" class="admin-action">➕ העלאת תוכן</button>
                <button type="button" class="admin-action">📁 ניהול תיקיות</button>
                <button type="button" class="admin-action">🗂️ ניהול קבצים</button>
            </div>
        </div>`;
    document.body.appendChild(panel);
    $("logoutButton").addEventListener("click", handleLogout);
};

const handleLogout = async () => {
    try { await sb.auth.signOut(); } catch (err) { console.error("Logout error:", err); }
    const panel = $("adminPanel");
    if (panel) panel.remove();
};

/* =========================================
   EVENTS
========================================= */

$("adminLoginButton").addEventListener("click", (e) => { e.preventDefault(); openLoginModal(); });
$("closeLoginButton").addEventListener("click", (e) => { e.preventDefault(); closeLoginModal(); });
loginButton.addEventListener("click", (e) => { e.preventDefault(); handleLogin(); });
loginModal.addEventListener("click", (e) => { if (e.target === loginModal) closeLoginModal(); });
loginPassword.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); handleLogin(); } });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLoginModal(); });

/* =========================================
   EXISTING SESSION
========================================= */

(async () => {
    try {
        const { data, error } = await sb.auth.getSession();
        if (error || !data.session) return;

        const { data: profile, error: profileError } = await sb
            .from("profiles").select("role").eq("id", data.session.user.id).single();

        if (!profileError && profile && profile.role === "admin") showAdminPanel();
    } catch (err) {
        console.error("Session check error:", err);
    }
})();
