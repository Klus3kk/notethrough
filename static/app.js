const form = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const resultsContainer = document.getElementById("results");
const resultTemplate = document.getElementById("result-template");
const suggestionsList = document.getElementById("suggestions");
const primarySearchWrapper = document.querySelector("#search-form .search-wrapper");

const detailOverlay = document.getElementById("detail-overlay");
const detailCloseButton = document.getElementById("detail-close");
const detailTitle = document.getElementById("detail-title");
const detailSubtitle = document.getElementById("detail-subtitle");
const detailGenres = document.getElementById("detail-genres");
const detailAttributes = document.getElementById("detail-attributes");
const detailAvatar = document.getElementById("detail-avatar");

const analysisMarquee = document.getElementById("analysis-marquee");

const seedForm = document.getElementById("seed-form");
const seedInput = document.getElementById("seed-input");
const seedSuggestionsList = document.getElementById("seed-suggestions");
const seedSearchWrapper = document.querySelector("#seed-form .search-wrapper");
const seedChipsContainer = document.getElementById("seed-chips");
const recommendBtn = document.getElementById("recommend-btn");
const recommendResultsContainer = document.getElementById("recommend-results");

const MIN_QUERY_LENGTH = 2;
const KEY_NAMES = ["C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B"];
const MODE_NAMES = { 0: "Minor", 1: "Major" };

let searchAbortController = null;
let suggestionAbortController = null;
let seedSuggestionAbortController = null;
let recommendAbortController = null;
let latestQuery = "";
let latestResults = [];
const detailCache = new Map();
const seedSelections = [];

let searchDebounce = null;
let suggestionDebounce = null;
let seedSuggestionDebounce = null;
let searchRequestId = 0;
let suggestionRequestId = 0;
let seedSuggestionRequestId = 0;
let recommendRequestId = 0;

const recommendDefaultLabel = recommendBtn ? recommendBtn.textContent.trim() : "Find similar songs";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return `${Math.round(Number(value) * 100)}%`;
}

function toFixed(value, fractionDigits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return Number(value).toFixed(fractionDigits);
}

