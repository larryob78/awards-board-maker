/* Optical type systems for editable, fixed-size awards boards. No remote fonts.
 *
 * Awards-entry-board craft (layered with Impeccable typeset/layout):
 * - Two argument sizes + one credits size
 * - Max three weights across the board (we use Regular 400 + Bold 700)
 * - Left-align, ragged right; never justify
 * - Body floor stays readable; fit only shrinks the headline
 */
(function (root) {
  'use strict';

  const presets = Object.freeze([
    { id: 'editorial', name: 'Editorial', description: 'A characterful serif headline with clear, neutral body copy.', display: 'Georgia, "Times New Roman", serif', body: 'Arial, Helvetica, sans-serif', weight: 700, tracking: -0.038, leading: 1.04 },
    { id: 'modern', name: 'Modern', description: 'Confident sans serif with a clean, consistent hierarchy.', display: 'Arial, Helvetica, sans-serif', body: 'Arial, Helvetica, sans-serif', weight: 700, tracking: -0.045, leading: 1.01 },
    { id: 'condensed', name: 'Compact', description: 'A narrow display face for direct, energetic headlines.', display: '"Avenir Next Condensed", "Arial Narrow", "Helvetica Neue", Arial, sans-serif', body: 'Arial, Helvetica, sans-serif', weight: 700, tracking: -0.025, leading: 1.01 },
    { id: 'humanist', name: 'Humanist', description: 'Warm, open letterforms for approachable storytelling.', display: '"Avenir Next", "Trebuchet MS", Arial, sans-serif', body: '"Avenir Next", "Trebuchet MS", Arial, sans-serif', weight: 700, tracking: -0.037, leading: 1.04 }
  ].map(Object.freeze));
  // Spacing multiplier stays on a modest band so whitespace remains the jury reading room.
  const limits = Object.freeze({ scale: [0.9, 1.12], leading: [0.95, 1.12], tracking: [-0.015, 0.02], spacing: [0.9, 1.15] });
  const states = new WeakMap();
  const clamp = (value, lo, hi, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(lo, Math.min(hi, number)) : fallback;
  };
  const cleanOptions = options => ({
    preset: presets.some(item => item.id === options.preset) ? options.preset : 'editorial',
    scale: clamp(options.scale ?? 1, ...limits.scale, 1),
    leading: clamp(options.leading ?? 1, ...limits.leading, 1),
    tracking: clamp(options.tracking ?? 0, ...limits.tracking, 0),
    spacing: clamp(options.spacing ?? 1, ...limits.spacing, 1)
  });

  function apply(board, options = {}) {
    if (!board || !board.style || !board.querySelector) throw new TypeError('A board element is required.');
    const settings = cleanOptions(options);
    const preset = presets.find(item => item.id === settings.preset);
    const layout = board.classList.contains('layout-story') ? 'story' : board.classList.contains('layout-impact') ? 'impact' : 'editorial';
    const headlineLength = (board.querySelector('.art-headline')?.textContent || '').trim().length;
    // Coherent short, medium and long tiers. Text is never rewritten to fit.
    const headlineTier = headlineLength > 85 ? 0.78 : headlineLength > 55 ? 0.88 : 1;
    // Argument size 1: display headline. Floors keep hierarchy unmistakable.
    const headlineSize = Math.max(54, ({ editorial: 76, impact: 90, story: 66 }[layout]) * headlineTier * settings.scale);
    // Argument size 2: one shared body size for subhead, sections and proof.
    const bodySize = Math.max(20, (layout === 'impact' ? 20 : 21) * settings.scale);
    // Credits size: brand, campaign, section labels, footer.
    const creditSize = Math.max(10, 11 * Math.min(1, settings.scale));
    const variables = {
      '--type-display': preset.display,
      '--type-body': preset.body,
      '--type-weight': String(preset.weight),
      '--type-headline-size': `${headlineSize.toFixed(2)}px`,
      '--type-headline-leading': Math.max(0.98, preset.leading * settings.leading).toFixed(3),
      '--type-headline-tracking': `${(preset.tracking + settings.tracking).toFixed(4)}em`,
      '--type-body-size': `${bodySize.toFixed(2)}px`,
      '--type-body-leading': Math.max(1.32, 1.45 * settings.leading).toFixed(3),
      '--type-body-tracking': `${Math.max(-0.005, settings.tracking * 0.25).toFixed(4)}em`,
      // Subhead shares argument size 2 (body). Only leading differs slightly via CSS.
      '--type-subhead-size': `${bodySize.toFixed(2)}px`,
      '--type-credit-size': `${creditSize.toFixed(2)}px`,
      // Spacing scale (approx 4px base): generous section/column gaps, tighter heading gap.
      '--type-section-gap': `${(28 * settings.spacing).toFixed(2)}px`,
      '--type-heading-gap': `${(16 * settings.spacing).toFixed(2)}px`,
      '--type-column-gap': `${(52 * settings.spacing).toFixed(2)}px`,
      '--type-margin': `${(56 * settings.spacing).toFixed(2)}px`
    };
    Object.entries(variables).forEach(([key, value]) => board.style.setProperty(key, value));
    board.dataset.typography = settings.preset;
    board.dataset.typeCraft = 'argument-2-credit-1';
    states.set(board, { settings, headlineSize, bodySize, creditSize });
    return settings;
  }

  function inspect(board) {
    const issues = [];
    const add = (type, message, selector) => {
      if (!issues.some(issue => issue.type === type && issue.selector === selector)) issues.push({ type, message, selector });
    };
    const box = board.getBoundingClientRect();
    if (!box.width || !box.height) return { ok: false, measurable: false, issues: [{ type: 'not-visible', message: 'Show the board to check its text fit.', selector: '.board-art' }] };
    const scale = box.width / (board.offsetWidth || 1400);
    const footer = board.querySelector('.art-footer');
    const safeBottom = footer ? footer.getBoundingClientRect().top - 14 * scale : box.bottom - 45 * scale;
    const nodes = board.querySelectorAll('.art-headline,.art-subhead,.art-section,.art-proof,.art-brand,.art-campaign');
    nodes.forEach(node => {
      const rect = node.getBoundingClientRect();
      const selector = `.${Array.from(node.classList).find(name => name.startsWith('art-'))}`;
      if (node.scrollWidth > node.clientWidth + 2) add('overflow', 'Text is wider than its column. Shorten a long word or choose another preset.', selector);
      if (rect.bottom > safeBottom + 2 * scale) add('overflow', 'Copy runs into the footer. Shorten the copy or use another layout.', selector);
      if (rect.left < box.left - scale || rect.right > box.right + scale) add('overflow', 'Text extends outside the board.', selector);
    });
    const text = board.querySelector('.art-text');
    if (text && text.scrollHeight > text.clientHeight + 3) add('overflow', 'There is more copy than this layout can hold at a readable size. Trim the copy or change the layout.', '.art-text');
    const heading = board.querySelector('.art-heading');
    if (heading && heading.scrollHeight > heading.clientHeight + 3) add('overflow', 'The headline needs more room. Try a shorter headline or another layout.', '.art-heading');
    return { ok: issues.length === 0, measurable: true, issues, headlineSize: parseFloat(board.style.getPropertyValue('--type-headline-size')) || states.get(board)?.headlineSize, bodySize: states.get(board)?.bodySize, creditSize: states.get(board)?.creditSize };
  }

  function fit(board, options) {
    if (options || !states.has(board)) apply(board, options || {});
    else apply(board, states.get(board).settings);
    let result = inspect(board);
    const state = states.get(board);
    const adjustments = [];
    // Recover only display space. Body and credits keep their readable sizes.
    if (!result.ok && result.measurable) {
      for (const ratio of [0.94, 0.88, 0.82]) {
        const size = Math.max(54, state.headlineSize * ratio);
        board.style.setProperty('--type-headline-size', `${size.toFixed(2)}px`);
        result = inspect(board);
        if (result.ok || size === 54) {
          adjustments.push(`Headline fitted at ${Math.round(size)} px; body stays at ${Math.round(state.bodySize)} px; credits at ${Math.round(state.creditSize)} px.`);
          break;
        }
      }
      if (!adjustments.length) adjustments.push('Headline reduced within its safe range; copy still needs attention.');
    }
    return { ...result, adjustments };
  }

  root.BoardTypography = Object.freeze({ presets, limits, apply, fit, inspect });
})(typeof window === 'undefined' ? globalThis : window);
