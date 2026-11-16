import { SimulationEngineId } from '../types/lab';
import { drawGrid } from './renderPhysicsCanvas';

export function renderMathEngCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  engineId: SimulationEngineId,
  params: Record<string, number>,
  timeSec: number
): boolean {
  switch (engineId) {
    case 'linear_coord': {
      drawGrid(ctx, w, h, 28);
      const m1 = params.m1 ?? 1.5;
      const c1 = params.c1 ?? -1;
      const m2 = params.m2 ?? -0.5;
      const c2 = params.c2 ?? 3;
      const cx = w / 2;
      const cy = h / 2;
      const scale = 26;

      // Axes
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, cy);
      ctx.lineTo(w - 20, cy);
      ctx.moveTo(cx, 20);
      ctx.lineTo(cx, h - 20);
      ctx.stroke();

      const drawLine = (m: number, c: number, color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const xMin = -12;
        const xMax = 12;
        ctx.moveTo(cx + xMin * scale, cy - (m * xMin + c) * scale);
        ctx.lineTo(cx + xMax * scale, cy - (m * xMax + c) * scale);
        ctx.stroke();
      };
      drawLine(m1, c1, '#0284c7');
      drawLine(m2, c2, '#d97706');

      if (Math.abs(m1 - m2) > 1e-4) {
        const ix = (c2 - c1) / (m1 - m2);
        const iy = m1 * ix + c1;
        ctx.fillStyle = '#059669';
        ctx.beginPath();
        ctx.arc(cx + ix * scale, cy - iy * scale, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.font = '600 12px "IBM Plex Mono", monospace';
        ctx.fillText(`(${ix.toFixed(2)}, ${iy.toFixed(2)})`, cx + ix * scale + 10, cy - iy * scale - 8);
      }
      return true;
    }

    case 'quadratic_roots': {
      drawGrid(ctx, w, h, 28);
      const a = Math.abs(params.a ?? 1) < 0.1 ? 0.25 : params.a ?? 1;
      const b = params.b ?? -2;
      const c = params.c ?? -3;
      const cx = w / 2;
      const cy = h / 2;
      const scale = 28;

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, cy);
      ctx.lineTo(w - 20, cy);
      ctx.moveTo(cx, 20);
      ctx.lineTo(cx, h - 20);
      ctx.stroke();

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let px = 20; px <= w - 20; px += 2) {
        const x = (px - cx) / scale;
        const y = a * x * x + b * x + c;
        const py = cy - y * scale;
        if (px === 20) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      const vx = -b / (2 * a);
      const vy = a * vx * vx + b * vx + c;
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(cx + vx * scale, cy - vy * scale, 5.5, 0, Math.PI * 2);
      ctx.fill();

      const delta = b * b - 4 * a * c;
      if (delta >= 0) {
        const r1 = (-b - Math.sqrt(delta)) / (2 * a);
        const r2 = (-b + Math.sqrt(delta)) / (2 * a);
        [r1, r2].forEach((r) => {
          ctx.fillStyle = '#059669';
          ctx.beginPath();
          ctx.arc(cx + r * scale, cy, 5.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      return true;
    }

    case 'trig_conics': {
      drawGrid(ctx, w, h, 26);
      const theta = params.theta ?? 45;
      const e = params.eccentricity ?? 0.65;
      const p = params.semiLatus ?? 2.0;
      const rad = (theta * Math.PI) / 180;

      // Left: Unit Circle Goniometer
      const ucx = w * 0.27;
      const ucy = h * 0.5;
      const ur = 86;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ucx, ucy, ur, 0, Math.PI * 2);
      ctx.moveTo(ucx - ur - 18, ucy);
      ctx.lineTo(ucx + ur + 18, ucy);
      ctx.moveTo(ucx, ucy - ur - 18);
      ctx.lineTo(ucx, ucy + ur + 18);
      ctx.stroke();

      const px = ucx + ur * Math.cos(rad);
      const py = ucy - ur * Math.sin(rad);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(ucx, ucy);
      ctx.lineTo(px, py);
      ctx.stroke();

      // sin and cos projections
      ctx.strokeStyle = '#059669';
      ctx.beginPath();
      ctx.moveTo(px, ucy);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.strokeStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(ucx, ucy);
      ctx.lineTo(px, ucy);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();

      // Right: Conic Polar Plotter
      const fcx = w * 0.72;
      const fcy = h * 0.5;
      const cScale = 24;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, fcy);
      ctx.lineTo(w - 20, fcy);
      ctx.moveTo(fcx, 24);
      ctx.lineTo(fcx, h - 24);
      ctx.stroke();

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      let started = false;
      for (let deg = 0; deg <= 360; deg += 2) {
        const ang = (deg * Math.PI) / 180;
        const denom = 1 + e * Math.cos(ang);
        if (Math.abs(denom) < 0.08 || (e > 1 && denom < 0)) {
          started = false;
          continue;
        }
        const r = Math.min(7, (e === 0 ? p : (e * p) / denom));
        const x = fcx + r * Math.cos(ang) * cScale;
        const y = fcy - r * Math.sin(ang) * cScale;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(fcx, fcy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'riemann_integral': {
      drawGrid(ctx, w, h);
      const n = params.subintervals ?? 8;
      const b = params.upperLimit ?? 3.0;
      const method = params.method ?? 0;
      const fn = (x: number) => 0.4 * x * x + 0.5;

      const gx = 56;
      const gy = 48;
      const gw = w - 112;
      const gh = h - 96;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(gx, gy, gw, gh);

      const xMax = 4.2;
      const yMax = 7.5;
      const toPx = (x: number) => gx + 20 + (x / xMax) * (gw - 40);
      const toPy = (y: number) => gy + gh - 24 - (y / yMax) * (gh - 52);

      // Draw Riemann rectangles/trapezoids
      const dx = b / n;
      for (let i = 0; i < n; i++) {
        const x0 = i * dx;
        const x1 = (i + 1) * dx;
        const px0 = toPx(x0);
        const px1 = toPx(x1);
        ctx.fillStyle = 'rgba(2, 132, 199, 0.22)';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1;
        if (method === 3) {
          const py0 = toPy(fn(x0));
          const py1 = toPy(fn(x1));
          const base = toPy(0);
          ctx.beginPath();
          ctx.moveTo(px0, base);
          ctx.lineTo(px0, py0);
          ctx.lineTo(px1, py1);
          ctx.lineTo(px1, base);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          const sampleX = method === 0 ? x0 : method === 1 ? x1 : (x0 + x1) / 2;
          const py = toPy(fn(sampleX));
          const base = toPy(0);
          ctx.fillRect(px0, py, px1 - px0, base - py);
          ctx.strokeRect(px0, py, px1 - px0, base - py);
        }
      }

      // Exact curve
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const x = (i / 100) * xMax;
        const px = toPx(x);
        const py = toPy(fn(x));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      return true;
    }

    case 'rlc_resonance': {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      drawGrid(ctx, w, h, 32, true);

      const f = params.freqHz ?? 160;
      const R = params.resistance ?? 35;
      const L = (params.inductanceMh ?? 100) * 1e-3;
      const C = (params.capacitanceUf ?? 10) * 1e-6;
      const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
      const wRad = 2 * Math.PI * f;
      const xl = wRad * L;
      const xc = 1 / (wRad * C);
      const Z = Math.sqrt(R * R + (xl - xc) * (xl - xc));
      const phase = Math.atan2(xl - xc, R);

      // Left: Oscilloscope V(t) & I(t)
      const ox = 36;
      const oy = 48;
      const ow = w * 0.46;
      const oh = h - 96;
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(ox, oy, ow, oh);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillText('CRO Scope: V(t) vs I(t)', ox + 12, oy + 20);

      // Voltage wave
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const xNorm = i / 120;
        const v = Math.sin(xNorm * Math.PI * 4 - timeSec * 4);
        const px = ox + xNorm * ow;
        const py = oy + oh / 2 - v * (oh * 0.34);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Current wave scaled by R/Z and shifted by phase
      const ampRatio = Math.min(1, R / Z);
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const xNorm = i / 120;
        const cur = ampRatio * Math.sin(xNorm * Math.PI * 4 - timeSec * 4 - phase);
        const px = ox + xNorm * ow;
        const py = oy + oh / 2 - cur * (oh * 0.32);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Right: Resonance Frequency Sweep Curve
      const gx = w * 0.55;
      const gw = w * 0.4;
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(gx, oy, gw, oh);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Frequency Response (f₀ = ${f0.toFixed(1)} Hz)`, gx + 12, oy + 20);

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const ff = 50 + (i / 100) * 550;
        const ww = 2 * Math.PI * ff;
        const zz = Math.sqrt(R * R + Math.pow(ww * L - 1 / (ww * C), 2));
        const normI = (R / zz);
        const px = gx + 12 + (i / 100) * (gw - 24);
        const py = oy + oh - 22 - normI * (oh - 58);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      const curX = gx + 12 + ((f - 50) / 550) * (gw - 24);
      const curY = oy + oh - 22 - (R / Z) * (oh - 58);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(curX, curY, 5.5, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'opamp_gain': {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      drawGrid(ctx, w, h, 32, true);

      const vin = params.vinAmp ?? 1.0;
      const rin = params.rInK ?? 10;
      const rf = params.rFeedbackK ?? 50;
      const topo = params.topology ?? 0;
      const gain = topo === 0 ? -(rf / rin) : 1 + rf / rin;

      const ox = 48;
      const oy = 48;
      const ow = w - 96;
      const oh = h - 96;
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(ox, oy, ow, oh);

      // ±12V Supply rail limit lines
      const railYTop = oy + oh / 2 - (12 / 15) * (oh * 0.45);
      const railYBot = oy + oh / 2 + (12 / 15) * (oh * 0.45);
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(ox, railYTop);
      ctx.lineTo(ox + ow, railYTop);
      ctx.moveTo(ox, railYBot);
      ctx.lineTo(ox + ow, railYBot);
      ctx.stroke();
      ctx.setLineDash([]);

      // Input Vin (cyan)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 160; i++) {
        const xn = i / 160;
        const val = vin * Math.sin(xn * Math.PI * 4 - timeSec * 3.5);
        const px = ox + xn * ow;
        const py = oy + oh / 2 - (val / 15) * (oh * 0.45);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Output Vout (emerald, clipped at ±12V)
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      for (let i = 0; i <= 160; i++) {
        const xn = i / 160;
        const ideal = gain * vin * Math.sin(xn * Math.PI * 4 - timeSec * 3.5);
        const clipped = Math.max(-12, Math.min(12, ideal));
        const px = ox + xn * ow;
        const py = oy + oh / 2 - (clipped / 15) * (oh * 0.45);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillText(`Cyan: V_in (${vin.toFixed(1)}V)   Emerald: V_out (A_v = ${gain.toFixed(1)}×)   Red: ±12V Rails`, ox + 12, oy + 20);
      return true;
    }

    case 'logic_gates': {
      drawGrid(ctx, w, h);
      const A = params.inputA ?? 1;
      const B = params.inputB ?? 0;
      const mode = params.gateMode ?? 3;
      const out1 = mode === 0 ? A & B : mode === 1 ? A | B : mode === 2 ? A ^ B : A ^ B;
      const out2 = mode === 3 ? A & B : out1 ? 0 : 1;
      const labels = [
        ['AND', 'NAND'],
        ['OR', 'NOR'],
        ['XOR', 'XNOR'],
        ['SUM (A⊕B)', 'CARRY (A·B)'],
      ][mode];

      // Interactive input toggle boxes on left
      const drawNode = (x: number, y: number, label: string, state: number) => {
        ctx.fillStyle = state ? '#059669' : '#e2e8f0';
        ctx.strokeStyle = state ? '#047857' : '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, 76, 40, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = state ? '#ffffff' : '#0f172a';
        ctx.font = '600 12px "IBM Plex Mono", monospace';
        ctx.fillText(`${label}: ${state}`, x + 12, y + 24);
      };

      drawNode(54, h * 0.3, 'IN A', A);
      drawNode(54, h * 0.6, 'IN B', B);

      // Gate block in center
      const gx = w * 0.38;
      const gy = h * 0.24;
      const gw = 160;
      const gh = h * 0.52;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(gx, gy, gw, gh, 10);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 13px "IBM Plex Mono", monospace';
      ctx.fillText(mode === 3 ? 'HALF ADDER' : labels[0] + ' / ' + labels[1], gx + 24, gy + gh / 2 + 4);

      // Input wires
      const wire = (x1: number, y1: number, x2: number, y2: number, high: number) => {
        ctx.strokeStyle = high ? '#059669' : '#94a3b8';
        ctx.lineWidth = high ? 3.5 : 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      };
      wire(130, h * 0.3 + 20, gx, h * 0.3 + 20, A);
      wire(130, h * 0.6 + 20, gx, h * 0.6 + 20, B);

      // Output wires + LEDs
      const ox = w * 0.72;
      wire(gx + gw, h * 0.36, ox, h * 0.36, out1);
      wire(gx + gw, h * 0.62, ox, h * 0.62, out2);

      const drawLed = (x: number, y: number, name: string, val: number) => {
        ctx.fillStyle = val ? '#10b981' : '#cbd5e1';
        ctx.beginPath();
        ctx.arc(x + 14, y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.font = '600 12px "IBM Plex Mono", monospace';
        ctx.fillText(`${name} = ${val}`, x + 38, y + 4);
      };
      drawLed(ox, h * 0.36, labels[0], out1);
      drawLed(ox, h * 0.62, labels[1], out2);
      return true;
    }

    case 'beam_bending': {
      drawGrid(ctx, w, h);
      const P = params.loadN ?? 400;
      const L = params.lengthM ?? 1.5;
      const EGpa = params.modulusGpa ?? 200;
      const E = EGpa * 1e9;
      const I = (0.04 * Math.pow(0.03, 3)) / 12;
      const deltaMm = ((P * Math.pow(L, 3)) / (3 * E * I)) * 1000;
      const visualDeflect = Math.min(110, deltaMm * 1.6);

      const wallX = 76;
      const beamY = h * 0.36;
      const spanPx = 140 + (L / 3) * (w - 240);

      // Fixed concrete support wall
      ctx.fillStyle = '#334155';
      ctx.fillRect(wallX - 24, beamY - 70, 24, 180);

      // Neutral dashed reference
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(wallX, beamY);
      ctx.lineTo(wallX + spanPx, beamY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Deflected Euler-Bernoulli cantilever curve: y(x) = delta * (3L x^2 - x^3) / (2 L^3)
      ctx.strokeStyle = EGpa === 200 ? '#0284c7' : EGpa === 69 ? '#64748b' : '#b45309';
      ctx.lineWidth = 14;
      ctx.beginPath();
      for (let i = 0; i <= 50; i++) {
        const xn = i / 50;
        const def = visualDeflect * (1.5 * xn * xn - 0.5 * xn * xn * xn);
        const px = wallX + xn * spanPx;
        const py = beamY + def;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Load vector arrow at tip
      const tipX = wallX + spanPx;
      const tipY = beamY + visualDeflect;
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY - 52);
      ctx.lineTo(tipX, tipY - 10);
      ctx.stroke();
      ctx.fillStyle = '#dc2626';
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.fillText(`P = ${P} N`, tipX - 36, tipY - 60);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`δ_max = ${deltaMm.toFixed(2)} mm`, tipX - 88, tipY + 34);
      return true;
    }

    case 'otto_cycle': {
      drawGrid(ctx, w, h);
      const r = params.compRatio ?? 9.5;
      const qIn = params.heatInKj ?? 1100;
      const gamma = params.gamma ?? 1.4;

      // Left: Animated Piston Cylinder
      const cx = 64;
      const cw = 110;
      const cyTop = 58;
      const cyH = 210;
      const phase = (timeSec * 1.2) % 4; // 0-1 comp, 1-2 comb, 2-3 exp, 3-4 exh
      const strokeFrac = phase < 1 ? 1 - phase : phase < 2 ? 0 : phase < 3 ? phase - 2 : 1;
      const clearance = cyH / r;
      const pistonTop = cyTop + clearance + strokeFrac * (cyH - clearance - 28);

      ctx.fillStyle = phase >= 1 && phase < 2.2 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(14, 165, 233, 0.14)';
      ctx.fillRect(cx, cyTop, cw, pistonTop - cyTop);
      ctx.fillStyle = '#334155';
      ctx.fillRect(cx + 2, pistonTop, cw - 4, 24);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(cx, cyTop, cw, cyH);

      // Right: P-V Indicator Diagram
      const gx = w * 0.38;
      const gy = 48;
      const gw = w * 0.56;
      const gh = h - 96;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(gx, gy, gw, gh);
      ctx.fillStyle = '#334155';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillText('Otto P-V Indicator Loop', gx + 12, gy + 20);

      const p1 = 1;
      const p2 = p1 * Math.pow(r, gamma);
      const p3 = p2 * (1 + qIn / 800);
      const p4 = p3 * Math.pow(1 / r, gamma);
      const pMax = Math.max(p3 * 1.1, 90);
      const toX = (vNorm: number) => gx + 28 + vNorm * (gw - 52);
      const toY = (p: number) => gy + gh - 24 - (p / pMax) * (gh - 56);

      ctx.fillStyle = 'rgba(2, 132, 199, 0.14)';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      // 1 -> 2 compression
      for (let i = 0; i <= 30; i++) {
        const v = 1 - (i / 30) * (1 - 1 / r);
        const p = p1 * Math.pow(1 / v, gamma);
        if (i === 0) ctx.moveTo(toX(v), toY(p));
        else ctx.lineTo(toX(v), toY(p));
      }
      // 2 -> 3 isochoric heat add
      ctx.lineTo(toX(1 / r), toY(p3));
      // 3 -> 4 expansion
      for (let i = 0; i <= 30; i++) {
        const v = 1 / r + (i / 30) * (1 - 1 / r);
        const p = p3 * Math.pow((1 / r) / v, gamma);
        ctx.lineTo(toX(v), toY(p));
      }
      // 4 -> 1 exhaust
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return true;
    }

    case 'pid_control': {
      drawGrid(ctx, w, h);
      const kp = params.kp ?? 5.0;
      const ki = params.ki ?? 1.5;
      const kd = params.kd ?? 2.0;

      const gx = 56;
      const gy = 48;
      const gw = w - 112;
      const gh = h - 96;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(gx, gy, gw, gh);
      ctx.fillStyle = '#334155';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillText('Unit Step Response y(t) vs Setpoint r(t) = 1.0', gx + 12, gy + 20);

      const yToPx = (val: number) => gy + gh - 24 - (val / 1.6) * (gh - 56);
      // Setpoint 1.0
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx + 16, yToPx(1.0));
      ctx.lineTo(gx + gw - 16, yToPx(1.0));
      ctx.stroke();
      ctx.setLineDash([]);

      // Simulate response
      let y = 0;
      let dy = 0;
      let integ = 0;
      let prevE = 1;
      const dt = 0.02;
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      for (let step = 0; step <= 300; step++) {
        const t = step * dt;
        const px = gx + 16 + (t / 6.0) * (gw - 32);
        const py = yToPx(Math.max(-0.2, Math.min(1.58, y)));
        if (step === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);

        const e = 1 - y;
        integ += e * dt;
        const d = (e - prevE) / dt;
        const u = kp * e + ki * integ + kd * d;
        dy += (u - 1.4 * dy - y) * dt;
        y += dy * dt;
        prevE = e;
      }
      ctx.stroke();
      return true;
    }

    case 'fourier_series': {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      drawGrid(ctx, w, h, 32, true);

      const N = params.harmonics ?? 5;
      const wf = params.waveform ?? 0;

      const ox = 36;
      const oy = 48;
      const ow = w * 0.56;
      const oh = h - 96;
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(ox, oy, ow, oh);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillText(`Time-Domain Synthesis (${N} Harmonics)`, ox + 12, oy + 20);

      // Target dashed ideal wave
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 180; i++) {
        const phase = (i / 180) * 2 * Math.PI;
        let t = 0;
        if (wf === 0) t = phase < Math.PI ? 1 : -1;
        else if (wf === 1) t = 1 - phase / Math.PI;
        else t = phase < Math.PI ? -1 + (2 * phase) / Math.PI : 3 - (2 * phase) / Math.PI;
        const px = ox + (i / 180) * ow;
        const py = oy + oh / 2 - t * (oh * 0.34);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Synthesized wave
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 180; i++) {
        const phase = (i / 180) * 2 * Math.PI;
        let s = 0;
        for (let k = 1; k <= N; k++) {
          if (wf === 0) {
            const n = 2 * k - 1;
            s += (4 / (Math.PI * n)) * Math.sin(n * phase);
          } else if (wf === 1) {
            s += (2 / (Math.PI * k)) * Math.sin(k * phase);
          } else {
            const n = 2 * k - 1;
            const sign = (k - 1) % 2 === 0 ? -1 : 1;
            s += sign * (8 / (Math.PI * Math.PI * n * n)) * Math.cos(n * phase);
          }
        }
        const px = ox + (i / 180) * ow;
        const py = oy + oh / 2 - s * (oh * 0.34);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Right: Harmonic Spectrum Magnitude Bars
      const sx = w * 0.66;
      const sw = w * 0.29;
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(sx, oy, sw, oh);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Magnitude Spectrum', sx + 12, oy + 20);

      const bars = Math.min(12, N);
      const barW = Math.max(6, (sw - 36) / bars - 4);
      for (let k = 1; k <= bars; k++) {
        const amp = wf === 0 ? 1 / (2 * k - 1) : wf === 1 ? 1 / k : 1 / Math.pow(2 * k - 1, 2);
        const bh = amp * (oh - 68);
        const bx = sx + 18 + (k - 1) * ((sw - 36) / bars);
        ctx.fillStyle = '#34d399';
        ctx.fillRect(bx, oy + oh - 22 - bh, barW, bh);
      }
      return true;
    }

    default:
      return false;
  }
}