function formatDuration(ms) {
  if (ms === null || ms === undefined || Number.isNaN(ms)) {
    return "—";
  }
  const totalSeconds = Math.max(0, Math.round(Number(ms) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function highlightMatch(text, query) {
  if (!query) {
    return text;
  }
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => escapeRegExp(token));
  if (!tokens.length) {
    return text;
  }
  const pattern = new RegExp(`(${tokens.join("|")})`, "gi");
  return text.replace(pattern, "<mark>$1</mark>");
}

function hashString(value) {
  let hash = 0;
  const input = (value || "").toString();
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function avatarGradient(label) {
  const hash = hashString(label);
  const hue = hash % 360;
  const hue2 = (hue + 40) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 55%, 52%), hsl(${hue2}, 62%, 46%))`;
}

function setAvatar(element, label) {
  if (!element) {
    return;
  }
  const initial = (label || "").trim().charAt(0) || "♫";
  element.textContent = initial.toUpperCase();
  element.style.background = avatarGradient(label || initial);
}

function clearResults(message, container = resultsContainer, { resetState = false } = {}) {
  container.innerHTML = "";
  if (resetState) {
    latestResults = [];
  }
  if (message) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = message;
    container.appendChild(emptyState);
  }
}

function renderGenres(listEl, genres, limit = 6) {
  listEl.innerHTML = "";
  if (!Array.isArray(genres) || !genres.length) {
    return;
  }
  genres.slice(0, limit).forEach((genre) => {
    const li = document.createElement("li");
    li.textContent = genre;
    listEl.appendChild(li);
  });
}

function createTrackCard(track, { query = "", showSimilarity = false } = {}) {
  const clone = resultTemplate.content.cloneNode(true);
  const article = clone.querySelector(".result");
  const avatarEl = clone.querySelector(".avatar");
  const titleEl = clone.querySelector(".song-title");
  const metaEl = clone.querySelector(".song-meta");
  const insightsEl = clone.querySelector(".song-insights");
  const genresEl = clone.querySelector(".genre-list");
  const addBtn = clone.querySelector(".add-to-mix");

  setAvatar(avatarEl, track["Artist Name(s)"]);

  if (query) {
    titleEl.innerHTML = highlightMatch(track["Track Name"], query);
    metaEl.innerHTML = highlightMatch(`${track["Artist Name(s)"]} • ${track["Album Name"]}`, query);
  } else {
    titleEl.textContent = track["Track Name"];
    metaEl.textContent = `${track["Artist Name(s)"]} • ${track["Album Name"]}`;
  }

  const release = track["Release Year"] || track["Release Date"];
  const popularity = track["Popularity"] ?? "—";
  const tempo = track["Tempo"] ? `${toFixed(track["Tempo"])} BPM` : null;

  const similarityValue = typeof track.similarity === "number"
    ? Math.max(0, Math.min(1, Number(track.similarity)))
    : null;

  const insightParts = [
    showSimilarity && similarityValue !== null
      ? `Match ${(similarityValue * 100).toFixed(0)}%`
      : null,
    release ? `Released ${release}` : null,
    popularity !== "—" ? `Popularity ${popularity}` : null,
    `Danceability ${toPercent(track.Danceability)}`,
    `Energy ${toPercent(track.Energy)}`,
    `Valence ${toPercent(track.Valence)}`,
    tempo,
  ].filter(Boolean);

  insightsEl.textContent = insightParts.join(" • ");

  renderGenres(genresEl, track.Genres);

  article.dataset.uri = track["Track URI"];
  article.tabIndex = 0;

  article.addEventListener("click", () => openDetail(track["Track URI"]));
  article.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail(track["Track URI"]);
    }
  });

  if (addBtn) {
    addBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      addSeedTrack(track);
    });
  }

  return article;
}

function renderTrackList(tracks, { container, query = "", showSimilarity = false, emptyMessage = "No results to show yet." }) {
  container.innerHTML = "";
  if (!tracks.length) {
    clearResults(emptyMessage, container);
    return;
  }

  tracks.forEach((track) => {
    const card = createTrackCard(track, { query, showSimilarity });
    container.appendChild(card);
  });
}

function renderSearchResults(data, query) {
  latestResults = data;
  if (!data.length) {
    clearResults("No matches yet. Try a different search.", resultsContainer, { resetState: true });
    return;
  }
  renderTrackList(data, { container: resultsContainer, query, showSimilarity: false });
}

function buildSuggestionList(items, query, container, onSelect) {
  container.innerHTML = "";
  if (!items.length || !query || query.trim().length < MIN_QUERY_LENGTH) {
    container.classList.remove("visible");
    container.style.maxHeight = "";
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.tabIndex = 0;

    const avatar = document.createElement("div");
    avatar.className = "avatar avatar-sm";
    setAvatar(avatar, item["Artist Name(s)"]);

    const textWrap = document.createElement("div");
    textWrap.className = "suggestion-text";

    const title = document.createElement("span");
    title.className = "suggestion-title";
    title.innerHTML = highlightMatch(item["Track Name"], query);

    const subtitle = document.createElement("span");
    subtitle.className = "suggestion-subtitle";
    subtitle.innerHTML = highlightMatch(item["Artist Name(s)"], query);

    textWrap.append(title, subtitle);
    li.append(avatar, textWrap);

    li.addEventListener("click", () => onSelect(item));
    li.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onSelect(item);
      }
    });

    container.appendChild(li);
  });

  const maxItems = Math.min(items.length, 6);
  const ITEM_HEIGHT = 60;
  container.style.maxHeight = `${maxItems * ITEM_HEIGHT}px`;
  container.classList.add("visible");
}

function renderSuggestions(items, query) {
  buildSuggestionList(items, query, suggestionsList, handleSuggestionSelection);
}

function hideSuggestions() {
  suggestionsList.classList.remove("visible");
  suggestionsList.style.maxHeight = "";
}

function renderSeedSuggestions(items, query) {
  buildSuggestionList(items, query, seedSuggestionsList, handleSeedSuggestionSelection);
}

function hideSeedSuggestions() {
  seedSuggestionsList.classList.remove("visible");
  seedSuggestionsList.style.maxHeight = "";
}

function handleSuggestionSelection(item) {
  hideSuggestions();
  if (!item) {
    return;
  }
  if (searchDebounce) {
    clearTimeout(searchDebounce);
    searchDebounce = null;
  }
  if (suggestionDebounce) {
    clearTimeout(suggestionDebounce);
    suggestionDebounce = null;
  }
  searchInput.value = item["Track Name"];
  performSearch(item["Track Name"]);
  openDetail(item["Track URI"]);
}

function handleSeedSuggestionSelection(item) {
  hideSeedSuggestions();
  if (!item) {
    return;
  }
  if (seedSuggestionDebounce) {
    clearTimeout(seedSuggestionDebounce);
    seedSuggestionDebounce = null;
  }
  seedInput.value = "";
  addSeedTrack(item);
}

async function fetchSuggestions(query) {
  if (suggestionAbortController) {
    suggestionAbortController.abort();
  }

  const requestId = ++suggestionRequestId;
  if (!query || query.trim().length < MIN_QUERY_LENGTH) {
    hideSuggestions();
    return;
  }

  suggestionAbortController = new AbortController();

  try {
    const response = await fetch(`/suggest?q=${encodeURIComponent(query)}`, {
      signal: suggestionAbortController.signal,
    });
    if (!response.ok) {
      throw new Error(`Suggestion request failed with status ${response.status}`);
    }
    const data = await response.json();
    if (requestId !== suggestionRequestId) {
      return;
    }
    renderSuggestions(data, query);
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
    }
  } finally {
    suggestionAbortController = null;
  }
}

async function fetchSeedSuggestions(query) {
  if (seedSuggestionAbortController) {
    seedSuggestionAbortController.abort();
  }

  const requestId = ++seedSuggestionRequestId;
  if (!query || query.trim().length < MIN_QUERY_LENGTH) {
    hideSeedSuggestions();
    return;
  }

  seedSuggestionAbortController = new AbortController();

  try {
    const response = await fetch(`/suggest?q=${encodeURIComponent(query)}`, {
      signal: seedSuggestionAbortController.signal,
    });
    if (!response.ok) {
      throw new Error(`Suggestion request failed with status ${response.status}`);
    }
    const data = await response.json();
    if (requestId !== seedSuggestionRequestId) {
      return;
    }
    renderSeedSuggestions(data, query);
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
    }
  } finally {
    seedSuggestionAbortController = null;
  }
}

async function performSearch(query) {
  if (searchAbortController) {
    searchAbortController.abort();
  }

  const requestId = ++searchRequestId;
  if (!query || query.trim().length < MIN_QUERY_LENGTH) {
    clearResults("Type at least two characters to start searching.", resultsContainer, { resetState: true });
    return;
  }

  latestQuery = query;
  searchAbortController = new AbortController();
  clearResults("Searching...", resultsContainer);

  try {
    const response = await fetch(`/search?q=${encodeURIComponent(query)}`, {
      signal: searchAbortController.signal,
    });
    if (!response.ok) {
      throw new Error(`Search failed with status ${response.status}`);
    }
    const data = await response.json();
    if (requestId !== searchRequestId) {
      return;
    }
    renderSearchResults(data, query);
    renderSuggestions(data.slice(0, 8), query);
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }
    clearResults("Something went wrong while searching. Please try again.", resultsContainer, { resetState: true });
    console.error(error);
  } finally {
    searchAbortController = null;
  }
}

function handleInput() {
  const query = searchInput.value.trim();
  if (!query || query.length < MIN_QUERY_LENGTH) {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
      searchDebounce = null;
    }
    if (suggestionDebounce) {
      clearTimeout(suggestionDebounce);
      suggestionDebounce = null;
    }
    clearResults("Type at least two characters to start searching.", resultsContainer, { resetState: true });
    hideSuggestions();
    return;
  }
  if (searchDebounce) {
    clearTimeout(searchDebounce);
  }
  searchDebounce = setTimeout(() => {
    performSearch(searchInput.value.trim());
  }, 220);

  if (suggestionDebounce) {
    clearTimeout(suggestionDebounce);
  }
  suggestionDebounce = setTimeout(() => {
    fetchSuggestions(searchInput.value.trim());
  }, 160);
}

function renderSeedChips() {
  seedChipsContainer.innerHTML = "";
  if (!seedSelections.length) {
    return;
  }

  seedSelections.forEach((track) => {
    const chip = document.createElement("div");
    chip.className = "seed-chip";

    const label = document.createElement("span");
    label.textContent = `${track["Track Name"]} — ${track["Artist Name(s)"]}`;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", `Remove ${track["Track Name"]}`);
    removeButton.textContent = "×";
    removeButton.addEventListener("click", () => removeSeedTrack(track["Track URI"]));

    chip.append(label, removeButton);
    seedChipsContainer.appendChild(chip);
  });
}

function updateRecommendButton({ loading = false } = {}) {
  if (!recommendBtn) {
    return;
  }
  if (loading) {
    recommendBtn.disabled = true;
    recommendBtn.textContent = "Finding matches…";
    return;
  }
  recommendBtn.textContent = recommendDefaultLabel;
  recommendBtn.disabled = seedSelections.length === 0;
}

function addSeedTrack(track) {
  if (!track || !track["Track URI"]) {
    return;
  }
  const exists = seedSelections.some((entry) => entry["Track URI"] === track["Track URI"]);
  if (exists) {
    return;
  }
  seedSelections.push({
    "Track URI": track["Track URI"],
    "Track Name": track["Track Name"],
    "Artist Name(s)": track["Artist Name(s)"],
    Genres: track.Genres || [],
  });
  renderSeedChips();
  updateRecommendButton();
}

function removeSeedTrack(uri) {
  const index = seedSelections.findIndex((track) => track["Track URI"] === uri);
  if (index === -1) {
    return;
  }
  seedSelections.splice(index, 1);
  renderSeedChips();
  updateRecommendButton();
}

function renderRecommendationResults(data) {
  renderTrackList(data, {
    container: recommendResultsContainer,
    showSimilarity: true,
    emptyMessage: "No close matches found yet. Add a different favourite to refine the search.",
  });
}

async function requestRecommendations() {
  if (!seedSelections.length) {
    return;
  }

  const requestId = ++recommendRequestId;
  if (recommendAbortController) {
    recommendAbortController.abort();
  }

  recommendAbortController = new AbortController();
  updateRecommendButton({ loading: true });
  clearResults("Looking for songs that match the vibe…", recommendResultsContainer);

  try {
    const response = await fetch("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uris: seedSelections.map((track) => track["Track URI"]) }),
      signal: recommendAbortController.signal,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message = payload.error || `Recommendation request failed with status ${response.status}`;
      throw new Error(message);
    }
    const data = await response.json();
    if (requestId !== recommendRequestId) {
      return;
    }
    renderRecommendationResults(Array.isArray(data) ? data : []);
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }
    console.error(error);
    clearResults("We hit a snag finding matches. Please try again.", recommendResultsContainer);
  } finally {
    updateRecommendButton({ loading: false });
    recommendAbortController = null;
  }
}

function renderStats(summary) {
  if (!analysisMarquee) {
    return;
  }

  analysisMarquee.innerHTML = "";
  if (!summary) {
    return;
  }

  const cards = [];
  const totals = summary.totals || {};

  if (typeof totals.total_rows === "number") {
    cards.push({ title: "Rows analysed", text: `${totals.total_rows.toLocaleString()} tracks` });
  }
  if (typeof totals.unique_tracks === "number") {
    cards.push({ title: "Unique songs", text: totals.unique_tracks.toLocaleString() });
  }
  if (typeof totals.unique_artists === "number") {
    cards.push({ title: "Unique artists", text: totals.unique_artists.toLocaleString() });
  }
  if (totals.release_year_range) {
    cards.push({
      title: "Release span",
      text: `${totals.release_year_range.min} – ${totals.release_year_range.max}`,
    });
  }
  if (typeof totals.average_popularity === "number") {
    cards.push({ title: "Avg popularity", text: totals.average_popularity.toFixed(1) });
  }
  if (typeof totals.average_danceability === "number") {
    cards.push({ title: "Avg danceability", text: totals.average_danceability.toFixed(2) });
  }
  if (typeof totals.average_energy === "number") {
    cards.push({ title: "Avg energy", text: totals.average_energy.toFixed(2) });
  }

  const topArtists = summary.top_artists || [];
  topArtists.slice(0, 5).forEach((artist, index) => {
    cards.push({
      title: `Top artist #${index + 1}`,
      text: `${artist.name} • ${artist.count.toLocaleString()} songs`,
    });
  });

  const topGenres = summary.top_genres || [];
  topGenres.slice(0, 6).forEach((genre, index) => {
    cards.push({
      title: `Hot genre #${index + 1}`,
      text: `${genre.name} • ${genre.count.toLocaleString()} tracks`,
    });
  });

  const topTracks = summary.top_tracks || [];
  topTracks.slice(0, 4).forEach((track, index) => {
    cards.push({
      title: `Popular track #${index + 1}`,
      text: `${track["Track Name"]} — ${track["Artist Name(s)"]} (${track.Popularity})`,
    });
  });

  const yearly = summary.yearly_release_counts || [];
  if (yearly.length) {
    const first = yearly[0];
    const last = yearly[yearly.length - 1];
    cards.push({
      title: "Earliest year",
      text: `${first.year} • ${first.count.toLocaleString()} songs`,
    });
    cards.push({
      title: "Latest year",
      text: `${last.year} • ${last.count.toLocaleString()} songs`,
    });
  }

  if (!cards.length) {
    return;
  }

  const loopItems = cards.length === 1 ? [...cards, ...cards, ...cards] : [...cards, ...cards];
  const duration = Math.max(20, loopItems.length * 5);
  analysisMarquee.style.setProperty("--marquee-duration", `${duration}s`);

  loopItems.forEach((card, index) => {
    const li = document.createElement("li");
    li.className = "marquee-item";
    li.setAttribute("aria-hidden", index >= cards.length ? "true" : "false");

    const title = document.createElement("strong");
    title.textContent = card.title;
    const text = document.createElement("span");
    text.textContent = card.text;

    li.append(title, text);
    analysisMarquee.appendChild(li);
  });
}

