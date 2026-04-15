(function () {
  if (window.Chart) return;

  class FallbackChart {
    constructor(ctx, config) {
      this.ctx = ctx;
      this.canvas = ctx && ctx.canvas;
      this.config = config || {};
      this.destroyed = false;
      this.render();
    }

    destroy() {
      this.destroyed = true;
      if (!this.ctx || !this.canvas) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render() {
      if (!this.ctx || !this.canvas || this.destroyed) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect.width || this.canvas.clientWidth || 600));
      const height = Math.max(180, Math.floor(rect.height || this.canvas.clientHeight || 300));
      this.canvas.width = Math.floor(width * dpr);
      this.canvas.height = Math.floor(height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.clearRect(0, 0, width, height);

      const type = this.config?.type || 'bar';
      const labels = this.config?.data?.labels || [];
      const ds = this.config?.data?.datasets?.[0] || { data: [] };
      const values = (ds.data || []).map(v => (Number.isFinite(v) ? Number(v) : 0));
      const colors = ds.backgroundColor || '#7b8dff';

      if (type === 'line') return this.drawLine(labels, values, width, height);
      if (type === 'doughnut') return this.drawDoughnut(labels, values, width, height, colors);
      return this.drawBars(labels, values, width, height, colors);
    }

    drawBars(labels, values, w, h, colors) {
      const ctx = this.ctx;
      const pad = { t: 12, r: 10, b: 34, l: 36 };
      const cw = w - pad.l - pad.r;
      const ch = h - pad.t - pad.b;
      const max = Math.max(1, ...values);
      const count = Math.max(1, values.length);
      const slot = cw / count;
      const barW = Math.max(4, slot * 0.66);
      ctx.strokeStyle = 'rgba(255,255,255,.18)';
      ctx.beginPath();
      ctx.moveTo(pad.l, pad.t + ch);
      ctx.lineTo(pad.l + cw, pad.t + ch);
      ctx.stroke();
      values.forEach((v, i) => {
        const x = pad.l + i * slot + (slot - barW) / 2;
        const bh = (v / max) * ch;
        const y = pad.t + ch - bh;
        ctx.fillStyle = Array.isArray(colors) ? (colors[i] || '#7b8dff') : colors;
        ctx.fillRect(x, y, barW, bh);
      });
      this.drawLabels(labels, pad, cw, h);
    }

    drawLine(labels, values, w, h) {
      const ctx = this.ctx;
      const pad = { t: 12, r: 10, b: 34, l: 36 };
      const cw = w - pad.l - pad.r;
      const ch = h - pad.t - pad.b;
      const max = Math.max(1, ...values);
      const n = Math.max(1, values.length - 1);
      ctx.strokeStyle = '#7b8dff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      values.forEach((v, i) => {
        const x = pad.l + (i / n) * cw;
        const y = pad.t + ch - (v / max) * ch;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      this.drawLabels(labels, pad, cw, h);
    }

    drawDoughnut(labels, values, w, h, colors) {
      const ctx = this.ctx;
      const total = values.reduce((a, b) => a + Math.max(0, b), 0) || 1;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.max(24, Math.min(w, h) * 0.28);
      let start = -Math.PI / 2;
      values.forEach((v, i) => {
        const angle = (Math.max(0, v) / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, start, start + angle);
        ctx.closePath();
        ctx.fillStyle = Array.isArray(colors) ? (colors[i] || '#7b8dff') : '#7b8dff';
        ctx.fill();
        start += angle;
      });
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.58, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      this.drawLabels(labels, { l: 0 }, w, h);
    }

    drawLabels(labels, pad, cw, h) {
      const ctx = this.ctx;
      if (!labels || !labels.length) return;
      ctx.fillStyle = 'rgba(214,225,244,.86)';
      ctx.font = '11px sans-serif';
      const maxLabels = Math.min(labels.length, 8);
      for (let i = 0; i < maxLabels; i++) {
        const text = String(labels[i] || '').slice(0, 14);
        const x = pad.l + (i + 0.5) * (cw / maxLabels);
        ctx.fillText(text, x - 16, h - 12);
      }
    }
  }

  window.Chart = FallbackChart;
  window.__chartFallbackActive = true;
  console.warn('[chart-fallback] Chart.js not found. Using local fallback renderer.');
})();
