import { SimulationEngineId } from '../types/lab';

export function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, step = 32, dark = false) {
  ctx.save();
  ctx.strokeStyle = dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

export function renderPhysicsCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  engineId: SimulationEngineId,
  params: Record<string, number>,
  timeSec: number
): boolean {
  switch (engineId) {
    case 'pendulum': {
      drawGrid(ctx, w, h);
      const L = params.length ?? 1.0;
      const m = params.mass ?? 80;
      const theta0Deg = params.angle ?? 8;
      const g = params.gravity ?? 9.81;
      const theta0 = (theta0Deg * Math.PI) / 180;
      const omega = Math.sqrt(g / L) / (1 + (theta0 * theta0) / 16);
      const theta = theta0 * Math.cos(omega * timeSec);

      const pivotX = w * 0.42;
      const pivotY = 58;
      const pxLen = 80 + L * 90;
      const bobX = pivotX + pxLen * Math.sin(theta);
      const bobY = pivotY + pxLen * Math.cos(theta);
      const bobR = 11 + (m / 200) * 11;

      // Support beam
      ctx.fillStyle = '#334155';
      ctx.fillRect(pivotX - 90, pivotY - 12, 180, 12);
      // Vertical equilibrium guide
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(pivotX, pivotY + pxLen + 36);
      ctx.stroke();
      ctx.setLineDash([]);

      // Angle arc
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 48, Math.PI / 2 - theta0, Math.PI / 2 + theta0);
      ctx.stroke();

      // String
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(bobX, bobY);
      ctx.stroke();

      // Brass bob
      const grad = ctx.createRadialGradient(bobX - 4, bobY - 4, 2, bobX, bobY, bobR);
      grad.addColorStop(0, '#fcd34d');
      grad.addColorStop(0.7, '#d97706');
      grad.addColorStop(1, '#78350f');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bobX, bobY, bobR, 0, Math.PI * 2);
      ctx.fill();

      // Right mini phase graph: theta(t)
      const gx = w * 0.68;
      const gy = 70;
      const gw = w * 0.28;
      const gh = h - 130;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeRect(gx, gy, gw, gh);
      ctx.fillStyle = '#475569';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillText('θ(t) Displacement', gx + 10, gy + 20);

      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(gx, gy + gh / 2);
      ctx.lineTo(gx + gw, gy + gh / 2);
      ctx.stroke();

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const dt = (i / 100) * 6;
        const val = theta0 * Math.cos(omega * (timeSec - 6 + dt));
        const px = gx + (i / 100) * gw;
        const py = gy + gh / 2 - (val / ((26 * Math.PI) / 180)) * (gh * 0.38);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = '500 12px "IBM Plex Mono", monospace';
      ctx.fillText(`L = ${L.toFixed(2)} m   g = ${g.toFixed(2)} m/s²`, 24, h - 22);
      return true;
    }

    case 'buoyancy': {
      drawGrid(ctx, w, h);
      const immersion = params.immersion ?? 60;
      const rhoBlock = params.blockDensity ?? 2700;
      const rhoFluid = params.fluidDensity ?? 1000;
      const vol = params.volume ?? 250;
      const weightAir = rhoBlock * vol * 1e-6 * 9.81;
      const upthrust = rhoFluid * vol * 1e-6 * (immersion / 100) * 9.81;
      const apparent = Math.max(0, weightAir - upthrust);

      const beakerX = w * 0.25;
      const beakerW = 210;
      const beakerY = h * 0.36;
      const beakerH = 210;
      const baseFluidY = beakerY + 62;
      const rise = (immersion / 100) * 26;
      const fluidY = baseFluidY - rise;

      // Overflow beaker
      ctx.fillStyle = 'rgba(14, 165, 233, 0.18)';
      ctx.fillRect(beakerX, fluidY, beakerW, beakerY + beakerH - fluidY);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(beakerX, fluidY);
      ctx.lineTo(beakerX + beakerW, fluidY);
      ctx.stroke();

      // Overflow spout & catch cylinder
      const catchX = beakerX + beakerW + 55;
      const catchY = beakerY + 75;
      const catchH = 135;
      const displacedH = (immersion / 100) * 85;
      ctx.fillStyle = 'rgba(14, 165, 233, 0.32)';
      ctx.fillRect(catchX, catchY + catchH - displacedH, 74, displacedH);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(catchX, catchY, 74, catchH);
      ctx.fillStyle = '#334155';
      ctx.font = '500 11px "IBM Plex Mono", monospace';
      ctx.fillText('Displaced', catchX + 4, catchY + catchH + 18);
      ctx.fillText(`${(vol * (immersion / 100)).toFixed(0)} cm³`, catchX + 10, catchY + catchH + 34);

      // Beaker walls
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(beakerX, beakerY);
      ctx.lineTo(beakerX, beakerY + beakerH);
      ctx.lineTo(beakerX + beakerW, beakerY + beakerH);
      ctx.lineTo(beakerX + beakerW, beakerY + 42);
      ctx.stroke();

      // Block position
      const blockW = 76;
      const blockH = 76;
      const blockX = beakerX + beakerW / 2 - blockW / 2;
      const blockY = fluidY - blockH * (1 - immersion / 100) + (immersion === 0 ? -36 : 0);

      // Spring balance at top
      const scaleX = beakerX + beakerW / 2;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(scaleX - 24, 24, 48, 66);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.fillText(`${apparent.toFixed(1)}N`, scaleX - 18, 62);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(scaleX, 90);
      ctx.lineTo(scaleX, blockY);
      ctx.stroke();

      // Solid block
      ctx.fillStyle = rhoBlock < 900 ? '#d97706' : rhoBlock < 3000 ? '#64748b' : '#b45309';
      ctx.fillRect(blockX, blockY, blockW, blockH);
      ctx.strokeStyle = '#0f172a';
      ctx.strokeRect(blockX, blockY, blockW, blockH);
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillText(`${rhoBlock}`, blockX + 20, blockY + 38);
      ctx.fillText(`kg/m³`, blockX + 18, blockY + 52);

      // Force arrows
      if (upthrust > 0.05) {
        ctx.strokeStyle = '#059669';
        ctx.fillStyle = '#059669';
        ctx.lineWidth = 3;
        const arrLen = Math.min(68, upthrust * 12);
        ctx.beginPath();
        ctx.moveTo(blockX - 18, blockY + blockH);
        ctx.lineTo(blockX - 18, blockY + blockH - arrLen);
        ctx.stroke();
        ctx.fillText(`F_b=${upthrust.toFixed(2)}N`, blockX - 96, blockY + blockH - arrLen / 2);
      }
      return true;
    }

    case 'sound_reflection': {
      drawGrid(ctx, w, h);
      const iDeg = params.incidentAngle ?? 40;
      const rDeg = params.receiverAngle ?? 40;
      const freq = params.frequency ?? 800;
      const hitX = w * 0.5;
      const hitY = h * 0.72;

      // Reflector wall
      ctx.fillStyle = '#334155';
      ctx.fillRect(w * 0.15, hitY, w * 0.7, 14);
      // Normal line
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hitX, hitY);
      ctx.lineTo(hitX, hitY - 220);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#475569';
      ctx.font = '500 11px "IBM Plex Mono", monospace';
      ctx.fillText('Normal', hitX - 20, hitY - 228);

      const tubeLen = 185;
      const iRad = (iDeg * Math.PI) / 180;
      const rRad = (rDeg * Math.PI) / 180;

      // Incident tube
      const sx = hitX - tubeLen * Math.sin(iRad);
      const sy = hitY - tubeLen * Math.cos(iRad);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(hitX, hitY);
      ctx.stroke();

      // Animated wavefront pulses along incident & reflected paths
      const speedScale = (freq / 800) * 1.5;
      for (let p = 0; p < 4; p++) {
        const prog = (timeSec * speedScale + p * 0.25) % 1;
        const px = sx + (hitX - sx) * prog;
        const py = sy + (hitY - sy) * prog;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // True reflected path
      const trueRx = hitX + tubeLen * Math.sin(iRad);
      const trueRy = hitY - tubeLen * Math.cos(iRad);
      ctx.strokeStyle = 'rgba(5, 150, 105, 0.32)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(hitX, hitY);
      ctx.lineTo(trueRx, trueRy);
      ctx.stroke();

      // Receiver tube
      const rx = hitX + tubeLen * Math.sin(rRad);
      const ry = hitY - tubeLen * Math.cos(rRad);
      const aligned = Math.abs(iDeg - rDeg) <= 2;
      ctx.strokeStyle = aligned ? '#059669' : '#d97706';
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(hitX, hitY);
      ctx.lineTo(rx, ry);
      ctx.stroke();

      for (let p = 0; p < 4; p++) {
        const prog = (timeSec * speedScale + p * 0.25) % 1;
        const px = hitX + (trueRx - hitX) * prog;
        const py = hitY + (trueRy - hitY) * prog;
        ctx.fillStyle = aligned ? '#34d399' : '#fbbf24';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.fillText(`∠i = ${iDeg}°`, hitX - 75, hitY - 45);
      ctx.fillText(`∠r = ${rDeg}°`, hitX + 35, hitY - 45);
      return true;
    }

    case 'ohms_law': {
      drawGrid(ctx, w, h);
      const V = params.voltage ?? 4.5;
      const R0 = params.nominalR ?? 6;
      const T = params.ambientTemp ?? 25;
      const R = R0 * (1 + 0.0042 * Math.max(0, T - 25));
      const I = V / R;

      // Left: Circuit Schematic
      const cx = 60;
      const cy = 65;
      const cw = w * 0.42;
      const ch = h - 130;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(cx, cy, cw, ch);

      // Battery on left edge
      const batY = cy + ch / 2;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx - 12, batY - 22, 24, 44);
      ctx.strokeStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(cx - 14, batY - 8);
      ctx.lineTo(cx + 14, batY - 8);
      ctx.moveTo(cx - 7, batY + 8);
      ctx.lineTo(cx + 7, batY + 8);
      ctx.stroke();
      ctx.fillStyle = '#0284c7';
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.fillText(`${V.toFixed(1)}V`, cx + 18, batY + 4);

      // Resistor on top edge
      const resX = cx + cw / 2;
      ctx.fillStyle = T > 90 ? '#fef2f2' : '#f8fafc';
      ctx.fillRect(resX - 36, cy - 12, 72, 24);
      ctx.strokeStyle = T > 90 ? '#dc2626' : '#0f172a';
      ctx.strokeRect(resX - 36, cy - 12, 72, 24);
      ctx.fillStyle = T > 90 ? '#dc2626' : '#0f172a';
      ctx.fillText(`${R.toFixed(2)}Ω`, resX - 24, cy + 4);

      // Ammeter on right edge
      const amY = cy + ch / 2;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + cw, amY, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.stroke();
      ctx.fillStyle = '#0284c7';
      ctx.fillText('A', cx + cw - 4, amY + 4);
      ctx.fillText(`${I.toFixed(2)}A`, cx + cw - 58, amY + 4);

      // Current electron pulses along loop
      const speed = Math.min(3.5, 0.3 + I * 0.45);
      const perimeter = 2 * (cw + ch);
      for (let k = 0; k < 10; k++) {
        const d = ((timeSec * 90 * speed + (k * perimeter) / 10) % perimeter);
        let px = cx;
        let py = cy;
        if (d < cw) {
          px = cx + d;
          py = cy;
        } else if (d < cw + ch) {
          px = cx + cw;
          py = cy + (d - cw);
        } else if (d < 2 * cw + ch) {
          px = cx + cw - (d - cw - ch);
          py = cy + ch;
        } else {
          px = cx;
          py = cy + ch - (d - 2 * cw - ch);
        }
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Right: Live V-I Graph
      const gx = w * 0.56;
      const gy = 55;
      const gw = w * 0.38;
      const gh = h - 110;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(gx, gy, gw, gh);
      ctx.fillStyle = '#334155';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillText('Live V vs I Characteristic', gx + 12, gy + 20);

      // Ideal dashed R0 line
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(gx + 24, gy + gh - 24);
      ctx.lineTo(gx + gw - 20, gy + gh - 24 - ((12 / R0) / 4) * (gh - 55));
      ctx.stroke();
      ctx.setLineDash([]);

      // Actual line
      ctx.strokeStyle = T > 90 ? '#dc2626' : '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(gx + 24, gy + gh - 24);
      const curX = gx + 24 + (V / 12) * (gw - 44);
      const curY = gy + gh - 24 - Math.min(1, I / 4) * (gh - 55);
      ctx.lineTo(curX, curY);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(curX, curY, 5, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'snell_refraction': {
      drawGrid(ctx, w, h);
      const iDeg = params.angleI ?? 40;
      const n1 = params.n1 ?? 1.0;
      const n2 = params.n2 ?? 1.52;
      const iRad = (iDeg * Math.PI) / 180;
      const sinR = (n1 / n2) * Math.sin(iRad);
      const isTIR = sinR > 1.0;
      const rRad = isTIR ? iRad : Math.asin(sinR);

      const midY = h * 0.5;
      const midX = w * 0.5;

      // Top medium
      ctx.fillStyle = n1 > 1.2 ? 'rgba(14, 165, 233, 0.14)' : '#f8fafc';
      ctx.fillRect(0, 0, w, midY);
      // Bottom medium
      ctx.fillStyle = n2 > 1.2 ? 'rgba(2, 132, 199, 0.22)' : '#f8fafc';
      ctx.fillRect(0, midY, w, h - midY);

      // Interface & Normal
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();

      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(midX, 24);
      ctx.lineTo(midX, h - 24);
      ctx.stroke();
      ctx.setLineDash([]);

      const rayLen = 175;
      const ix = midX - rayLen * Math.sin(iRad);
      const iy = midY - rayLen * Math.cos(iRad);

      // Incident laser ray
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.lineTo(midX, midY);
      ctx.stroke();

      // Refracted or TIR ray
      ctx.strokeStyle = isTIR ? '#dc2626' : '#0284c7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(midX, midY);
      if (isTIR) {
        ctx.lineTo(midX + rayLen * Math.sin(iRad), midY - rayLen * Math.cos(iRad));
      } else {
        ctx.lineTo(midX + rayLen * Math.sin(rRad), midY + rayLen * Math.cos(rRad));
      }
      ctx.stroke();

      // Weak partial reflection when not TIR
      if (!isTIR && iDeg > 0) {
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.28)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.lineTo(midX + rayLen * Math.sin(iRad), midY - rayLen * Math.cos(iRad));
        ctx.stroke();
      }

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.fillText(`Medium 1: n₁ = ${n1.toFixed(2)}`, 24, 30);
      ctx.fillText(`Medium 2: n₂ = ${n2.toFixed(2)}`, 24, midY + 28);
      ctx.fillText(`∠i = ${iDeg}°`, midX - 88, midY - 26);
      ctx.fillText(
        isTIR ? 'TOTAL INTERNAL REFLECTION' : `∠r = ${((rRad * 180) / Math.PI).toFixed(1)}°`,
        midX + 24,
        isTIR ? midY - 26 : midY + 34
      );
      return true;
    }

    case 'lens_mirror': {
      drawGrid(ctx, w, h);
      const u = params.objectDist ?? 35;
      const f = params.focalLength ?? 15;
      const isMirror = (params.elementType ?? 0) === 1;
      const scale = 4.2;
      const cx = w * 0.5;
      const cy = h * 0.54;

      // Principal axis
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, cy);
      ctx.lineTo(w - 20, cy);
      ctx.stroke();

      // Focal markers
      const marks = [-2 * f, -f, f, 2 * f];
      const labels = ['2F', 'F', 'F', '2F'];
      marks.forEach((m, idx) => {
        const mx = cx + m * scale;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(mx, cy, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '500 11px "IBM Plex Mono", monospace';
        ctx.fillText(labels[idx], mx - 6, cy + 18);
      });

      // Optical element at cx
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3;
      if (isMirror) {
        ctx.beginPath();
        ctx.arc(cx - 120, cy, 130, -0.55, 0.55);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(14, 165, 233, 0.16)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 12, 96, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Object arrow
      const objX = cx - u * scale;
      const objH = 48;
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(objX, cy);
      ctx.lineTo(objX, cy - objH);
      ctx.stroke();
      ctx.fillStyle = '#d97706';
      ctx.fillText('Object', objX - 20, cy + 32);

      // Image calculation
      const denom = u - f;
      if (Math.abs(denom) > 0.4) {
        const v = (f * u) / denom;
        const mag = -v / u;
        const imgX = isMirror ? cx - v * scale : cx + v * scale;
        const imgH = clampVal(objH * mag, -110, 110);

        // Principal Ray 1: Parallel then through F
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(objX, cy - objH);
        ctx.lineTo(cx, cy - objH);
        ctx.lineTo(imgX, cy - imgH);
        ctx.stroke();

        // Principal Ray 2: Through optical center
        ctx.strokeStyle = '#059669';
        ctx.beginPath();
        ctx.moveTo(objX, cy - objH);
        ctx.lineTo(imgX, cy - imgH);
        ctx.stroke();

        // Image arrow
        ctx.strokeStyle = v < 0 ? '#7c3aed' : '#059669';
        ctx.lineWidth = 3;
        if (v < 0) ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(imgX, cy);
        ctx.lineTo(imgX, cy - imgH);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = v < 0 ? '#7c3aed' : '#059669';
        ctx.fillText(v < 0 ? 'Virtual Image' : 'Real Image', imgX - 28, cy + 32);
      }
      return true;
    }

    case 'projectile': {
      drawGrid(ctx, w, h);
      const u = params.velocity ?? 28;
      const deg = params.angle ?? 45;
      const drag = params.drag ?? 0;
      const g = params.gravity ?? 9.81;
      const rad = (deg * Math.PI) / 180;

      const pts: { x: number; y: number }[] = [];
      let x = 0;
      let y = 0;
      let vx = u * Math.cos(rad);
      let vy = u * Math.sin(rad);
      const dt = 0.04;
      let maxX = 1;
      let maxY = 1;
      for (let t = 0; t < 18 && y >= 0; t += dt) {
        pts.push({ x, y });
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        vx += -drag * vx * dt;
        vy += (-g - drag * vy) * dt;
        x += vx * dt;
        y += vy * dt;
      }

      const ox = 48;
      const oy = h - 48;
      const scale = Math.min((w - 100) / Math.max(85, maxX * 1.05), (h - 100) / Math.max(42, maxY * 1.15));

      // Ground line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, oy);
      ctx.lineTo(w - 20, oy);
      ctx.stroke();

      // Path curve
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      pts.forEach((pt, idx) => {
        const px = ox + pt.x * scale;
        const py = oy - pt.y * scale;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      // Animated projectile ball
      if (pts.length > 0) {
        const idx = Math.floor(((timeSec * 22) % pts.length));
        const cur = pts[idx];
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(ox + cur.x * scale, oy - cur.y * scale, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'spring_shm': {
      drawGrid(ctx, w, h);
      const m = params.mass ?? 0.5;
      const k = params.stiffness ?? 24;
      const b = params.damping ?? 0.05;
      const omega = Math.sqrt(k / m);
      const zeta = b / (2 * Math.sqrt(k * m));
      const amp = 48 * Math.exp(-zeta * omega * (timeSec % 8));
      const disp = amp * Math.cos(omega * (timeSec % 8));

      const sx = w * 0.26;
      const topY = 38;
      const eqY = 175 + ((m * 9.81) / k) * 90;
      const massY = eqY + disp;

      // Ceiling
      ctx.fillStyle = '#334155';
      ctx.fillRect(sx - 60, topY - 10, 120, 10);

      // Zigzag spring coils
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sx, topY);
      const coils = 12;
      for (let i = 1; i <= coils; i++) {
        const cy = topY + (i / coils) * (massY - topY);
        const cx = sx + (i === coils ? 0 : i % 2 === 0 ? -16 : 16);
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();

      // Mass block
      const side = 36 + m * 12;
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(sx - side / 2, massY, side, side);
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillText(`${m.toFixed(2)}kg`, sx - 20, massY + side / 2 + 4);

      // Right: Damped sinusoid chart
      const gx = w * 0.48;
      const gy = 55;
      const gw = w * 0.46;
      const gh = h - 110;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(gx, gy, gw, gh);
      ctx.fillStyle = '#334155';
      ctx.fillText('x(t) Oscillation Envelope', gx + 12, gy + 20);

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 140; i++) {
        const t = (i / 140) * 6;
        const val = Math.exp(-zeta * omega * t) * Math.cos(omega * t);
        const px = gx + (i / 140) * gw;
        const py = gy + gh / 2 - val * (gh * 0.36);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      return true;
    }

    case 'bernoulli_flow': {
      drawGrid(ctx, w, h);
      const v1 = params.inletVelocity ?? 2.0;
      const ratio = params.throatRatio ?? 0.55;
      const v2 = v1 / (ratio * ratio);
      const midY = h * 0.62;
      const rInlet = 56;
      const rThroat = rInlet * ratio;

      // Pipe profile helper
      const pipeRadius = (xNorm: number) => {
        const constrict = Math.exp(-Math.pow((xNorm - 0.5) / 0.16, 2));
        return rInlet - (rInlet - rThroat) * constrict;
      };

      // Draw pipe walls & fluid fill
      ctx.fillStyle = 'rgba(14, 165, 233, 0.22)';
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const xn = i / 80;
        const px = 40 + xn * (w - 80);
        const py = midY - pipeRadius(xn);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      for (let i = 80; i >= 0; i--) {
        const xn = i / 80;
        const px = 40 + xn * (w - 80);
        const py = midY + pipeRadius(xn);
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Piezometer columns at inlet (0.2) & throat (0.5)
      const p1H = 115;
      const p2H = Math.max(18, p1H - (v2 * v2 - v1 * v1) * 4.5);
      const cols = [
        { xn: 0.2, hCol: p1H, label: 'P₁ Inlet' },
        { xn: 0.5, hCol: p2H, label: 'P₂ Throat' },
        { xn: 0.8, hCol: p1H - 6, label: 'P₃ Outlet' },
      ];
      cols.forEach((c) => {
        const cx = 40 + c.xn * (w - 80);
        const topPipe = midY - pipeRadius(c.xn);
        ctx.fillStyle = 'rgba(2, 132, 199, 0.35)';
        ctx.fillRect(cx - 10, topPipe - c.hCol, 20, c.hCol);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 10, topPipe - 135, 20, 135);
        ctx.fillStyle = '#0f172a';
        ctx.font = '500 10px "IBM Plex Mono", monospace';
        ctx.fillText(c.label, cx - 22, topPipe - 142);
      });

      // Animated streamline particles
      for (let row = -2; row <= 2; row++) {
        for (let p = 0; p < 5; p++) {
          const xn = ((timeSec * 0.28 * (v1 / 2) + p * 0.2 + Math.abs(row) * 0.04) % 1);
          const px = 40 + xn * (w - 80);
          const py = midY + (row / 3) * pipeRadius(xn);
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(px, py, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return true;
    }

    case 'wheatstone_bridge': {
      drawGrid(ctx, w, h);
      const l = params.jockeyCm ?? 35;
      const R = params.knownR ?? 10;
      const Rx = params.unknownPreset ?? 15;
      const nullCm = (100 * Rx) / (Rx + R);
      const ig = (l - nullCm) * 0.45;

      // Meter bridge wooden base & 100cm wire
      const wx = 60;
      const ww = w - 120;
      const wy = h * 0.68;

      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(wx - 10, wy - 12, ww + 20, 34);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(wx - 10, wy - 12, ww + 20, 34);

      // Manganin wire
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + ww, wy);
      ctx.stroke();

      // Ruler ticks
      ctx.fillStyle = '#475569';
      ctx.font = '500 10px "IBM Plex Mono", monospace';
      for (let cm = 0; cm <= 100; cm += 10) {
        const tx = wx + (cm / 100) * ww;
        ctx.beginPath();
        ctx.moveTo(tx, wy + 5);
        ctx.lineTo(tx, wy + 12);
        ctx.stroke();
        ctx.fillText(`${cm}`, tx - 6, wy + 24);
      }

      // Copper L-strips & Resistor gaps at top
      const topY = h * 0.28;
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx, topY);
      ctx.lineTo(wx + ww * 0.18, topY);
      ctx.moveTo(wx + ww * 0.36, topY);
      ctx.lineTo(wx + ww * 0.64, topY);
      ctx.moveTo(wx + ww * 0.82, topY);
      ctx.lineTo(wx + ww, topY);
      ctx.lineTo(wx + ww, wy);
      ctx.stroke();

      // Left gap: Unknown R_x, Right gap: Known R
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(wx + ww * 0.18, topY - 14, ww * 0.18, 28);
      ctx.fillRect(wx + ww * 0.64, topY - 14, ww * 0.18, 28);
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.fillText('R_x = ?', wx + ww * 0.22, topY + 4);
      ctx.fillText(`R = ${R} Ω`, wx + ww * 0.68, topY + 4);

      // Center Galvanometer
      const gx = wx + ww * 0.5;
      const gy = topY + 62;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(gx, gy, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();

      const needleAngle = clampVal(ig * 0.08, -1.0, 1.0);
      ctx.strokeStyle = Math.abs(ig) < 0.28 ? '#059669' : '#dc2626';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(gx, gy + 12);
      ctx.lineTo(gx + 26 * Math.sin(needleAngle), gy + 12 - 26 * Math.cos(needleAngle));
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.font = '600 10px "IBM Plex Mono", monospace';
      ctx.fillText('G', gx - 4, gy + 24);

      // Wire from center node to jockey
      const jx = wx + (l / 100) * ww;
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gx, topY);
      ctx.lineTo(gx, gy - 34);
      ctx.moveTo(gx, gy + 34);
      ctx.lineTo(jx, wy);
      ctx.stroke();

      // Jockey handle
      ctx.fillStyle = Math.abs(ig) < 0.28 ? '#059669' : '#0284c7';
      ctx.beginPath();
      ctx.moveTo(jx, wy);
      ctx.lineTo(jx - 8, wy - 20);
      ctx.lineTo(jx + 8, wy - 20);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`l = ${l.toFixed(1)} cm (drag)`, jx - 42, wy - 26);
      return true;
    }

    case 'pn_diode': {
      drawGrid(ctx, w, h);
      const V = params.biasVoltage ?? 0.7;
      const mat = params.material ?? 0;
      const vKnee = mat === 0 ? 0.7 : 0.3;

      // Left: PN Junction Depletion Bar
      const bx = 42;
      const by = 62;
      const bw = w * 0.42;
      const bh = 130;
      const depWidth = V >= vKnee ? 14 : V >= 0 ? 36 - (V / vKnee) * 22 : Math.min(110, 36 + Math.abs(V) * 10);

      // P-type & N-type
      ctx.fillStyle = 'rgba(217, 119, 6, 0.16)';
      ctx.fillRect(bx, by, bw / 2, bh);
      ctx.fillStyle = 'rgba(2, 132, 199, 0.16)';
      ctx.fillRect(bx + bw / 2, by, bw / 2, bh);
      // Depletion zone
      ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
      ctx.fillRect(bx + bw / 2 - depWidth / 2, by, depWidth, bh);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.fillText('P-Type (+)', bx + 14, by + 24);
      ctx.fillText('N-Type (−)', bx + bw - 88, by + 24);
      ctx.fillText(`Depletion Zone`, bx + bw / 2 - 48, by + bh + 22);

      // Carrier dots moving if conducting
      const conducting = V >= vKnee || V <= -7.0;
      if (conducting) {
        for (let i = 0; i < 8; i++) {
          const prog = (timeSec * 0.9 + i * 0.125) % 1;
          const px = bx + prog * bw;
          const py = by + 48 + (i % 3) * 26;
          ctx.fillStyle = V >= vKnee ? '#059669' : '#dc2626';
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Right: Live I-V Curve
      const gx = w * 0.54;
      const gy = 48;
      const gw = w * 0.41;
      const gh = h - 96;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(gx, gy, gw, gh);

      const ox = gx + gw * 0.65;
      const oy = gy + gh * 0.68;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx + 10, oy);
      ctx.lineTo(gx + gw - 10, oy);
      ctx.moveTo(ox, gy + 10);
      ctx.lineTo(ox, gy + gh - 10);
      ctx.stroke();

      // Plot curve from -8V to +1.2V
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const vv = -8 + (i / 100) * 9.2;
        let ii = 0;
        if (vv >= vKnee) ii = (vv - vKnee) * 18;
        else if (vv < -7) ii = -(Math.abs(vv) - 7) * 14;
        const px = ox + (vv < 0 ? (vv / 8) * (ox - gx - 16) : (vv / 1.3) * (gx + gw - ox - 16));
        const py = oy - clampVal(ii * 5, -gh * 0.28, gh * 0.62);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Active operating point
      let curI = 0;
      if (V >= vKnee) curI = (V - vKnee) * 18;
      else if (V < -7) curI = -(Math.abs(V) - 7) * 14;
      const dotX = ox + (V < 0 ? (V / 8) * (ox - gx - 16) : (V / 1.3) * (gx + gw - ox - 16));
      const dotY = oy - clampVal(curI * 5, -gh * 0.28, gh * 0.62);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(dotX, dotY, 5.5, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'ydse_interference': {
      // Dark optical chamber for crisp laser fringes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      drawGrid(ctx, w, h, 32, true);

      const lam = params.wavelengthNm ?? 550;
      const dMm = params.slitDistMm ?? 0.5;
      const DM = params.screenDistM ?? 1.5;
      const rgb = wavelengthToColor(lam);
      const betaMm = ((lam * 1e-9 * DM) / (dMm * 1e-3)) * 1000;

      const slitX = w * 0.25;
      const scrX = w * 0.72;
      const midY = h * 0.5;
      const slitGap = 16 + dMm * 28;

      // Laser source
      ctx.fillStyle = '#334155';
      ctx.fillRect(28, midY - 14, 58, 28);
      ctx.strokeStyle = rgb;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(86, midY);
      ctx.lineTo(slitX, midY);
      ctx.stroke();

      // Double slit barrier
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(slitX, 30);
      ctx.lineTo(slitX, midY - slitGap - 5);
      ctx.moveTo(slitX, midY - slitGap + 5);
      ctx.lineTo(slitX, midY + slitGap - 5);
      ctx.moveTo(slitX, midY + slitGap + 5);
      ctx.lineTo(slitX, h - 30);
      ctx.stroke();

      // Interfering wavefront arcs
      ctx.strokeStyle = rgb;
      ctx.lineWidth = 1;
      for (let r = 18; r < 180; r += 22) {
        const animR = r + ((timeSec * 36) % 22);
        ctx.globalAlpha = Math.max(0.08, 0.45 - animR / 380);
        ctx.beginPath();
        ctx.arc(slitX, midY - slitGap, animR, -Math.PI / 2.4, Math.PI / 2.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(slitX, midY + slitGap, animR, -Math.PI / 2.4, Math.PI / 2.4);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Interference Fringe Strip & Intensity Curve on Right
      const stripW = 42;
      for (let y = 30; y < h - 30; y++) {
        const yMm = ((y - midY) / (h - 60)) * 18;
        const intensity = Math.pow(Math.cos((Math.PI * yMm) / betaMm), 2);
        ctx.fillStyle = rgb;
        ctx.globalAlpha = intensity;
        ctx.fillRect(scrX, y, stripW, 1.5);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(scrX, 30, stripW, h - 60);

      // Intensity plot beside strip
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let y = 30; y < h - 30; y += 2) {
        const yMm = ((y - midY) / (h - 60)) * 18;
        const intensity = Math.pow(Math.cos((Math.PI * yMm) / betaMm), 2);
        const px = scrX + stripW + 10 + intensity * 72;
        if (y === 30) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.fillText(`λ = ${lam} nm   β = ${betaMm.toFixed(2)} mm`, 28, h - 22);
      return true;
    }

    default:
      return false;
  }
}

function clampVal(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function wavelengthToColor(nm: number): string {
  if (nm < 450) return '#8b5cf6';
  if (nm < 495) return '#3b82f6';
  if (nm < 570) return '#10b981';
  if (nm < 600) return '#eab308';
  if (nm < 630) return '#f97316';
  return '#ef4444';
}