function renderDetailAttributes(track) {
  const attributes = [];

  attributes.push({ label: "Release Date", value: track["Release Date"] || "—" });
  attributes.push({ label: "Popularity", value: track["Popularity"] ?? "—" });
  attributes.push({ label: "Duration", value: formatDuration(track["Duration (ms)"]) });
  attributes.push({ label: "Explicit", value: track.Explicit ? "Yes" : "No" });

  attributes.push({ label: "Danceability", value: toPercent(track.Danceability) });
  attributes.push({ label: "Energy", value: toPercent(track.Energy) });
  attributes.push({ label: "Valence", value: toPercent(track.Valence) });
  attributes.push({
    label: "Tempo (BPM)",
    value: track.Tempo ? `${toFixed(track.Tempo)} BPM` : "—",
  });
  attributes.push({
    label: "Loudness (dB)",
    value: track.Loudness ? `${toFixed(track.Loudness)} dB` : "—",
  });
  attributes.push({ label: "Speechiness", value: toPercent(track.Speechiness) });
  attributes.push({ label: "Acousticness", value: toPercent(track.Acousticness) });
  attributes.push({ label: "Instrumentalness", value: toPercent(track.Instrumentalness) });
  attributes.push({ label: "Liveness", value: toPercent(track.Liveness) });
  attributes.push({
    label: "Time Signature",
    value: track["Time Signature"] ?? "—",
  });

  const keyIndex = Number(track.Key);
  const modeIndex = Number(track.Mode);
  const keyName = Number.isInteger(keyIndex) && keyIndex >= 0 && keyIndex < KEY_NAMES.length
    ? KEY_NAMES[keyIndex]
    : "—";
  const modeName = modeIndex in MODE_NAMES ? MODE_NAMES[modeIndex] : "—";

  attributes.push({ label: "Key", value: keyName });
  attributes.push({ label: "Mode", value: modeName });

  detailAttributes.innerHTML = "";
  attributes.forEach(({ label, value }) => {
    const wrapper = document.createElement("div");
    wrapper.className = "detail-attribute";
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    wrapper.append(dt, dd);
    detailAttributes.appendChild(wrapper);
  });
}

