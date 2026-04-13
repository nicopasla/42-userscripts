// ==UserScript==
// @name         42 Logtime
// @namespace    https://github.com/nicopasla/42-userscripts
// @version      0.0.4
// @updateURL	 https://raw.githubusercontent.com/nicopasla/42-userscripts/main/logtime.user.js
// @license      MIT
// @author       nicopasla
// @description  Redesign the logtime to show weekly and total hours.
// @match        https://profile-v3.intra.42.fr/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const CONFIG = {
    GOAL_HOURS: 140,
    MAX_INTENSITY_SECS: 3600 * 12,
    CALENDAR_COLOR: '#00BCBA',
    LABELS_COLOR: '#26a641',
    BG_CARD: '#ffffff',
    CARD_RADIUS: '16px',
    CELL_RADIUS: '6px',
    GAP_BETWEEN_CARDS: '16px',
    CARD_WIDTH: '280px',
    HOVER_OPACITY: 1.0,
    PAST_MONTHS_OPACITY: 0.8,
    AVG_ONLY_ACTIVE_DAYS: true,
    COLORS: {
      BORDER: '#e2e8f0',
      TEXT_DARK: '#1e293b',
      TEXT_LIGHT: '#94a3b8',
      CELL_EMPTY: '#f8fafc'
    },
    INTRA_FONT: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  };

  const style = document.createElement('style');
  style.textContent = `
    [class*="logtime"], .card, .card-body, .row, .col-md-12 {
      overflow: visible !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .log-slider-fixed {
      overflow-x: auto !important;
      overflow-y: hidden !important;
      width: 100%;
      margin-top: -10px !important;
      font-family: ${CONFIG.INTRA_FONT};
      display: flex !important;
      scroll-behavior: smooth;
    }

    .log-slider-fixed::-webkit-scrollbar { height: 6px; }
    .log-slider-fixed::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

    .grid-centering-container {
      display: flex;
      gap: ${CONFIG.GAP_BETWEEN_CARDS};
      padding: 10px 20px 20px 20px;
      margin: 0 auto;
      min-width: min-content;
    }

    .month-card {
      transition: opacity 0.2s ease;
      border: 1px solid ${CONFIG.COLORS.BORDER};
    }

    .month-card.current-month {
      border: 2px solid ${CONFIG.CALENDAR_COLOR} !important;
      box-shadow: 0 0 15px ${CONFIG.CALENDAR_COLOR}33 !important;
      opacity: 1 !important;
    }

    .day-cell { transition: transform 0.1s ease; cursor: pointer; position: relative; }
    .day-cell:hover { transform: scale(1.2); filter: brightness(0.9); z-index: 50 !important; }

    .today-highlight {
      box-shadow: 0 0 0 2px ${CONFIG.CALENDAR_COLOR}, 0 0 8px ${CONFIG.CALENDAR_COLOR}88;
      border: none !important;
      z-index: 10;
    }

    .day-tooltip {
      display: none; position: absolute; bottom: 130%; left: 50%; transform: translateX(-50%);
      background: #1e293b; color: #fff; font-size: 11px; padding: 4px 8px; border-radius: 4px;
      z-index: 100; white-space: nowrap; pointer-events: none;
    }
    .day-cell:hover .day-tooltip { display: block; }
  `;
  document.head.appendChild(style);

  const fmtHours = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
  };

  function render(stats) {
    if (!stats) return;
    const byMonth = {};
    Object.keys(stats).sort().forEach(d => {
      const ym = d.slice(0, 7);
      if (!byMonth[ym]) byMonth[ym] = {};
      const parts = (stats[d] || '00:00:00').split(':').map(Number);
      byMonth[ym][d] = (parts[0] * 3600) + (parts[1] * 60) + (parts[2] || 0);
    });

    const scrollWrapper = document.createElement('div');
    scrollWrapper.className = 'log-slider-fixed';
    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid-centering-container';

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthKeys = Object.keys(byMonth).sort();

    monthKeys.forEach((ym, index) => {
      const isCurrent = (index === monthKeys.length - 1);
      const [year, mon] = ym.split('-').map(Number);
      const data = byMonth[ym];
      const total = Object.values(data).reduce((a, b) => a + b, 0);
      const lastDayDate = new Date(year, mon, 0).getDate();

      const divisor = CONFIG.AVG_ONLY_ACTIVE_DAYS ? (Object.values(data).filter(s => s > 0).length || 1) : (isCurrent ? now.getDate() : lastDayDate);
      const avg = total / divisor;

      const card = document.createElement('div');
      card.className = `month-card ${isCurrent ? 'current-month' : ''}`;
      card.style.cssText = `
        background:${CONFIG.BG_CARD};
        border-radius:${CONFIG.CARD_RADIUS}; padding:16px; width:${CONFIG.CARD_WIDTH};
        flex-shrink: 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        opacity: ${isCurrent ? '1' : CONFIG.PAST_MONTHS_OPACITY};
      `;

      card.innerHTML = `
		<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
			<span style="font-size:22px; font-weight:700; color:${CONFIG.COLORS.TEXT_DARK};">${new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(year, mon - 1))}</span>
			<span style="font-size:16px; font-weight:800; color:${CONFIG.LABELS_COLOR}; background:rgba(38,166,65,0.08); padding:4px 10px; border-radius:8px;">${fmtHours(total)} / ${CONFIG.GOAL_HOURS}h</span>
		</div>

		<div style="display:flex; justify-content:space-between; align-items:center; font-size:14px; color:${CONFIG.LABELS_COLOR}; margin-bottom:10px;">
			<div class="day-cell" style="background:transparent; width:auto; height:auto; padding:0; cursor:help;">
			<b>${Math.round((total / (CONFIG.GOAL_HOURS * 3600)) * 100, 100)}%</b>
			<div class="day-tooltip">Remaining: ${fmtHours(Math.max(0, (CONFIG.GOAL_HOURS * 3600) - total))}</div>
			</div>
			
			<span>Avg: <b>${fmtHours(avg)}</b></span>
		</div>

		<div style="width:100%; height:4px; background:#f1f5f9; border-radius:2px; margin-bottom:16px; overflow:hidden;">
			<div style="width:${Math.min((total / (CONFIG.GOAL_HOURS * 3600)) * 100, 100)}%; height:100%; background:${CONFIG.LABELS_COLOR};"></div>
		</div>
		`;

      const grid = document.createElement('div');
      grid.style.cssText = `display:grid; grid-template-columns:repeat(7, 1fr) 58px; gap:8px 5px;`;

      ['M', 'T', 'W', 'T', 'F', 'S', 'S', 'Total'].forEach((d, idx) => {
        const el = document.createElement('div');
        el.textContent = d;
        el.style.cssText = `font-size:11px; font-weight:800; text-align:center; color:${CONFIG.COLORS.TEXT_LIGHT}; ${idx === 7 ? 'border-left:1px solid #f1f5f9; color:' + CONFIG.LABELS_COLOR : ''}`;
        grid.appendChild(el);
      });

      const offset = (new Date(year, mon - 1, 1).getDay() + 6) % 7;
      for (let i = 0; i < offset; i++) grid.appendChild(document.createElement('div'));

      let weekSecs = 0;
      for (let day = 1; day <= lastDayDate; day++) {
        const dKey = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const s = data[dKey] ?? 0;
        weekSecs += s;

        const cell = document.createElement('div');
        cell.className = `day-cell ${dKey === todayStr ? 'today-highlight' : ''}`;
        cell.textContent = day;
        const alpha = Math.min(s / CONFIG.MAX_INTENSITY_SECS, 1).toFixed(2);
        cell.style.cssText = `
          aspect-ratio:1/1; border-radius:${CONFIG.CELL_RADIUS}; display:flex; align-items:center; justify-content:center;
          font-size:11px; font-weight:700; background: ${s > 0 ? `rgba(0, 186, 186, ${alpha})` : CONFIG.COLORS.CELL_EMPTY};
          color: ${s > (CONFIG.MAX_INTENSITY_SECS / 2) ? '#fff' : CONFIG.COLORS.TEXT_DARK};
        `;

        const tt = document.createElement('div');
        tt.className = 'day-tooltip';
        tt.textContent = s > 0 ? fmtHours(s) : '0h';
        cell.appendChild(tt);
        grid.appendChild(cell);

        if ((offset + day) % 7 === 0 || day === lastDayDate) {
          if (day === lastDayDate && (offset + day) % 7 !== 0) {
            for (let j = 0; j < (7 - (offset + day) % 7); j++) grid.appendChild(document.createElement('div'));
          }
          const w = document.createElement('div');
          w.textContent = weekSecs > 0 ? fmtHours(weekSecs) : '—';
          w.style.cssText = `font-size:14px; font-weight:700; text-align:right; color:${CONFIG.LABELS_COLOR}; border-left:1px solid #f1f5f9; padding-right:4px; display:flex; align-items:center; justify-content:flex-end;`;
          grid.appendChild(w);
          weekSecs = 0;
        }
      }
      card.appendChild(grid);
      gridContainer.appendChild(card);
    });

    scrollWrapper.appendChild(gridContainer);

    const obs = new MutationObserver((_, o) => {
      const t = document.querySelector('div.flex.flex-row.flex-wrap.w-full');
      if (t) {
        o.disconnect();
        t.replaceWith(scrollWrapper);
        setTimeout(() => {
          scrollWrapper.scrollTo({ left: scrollWrapper.scrollWidth, behavior: 'smooth' });
        }, 300);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  const _f = window.fetch;
  window.fetch = function (...a) {
    const p = _f.apply(this, a);
    if (a[0]?.includes?.('locations_stats')) p.then(r => r.clone().json()).then(render);
    return p;
  };
})();