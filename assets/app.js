/* Alpine Ascents — interactive SPA behaviour.
   Content is read from data/content.json when served over HTTP, with a
   generated browser-safe fallback for direct file previews. */
(function () {
  'use strict';

  const fallbackData = window.ALPINE_ASCENTS_DATA || null;
  const dataPromise = (window.location.protocol === 'file:' || !window.fetch)
    ? Promise.resolve(fallbackData)
    : fetch('data/content.json', { cache: 'no-store' })
        .then((response) => { if (!response.ok) throw new Error('Could not load JSON'); return response.json(); })
        .catch(() => fallbackData);

  let siteData = null;
  let map = null;
  let clubMarkers = {};
  let userMarker = null;
  let selectedClubId = null;
  let lastPosition = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  function initVisitorCount() {
    const key = 'alpineAscentsVisitCount';
    let count = 1;
    try {
      count = Number.parseInt(localStorage.getItem(key) || '0', 10) + 1;
      if (!Number.isFinite(count) || count < 1) count = 1;
      localStorage.setItem(key, String(count));
    } catch (error) {
      count = 1;
    }
    const element = $('#visitor-count');
    if (element) element.textContent = count.toLocaleString();
    const year = $('#footer-year');
    if (year) year.textContent = new Date().getFullYear();
  }

  function initLiveTicker() {
    const dateOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    function updateTime() {
      const now = new Date();
      const dateText = new Intl.DateTimeFormat(undefined, dateOptions).format(now);
      const timeText = new Intl.DateTimeFormat(undefined, timeOptions).format(now);
      ['#ticker-date', '#ticker-date-copy'].forEach((selector) => { const item = $(selector); if (item) item.textContent = dateText; });
      ['#ticker-time', '#ticker-time-copy'].forEach((selector) => { const item = $(selector); if (item) item.textContent = timeText; });
    }
    updateTime();
    window.setInterval(updateTime, 1000);
  }

  function setTickerLocation(text) {
    ['#ticker-location', '#ticker-location-copy'].forEach((selector) => {
      const item = $(selector);
      if (item) item.textContent = text;
    });
  }

  function coordinateText(latitude, longitude) {
    return `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
  }

  function requestLocation() {
    if (!('geolocation' in navigator)) {
      setTickerLocation('Geolocation is not supported by this browser');
      showToast('Your browser does not support geolocation. The site still works without it.');
      return;
    }
    setTickerLocation('Requesting browser location…');
    navigator.geolocation.getCurrentPosition((position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      lastPosition = [latitude, longitude];
      setTickerLocation(`Your location: ${coordinateText(latitude, longitude)}`);
      if (map && window.L) {
        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.circleMarker(lastPosition, { radius: 8, color: '#142e2d', weight: 2, fillColor: '#c8da91', fillOpacity: 1 })
          .addTo(map)
          .bindPopup('<strong>Your current browser location</strong><br><span style="font-size:10px">Coordinates are used for this page session only.</span>');
        map.setView(lastPosition, Math.max(map.getZoom(), 5), { animate: true });
      }
      const btn = $('#enable-location');
      if (btn) btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Location enabled';
      showToast('Location enabled for this page session.');
    }, (error) => {
      const message = error.code === 1 ? 'Location permission is off' : error.code === 2 ? 'Location is unavailable' : 'Location request timed out';
      setTickerLocation(`${message} · use the location button to retry`);
      showToast(`${message}. You can continue exploring without sharing your location.`);
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 });
  }

  function showToast(message) {
    let toast = $('#aa-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'aa-toast';
      toast.className = 'aa-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 3800);
  }

  function initNavInteractions() {
    const navLinks = $$('.navbar-nav .nav-link[href^="#"]');
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.forEach((candidate) => candidate.classList.remove('active'));
        link.classList.add('active');
        const collapse = $('#mainNav');
        if (collapse && collapse.classList.contains('show') && window.bootstrap) bootstrap.Collapse.getOrCreateInstance(collapse).hide();
        const target = $(link.getAttribute('href'));
        if (target) {
          if (window.jQuery) $(target).stop(true, true).addClass('fade-section').delay(460).queue(function (next) { $(this).removeClass('fade-section'); next(); });
        }
      });
    });
    const observedSections = navLinks.map((link) => $(link.getAttribute('href'))).filter(Boolean);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
          }
        });
      }, { rootMargin: '-24% 0px -63% 0px', threshold: 0 });
      observedSections.forEach((section) => observer.observe(section));
    }
  }

  function renderStylesReact() {
    const mount = $('#styles-explorer');
    if (!mount || !siteData) return;
    const styles = siteData.styles;
    if (!window.React || !window.ReactDOM) {
      mount.innerHTML = `<div class="row g-3">${styles.map((style) => styleCardHTML(style)).join('')}</div>`;
      return;
    }
    const h = React.createElement;
    function Explorer() {
      const [filter, setFilter] = React.useState('all');
      const [search, setSearch] = React.useState('');
      const categories = [
        { id: 'all', label: 'All approaches' },
        { id: 'foundations', label: 'Foundations' },
        { id: 'technical', label: 'Technical climbing' },
        { id: 'remote', label: 'Remote & snow' }
      ];
      const filtered = styles.filter((style) => {
        const term = `${style.name} ${style.description} ${style.region} ${style.level}`.toLowerCase();
        const matchesSearch = term.includes(search.trim().toLowerCase());
        const matchesFilter = filter === 'all' ||
          (filter === 'foundations' && ['trek', 'rock'].includes(style.id)) ||
          (filter === 'technical' && ['alpine', 'rock', 'ice'].includes(style.id)) ||
          (filter === 'remote' && ['expedition', 'ski'].includes(style.id));
        return matchesSearch && matchesFilter;
      });
      return h('div', { className: 'styles-explorer-inner' },
        h('div', { className: 'styles-toolbar' },
          h('div', { className: 'style-filter-tabs', role: 'group', 'aria-label': 'Filter climbing styles' },
            categories.map((category) => h('button', { key: category.id, type: 'button', className: `style-filter ${filter === category.id ? 'active' : ''}`, onClick: () => setFilter(category.id), 'aria-pressed': filter === category.id }, category.label))
          ),
          h('label', { className: 'style-search' },
            h('i', { className: 'bi bi-search', 'aria-hidden': true }),
            h('input', { type: 'search', value: search, onChange: (event) => setSearch(event.target.value), placeholder: 'Search a style…', 'aria-label': 'Search mountaineering styles' })
          )
        ),
        h('div', { className: 'row g-3 styles-grid' }, filtered.map((style, index) =>
          h('div', { className: 'col-md-6 col-xl-4', key: style.id },
            h('article', { className: 'style-card' },
              h('div', { className: 'style-card-top' },
                h('span', { className: 'style-icon', 'aria-hidden': true }, style.icon),
                h('span', { className: 'style-no' }, `STYLE 0${index + 1}`)
              ),
              h('h3', null, style.name),
              h('p', null, style.description),
              h('div', { className: 'style-meta' },
                h('span', null, style.level),
                h('span', null, style.region)
              )
            )
          )
        )),
        filtered.length === 0 ? h('div', { className: 'style-empty' }, 'No styles match that search. Try a broader term.') : null,
        h('p', { className: 'explorer-count' }, `${filtered.length} ${filtered.length === 1 ? 'approach' : 'approaches'} shown · Filters are interactive, with data supplied by the site JSON.`)
      );
    }
    ReactDOM.createRoot(mount).render(h(Explorer));
  }

  function styleCardHTML(style) {
    return `<div class="col-md-6 col-xl-4"><article class="style-card"><div class="style-card-top"><span class="style-icon">${escapeHTML(style.icon)}</span></div><h3>${escapeHTML(style.name)}</h3><p>${escapeHTML(style.description)}</p><div class="style-meta"><span>${escapeHTML(style.level)}</span><span>${escapeHTML(style.region)}</span></div></article></div>`;
  }

  function renderRecords() {
    const mount = $('#records-grid');
    if (!mount) return;
    mount.innerHTML = siteData.records.map((record) => `
      <article class="record-card"><div class="record-value">${escapeHTML(record.value)}</div><div class="record-label">${escapeHTML(record.label)}</div><p class="record-detail">${escapeHTML(record.detail)}</p></article>`).join('');
  }

  function renderClubs(clubs = siteData.clubs) {
    const mount = $('#club-list');
    if (!mount) return;
    $('#club-total').textContent = clubs.length;
    if (!clubs.length) {
      mount.innerHTML = '<div class="club-empty"><i class="bi bi-search me-2"></i>No clubs match that search. Try another name or region.</div>';
      return;
    }
    mount.innerHTML = clubs.map((club) => `
      <article class="club-row ${selectedClubId === club.id ? 'selected' : ''}" data-club-id="${escapeHTML(club.id)}" tabindex="0" role="button" aria-label="Focus map on ${escapeHTML(club.name)}">
        <span class="club-pin"><i class="bi bi-geo-alt-fill"></i></span>
        <div><h4>${escapeHTML(club.name)}</h4><div class="club-location">${escapeHTML(club.city)} · ${escapeHTML(club.country)}</div><p>${escapeHTML(club.description)}</p></div>
        <div class="club-actions"><a href="${escapeHTML(club.url)}" target="_blank" rel="noopener">Website <i class="bi bi-arrow-up-right"></i></a><a href="${escapeHTML(club.map)}" target="_blank" rel="noopener">Map <i class="bi bi-map"></i></a></div>
      </article>`).join('');
    $$('.club-row', mount).forEach((row) => {
      const activate = () => focusClub(row.dataset.clubId);
      row.addEventListener('click', (event) => { if (event.target.closest('a')) return; activate(); });
      row.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); } });
    });
  }

  function focusClub(id) {
    const club = siteData.clubs.find((item) => item.id === id);
    if (!club) return;
    selectedClubId = id;
    $$('.club-row').forEach((row) => row.classList.toggle('selected', row.dataset.clubId === id));
    if (map && clubMarkers[id]) {
      map.setView(club.coordinates, Math.max(map.getZoom(), 5), { animate: true });
      clubMarkers[id].openPopup();
      if (window.innerWidth < 992) $('#club-map').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function initMap() {
    const element = $('#club-map');
    if (!element) return;
    if (!window.L) {
      element.innerHTML = '<div class="map-fallback"><i class="bi bi-map"></i><strong>Interactive map unavailable</strong><span>Open a club’s individual map link from the directory.</span></div>';
      return;
    }
    map = L.map(element, { scrollWheelZoom: false, zoomControl: true }).setView([22, 20], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
    }).addTo(map);
    const mountainIcon = L.divIcon({ className: 'club-map-marker', html: '<span><i class="bi bi-mountain-fill"></i></span>', iconSize: [30, 34], iconAnchor: [15, 28], popupAnchor: [0, -27] });
    siteData.clubs.forEach((club) => {
      const marker = L.marker(club.coordinates, { icon: mountainIcon }).addTo(map);
      marker.bindPopup(`<strong>${escapeHTML(club.name)}</strong><br>${escapeHTML(club.city)}, ${escapeHTML(club.country)}<br><a href="${escapeHTML(club.url)}" target="_blank" rel="noopener">Official website ↗</a> &nbsp; <a href="${escapeHTML(club.map)}" target="_blank" rel="noopener">Open map ↗</a>`);
      marker.on('click', () => {
        selectedClubId = club.id;
        $$('.club-row').forEach((row) => row.classList.toggle('selected', row.dataset.clubId === club.id));
      });
      clubMarkers[club.id] = marker;
    });
    window.setTimeout(() => map && map.invalidateSize(), 120);
  }

  function initClubFilters() {
    const search = $('#club-search');
    const region = $('#region-filter');
    const applyFilters = () => {
      const term = (search ? search.value : '').trim().toLowerCase();
      const regionValue = region ? region.value : 'all';
      const visible = siteData.clubs.filter((club) => {
        const searchable = `${club.name} ${club.city} ${club.country} ${club.description} ${club.region}`.toLowerCase();
        return searchable.includes(term) && (regionValue === 'all' || club.region === regionValue);
      });
      renderClubs(visible);
    };
    if (search) search.addEventListener('input', applyFilters);
    if (region) region.addEventListener('change', applyFilters);
    renderClubs();
  }

  function renderStories() {
    const mount = $('#story-grid');
    if (!mount) return;
    const storyImages = ['assets/alpine-hero.png', 'assets/climbers-ice.png', 'assets/alpine-camp.png'];
    mount.innerHTML = siteData.stories.map((story, index) => `
      <article class="story-card"><div class="story-image" style="background-image:url('${storyImages[index % storyImages.length]}');background-position:${['center 52%', 'right 60%', 'center 42%'][index % 3]}"><span class="story-year">${escapeHTML(story.year)}</span></div><div class="story-body"><div class="story-place">${escapeHTML(story.place)}</div><h3>${escapeHTML(story.title)}</h3><p>${escapeHTML(story.description)}</p><div class="story-result"><i class="bi bi-check2-circle"></i>${escapeHTML(story.result)}</div></div></article>`).join('');
  }

  function renderGallery() {
    const mount = $('#gallery-grid');
    if (!mount) return;
    mount.innerHTML = siteData.gallery.map((item, index) => {
      const backgroundPosition = item.position || 'center';
      const isVideo = item.type === 'video';
      const action = isVideo
        ? `<a class="gallery-action" href="${escapeHTML(item.url)}" target="_blank" rel="noopener">Explore video resources <i class="bi bi-arrow-up-right"></i></a>`
        : `<button class="gallery-action" type="button" data-photo-index="${index}">View photograph <i class="bi bi-arrows-angle-expand"></i></button>`;
      return `<article class="gallery-card"><div class="gallery-image" style="background-image:url('${escapeHTML(item.image)}');background-position:${escapeHTML(backgroundPosition)}"></div>${isVideo ? '<span class="gallery-play"><i class="bi bi-play-fill"></i></span>' : ''}<div class="gallery-card-content"><span class="gallery-category">${escapeHTML(item.category)}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description)}</p>${action}</div></article>`;
    }).join('');
    $$('.gallery-card [data-photo-index]', mount).forEach((button) => {
      button.addEventListener('click', () => {
        const item = siteData.gallery[Number(button.dataset.photoIndex)];
        $('#modal-photo').src = item.image;
        $('#modal-photo').alt = item.title;
        $('#photo-modal-title').textContent = item.title;
        $('#modal-photo-caption').textContent = item.description;
        if (window.bootstrap) bootstrap.Modal.getOrCreateInstance($('#photo-modal')).show();
      });
    });
  }

  function renderFieldNotes() {
    const mount = $('#field-notes-grid');
    if (!mount) return;
    mount.innerHTML = siteData.fieldNotes.map((note) => `
      <article class="field-note-card"><div class="field-note-top"><span class="field-note-category">${escapeHTML(note.category)}</span><span class="field-note-date">${escapeHTML(note.date)}</span></div><h3>${escapeHTML(note.title)}</h3><p>${escapeHTML(note.summary)}</p><div class="field-note-source"><span>${escapeHTML(note.source)}</span><a href="${escapeHTML(note.url)}" target="_blank" rel="noopener">Read source <i class="bi bi-arrow-up-right"></i></a></div></article>`).join('');
  }

  function renderGuidelines() {
    const mount = $('#guidelines-list');
    if (!mount) return;
    mount.innerHTML = siteData.guidelines.map((item, index) => `
      <label class="guideline-item" for="guideline-${index}"><input class="guideline-check" type="checkbox" id="guideline-${index}" value="${index}"><span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.text)}</p></span></label>`).join('');
    $$('.guideline-check', mount).forEach((input) => input.addEventListener('change', () => {
      input.closest('.guideline-item').classList.toggle('completed', input.checked);
      updateChecklistProgress();
    }));
    const reset = $('#reset-checklist');
    if (reset) reset.addEventListener('click', () => {
      $$('.guideline-check', mount).forEach((input) => { input.checked = false; input.closest('.guideline-item').classList.remove('completed'); });
      updateChecklistProgress();
    });
    updateChecklistProgress();
  }

  function updateChecklistProgress() {
    const all = $$('.guideline-check');
    const completed = all.filter((input) => input.checked).length;
    const label = $('#check-progress-label');
    const bar = $('#check-progress-bar');
    if (label) label.textContent = `${completed} of ${all.length}`;
    if (bar) {
      const percentage = all.length ? completed / all.length * 100 : 0;
      bar.style.width = `${percentage}%`;
      bar.setAttribute('aria-valuemax', String(all.length));
      bar.setAttribute('aria-valuenow', String(completed));
    }
  }

  function attachLocationControls() {
    ['#enable-location', '#ticker-location-button'].forEach((selector) => {
      const button = $(selector);
      if (button) button.addEventListener('click', requestLocation);
    });
  }

  function boot(data) {
    if (!data) {
      showToast('Site data could not be loaded. Run this site using the included local server instructions.');
      return;
    }
    siteData = data;
    initNavInteractions();
    renderStylesReact();
    renderRecords();
    initClubFilters();
    initMap();
    renderStories();
    renderGallery();
    renderFieldNotes();
    renderGuidelines();
    setTickerLocation('Location not enabled · tap the crosshair to share');
  }

  document.addEventListener('DOMContentLoaded', () => {
    initVisitorCount();
    initLiveTicker();
    attachLocationControls();
    dataPromise.then(boot).catch(() => boot(fallbackData));
  });
})();
