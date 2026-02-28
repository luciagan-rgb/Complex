(() => {
  const STORAGE_KEY = "layout_rating_v1";

  const CONFIG = {
    groupCount: 20,
    imagesPerGroup: 50,
    imageIdStart: 1,
    // 仅用于显示提示；后续你接评分页时会用到实际图片路径
    imageBaseDirHint: "../界面数量统计_副本/images/",
  };

  const el = {
    headerMeta: document.getElementById("headerMeta"),
    screenProfile: document.getElementById("screenProfile"),
    screenGroups: document.getElementById("screenGroups"),
    profileForm: document.getElementById("profileForm"),
    participantId: document.getElementById("participantId"),
    ageRange: document.getElementById("ageRange"),
    gender: document.getElementById("gender"),
    btnResetAll: document.getElementById("btnResetAll"),
    btnResetAll2: document.getElementById("btnResetAll2"),
    btnBackToProfile: document.getElementById("btnBackToProfile"),
    groupsGrid: document.getElementById("groupsGrid"),
    imagesNote: document.getElementById("imagesNote"),
  };

  function safeParse(json, fallback) {
    try {
      return JSON.parse(json);
    } catch {
      return fallback;
    }
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const state = safeParse(raw, null);
    if (!state || typeof state !== "object") return { participant: null, groups: {} };
    return {
      participant: state.participant ?? null,
      groups: state.groups ?? {},
    };
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function generateParticipantId() {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
      d.getDate()
    ).padStart(2, "0")}`;
    const rand = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Math.random()}`;
    const short = rand.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
    return `P-${ymd}-${short}`;
  }

  function setScreen(name) {
    const isProfile = name === "profile";
    el.screenProfile.classList.toggle("hidden", !isProfile);
    el.screenGroups.classList.toggle("hidden", isProfile);
  }

  function fmtGroupIndex(i) {
    return String(i).padStart(2, "0");
  }

  function computeGroupRange(groupIndex) {
    const start = CONFIG.imageIdStart + (groupIndex - 1) * CONFIG.imagesPerGroup;
    const end = start + CONFIG.imagesPerGroup - 1;
    return { start, end };
  }

  function renderHeader(state) {
    if (!state.participant) {
      el.headerMeta.textContent = "";
      return;
    }
    const { id, ageRange, gender } = state.participant;
    el.headerMeta.textContent = `${id} · ${labelAge(ageRange)} · ${labelGender(gender)}`;
  }

  function labelAge(v) {
    const map = {
      lt18: "18以下",
      "18-30": "18-30",
      "30-40": "30-40",
      "40-50": "40-50",
      gt50: "50以上",
    };
    return map[v] ?? v ?? "";
  }

  function labelGender(v) {
    const map = { male: "男", female: "女", other: "其他/不透露" };
    return map[v] ?? v ?? "";
  }

  function renderGroups(state) {
    el.imagesNote.innerHTML = [
      `当前配置：<b>${CONFIG.groupCount}</b> 组 × <b>${CONFIG.imagesPerGroup}</b> 张/组（编号范围按顺序切分）。`,
      `图片目录（提示）：<code>${escapeHtml(CONFIG.imageBaseDirHint)}</code>（后续接评分页时会用到）。`,
    ].join("<br/>");

    const items = [];
    for (let i = 1; i <= CONFIG.groupCount; i++) {
      const { start, end } = computeGroupRange(i);
      const g = state.groups?.[String(i)] ?? null;
      const done = Boolean(g?.done);
      const selected = Boolean(g?.selectedAt);
      items.push(groupCardHtml({ i, start, end, done, selected }));
    }
    el.groupsGrid.innerHTML = items.join("");

    el.groupsGrid.querySelectorAll("[data-group]").forEach((node) => {
      const activate = () => {
        const groupIndex = Number(node.getAttribute("data-group"));
        const range = computeGroupRange(groupIndex);
        // 目前只做到组别选择；先把选择记录下来，后续你要接评分页面时会用到
        const next = loadState();
        next.groups[String(groupIndex)] = {
          ...(next.groups[String(groupIndex)] || {}),
          selectedAt: new Date().toISOString(),
          range,
        };
        saveState(next);
        renderHeader(next);
        renderGroups(next);
        alert(
          `已选择：第 ${groupIndex} 组（image_${range.start} ~ image_${range.end}）。\n\n下一步可以在这里进入“评分页面”。`
        );
      };
      node.addEventListener("click", activate);
      node.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      });
    });
  }

  function groupCardHtml({ i, start, end, done, selected }) {
    const title = `第 ${fmtGroupIndex(i)} 组`;
    const pill = done
      ? `<span class="pill pill--ok">已完成</span>`
      : selected
        ? `<span class="pill">已选择</span>`
        : `<span class="pill">未开始</span>`;
    return `
      <div class="groupCard" role="button" tabindex="0" aria-label="${title}" data-group="${i}">
        <div class="groupCard__row">
          <div class="groupCard__title">${title}</div>
          ${pill}
        </div>
        <div class="groupCard__meta">图片编号：<b>${start}</b> - <b>${end}</b></div>
      </div>
    `.trim();
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function fillProfileForm(state) {
    const participant = state.participant ?? null;
    if (!participant) {
      el.participantId.value = generateParticipantId();
      el.ageRange.value = "";
      el.gender.value = "";
      return;
    }
    el.participantId.value = participant.id ?? generateParticipantId();
    el.ageRange.value = participant.ageRange ?? "";
    el.gender.value = participant.gender ?? "";
  }

  function ensureParticipantIdOnScreen(state) {
    if (state.participant?.id) {
      el.participantId.value = state.participant.id;
      return state.participant.id;
    }
    const newId = el.participantId.value?.trim() || generateParticipantId();
    el.participantId.value = newId;
    return newId;
  }

  function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    const state = loadState();
    fillProfileForm(state);
    renderHeader(state);
    setScreen("profile");
  }

  function init() {
    let state = loadState();
    fillProfileForm(state);
    renderHeader(state);

    if (state.participant) {
      setScreen("groups");
      renderGroups(state);
    } else {
      setScreen("profile");
    }

    el.profileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = ensureParticipantIdOnScreen(state);
      const ageRange = el.ageRange.value;
      const gender = el.gender.value;
      if (!ageRange || !gender) return;

      state = loadState();
      state.participant = {
        id,
        ageRange,
        gender,
        createdAt: state.participant?.createdAt ?? new Date().toISOString(),
      };
      saveState(state);
      renderHeader(state);
      setScreen("groups");
      renderGroups(state);
    });

    el.btnResetAll.addEventListener("click", resetAll);
    el.btnResetAll2.addEventListener("click", resetAll);
    el.btnBackToProfile.addEventListener("click", () => {
      state = loadState();
      fillProfileForm(state);
      renderHeader(state);
      setScreen("profile");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

