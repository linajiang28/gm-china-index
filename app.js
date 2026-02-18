// GM China Index — Static search UI
// Expects data.json = array of records with your columns.

const state = {
  data: [],
  filtered: []
};

const els = {
  q: document.getElementById("q"),
  year: document.getElementById("year"),
  month: document.getElementById("month"),
  genre: document.getElementById("genre"),
  column: document.getElementById("column"),
  mention: document.getElementById("mention"),
  clear: document.getElementById("clear"),
  results: document.getElementById("results"),
  count: document.getElementById("count"),
  yr: document.getElementById("yr")
};

els.yr.textContent = String(new Date().getFullYear());

// Helpers
function norm(s) {
  return (s ?? "").toString().trim();
}
function normLower(s) {
  return norm(s).toLowerCase();
}
function uniqSorted(values) {
  return [...new Set(values.filter(v => norm(v) !== ""))].sort((a,b) => {
    // numeric-friendly sort for years/volumes if possible
    const na = Number(a), nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
}
function toMonthLabel(m) {
  const s = norm(m);
  if (!s) return "";
  // accept "February" or "02" etc.
  const map = {
    january:"January", february:"February", march:"March", april:"April", may:"May", june:"June",
    july:"July", august:"August", september:"September", october:"October", november:"November", december:"December"
  };
  const low = s.toLowerCase();
  if (map[low]) return map[low];
  const n = Number(s);
  if (!Number.isNaN(n) && n >= 1 && n <= 12) {
    const labels = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return labels[n-1];
  }
  return s; // leave as-is
}

function populateSelect(selectEl, values) {
  const current = selectEl.value;
  // remove all but first option
  selectEl.querySelectorAll("option:not(:first-child)").forEach(o => o.remove());
  for (const v of values) {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  }
  // restore if still exists
  if ([...selectEl.options].some(o => o.value === current)) selectEl.value = current;
}

function recordSearchText(r) {
  // free-text search across all relevant fields
  const fields = [
    r.Title, r.Volume, r.Year, r.Month, r.Page,
    r["Original Author"], r.Intermediary, r.Genre, r.Subgenre, r.Column,
    r.Keywords, r.Tags, r.Link, r.Notes, r.Transcription, r["Major/Minor mention"]
  ];
  return fields.map(normLower).join(" | ");
}

function passesFilters(r) {
  const q = normLower(els.q.value);
  const year = norm(els.year.value);
  const month = norm(els.month.value);
  const genre = norm(els.genre.value);
  const column = norm(els.column.value);
  const mention = norm(els.mention.value);

  if (year && norm(r.Year) !== year) return false;

  if (month) {
    const m = toMonthLabel(r.Month);
    if (m !== month) return false;
  }

  if (genre && norm(r.Genre) !== genre) return false;
  if (column && norm(r.Column) !== column) return false;
  if (mention && norm(r["Major/Minor mention"]) !== mention) return false;

  if (q) {
    const hay = recordSearchText(r);
    if (!hay.includes(q)) return false;
  }

  return true;
}

function makeEntryId(r, idx) {
  // Use an explicit ID if you add one later; otherwise generate a stable-ish one.
  // Recommended: add an "ID" column in your dataset for full stability.
  if (r.ID) return norm(r.ID);
  const vol = norm(r.Volume) || "v?";
  const year = norm(r.Year) || "????";
  const month = toMonthLabel(r.Month) || "??";
  const page = norm(r.Page) || "p?";
  const num = String(idx + 1).padStart(4, "0");
  return `GM_v${vol}_${year}_${month}_p${page}_${num}`;
}

function formatDate(r) {
  const y = norm(r.Year);
  const m = toMonthLabel(r.Month);
  if (y && m) return `${m} ${y}`;
  if (y) return y;
  return "";
}

function render() {
  const filtered = state.data.filter(passesFilters);
  state.filtered = filtered;
  els.count.textContent = String(filtered.length);

  els.results.innerHTML = "";

  for (let i = 0; i < filtered.length; i++) {
    const r = filtered[i];
    const id = makeEntryId(r, state.data.indexOf(r)); // stable over original data order
    const title = norm(r.Title) || "(Untitled)";
    const date = formatDate(r);
    const page = norm(r.Page);
    const genre = norm(r.Genre);
    const col = norm(r.Column);
    const mention = norm(r["Major/Minor mention"]);

    const row = document.createElement("div");
    row.className = "tr";

    row.innerHTML = `
      <div>
        <a class="titlelink" href="item.html?id=${encodeURIComponent(id)}">${escapeHtml(title)}</a>
        ${norm(r["Original Author"]) ? `<div class="small">Author: ${escapeHtml(norm(r["Original Author"]))}</div>` : ``}
      </div>
      <div>${escapeHtml(date)}</div>
      <div>${escapeHtml(page)}</div>
      <div>${genre ? `<span class="badge">${escapeHtml(genre)}</span>` : ``}</div>
      <div>${col ? `<span class="badge">${escapeHtml(col)}</span>` : ``}</div>
      <div>${mention ? `<span class="badge">${escapeHtml(mention)}</span>` : ``}</div>
    `;

    els.results.appendChild(row);
  }
}

function escapeHtml(str) {
  return (str ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clearAll() {
  els.q.value = "";
  els.year.value = "";
  els.month.value = "";
  els.genre.value = "";
  els.column.value = "";
  els.mention.value = "";
  render();
}

async function init() {
  const res = await fetch("./data.json", { cache: "no-store" });
  const data = await res.json();

  // Keep raw column names exactly as your sheet shows.
  state.data = data.map((r, idx) => ({ ...r, __idx: idx }));

  // Populate filter lists
  populateSelect(els.year, uniqSorted(state.data.map(r => norm(r.Year))));
  populateSelect(els.month, uniqSorted(state.data.map(r => toMonthLabel(r.Month))));
  populateSelect(els.genre, uniqSorted(state.data.map(r => norm(r.Genre))));
  populateSelect(els.column, uniqSorted(state.data.map(r => norm(r.Column))));

  // Events
  ["input", "change"].forEach(evt => {
    els.q.addEventListener(evt, render);
    els.year.addEventListener(evt, render);
    els.month.addEventListener(evt, render);
    els.genre.addEventListener(evt, render);
    els.column.addEventListener(evt, render);
    els.mention.addEventListener(evt, render);
  });

  els.clear.addEventListener("click", clearAll);

  render();
}

init().catch(err => {
  console.error(err);
  els.results.innerHTML = `<div class="tr"><div>Failed to load data.json. Check file path and JSON format.</div></div>`;
});