function renderDetail(track) {
  detailTitle.textContent = track["Track Name"];
  detailSubtitle.textContent = `${track["Artist Name(s)"]} • ${track["Album Name"]}`;
  setAvatar(detailAvatar, track["Artist Name(s)"]);
  renderGenres(detailGenres, track.Genres, 12);
  renderDetailAttributes(track);
  detailOverlay.classList.remove("hidden");
}

async function openDetail(uri) {
  if (!uri) {
    return;
  }

  if (detailCache.has(uri)) {
    renderDetail(detailCache.get(uri));
    return;
  }

  try {
    const response = await fetch(`/song?uri=${encodeURIComponent(uri)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch track detail (status ${response.status})`);
    }
    const data = await response.json();
    detailCache.set(uri, data);
    renderDetail(data);
  } catch (error) {
    console.error(error);
  }
}

async function fetchStats() {
  try {
    const response = await fetch("/stats");
    if (!response.ok) {
      throw new Error(`Stats request failed with status ${response.status}`);
    }
    const data = await response.json();
    renderStats(data);
  } catch (error) {
    console.error("Failed to load dataset insights.", error);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (searchDebounce) {
    clearTimeout(searchDebounce);
    searchDebounce = null;
  }
  if (suggestionDebounce) {
    clearTimeout(suggestionDebounce);
    suggestionDebounce = null;
  }
  if (!query || query.length < MIN_QUERY_LENGTH) {
    clearResults("Type at least two characters to start searching.", resultsContainer, { resetState: true });
    hideSuggestions();
    return;
  }
  performSearch(query);
  fetchSuggestions(query);
});

