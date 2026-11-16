import { SimulationEngineId } from '../types/lab';
import { drawGrid } from './renderPhysicsCanvas';

export function renderChemBioCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  engineId: SimulationEngineId,
  params: Record<string, number>,
  timeSec: number
): boolean {
  switch (engineId) {
    case 'thermo_curve': {
      drawGrid(ctx, w, h);
      const power = params.heatPower ?? 300;
      const salinity = params.salinity ?? 0;
      const tMin = params.elapsedMin ?? 6.5;
      const fp = -0.55 * salinity;
      const bp = 100 + 0.52 * salinity;
      const scale = power / 300;

      const tempAt = (tm: number) => {
        const q = tm * scale;
        if (q < 1.2) return -15 + (q / 1.2) * (fp - -15);
        if (q < 3.5) return fp;
        if (q < 11.0) return fp + ((q - 3.5) / 7.5) * (bp - fp);
        if (q < 16.0) return bp;
        return bp + (q - 16.0) * 8;
      };
      const curTemp = tempAt(tMin);

      // Left: Beaker + Bunsen flame + Thermometer
      const bx = 56;
      const by = 115;
      const bw = 120;
      const bh = 130;
      ctx.fillStyle = curTemp <= fp ? 'rgba(186, 230, 253, 0.7)' : 'rgba(14, 165, 233, 0.25)';
      ctx.fillRect(bx, by + 35, bw, bh - 35);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(bx, by, bw, bh);

      // Bubbles if boiling
      if (curTemp >= bp - 0.2) {
        for (let i = 0; i < 9; i++) {
          const px = bx + 18 + ((i * 23) % (bw - 36));
          const py = by + bh - 8 - ((timeSec * 55 + i * 19) % (bh - 42));
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Flame under beaker
      const flameH = 18 + (power / 600) * 22;
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(bx + bw / 2 - 12, by + bh + 28);
      ctx.quadraticCurveTo(bx + bw / 2, by + bh + 28 - flameH * 1.4, bx + bw / 2 + 12, by + bh + 28);
      ctx.fill();

      // Thermometer beside beaker
      const tx = bx + bw + 28;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(tx, 60, 14, 185);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(tx, 60, 14, 185);
      const normT = Math.max(0, Math.min(1, (curTemp + 20) / 145));
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(tx + 3, 240 - normT * 170, 8, normT * 170);
      ctx.fillStyle = '#0f172a';
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.fillText(`${curTemp.toFixed(1)}°C`, tx - 8, 48);

      // Right: Live Heating Curve
      const gx = w * 0.44;
      const gy = 48;
      const gw = w * 0.5;
      const gh = h - 96;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(gx, gy, gw, gh);
      ctx.fillStyle = '#334155';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillText('Temperature (°C) vs Heating Time', gx + 12, gy + 20);

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const tm = (i / 120) * 18;
        const val = tempAt(tm);
        const px = gx + 18 + (i / 120) * (gw - 36);
        const py = gy + gh - 24 - ((val + 20) / 145) * (gh - 56);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Current time marker
      const mx = gx + 18 + (tMin / 18) * (gw - 36);
      const my = gy + gh - 24 - ((curTemp + 20) / 145) * (gh - 56);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(mx, my, 5.5, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'osmosis_cell': {
      drawGrid(ctx, w, h);
      const cExt = params.externalSolute ?? 0.3;
      const cInt = params.internalSolute ?? 0.3;
      const diff = cInt - cExt;
      const shrink = Math.max(0.45, Math.min(1.0, 0.85 + diff * 0.45));

      const cx = w * 0.42;
      const cy = h * 0.5;
      const wallW = 210;
      const wallH = 140;

      // External bath solute particles
      const extCount = Math.round(cExt * 45);
      for (let i = 0; i < extCount; i++) {
        const px = ((i * 73 + Math.sin(timeSec + i) * 12) % (w - 40)) + 20;
        const py = ((i * 51 + Math.cos(timeSec * 0.8 + i) * 10) % (h - 40)) + 20;
        if (Math.abs(px - cx) > wallW / 2 + 12 || Math.abs(py - cy) > wallH / 2 + 12) {
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Rigid plant cell wall
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 8;
      ctx.strokeRect(cx - wallW / 2, cy - wallH / 2, wallW, wallH);
      ctx.fillRect(cx - wallW / 2 + 4, cy - wallH / 2 + 4, wallW - 8, wallH - 8);

      // Plasma membrane (shrinks during plasmolysis)
      const memW = (wallW - 16) * shrink;
      const memH = (wallH - 16) * shrink;
      ctx.fillStyle = 'rgba(134, 239, 172, 0.38)';
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(cx - memW / 2, cy - memH / 2, memW, memH, 24);
      ctx.fill();
      ctx.stroke();

      // Central Vacuole
      const vacW = memW * 0.72;
      const vacH = memH * 0.65;
      ctx.fillStyle = 'rgba(14, 165, 233, 0.42)';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx - vacW / 2, cy - vacH / 2, vacW, vacH, 20);
      ctx.fill();
      ctx.stroke();

      // Water flux arrows
      if (Math.abs(diff) > 0.06) {
        const inward = diff > 0;
        ctx.fillStyle = '#0284c7';
        ctx.font = '600 12px "IBM Plex Mono", monospace';
        ctx.fillText(inward ? 'H₂O → (Endosmosis)' : '← H₂O (Exosmosis)', cx + wallW / 2 + 18, cy);
      }

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.fillText('Cell Wall', cx - wallW / 2, cy - wallH / 2 - 12);
      ctx.fillText('Central Vacuole', cx - 50, cy + 4);
      return true;
    }

    case 'acid_base_ph': {
      drawGrid(ctx, w, h);
      const vBase = params.baseAdded ?? 12;
      const vAcid = params.acidVolume ?? 25;
      const ind = params.indicator ?? 0;
      const totalV = vAcid + vBase;
      const diff = 0.1 * (vAcid - vBase);
      let ph = 7.0;
      if (diff > 1e-4) ph = Math.max(0.8, -Math.log10(diff / totalV));
      else if (diff < -1e-4) ph = Math.min(13.2, 14 + Math.log10(-diff / totalV));

      let solColor = 'rgba(226, 232, 240, 0.5)';
      if (ind === 0) {
        if (ph < 4) solColor = 'rgba(239, 68, 68, 0.65)';
        else if (ph < 6.4) solColor = 'rgba(245, 158, 11, 0.65)';
        else if (ph <= 7.6) solColor = 'rgba(16, 185, 129, 0.68)';
        else if (ph < 10) solColor = 'rgba(14, 165, 233, 0.65)';
        else solColor = 'rgba(99, 102, 241, 0.72)';
      } else if (ind === 1) {
        solColor = ph > 8.2 ? 'rgba(236, 72, 153, 0.65)' : 'rgba(226, 232, 240, 0.42)';
      } else {
        solColor = ph < 3.4 ? 'rgba(239, 68, 68, 0.7)' : ph < 4.4 ? 'rgba(249, 115, 22, 0.7)' : 'rgba(234, 179, 8, 0.7)';
      }

      // Burette + Conical Flask on Left
      const fx = w * 0.23;
      // Burette
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(fx - 8, 26, 16, 110);
      const fillH = Math.max(8, 105 - vBase * 2);
      ctx.fillStyle = 'rgba(14, 165, 233, 0.35)';
      ctx.fillRect(fx - 6, 134 - fillH, 12, fillH);

      // Drip drop
      const dropY = 144 + ((timeSec * 45) % 44);
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(fx, dropY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Conical flask
      ctx.fillStyle = solColor;
      ctx.beginPath();
      ctx.moveTo(fx - 16, 198);
      ctx.lineTo(fx - 56, 286);
      ctx.lineTo(fx + 56, 286);
      ctx.lineTo(fx + 16, 198);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 13px "IBM Plex Mono", monospace';
      ctx.fillText(`pH ${ph.toFixed(2)}`, fx - 28, 314);

      // Right: Sigmoidal pH Titration Curve
      const gx = w * 0.46;
      const gy = 48;
      const gw = w * 0.48;
      const gh = h - 96;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(gx, gy, gw, gh);
      ctx.fillStyle = '#334155';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillText('Live pH Neutralization Curve', gx + 12, gy + 20);

      // pH 7 reference line
      const y7 = gy + gh - 24 - (7 / 14) * (gh - 54);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(gx + 16, y7);
      ctx.lineTo(gx + gw - 16, y7);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const vb = (i / 100) * 50;
        const tv = vAcid + vb;
        const md = 0.1 * (vAcid - vb);
        let p = 7;
        if (md > 1e-4) p = Math.max(0.8, -Math.log10(md / tv));
        else if (md < -1e-4) p = Math.min(13.2, 14 + Math.log10(-md / tv));
        const px = gx + 16 + (vb / 50) * (gw - 32);
        const py = gy + gh - 24 - (p / 14) * (gh - 54);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      const curX = gx + 16 + (vBase / 50) * (gw - 32);
      const curY = gy + gh - 24 - (ph / 14) * (gh - 54);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(curX, curY, 5.5, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'photosynthesis': {
      drawGrid(ctx, w, h);
      const light = params.lightIntensity ?? 60;
      const co2 = params.co2Level ?? 5.0;
      const temp = params.temperature ?? 26;
      const lf = light / (light + 22);
      const cf = co2 / (co2 + 1.8);
      const tf = temp <= 34 ? Math.exp(-Math.pow((temp - 30) / 16, 2)) : Math.max(0.05, Math.exp(-Math.pow((temp - 34) / 7, 2)));
      const rate = Math.round(78 * Math.min(lf, cf) * tf);

      // Lamp glow
      const lampX = 76;
      const lampY = 120;
      ctx.fillStyle = `rgba(250, 204, 21, ${0.15 + (light / 100) * 0.55})`;
      ctx.beginPath();
      ctx.moveTo(lampX + 18, lampY);
      ctx.lineTo(255, 65);
      ctx.lineTo(255, 250);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#334155';
      ctx.fillRect(lampX - 18, lampY - 18, 36, 36);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(lampX + 18, lampY, 10, 0, Math.PI * 2);
      ctx.fill();

      // Aquatic beaker with Hydrilla & funnel
      const bx = 240;
      const by = 80;
      const bw = 180;
      const bh = 200;
      ctx.fillStyle = 'rgba(14, 165, 233, 0.18)';
      ctx.fillRect(bx, by + 26, bw, bh - 26);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(bx, by, bw, bh);

      // Hydrilla leaves
      ctx.strokeStyle = temp > 42 ? '#b45309' : '#15803d';
      ctx.lineWidth = 3;
      for (let s = -2; s <= 2; s++) {
        ctx.beginPath();
        ctx.moveTo(bx + bw / 2 + s * 10, by + bh - 10);
        ctx.quadraticCurveTo(bx + bw / 2 + s * 18, by + bh - 55, bx + bw / 2 + s * 8, by + bh - 85);
        ctx.stroke();
      }

      // Inverted funnel + test tube
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + 35, by + bh - 12);
      ctx.lineTo(bx + bw / 2 - 12, by + 76);
      ctx.lineTo(bx + bw / 2 - 12, by - 10);
      ctx.lineTo(bx + bw / 2 + 12, by - 10);
      ctx.lineTo(bx + bw / 2 + 12, by + 76);
      ctx.lineTo(bx + bw - 35, by + bh - 12);
      ctx.stroke();

      // Rising O2 bubbles proportional to rate
      const bubbleCount = Math.max(1, Math.round(rate / 8));
      for (let b = 0; b < bubbleCount; b++) {
        const prog = (timeSec * (0.4 + rate / 60) + b / bubbleCount) % 1;
        const py = by + bh - 65 - prog * 130;
        const px = bx + bw / 2 + Math.sin(prog * 12 + b) * 4;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.fillText(`O₂ Output: ${rate} bubbles/min`, bx + bw + 32, by + 60);
      ctx.fillText(`Light: ${light}%   CO₂: ${co2} mM`, bx + bw + 32, by + 84);
      ctx.fillText(`Water Temp: ${temp}°C`, bx + bw + 32, by + 108);
      return true;
    }

    case 'chemical_equilibrium': {
      drawGrid(ctx, w, h);
      const P = params.pressure ?? 150;
      const T = params.temperature ?? 675;
      const h2 = params.h2Ratio ?? 2.0;
      const yieldPct = Math.max(4, Math.min(82, 32 * Math.pow(P / 200, 0.55) * Math.exp(-(T - 550) / 260) * Math.min(1.25, 0.7 + 0.25 * h2)));

      // High pressure piston reactor chamber on Left
      const cx = 48;
      const cw = w * 0.44;
      const pistonY = 65 + (P / 300) * 65;
      const ch = 265 - pistonY;

      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(cx, 50, cw, pistonY - 50);
      ctx.fillStyle = '#334155';
      ctx.fillRect(cx, pistonY - 12, cw, 12);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(cx, 50, cw, 225);

      // Molecules inside chamber: NH3 (emerald) vs N2/H2 (blue/amber)
      const totalMol = 28;
      const nh3Count = Math.round((yieldPct / 100) * totalMol);
      const speed = 0.6 + (T - 450) / 300;
      for (let i = 0; i < totalMol; i++) {
        const mx = cx + 16 + ((Math.sin(timeSec * speed * (1 + (i % 3) * 0.2) + i * 2.1) * 0.5 + 0.5) * (cw - 32));
        const my = pistonY + 14 + ((Math.cos(timeSec * speed * (1 + (i % 4) * 0.15) + i * 1.7) * 0.5 + 0.5) * (ch - 22));
        ctx.fillStyle = i < nh3Count ? '#059669' : i % 2 === 0 ? '#0284c7' : '#d97706';
        ctx.beginPath();
        ctx.arc(mx, my, i < nh3Count ? 5.5 : 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Legend & Yield Bars on Right
      const rx = w * 0.56;
      ctx.fillStyle = '#0f172a';
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.fillText('N₂ + 3H₂ ⇌ 2NH₃ + Heat', rx, 75);
      ctx.fillStyle = '#059669';
      ctx.fillRect(rx, 115, (yieldPct / 100) * (w * 0.36), 28);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(rx, 115, w * 0.36, 28);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`NH₃ Product Yield: ${yieldPct.toFixed(1)}%`, rx, 106);

      const reactPct = 100 - yieldPct;
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(rx, 185, (reactPct / 100) * (w * 0.36), 28);
      ctx.strokeRect(rx, 185, w * 0.36, 28);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`Unreacted N₂ / H₂: ${reactPct.toFixed(1)}%`, rx, 176);
      return true;
    }

    case 'enzyme_kinetics': {
      drawGrid(ctx, w, h);
      const S = params.substrate ?? 25;
      const ph = params.ph ?? 7.2;
      const temp = params.temperature ?? 37;
      const VmaxBase = 120;
      const Km = 15;
      const phAct = Math.exp(-Math.pow((ph - 7.2) / 1.9, 2));
      const tAct = temp <= 40 ? Math.exp(-Math.pow((temp - 37) / 18, 2)) : Math.max(0.03, Math.exp(-Math.pow((temp - 40) / 6.5, 2)));
      const vmax = VmaxBase * phAct * tAct;

      const gx = 56;
      const gy = 48;
      const gw = w - 112;
      const gh = h - 100;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(gx, gy, gw, gh);

      ctx.fillStyle = '#334155';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillText('Michaelis-Menten Curve: V₀ vs [S]', gx + 14, gy + 22);

      // Dashed ideal Vmax reference
      const yVmax = gy + gh - 24 - (vmax / 130) * (gh - 56);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(gx + 20, yVmax);
      ctx.lineTo(gx + gw - 20, yVmax);
      ctx.stroke();
      ctx.setLineDash([]);

      // Curve
      ctx.strokeStyle = phAct * tAct < 0.4 ? '#dc2626' : '#0284c7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const s = (i / 100) * 100;
        const v = (vmax * s) / (Km + s);
        const px = gx + 20 + (s / 100) * (gw - 40);
        const py = gy + gh - 24 - (v / 130) * (gh - 56);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      const curV = (vmax * S) / (Km + S);
      const curX = gx + 20 + (S / 100) * (gw - 40);
      const curY = gy + gh - 24 - (curV / 130) * (gh - 56);
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(curX, curY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`([S]=${S} mM, V₀=${curV.toFixed(1)})`, Math.min(curX + 10, gx + gw - 165), curY - 10);
      return true;
    }

    case 'redox_titration': {
      drawGrid(ctx, w, h);
      const vKmno4 = params.kmno4Added ?? 8.0;
      const oxM = params.oxalicMolarity ?? 0.045;
      const tempC = params.flaskTemp ?? 60;
      const vEq = ((2 / 5) * oxM * 20) / 0.02;
      const diff = vKmno4 - vEq;

      let flaskFill = 'rgba(226, 232, 240, 0.35)';
      if (tempC < 45 && vKmno4 > 2) flaskFill = 'rgba(146, 64, 14, 0.45)';
      else if (Math.abs(diff) <= 0.45) flaskFill = 'rgba(244, 114, 182, 0.48)';
      else if (diff > 0.45) flaskFill = 'rgba(126, 34, 206, 0.78)';

      const fx = w * 0.34;
      // Burette filled with purple KMnO4
      ctx.fillStyle = 'rgba(126, 34, 206, 0.75)';
      const bH = Math.max(8, 100 - vKmno4 * 2.5);
      ctx.fillRect(fx - 7, 130 - bH, 14, bH);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(fx - 8, 25, 16, 108);

      // Flask
      ctx.fillStyle = flaskFill;
      ctx.beginPath();
      ctx.moveTo(fx - 16, 195);
      ctx.lineTo(fx - 64, 290);
      ctx.lineTo(fx + 64, 290);
      ctx.lineTo(fx + 16, 195);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Hotplate indicator
      ctx.fillStyle = tempC >= 55 ? '#ef4444' : '#64748b';
      ctx.fillRect(fx - 68, 292, 136, 10);

      // Right info panel
      const rx = w * 0.56;
      ctx.fillStyle = '#0f172a';
      ctx.font = '600 13px "IBM Plex Mono", monospace';
      ctx.fillText(`KMnO₄ Burette: ${vKmno4.toFixed(1)} mL`, rx, 95);
      ctx.fillText(`Bath Temp: ${tempC}°C`, rx, 125);
      ctx.fillText(`2MnO₄⁻ + 5C₂O₄²⁻ + 16H⁺`, rx, 170);
      ctx.fillText(`  → 2Mn²⁺ + 10CO₂ + 8H₂O`, rx, 192);
      return true;
    }

    case 'galvanic_cell': {
      drawGrid(ctx, w, h);
      const zn = params.znConc ?? 1.0;
      const cu = params.cuConc ?? 1.0;
      const T = params.temperature ?? 298;
      const Ecell = 1.1 - ((8.314 * T) / (2 * 96485)) * Math.LN10 * Math.log10(zn / cu);

      // Two beakers
      const b1x = w * 0.16;
      const b2x = w * 0.58;
      const by = 135;
      const bw = 140;
      const bh = 150;

      // ZnSO4 (clear/pale) & CuSO4 (blue intensity proportional to cu)
      ctx.fillStyle = 'rgba(203, 213, 225, 0.35)';
      ctx.fillRect(b1x, by + 30, bw, bh - 30);
      ctx.fillStyle = `rgba(2, 132, 199, ${0.15 + Math.min(0.6, cu * 0.3)})`;
      ctx.fillRect(b2x, by + 30, bw, bh - 30);

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(b1x, by, bw, bh);
      ctx.strokeRect(b2x, by, bw, bh);

      // Electrodes
      ctx.fillStyle = '#64748b';
      ctx.fillRect(b1x + 28, by - 25, 22, 135);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(b2x + bw - 50, by - 25, 22, 135);

      // Salt bridge
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(b1x + bw - 28, by + 68);
      ctx.lineTo(b1x + bw - 28, by - 14);
      ctx.lineTo(b2x + 28, by - 14);
      ctx.lineTo(b2x + 28, by + 68);
      ctx.stroke();

      // Wire & Voltmeter
      const vx = (b1x + 39 + b2x + bw - 39) / 2;
      const vy = 52;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(b1x + 39, by - 25);
      ctx.lineTo(b1x + 39, vy);
      ctx.lineTo(b2x + bw - 39, vy);
      ctx.lineTo(b2x + bw - 39, by - 25);
      ctx.stroke();

      // Electron flow Zn -> Cu
      for (let k = 0; k < 5; k++) {
        const prog = (timeSec * 0.35 + k * 0.2) % 1;
        const ex = b1x + 39 + prog * (b2x + bw - 39 - (b1x + 39));
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(ex, vy, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(vx - 44, vy - 22, 88, 44);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '600 13px "IBM Plex Mono", monospace';
      ctx.fillText(`+${Ecell.toFixed(3)}V`, vx - 30, vy + 5);

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillText(`Zn Anode (${zn.toFixed(2)}M)`, b1x + 8, by + bh + 22);
      ctx.fillText(`Cu Cathode (${cu.toFixed(2)}M)`, b2x + 4, by + bh + 22);
      return true;
    }

    case 'bohr_effect': {
      drawGrid(ctx, w, h);
      const pO2 = params.pO2 ?? 40;
      const ph = params.bloodPh ?? 7.4;
      const pCO2 = params.pCO2 ?? 40;
      const p50 = 26.8 * Math.pow(10, -0.48 * (ph - 7.4)) * (1 + 0.002 * (pCO2 - 40));
      const sat = (p: number, p50Val: number) => (Math.pow(p, 2.7) / (Math.pow(p, 2.7) + Math.pow(p50Val, 2.7))) * 100;

      // Left: Capillary vessel with animated RBCs
      const cx = 36;
      const cy = 62;
      const cw = w * 0.34;
      const ch = 160;
      ctx.fillStyle = 'rgba(220, 38, 38, 0.08)';
      ctx.fillRect(cx, cy, cw, ch);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cw, ch);

      const curSat = sat(pO2, p50);
      for (let i = 0; i < 6; i++) {
        const rx = cx + 24 + ((timeSec * 40 + i * 44) % (cw - 48));
        const ry = cy + 36 + (i % 3) * 44;
        ctx.fillStyle = curSat > 75 ? '#dc2626' : '#9f1239';
        ctx.beginPath();
        ctx.ellipse(rx, ry, 14, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 8px "IBM Plex Mono", monospace';
        ctx.fillText('Hb', rx - 5, ry + 3);
      }

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.fillText(`Capillary pH: ${ph.toFixed(2)}`, cx, cy + ch + 26);
      ctx.fillText(`HbO₂ Sat: ${curSat.toFixed(1)}%`, cx, cy + ch + 46);

      // Right: Oxygen Dissociation Curve (Standard vs Shifted)
      const gx = w * 0.44;
      const gy = 48;
      const gw = w * 0.5;
      const gh = h - 96;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(gx, gy, gw, gh);

      ctx.fillStyle = '#334155';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillText('O₂-Hemoglobin Dissociation Curve', gx + 12, gy + 20);

      // Baseline pH 7.4 curve
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let p = 0; p <= 110; p += 2) {
        const px = gx + 20 + (p / 110) * (gw - 36);
        const py = gy + gh - 24 - (sat(p, 26.8) / 100) * (gh - 56);
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Active Bohr-shifted curve
      ctx.strokeStyle = p50 > 30 ? '#dc2626' : '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let p = 0; p <= 110; p += 2) {
        const px = gx + 20 + (p / 110) * (gw - 36);
        const py = gy + gh - 24 - (sat(p, p50) / 100) * (gh - 56);
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      const dotX = gx + 20 + (pO2 / 110) * (gw - 36);
      const dotY = gy + gh - 24 - (curSat / 100) * (gh - 56);
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    default:
      return false;
  }
}
