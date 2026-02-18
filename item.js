function norm(s) {
  return (s ?? "").toString().trim();
}
function escapeHtml(str) {
  return (str ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function toMonthLabel(m) {
  const s = norm(m);
  if (!s) return "";
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
  return s;
}

function makeEntryId(r, idx) {
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

function buildCitation(r) {
  // Simple Chicago-ish index citation; adjust to your preference.
  // Example:
  // "An Heroic Postscript..." The Gentleman’s Magazine 44 (February 1774): 85. HathiTrust link.
  const title = norm(r.Title) || "(Untitled)";
  const vol = norm(r.Volume);
  const date = formatDate(r);
  const page = norm(r.Page);
  const author = norm(r["Original Author"]);

  const parts = [];
  if (author) parts.push(`${author}.`);
  parts.push(`“${title}.”`);
  parts.push(`<em>The Gentleman’s Magazine</em>`);
  if (vol) parts.push(`${vol}`);
  if (date) parts.push(`(${date})`);
  if (page) parts.push(`: ${page}`);
  return parts.join(" ");
}

function dlRow(label, valueHtml) {
  return `<dt>${escapeHtml(label)}</dt><dd>${valueHtml}</dd>`;
}

async function init() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  const titleEl = document.getElementById("itemTitle");
  const subEl = document.getElementById("itemSub");
  const metaEl = document.getElementById("meta");
  const notesCard = document.getElementById("notesCard");
  const notesEl = document.getElementById("notes");
  const transCard = document.getElementById("transCard");
  const transEl = document.getElementById("transcription");
  const citeEl = document.getElementById("citation");
  const stableEl = document.getElementById("stable");

  if (!id) {
    titleEl.textContent = "Missing item id";
    subEl.textContent = "Open an item from the search page.";
    return;
  }

  const res = await fetch("./data.json", { cache: "no-store" });
  const data = await res.json();

  // Find matching record by generated ID
  let found = null;
  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    const rid = makeEntryId(r, i);
    if (rid === id) { found = { r, i, rid }; break; }
  }

  if (!found) {
    titleEl.textContent = "Item not found";
    subEl.textContent = `No record matches id=${id}. If you reordered data.json, IDs may change. Add an explicit ID column for stability.`;
    return;
  }

  const r = found.r;

  const title = norm(r.Title) || "(Untitled)";
  document.title = `${title} — GM China Index`;
  titleEl.textContent = title;

  const date = formatDate(r);
  subEl.textContent = `${date}${norm(r.Page) ? ` • p. ${norm(r.Page)}` : ""}${norm(r.Genre) ? ` • ${norm(r.Genre)}` : ""}`;

  // Metadata list
  const link = norm(r.Link);
  const linkHtml = link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener">Open source</a>` : "";

  const meta = [];
  meta.push(dlRow("ID", `<code>${escapeHtml(found.rid)}</code>`));
  meta.push(dlRow("Title", escapeHtml(title)));
  meta.push(dlRow("Volume", escapeHtml(norm(r.Volume))));
  meta.push(dlRow("Year", escapeHtml(norm(r.Year))));
  meta.push(dlRow("Month", escapeHtml(toMonthLabel(r.Month))));
  meta.push(dlRow("Page", escapeHtml(norm(r.Page))));
  meta.push(dlRow("Original Author", escapeHtml(norm(r["Original Author"]))));
  meta.push(dlRow("Intermediary", escapeHtml(norm(r.Intermediary))));
  meta.push(dlRow("Genre", escapeHtml(norm(r.Genre))));
  meta.push(dlRow("Subgenre", escapeHtml(norm(r.Subgenre))));
  meta.push(dlRow("Column", escapeHtml(norm(r.Column))));
  meta.push(dlRow("Keywords", escapeHtml(norm(r.Keywords))));
  meta.push(dlRow("Tags", escapeHtml(norm(r.Tags))));
  meta.push(dlRow("Major/Minor mention", escapeHtml(norm(r["Major/Minor mention"]))));
  meta.push(dlRow("Link", linkHtml || "<span class='small'>—</span>"));

  metaEl.innerHTML = meta.join("");

  // Notes
  const notes = norm(r.Notes);
  if (notes) {
    notesCard.hidden = false;
    notesEl.textContent = notes;
  }

  // Transcription
  const trans = norm(r.Transcription);
  if (trans) {
    transCard.hidden = false;
    transEl.textContent = trans;
  }

  // Citation + stable link
  citeEl.innerHTML = buildCitation(r) + (link ? ` <a href="${escapeHtml(link)}" target="_blank" rel="noopener">Link</a>` : "");
  const stableUrl = `${location.origin}${location.pathname.replace(/item\.html.*/, "item.html")}?id=${encodeURIComponent(found.rid)}`;
  stableEl.innerHTML = `<a href="${escapeHtml(stableUrl)}">${escapeHtml(stableUrl)}</a>`;
}

init().catch(err => {
  console.error(err);
  document.getElementById("itemTitle").textContent = "Error loading item";
  document.getElementById("itemSub").textContent = "Check that data.json exists and is valid JSON.";
});
