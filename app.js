(() => {
  const STORAGE_KEY = "layout_rating_v1";

  const CONFIG = {
    groupCount: 20,
    imagesPerGroup: 50,
    imageIdStart: 1,
    // 仓库里图片目录（相对路径，GitHub Pages 下即 /仓库名/images/）
    imageBasePath: "images/",
    imageExt: "jpeg",
  };

  function getImageUrl(id) {
    return CONFIG.imageBasePath + id + "." + CONFIG.imageExt;
  }

  const el = {
    headerMeta: document.getElementById("headerMeta"),
    screenWelcome: document.getElementById("screenWelcome"),
    screenInstructions: document.getElementById("screenInstructions"),
    screenProfile: document.getElementById("screenProfile"),
    screenGroups: document.getElementById("screenGroups"),
    screenGroupImages: document.getElementById("screenGroupImages"),
    profileForm: document.getElementById("profileForm"),
    participantId: document.getElementById("participantId"),
    ageRange: document.getElementById("ageRange"),
    gender: document.getElementById("gender"),
    btnResetAll: document.getElementById("btnResetAll"),
    btnResetAll2: document.getElementById("btnResetAll2"),
    btnBackToProfile: document.getElementById("btnBackToProfile"),
    btnExport: document.getElementById("btnExport"),
    btnExportFooter: document.getElementById("btnExportFooter"),
    btnConsent: document.getElementById("btnConsent"),
    btnStartRating: document.getElementById("btnStartRating"),
    btnBackToGroups: document.getElementById("btnBackToGroups"),
    btnPrevImage: document.getElementById("btnPrevImage"),
    btnNextImage: document.getElementById("btnNextImage"),
    groupsGrid: document.getElementById("groupsGrid"),
    imagesNote: document.getElementById("imagesNote"),
    groupImagesTitle: document.getElementById("groupImagesTitle"),
    ratingBigImage: document.getElementById("ratingBigImage"),
    ratingProgress: document.getElementById("ratingProgress"),
    scale7: document.getElementById("scale7"),
    ratingFlowWrap: document.getElementById("ratingFlowWrap"),
    ratingCompleteWrap: document.getElementById("ratingCompleteWrap"),
    ratingCompleteGroupNum: document.getElementById("ratingCompleteGroupNum"),
    btnBackAfterComplete: document.getElementById("btnBackAfterComplete"),
    btnDownloadGroup: document.getElementById("btnDownloadGroup"),
  };

  let ratingState = { groupIndex: 0, range: { start: 1, end: 50 }, imageIndex: 0 };

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
    const isWelcome = name === "welcome";
    const isInstructions = name === "instructions";
    const isProfile = name === "profile";
    const isGroups = name === "groups";
    const isGroupImages = name === "groupImages";
    if (el.screenWelcome) el.screenWelcome.classList.toggle("hidden", !isWelcome);
    if (el.screenInstructions) el.screenInstructions.classList.toggle("hidden", !isInstructions);
    el.screenProfile.classList.toggle("hidden", !isProfile);
    el.screenGroups.classList.toggle("hidden", !isGroups);
    if (el.screenGroupImages) el.screenGroupImages.classList.toggle("hidden", !isGroupImages);
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
      `当前配置：<b>${CONFIG.groupCount}</b> 组 × <b>${CONFIG.imagesPerGroup}</b> 张/组。`,
      `图片路径：<code>${escapeHtml(CONFIG.imageBasePath)}1.${CONFIG.imageExt}</code> … <code>${escapeHtml(CONFIG.imageBasePath)}562.${CONFIG.imageExt}</code>（与仓库一致）。`,
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
        const next = loadState();
        next.groups[String(groupIndex)] = {
          ...(next.groups[String(groupIndex)] || {}),
          selectedAt: new Date().toISOString(),
          range,
        };
        saveState(next);
        renderHeader(next);
        renderGroups(next);
        openGroupImages(groupIndex, range);
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

  function openGroupImages(groupIndex, range) {
    if (!el.screenGroupImages || !el.ratingBigImage) return;
    ratingState = { groupIndex, range, imageIndex: 0 };
    const state = loadState();
    if (!state.groups[String(groupIndex)].ratings) state.groups[String(groupIndex)].ratings = {};
    saveState(state);
    el.groupImagesTitle.textContent = `第 ${fmtGroupIndex(groupIndex)} 组`;
    hideCompletionView();
    setScreen("groupImages");
    renderRatingScreen();
    bindScale7();
  }

  function getCurrentImageId() {
    return ratingState.range.start + ratingState.imageIndex;
  }

  function renderRatingScreen() {
    const { groupIndex, range, imageIndex } = ratingState;
    const total = range.end - range.start + 1;
    const imageId = getCurrentImageId();
    if (el.ratingBigImage) {
      el.ratingBigImage.src = getImageUrl(imageId);
      el.ratingBigImage.alt = `图片 ${imageId}`;
    }
    if (el.ratingProgress) el.ratingProgress.textContent = `第 ${imageIndex + 1} / ${total} 张`;
    const state = loadState();
    const g = state.groups[String(groupIndex)] || {};
    const ratings = g.ratings || {};
    const selected = ratings[String(imageId)];
    el.scale7?.querySelectorAll(".scale-7__option").forEach((btn) => {
      const v = Number(btn.getAttribute("data-value"));
      btn.classList.toggle("scale-7__option--selected", v === selected);
      btn.setAttribute("aria-pressed", v === selected ? "true" : "false");
    });
    if (el.btnPrevImage) el.btnPrevImage.disabled = imageIndex <= 0;
    if (el.btnNextImage) {
      el.btnNextImage.disabled = false;
      el.btnNextImage.textContent = imageIndex >= total - 1 ? "完成本组" : "下一张";
    }
  }

  function bindScale7() {
    if (!el.scale7) return;
    el.scale7.querySelectorAll(".scale-7__option").forEach((btn) => {
      btn.replaceWith(btn.cloneNode(true));
    });
    el.scale7.querySelectorAll(".scale-7__option").forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = Number(btn.getAttribute("data-value"));
        const state = loadState();
        const g = state.groups[String(ratingState.groupIndex)] || {};
        if (!g.ratings) g.ratings = {};
        g.ratings[String(getCurrentImageId())] = value;
        saveState(state);
        renderRatingScreen();
      });
    });
  }

  function goPrevImage() {
    if (ratingState.imageIndex <= 0) return;
    ratingState.imageIndex--;
    renderRatingScreen();
  }

  function goNextImage() {
    const total = ratingState.range.end - ratingState.range.start + 1;
    if (ratingState.imageIndex >= total - 1) {
      const state = loadState();
      const g = state.groups[String(ratingState.groupIndex)] || {};
      g.done = true;
      saveState(state);
      showCompletionView();
      return;
    }
    ratingState.imageIndex++;
    renderRatingScreen();
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

  function showCompletionView() {
    if (el.ratingFlowWrap) el.ratingFlowWrap.classList.add("hidden");
    if (el.ratingCompleteWrap) el.ratingCompleteWrap.classList.remove("hidden");
    if (el.ratingCompleteGroupNum) el.ratingCompleteGroupNum.textContent = fmtGroupIndex(ratingState.groupIndex);
  }

  function hideCompletionView() {
    if (el.ratingFlowWrap) el.ratingFlowWrap.classList.remove("hidden");
    if (el.ratingCompleteWrap) el.ratingCompleteWrap.classList.add("hidden");
  }

  function exportGroupData() {
    const state = loadState();
    const p = state.participant;
    if (!p) return;
    const g = state.groups[String(ratingState.groupIndex)];
    if (!g || !g.ratings || typeof g.ratings !== "object") return;
    const groupIndex = ratingState.groupIndex;
    const imageIds = Object.keys(g.ratings).sort((a, b) => Number(a) - Number(b));
    const rows = imageIds.map((imageId) => ({
      用户: p.id,
      性别: labelGender(p.gender),
      年龄: labelAge(p.ageRange),
      组别: groupIndex,
      图片编号: imageId,
      分数: g.ratings[imageId],
    }));
    const headers = ["用户", "性别", "年龄", "组别", "图片编号", "分数"];
    const escapeCsv = (v) => {
      const s = String(v ?? "");
      if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const line = (obj) => headers.map((h) => escapeCsv(obj[h])).join(",");
    const csv = "\uFEFF" + headers.join(",") + "\r\n" + rows.map(line).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `layout_rating_${p.id}_组${fmtGroupIndex(groupIndex)}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportData() {
    const state = loadState();
    const p = state.participant;
    if (!p) {
      alert("暂无数据，请先填写基本信息并进入组别评分。");
      return;
    }
    const rows = [];
    const groupKeys = Object.keys(state.groups || {}).sort((a, b) => Number(a) - Number(b));
    for (const key of groupKeys) {
      const g = state.groups[key];
      if (!g || !g.ratings || typeof g.ratings !== "object") continue;
      const groupIndex = Number(key);
      const imageIds = Object.keys(g.ratings).sort((a, b) => Number(a) - Number(b));
      for (const imageId of imageIds) {
        rows.push({
          用户: p.id,
          性别: labelGender(p.gender),
          年龄: labelAge(p.ageRange),
          组别: groupIndex,
          图片编号: imageId,
          分数: g.ratings[imageId],
        });
      }
    }
    if (rows.length === 0) {
      alert("暂无评分数据，请先完成至少一张图的评分后再导出。");
      return;
    }
    const headers = ["用户", "性别", "年龄", "组别", "图片编号", "分数"];
    const escapeCsv = (v) => {
      const s = String(v ?? "");
      if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const line = (obj) => headers.map((h) => escapeCsv(obj[h])).join(",");
    const csv = "\uFEFF" + headers.join(",") + "\r\n" + rows.map(line).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `layout_rating_${p.id}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
    setScreen("welcome");
  }

  function init() {
    let state = loadState();
    fillProfileForm(state);
    renderHeader(state);

    if (state.participant) {
      setScreen("groups");
      renderGroups(state);
    } else {
      setScreen("welcome");
    }

    if (el.btnConsent) {
      el.btnConsent.addEventListener("click", () => setScreen("instructions"));
    }
    if (el.btnStartRating) {
      el.btnStartRating.addEventListener("click", () => setScreen("profile"));
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
    if (el.btnBackToGroups) {
      el.btnBackToGroups.addEventListener("click", () => {
        setScreen("groups");
        renderGroups(loadState());
      });
    }
    if (el.btnPrevImage) el.btnPrevImage.addEventListener("click", goPrevImage);
    if (el.btnNextImage) el.btnNextImage.addEventListener("click", goNextImage);
    if (el.btnExport) el.btnExport.addEventListener("click", exportData);
    if (el.btnExportFooter) el.btnExportFooter.addEventListener("click", exportData);
    if (el.btnBackAfterComplete) {
      el.btnBackAfterComplete.addEventListener("click", () => {
        hideCompletionView();
        setScreen("groups");
        renderGroups(loadState());
      });
    }
    if (el.btnDownloadGroup) el.btnDownloadGroup.addEventListener("click", exportGroupData);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

