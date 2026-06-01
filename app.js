(() => {
  const listEl = document.getElementById('demon-list');
  const searchEl = document.getElementById('search');
  const filterBtns = document.querySelectorAll('.filter-btn');

  let activeFilter = 'all';
  let searchQuery = '';

  function getTierClass(rank) {
    if (rank === 1)        return 'top1';
    if (rank <= 3)         return 'top3';
    if (rank <= 10)        return 'top10';
    if (rank <= 25)        return 'top25';
    if (rank <= 50)        return 'top50';
    if (rank <= 75)        return 'top75';
    return 'extended';
  }

  function getTierLabel(rank) {
    if (rank === 1)        return 'TOP 1';
    if (rank <= 3)         return 'TOP 3';
    if (rank <= 10)        return 'TOP 10';
    if (rank <= 25)        return 'TOP 25';
    if (rank <= 50)        return 'TOP 50';
    if (rank <= 75)        return 'TOP 75';
    return 'EXTENDED';
  }

  function renderList() {
    const q = searchQuery.toLowerCase();

    const filtered = DEMONS.filter(d => {
      const matchesFilter =
        activeFilter === 'all' ||
        d.list === activeFilter;
      const matchesSearch =
        !q ||
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

      const tier = getTierClass(d.rank);
      const tierLabel = getTierLabel(d.rank);

      html += `
        <div class="demon-entry ${tier}" data-rank="${d.rank}">
          <span class="col-rank"><span class="rank-hash">#</span>${d.rank}</span>
          <span class="col-name">${d.name}</span>
          <span class="col-creator">${d.creator}</span>
          <span class="col-tier">
            <span class="tier-badge tier-${tier}">${tierLabel}</span>
          </span>
        </div>`;
    });

    listEl.innerHTML = html;
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

  // Initial render
  renderList();
})();
