/* Reference retrieval is separate from board content and never overwrites it. */
(() => {
  const byId = id => document.getElementById(id);
  const selected = new Map();
  let results = [];
  let aiAvailable = false;
  let generating = false;
  let searchNumber = 0;

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function sourceLink(label, url) {
    const node = element('a', label);
    node.href = url;
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
    return node;
  }

  async function api(path, data) {
    const response = await fetch(path, data ? {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    } : {});
    let result;
    try { result = await response.json(); }
    catch { throw new Error('The reference service is unavailable. Start the local reference server and open its preview.'); }
    if (!response.ok) throw new Error(result.error || 'The reference request failed.');
    return result;
  }

  function renderSelection() {
    const list = byId('reference-selection');
    list.replaceChildren();
    if (!selected.size) list.append(element('li', 'No references selected yet.'));
    selected.forEach(row => {
      const item = element('li');
      item.append(element('span', `${row.title} (${row.year}) `));
      const remove = element('button', 'Remove');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${row.title}`);
      remove.addEventListener('click', () => { selected.delete(row.id); renderSelection(); renderResults(); });
      item.append(remove);
      list.append(item);
    });
    byId('reference-count').textContent = `${selected.size} / 3`;
    byId('reference-generate').disabled = !aiAvailable || !selected.size || generating;
  }

  function renderResults() {
    const grid = byId('reference-results');
    grid.replaceChildren();
    results.forEach(row => {
      const card = element('article', '', 'reference-card');
      const imageLink = sourceLink('', row.image);
      imageLink.setAttribute('aria-label', `View ${row.title} reference board`);
      const image = element('img');
      image.src = row.thumbnail;
      image.alt = `${row.title} reference board`;
      image.loading = 'lazy';
      imageLink.append(image);
      card.append(imageLink, element('h3', row.title),
        element('p', [row.brand, row.year, row.award].filter(Boolean).join(' · ')),
        element('p', `${row.evidence}. Matched: ${row.matched.join(', ')}.`, 'reference-note'));
      if (row.description) {
        const details = element('details');
        details.append(element('summary', 'Read source excerpt'), element('p', row.description));
        if (row.text_source) details.append(sourceLink('Description source', row.text_source));
        card.append(details);
      }
      const links = element('div', '', 'reference-card-actions');
      if (row.source) links.append(sourceLink('Campaign source', row.source));
      else links.append(element('span', 'Source: local collection'));
      const toggle = element('button', selected.has(row.id) ? 'Selected ✓' : 'Select reference');
      toggle.type = 'button';
      toggle.setAttribute('aria-label', `${selected.has(row.id) ? 'Deselect' : 'Select'} ${row.title}`);
      toggle.setAttribute('aria-pressed', String(selected.has(row.id)));
      toggle.disabled = !selected.has(row.id) && selected.size >= 3;
      toggle.addEventListener('click', () => {
        if (selected.has(row.id)) selected.delete(row.id);
        else if (selected.size < 3) selected.set(row.id, row);
        renderSelection(); renderResults();
      });
      links.append(toggle);
      card.append(links);
      grid.append(card);
    });
  }

  byId('reference-search').addEventListener('submit', async event => {
    event.preventDefault();
    const number = ++searchNumber;
    byId('reference-message').textContent = 'Searching references…';
    try {
      const response = await api('/api/search', { query: byId('reference-query').value.trim() });
      if (number !== searchNumber) return;
      results = response.results;
      renderResults();
      byId('reference-message').textContent = results.length
        ? `${results.length} matches. Select up to 3 examples for guidance.`
        : 'No matching references. Try a brand, campaign name or a simpler theme.';
    } catch (error) {
      if (number !== searchNumber) return;
      results = []; renderResults();
      byId('reference-message').textContent = error.message;
    }
  });

  byId('reference-generate').addEventListener('click', async () => {
    if (generating || !selected.size) return;
    const board = Object.fromEntries(['brief', 'insight', 'idea', 'execution', 'results'].map(field => [field, byId(field).value]));
    const request = byId('reference-request').value.trim();
    const boardName = byId('board-select').selectedOptions[0]?.textContent || 'Current board';
    generating = true; renderSelection();
    byId('guidance-message').textContent = 'Reading the selected reference images and preparing cited suggestions…';
    byId('reference-guidance-output').replaceChildren();
    try {
      const response = await api('/api/guidance', { ids: [...selected.keys()], board, request });
      const output = byId('reference-guidance-output');
      output.append(element('h2', `Design guidance for ${boardName}`),
        element('p', 'AI suggestions for review. Based on the board text when requested; no edits have been applied.', 'reference-note'),
        element('p', response.summary));
      const references = new Map(response.references.map(row => [row.id, row]));
      response.suggestions.forEach(suggestion => {
        const card = element('article', '', 'guidance-card');
        card.append(element('h3', suggestion.title), element('p', suggestion.guidance));
        suggestion.reference_ids.forEach(id => {
          const row = references.get(id);
          if (row) card.append(sourceLink(`Reference: ${row.title}`, row.source || row.image));
        });
        output.append(card);
      });
      if (response.missing_information.length) {
        output.append(element('h3', 'Still needed from your campaign'));
        const list = element('ul');
        response.missing_information.forEach(value => list.append(element('li', value)));
        output.append(list);
      }
      const download = element('button', 'Save guidance with sources');
      download.type = 'button';
      download.addEventListener('click', () => {
        const text = [`# ${boardName}: reference guidance`, response.summary,
          ...response.suggestions.map(s => `## ${s.title}\n${s.guidance}\n${s.reference_ids.map(id => {
            const row = references.get(id); return `Reference ${id}: ${row.title} ${row.source || '(local collection)'}`;
          }).join('\n')}`),
          '## Missing campaign information', ...response.missing_information.map(v => `- ${v}`),
          '## Input snapshot', ...Object.entries(response.campaign_inputs).map(([key, value]) => `${key}: ${value}`),
          `Request: ${response.design_request}`, `AI model: ${response.model}. Suggestions require review.`].join('\n\n');
        const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
        const link = element('a'); link.href = url; link.download = 'awards-board-reference-guidance.md';
        link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
      output.append(download);
      byId('guidance-message').textContent = 'Guidance ready. Review the references before using the suggestions.';
    } catch (error) { byId('guidance-message').textContent = error.message; }
    finally { generating = false; renderSelection(); }
  });

  api('/api/status').then(status => {
    byId('reference-status').textContent = status.campaigns
      ? `${status.label}: ${status.images.toLocaleString()} images · ${status.campaigns.toLocaleString()} campaigns · ${status.descriptions.toLocaleString()} with descriptions. ${status.retrieval}.`
      : 'No reference folder connected. Set board_dir in references.local.json and restart the reference server.';
    aiAvailable = status.ai_available;
    if (!aiAvailable) byId('guidance-message').textContent = 'AI guidance needs a server-side Gemini key. Reference search still works.';
    renderSelection();
  }).catch(() => {
    byId('reference-status').textContent = 'Reference search needs the local reference server. Run python3 reference_server.py, then open http://127.0.0.1:8766/. The board editor still works here.';
  });
})();
