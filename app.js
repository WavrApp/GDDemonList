(() => {
  const listEl = document.getElementById('demon-list');
  const searchEl = document.getElementById('search');
  const filterBtns = document.querySelectorAll('.filter-btn');

  let activeFilter = 'all';
  let searchQuery = '';

  // Cache: rank -> { id, videoID }
  const thumbCache = {};

  function getTierClass(rank) {
    if (rank === 1)    return 'top1';
    if (rank <= 3)     return 'top3';
    if (rank <= 10)    return 'top10';
    if (rank <= 25)    return 'top25';
    if (rank <= 50)    return 'top50';
    if (rank <= 75)    return 'top75';
    return 'extended';
  }

  function getTierLabel(rank) {
    if (rank === 1)    return 'TOP 1';
    if (rank <= 3)     return 'TOP 3';
    if (rank <= 10)    return 'TOP 10';
    if (rank <= 25)    return 'TOP 25';
    if (rank <= 50)    return 'TOP 50';
    if (rank <= 75)    return 'TOP 75';
    return 'EXTENDED';
  }

  function getDifficultyInfo(difficulty) {
    const map = {
      'Easy Demon':    { color: '#44cc88', glow: 'rgba(68,204,136,0.5)',  label: 'EASY DEMON',    face: 'https://gdbrowser.com/assets/difficulties/demon-easy.png'    },
      'Medium Demon':  { color: '#ffaa00', glow: 'rgba(255,170,0,0.5)',   label: 'MEDIUM DEMON',  face: 'https://gdbrowser.com/assets/difficulties/demon-medium.png'  },
      'Hard Demon':    { color: '#ff6020', glow: 'rgba(255,96,32,0.5)',   label: 'HARD DEMON',    face: 'https://gdbrowser.com/assets/difficulties/demon-hard.png'    },
      'Insane Demon':  { color: '#cc44ff', glow: 'rgba(204,68,255,0.5)',  label: 'INSANE DEMON',  face: 'https://gdbrowser.com/assets/difficulties/demon-insane.png'  },
      'Extreme Demon': { color: '#ff2040', glow: 'rgba(255,32,64,0.5)',   label: 'EXTREME DEMON', face: 'https://gdbrowser.com/assets/difficulties/demon-extreme.png' },
    };
    return map[difficulty] || map['Extreme Demon'];
  }

  function getTierGradient(tier) {
    const gradients = {
      top1:     'linear-gradient(135deg, #3a0010 0%, #1a0008 50%, #0a0008 100%)',
      top3:     'linear-gradient(135deg, #2a1200 0%, #1a0a00 50%, #0a0600 100%)',
      top10:    'linear-gradient(135deg, #2a1e00 0%, #1a1200 50%, #0a0800 100%)',
      top25:    'linear-gradient(135deg, #1a0a2a 0%, #100618 50%, #080410 100%)',
      top50:    'linear-gradient(135deg, #001030 0%, #00091c 50%, #00060f 100%)',
      top75:    'linear-gradient(135deg, #001828 0%, #000f18 50%, #00080f 100%)',
      extended: 'linear-gradient(135deg, #001818 0%, #000f0f 50%, #000808 100%)',
    };
    return gradients[tier] || gradients.extended;
  }

  function renderList() {
    const q = searchQuery.toLowerCase();
    const filtered = DEMONS.filter(d => {
      const matchesFilter = activeFilter === 'all' || d.list === activeFilter;
      const matchesSearch = !q ||
        d.name.toLowerCase().includes(q) ||
        d.creator.toLowerCase().includes(q) ||
        String(d.rank).includes(q);
      return matchesFilter && matchesSearch;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="no-results">NO DEMONS FOUND</div>';
      return;
    }

    let html = '';
    let shownExtendedDivider = false;

    filtered.forEach(d => {
      if (d.list === 'extended' && !shownExtendedDivider) {
        shownExtendedDivider = true;
        html += `<div class="section-divider">EXTENDED LIST</div>`;
      }

      const tier      = getTierClass(d.rank);
      const tierLabel = getTierLabel(d.rank);
      const diff      = getDifficultyInfo(d.difficulty);
      const grad      = getTierGradient(tier);

      const featuredHtml = d.featured
        ? `<span class="featured-badge">⭐ YES</span>`
        : `<span class="not-featured">—</span>`;

      // Thumbnail: starts as a styled placeholder; JS will inject real YouTube thumb
      html += `
        <div class="demon-entry ${tier}" data-rank="${d.rank}">
          <span class="col-rank"><span class="rank-hash">#</span>${d.rank}</span>

          <span class="col-thumb">
            <div class="level-thumb-wrap" data-rank="${d.rank}">
              <!-- real YouTube thumb injected by JS; fallback is the styled card -->
              <img class="level-thumb" alt="${d.name}" style="display:none;" loading="lazy"/>
              <div class="level-thumb-card" style="background:${grad}; --tier-color:${diff.color}; --tier-glow:${diff.glow};">
                <img class="diff-face" src="${diff.face}" alt="${d.difficulty}"
                     onerror="this.style.display='none'"/>
                <span class="thumb-rank">#${d.rank}</span>
              </div>
            </div>
          </span>

          <span class="col-name">${d.name}</span>
          <span class="col-creator">${d.creator}</span>

          <span class="col-difficulty">
            <span class="diff-badge" style="--diff-color:${diff.color}; --diff-glow:${diff.glow};">
              <img class="diff-badge-face" src="${diff.face}" alt="" onerror="this.style.display='none'"/>
              ${diff.label}
            </span>
          </span>

          <span class="col-featured">${featuredHtml}</span>

          <span class="col-tier">
            <span class="tier-badge tier-${tier}">${tierLabel}</span>
          </span>
        </div>`;
    });

    listEl.innerHTML = html;
    loadYoutubeThumbs(filtered);
  }

  // ── Fetch real level video IDs from GDBrowser and swap in YouTube thumbs ──
  async function loadYoutubeThumbs(demons) {
    // Process in batches of 5 to avoid hammering the API
    const BATCH = 5;
    for (let i = 0; i < demons.length; i += BATCH) {
      const batch = demons.slice(i, i + BATCH);
      await Promise.all(batch.map(d => loadThumbForDemon(d)));
    }
  }

  async function loadThumbForDemon(demon) {
    const wrap = listEl.querySelector(`.level-thumb-wrap[data-rank="${demon.rank}"]`);
    if (!wrap) return;

    // Already cached?
    if (thumbCache[demon.rank]) {
      applyYoutubeThumb(wrap, thumbCache[demon.rank]);
      return;
    }

    try {
      const res = await fetch(
        `https://gdbrowser.com/api/search/${encodeURIComponent(demon.name)}?count=1`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) throw new Error('api fail');
      const results = await res.json();
      if (!results || !results[0]) throw new Error('no match');

      const level = results[0];
      const videoID = level.videoID || null;
      thumbCache[demon.rank] = { levelId: level.id, videoID };

      if (videoID) {
        applyYoutubeThumb(wrap, { videoID });
      }
    } catch {
      // fallback card stays visible — nothing to do
    }
  }

  function applyYoutubeThumb(wrap, { videoID }) {
    if (!videoID) return;
    const img = wrap.querySelector('.level-thumb');
    const card = wrap.querySelector('.level-thumb-card');
    if (!img || !card) return;

    const src = `https://img.youtube.com/vi/${videoID}/mqdefault.jpg`;
    img.onload = () => {
      // YouTube returns a grey 120x90 placeholder for missing videos — skip it
      const c = document.createElement('canvas');
      c.width = 1; c.height = 1;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      const isGrey = Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && r > 100 && r < 160;
      if (!isGrey) {
        img.style.display = 'block';
        card.style.display = 'none';
      }
    };
    img.onerror = () => { /* keep card */ };
    img.src = src;
  }

  // Search
  searchEl.addEventListener('input', e => {
    searchQuery = e.target.value;
    renderList();
  });

  // Filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderList();
    });
  });

  renderList();
})();