searchInput.addEventListener("input", handleInput);
searchInput.addEventListener("focus", () => {
  if (suggestionsList.childElementCount) {
    suggestionsList.classList.add("visible");
  }
});

seedForm.addEventListener("submit", (event) => {
  event.preventDefault();
});

seedInput.addEventListener("input", () => {
  const query = seedInput.value.trim();
  if (seedSuggestionDebounce) {
    clearTimeout(seedSuggestionDebounce);
  }
  if (!query || query.length < MIN_QUERY_LENGTH) {
    seedSuggestionDebounce = null;
    hideSeedSuggestions();
    return;
  }
  seedSuggestionDebounce = setTimeout(() => {
    fetchSeedSuggestions(seedInput.value.trim());
  }, 180);
});

seedInput.addEventListener("focus", () => {
  if (seedSuggestionsList.childElementCount) {
    seedSuggestionsList.classList.add("visible");
  }
});

if (recommendBtn) {
  recommendBtn.addEventListener("click", () => {
    if (!recommendBtn.disabled) {
      requestRecommendations();
    }
  });
}

detailCloseButton.addEventListener("click", () => {
  detailOverlay.classList.add("hidden");
  detailAttributes.innerHTML = "";
  detailGenres.innerHTML = "";
});

detailOverlay.addEventListener("click", (event) => {
  if (event.target === detailOverlay) {
    detailOverlay.classList.add("hidden");
    detailAttributes.innerHTML = "";
    detailGenres.innerHTML = "";
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    detailOverlay.classList.add("hidden");
    detailAttributes.innerHTML = "";
    detailGenres.innerHTML = "";
    hideSuggestions();
    hideSeedSuggestions();
  }
});

document.addEventListener("click", (event) => {
  if (!primarySearchWrapper.contains(event.target)) {
    hideSuggestions();
  }
  if (!seedSearchWrapper.contains(event.target)) {
    hideSeedSuggestions();
  }
});

fetchStats();
updateRecommendButton();
clearResults("Type at least two characters to start searching.", resultsContainer, { resetState: true });
