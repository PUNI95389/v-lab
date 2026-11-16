import { LiveFeedback, SimulationEngineId, SimulationReading } from '../types/lab';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function evaluateSimulation(
  engineId: SimulationEngineId,
  params: Record<string, number>
): SimulationReading {
  switch (engineId) {
    case 'pendulum': {
      const L = params.length ?? 1.0;
      const m = params.mass ?? 80;
      const thetaDeg = params.angle ?? 8;
      const g = params.gravity ?? 9.81;
      const thetaRad = (thetaDeg * Math.PI) / 180;
      const tIdeal = 2 * Math.PI * Math.sqrt(L / g);
      // Large-angle correction factor (1 + theta^2 / 16)
      const anharmonicFactor = 1 + (thetaRad * thetaRad) / 16;
      const tObserved = tIdeal * anharmonicFactor;
      const gMeasured = (4 * Math.PI * Math.PI * L) / (tObserved * tObserved);
      const errPct = Math.abs(((gMeasured - g) / g) * 100);

      let feedback: LiveFeedback;
      const met: number[] = [1]; // mass independence always observable
      if (thetaDeg <= 10) {
        met.push(0);
        if (Math.abs(L - 0.8) < 0.1 || Math.abs(L - 1.0) < 0.1 || Math.abs(L - 1.6) < 0.1) {
          met.push(2);
        }
        feedback = {
          severity: 'verified',
          statusLabel: 'Nominal · Small-Angle SHM',
          headline: 'Isochronous harmonic oscillation regime verified',
          detail: `At θ₀ = ${thetaDeg}°, sin(θ) ≈ θ holds within ${errPct.toFixed(2)}% error. Changing bob mass (${m} g) leaves period T = ${tObserved.toFixed(3)} s invariant.`,
          checkpointIndicesMet: met,
        };
      } else {
        feedback = {
          severity: 'elevated',
          statusLabel: 'Elevated · Anharmonic Deviation',
          headline: 'Release angle exceeds small-angle SHM limit (10°)',
          detail: `At θ₀ = ${thetaDeg}°, non-linear restoring torque lengthens period by ${((anharmonicFactor - 1) * 100).toFixed(2)}%, skewing measured g to ${gMeasured.toFixed(2)} m/s². Reduce θ₀ ≤ 10°.`,
          checkpointIndicesMet: met,
        };
      }

      return {
        readouts: [
          { label: 'Period (T)', value: tObserved.toFixed(3), unit: 's' },
          { label: 'T² Value', value: (tObserved * tObserved).toFixed(3), unit: 's²' },
          { label: 'Measured g', value: gMeasured.toFixed(2), unit: 'm/s²' },
          { label: 'SHM Error', value: errPct.toFixed(2), unit: '%' },
        ],
        observationRow: [
          L.toFixed(2),
          String(m),
          tObserved.toFixed(3),
          (tObserved * tObserved).toFixed(2),
          gMeasured.toFixed(2),
        ],
        theoreticalErrorPct: Number(errPct.toFixed(2)),
        feedback,
      };
    }

    case 'buoyancy': {
      const immersion = params.immersion ?? 60;
      const rhoBlock = params.blockDensity ?? 2700;
      const rhoFluid = params.fluidDensity ?? 1000;
      const volCm3 = params.volume ?? 250;
      const g = 9.81;
      const volM3 = volCm3 * 1e-6;
      const weightAir = rhoBlock * volM3 * g;
      const displacedVolM3 = volM3 * (immersion / 100);
      const upthrust = rhoFluid * displacedVolM3 * g;
      const apparentWeight = Math.max(0, weightAir - upthrust);
      const floats = rhoBlock < rhoFluid;

      const met: number[] = [];
      if (immersion === 0) met.push(0);
      if (immersion === 100) met.push(1);
      if (rhoFluid !== 1000) met.push(2);

      const feedback: LiveFeedback =
        floats && upthrust >= weightAir
          ? {
              severity: 'verified',
              statusLabel: 'Nominal · Floating Equilibrium',
              headline: 'Upthrust balances block weight — object floats',
              detail: `Block density (${rhoBlock} kg/m³) is lower than fluid (${rhoFluid} kg/m³). Spring tension drops to 0.00 N once displaced fluid weight equals ${weightAir.toFixed(2)} N.`,
              checkpointIndicesMet: met,
            }
          : immersion === 100
          ? {
              severity: 'verified',
              statusLabel: 'Verified · Full Immersion',
              headline: 'Displaced fluid weight equals apparent weight loss',
              detail: `Weight loss (${(weightAir - apparentWeight).toFixed(2)} N) matches displaced fluid weight (${upthrust.toFixed(2)} N) to 0.0% discrepancy.`,
              checkpointIndicesMet: met,
            }
          : {
              severity: 'nominal',
              statusLabel: 'Nominal · Partial Submersion',
              headline: `Immersed at ${immersion}% volume`,
              detail: `Spring balance reads ${apparentWeight.toFixed(2)} N while displaced overflow collects ${(displacedVolM3 * 1e6).toFixed(0)} cm³ (${upthrust.toFixed(2)} N upthrust).`,
              checkpointIndicesMet: met,
            };

      return {
        readouts: [
          { label: 'Air Weight', value: weightAir.toFixed(2), unit: 'N' },
          { label: 'Apparent Wt', value: apparentWeight.toFixed(2), unit: 'N' },
          { label: 'Upthrust F_b', value: upthrust.toFixed(2), unit: 'N' },
          { label: 'Displaced Vol', value: (displacedVolM3 * 1e6).toFixed(0), unit: 'cm³' },
        ],
        observationRow: [
          `${immersion}%`,
          weightAir.toFixed(2),
          apparentWeight.toFixed(2),
          upthrust.toFixed(2),
          upthrust.toFixed(2),
        ],
        theoreticalErrorPct: 0.1,
        feedback,
      };
    }

    case 'sound_reflection': {
      const iDeg = params.incidentAngle ?? 40;
      const rDeg = params.receiverAngle ?? 40;
      const freq = params.frequency ?? 800;
      const tempC = params.temperature ?? 22;
      const speed = 331.4 + 0.6 * tempC;
      const wavelength = speed / freq;
      const diff = Math.abs(iDeg - rDeg);
      const db = Math.max(32, 92 * Math.exp(-(diff * diff) / 55));

      const met: number[] = [];
      if (diff <= 2) met.push(0);
      if (diff >= 8) met.push(1);
      if (tempC !== 22) met.push(2);

      const feedback: LiveFeedback =
        diff <= 2
          ? {
              severity: 'verified',
              statusLabel: 'Verified · Specular Match',
              headline: `Maximum acoustic intensity at ∠r = ${rDeg}° (∠i = ${iDeg}°)`,
              detail: `Receiver tube aligns with reflected wavefront normal. Measured sound level peaks at ${db.toFixed(1)} dB with λ = ${(wavelength * 100).toFixed(1)} cm.`,
              checkpointIndicesMet: met,
            }
          : {
              severity: 'elevated',
              statusLabel: 'Elevated · Off-Axis Attenuation',
              headline: `Receiver misaligned by ${diff}° from specular reflection`,
              detail: `Acoustic amplitude dropped to ${db.toFixed(1)} dB. Rotate receiver tube toward ${iDeg}° to satisfy ∠i = ∠r.`,
              checkpointIndicesMet: met,
            };

      return {
        readouts: [
          { label: 'Wave Speed', value: speed.toFixed(1), unit: 'm/s' },
          { label: 'Wavelength λ', value: wavelength.toFixed(3), unit: 'm' },
          { label: 'Receiver Level', value: db.toFixed(1), unit: 'dB' },
          { label: 'Angular Error', value: diff.toFixed(0), unit: 'deg' },
        ],
        observationRow: [
          String(iDeg),
          String(rDeg),
          speed.toFixed(1),
          wavelength.toFixed(3),
          db.toFixed(1),
        ],
        theoreticalErrorPct: Number(((diff / 90) * 100).toFixed(1)),
        feedback,
      };
    }

    case 'thermo_curve': {
      const power = params.heatPower ?? 300;
      const salinity = params.salinity ?? 0;
      const tMin = params.elapsedMin ?? 6.5;
      const fp = -0.55 * salinity;
      const bp = 100 + 0.52 * salinity;
      const scale = power / 300;
      const qUnit = tMin * scale;

      let temp = -15;
      let phase = 'Solid Ice';
      if (qUnit < 1.2) {
        temp = -15 + (qUnit / 1.2) * (fp - -15);
        phase = 'Solid Ice';
      } else if (qUnit < 3.5) {
        temp = fp;
        phase = 'Melting Plateau (Latent Heat)';
      } else if (qUnit < 11.0) {
        temp = fp + ((qUnit - 3.5) / 7.5) * (bp - fp);
        phase = 'Liquid Heating';
      } else if (qUnit < 16.0) {
        temp = bp;
        phase = 'Boiling Plateau (Vaporization)';
      } else {
        temp = bp + (qUnit - 16.0) * 8;
        phase = 'Superheated Steam';
      }

      const met: number[] = [];
      if (phase.includes('Melting')) met.push(0);
      if (phase.includes('Boiling') && salinity === 0) met.push(1);
      if (salinity >= 8) met.push(2);

      const feedback: LiveFeedback =
        phase.includes('Plateau')
          ? {
              severity: 'verified',
              statusLabel: 'Verified · Isothermal Phase Change',
              headline: `${phase} at ${temp.toFixed(1)} °C`,
              detail: `Thermal input (${power} W) supplies latent enthalpy to break intermolecular bonds while thermometer stays locked at ${temp.toFixed(1)} °C.`,
              checkpointIndicesMet: met,
            }
          : {
              severity: 'nominal',
              statusLabel: `Nominal · ${phase}`,
              headline: `Sensible heating at ${temp.toFixed(1)} °C`,
              detail: `Current boiling point with ${salinity}% NaCl is ${bp.toFixed(1)} °C (ΔT_b = +${(bp - 100).toFixed(1)} °C). Scrub time to inspect phase plateaus.`,
              checkpointIndicesMet: met,
            };

      return {
        readouts: [
          { label: 'Probe Temp', value: temp.toFixed(1), unit: '°C' },
          { label: 'Phase State', value: phase.split(' ')[0], unit: '' },
          { label: 'Freezing Pt', value: fp.toFixed(1), unit: '°C' },
          { label: 'Boiling Pt', value: bp.toFixed(1), unit: '°C' },
        ],
        observationRow: [
          tMin.toFixed(2),
          String(salinity),
          temp.toFixed(1),
          phase.split(' ')[0],
          bp.toFixed(1),
        ],
        theoreticalErrorPct: 0.2,
        feedback,
      };
    }

    case 'osmosis_cell': {
      const cExt = params.externalSolute ?? 0.3;
      const cInt = params.internalSolute ?? 0.3;
      const tempC = params.temperature ?? 25;
      const R = 0.0831; // L·bar/(mol·K)
      const T = tempC + 273.15;
      const psiExt = -cExt * R * T * 100; // kPa
      const psiInt = -cInt * R * T * 100; // kPa
      const diff = cInt - cExt;
      const vacuolePct = clamp(72 + diff * 48, 28, 98);
      const turgorKpa = Math.max(0, (cInt - cExt) * 650);

      let tonicity = 'Isotonic';
      let severity: LiveFeedback['severity'] = 'nominal';
      let headline = 'Dynamic water equilibrium across tonoplast';
      let detail = 'Equal solute potential inside and outside results in zero net osmotic flux.';
      const met: number[] = [];

      if (diff > 0.06) {
        tonicity = 'Hypotonic';
        severity = 'verified';
        headline = 'Endosmosis drives cell turgidity';
        detail = `Water enters the central vacuole (${vacuolePct.toFixed(0)}% volume). Cell wall counter-pressure builds to ${turgorKpa.toFixed(0)} kPa without bursting.`;
        met.push(0);
      } else if (diff < -0.06) {
        tonicity = 'Hypertonic';
        severity = cExt >= 0.6 ? 'critical' : 'elevated';
        headline = cExt >= 0.6 ? 'Plasmolysis: membrane detaches from wall' : 'Exosmosis shrinks vacuole';
        detail = `Higher external sucrose (${cExt.toFixed(2)} M) draws water outward, dropping turgor pressure to 0 kPa and contracting cytoplasm.`;
        if (cExt >= 0.6) met.push(2);
      } else {
        met.push(1);
      }

      return {
        readouts: [
          { label: 'Tonicity', value: tonicity, unit: '' },
          { label: 'Vacuole Vol', value: vacuolePct.toFixed(0), unit: '%' },
          { label: 'Turgor Pressure', value: turgorKpa.toFixed(0), unit: 'kPa' },
          { label: 'ΔΨ Potential', value: (psiInt - psiExt).toFixed(0), unit: 'kPa' },
        ],
        observationRow: [
          cExt.toFixed(2),
          cInt.toFixed(2),
          turgorKpa.toFixed(0),
          `${vacuolePct.toFixed(0)}%`,
          tonicity,
        ],
        theoreticalErrorPct: 0.0,
        feedback: {
          severity,
          statusLabel: `${severity === 'critical' ? 'Critical' : 'Nominal'} · ${tonicity}`,
          headline,
          detail,
          checkpointIndicesMet: met,
        },
      };
    }

    case 'linear_coord': {
      const m1 = params.m1 ?? 1.5;
      const c1 = params.c1 ?? -1;
      const m2 = params.m2 ?? -0.5;
      const c2 = params.c2 ?? 3;
      const dm = m1 - m2;
      const isParallel = Math.abs(dm) < 1e-4;
      const isPerp = Math.abs(m1 * m2 + 1) < 0.05;
      let intersection = 'No intersection';
      if (isParallel && Math.abs(c1 - c2) < 1e-4) {
        intersection = 'Coincident (∞)';
      } else if (!isParallel) {
        const x = (c2 - c1) / dm;
        const y = m1 * x + c1;
        intersection = `(${x.toFixed(2)}, ${y.toFixed(2)})`;
      }

      const met: number[] = [];
      if (!isParallel) met.push(0);
      if (isParallel && Math.abs(c1 - c2) >= 0.5) met.push(1);
      if (isPerp) met.push(2);

      const feedback: LiveFeedback = isParallel
        ? {
            severity: 'elevated',
            statusLabel: 'Parallel · Zero Intersection',
            headline: Math.abs(c1 - c2) < 0.01 ? 'Coincident lines (infinite solutions)' : 'Parallel system (inconsistent)',
            detail: `Both lines share slope m = ${m1.toFixed(2)}. They never cross in the Euclidean plane.`,
            checkpointIndicesMet: met,
          }
        : isPerp
        ? {
            severity: 'verified',
            statusLabel: 'Verified · Orthogonal 90°',
            headline: `Perpendicular intersection at ${intersection}`,
            detail: `Product m₁·m₂ = ${(m1 * m2).toFixed(2)} ≈ −1 confirms a 90° geometric crossing.`,
            checkpointIndicesMet: met,
          }
        : {
            severity: 'nominal',
            statusLabel: 'Nominal · Unique Solution',
            headline: `Lines intersect cleanly at ${intersection}`,
            detail: `Solving (${m1.toFixed(2)})x + (${c1.toFixed(1)}) = (${m2.toFixed(2)})x + (${c2.toFixed(1)}) yields a single coordinate root.`,
            checkpointIndicesMet: met,
          };

      return {
        readouts: [
          { label: 'Intersection', value: intersection, unit: '' },
          { label: 'Slope Product', value: (m1 * m2).toFixed(2), unit: '' },
          { label: 'Δ Slope', value: dm.toFixed(2), unit: '' },
          { label: 'Angle', value: isParallel ? '0.0' : ((Math.atan(Math.abs((m1 - m2) / (1 + m1 * m2))) * 180) / Math.PI).toFixed(1), unit: 'deg' },
        ],
        observationRow: [m1.toFixed(2), c1.toFixed(1), m2.toFixed(2), c2.toFixed(1), intersection],
        theoreticalErrorPct: 0,
        feedback,
      };
    }

    case 'ohms_law': {
      const V = params.voltage ?? 4.5;
      const R0 = params.nominalR ?? 6;
      const T = params.ambientTemp ?? 25;
      const alpha = 0.0042; // nichrome/metallic positive temp coeff
      const Ractual = R0 * (1 + alpha * Math.max(0, T - 25));
      const I = V / Ractual;
      const P = V * I;
      const driftPct = ((Ractual - R0) / R0) * 100;

      const met: number[] = [];
      if (T <= 40) met.push(0);
      if (driftPct < 2) met.push(1);
      if (T >= 100) met.push(2);

      let feedback: LiveFeedback;
      if (P > 22) {
        feedback = {
          severity: 'critical',
          statusLabel: 'Overload · Thermal Dissipation Alert',
          headline: `High power dissipation (${P.toFixed(1)} W) heats resistor`,
          detail: `Current I = ${I.toFixed(3)} A drives substantial Joule heating (I²R). Resistance drifted +${driftPct.toFixed(1)}% above nominal ${R0} Ω.`,
          checkpointIndicesMet: met,
        };
      } else if (T > 90) {
        feedback = {
          severity: 'elevated',
          statusLabel: 'Elevated · Non-Ohmic Thermal Drift',
          headline: `Conductor heating raises resistance to ${Ractual.toFixed(2)} Ω`,
          detail: `At ${T}°C, lattice phonon scattering increases resistance by +${driftPct.toFixed(1)}%, bending the V-I curve away from linear R₀.`,
          checkpointIndicesMet: met,
        };
      } else {
        feedback = {
          severity: 'verified',
          statusLabel: 'Nominal · Linear Ohmic Region',
          headline: `Measured R = ${Ractual.toFixed(2)} Ω (within ${driftPct.toFixed(1)}% of R₀)`,
          detail: `Current I = ${I.toFixed(3)} A scales proportionally with voltage V = ${V.toFixed(1)} V.`,
          checkpointIndicesMet: met,
        };
      }

      return {
        readouts: [
          { label: 'Ammeter (I)', value: I.toFixed(3), unit: 'A' },
          { label: 'Measured R', value: Ractual.toFixed(2), unit: 'Ω' },
          { label: 'Power (V·I)', value: P.toFixed(2), unit: 'W' },
          { label: 'Thermal Drift', value: `${driftPct >= 0 ? '+' : ''}${driftPct.toFixed(1)}`, unit: '%' },
        ],
        observationRow: [V.toFixed(1), I.toFixed(3), Ractual.toFixed(2), P.toFixed(2), driftPct.toFixed(1)],
        theoreticalErrorPct: Number(driftPct.toFixed(1)),
        feedback,
      };
    }

    case 'snell_refraction': {
      const iDeg = params.angleI ?? 40;
      const n1 = params.n1 ?? 1.0;
      const n2 = params.n2 ?? 1.52;
      const t = params.slabThickness ?? 5;
      const iRad = (iDeg * Math.PI) / 180;
      const sinR = (n1 / n2) * Math.sin(iRad);
      const isTIR = sinR > 1.0;
      const rRad = isTIR ? Math.PI / 2 : Math.asin(sinR);
      const rDeg = (rRad * 180) / Math.PI;
      const critDeg = n1 > n2 ? (Math.asin(n2 / n1) * 180) / Math.PI : null;
      const lateralShift = isTIR ? 0 : (t * Math.sin(iRad - rRad)) / Math.cos(rRad);
      const snellRatio = iDeg === 0 ? n2 / n1 : Math.sin(iRad) / Math.sin(rRad);

      const met: number[] = [];
      if (n1 === 1.0 && n2 > 1.4 && iDeg >= 25) met.push(0);
      if (!isTIR && Math.abs(snellRatio - n2 / n1) < 0.02) met.push(1);
      if (isTIR) met.push(2);

      const feedback: LiveFeedback = isTIR
        ? {
            severity: 'verified',
            statusLabel: 'Verified · Total Internal Reflection',
            headline: `Critical angle θ_c = ${critDeg?.toFixed(1)}° exceeded`,
            detail: `Since n₁ (${n1.toFixed(2)}) > n₂ (${n2.toFixed(2)}) and ∠i = ${iDeg}° > θ_c, 100% of incident light reflects internally at the boundary.`,
            checkpointIndicesMet: met,
          }
        : {
            severity: 'nominal',
            statusLabel: n2 > n1 ? 'Nominal · Bends Toward Normal' : 'Nominal · Bends Away From Normal',
            headline: `Refracted angle ∠r = ${rDeg.toFixed(1)}° (n₂/n₁ = ${(n2 / n1).toFixed(2)})`,
            detail:
              critDeg !== null
                ? `Critical angle for this denser-to-rarer boundary is ${critDeg.toFixed(1)}°. Lateral slab shift = ${Math.abs(lateralShift).toFixed(2)} cm.`
                : `Snell ratio sin(i)/sin(r) = ${snellRatio.toFixed(3)}. Slab lateral displacement = ${Math.abs(lateralShift).toFixed(2)} cm.`,
            checkpointIndicesMet: met,
          };

      return {
        readouts: [
          { label: 'Refracted ∠r', value: isTIR ? 'TIR' : rDeg.toFixed(1), unit: isTIR ? '' : 'deg' },
          { label: 'Critical θ_c', value: critDeg ? critDeg.toFixed(1) : 'N/A', unit: critDeg ? 'deg' : '' },
          { label: 'sin(i)/sin(r)', value: isTIR ? '—' : snellRatio.toFixed(3), unit: '' },
          { label: 'Lateral Shift', value: Math.abs(lateralShift).toFixed(2), unit: 'cm' },
        ],
        observationRow: [
          String(iDeg),
          isTIR ? 'TIR' : rDeg.toFixed(1),
          (n2 / n1).toFixed(2),
          isTIR ? 'TIR' : snellRatio.toFixed(3),
          Math.abs(lateralShift).toFixed(2),
        ],
        theoreticalErrorPct: 0.1,
        feedback,
      };
    }

    case 'lens_mirror': {
      const uAbs = params.objectDist ?? 35;
      const f = params.focalLength ?? 15;
      const isMirror = (params.elementType ?? 0) === 1;
      // Thin lens: 1/v - 1/u = 1/f with u = -uAbs -> 1/v = 1/f - 1/uAbs
      const denom = uAbs - f;
      const atFocus = Math.abs(denom) < 0.4;
      const v = atFocus ? Infinity : (f * uAbs) / denom;
      const m = atFocus ? Infinity : -v / uAbs;
      const nature = atFocus
        ? 'At Infinity'
        : v > 0
        ? Math.abs(m) > 1.05
          ? 'Real, Inverted, Magnified'
          : Math.abs(m) < 0.95
          ? 'Real, Inverted, Diminished'
          : 'Real, Inverted, Same Size'
        : 'Virtual, Erect, Magnified';

      const met: number[] = [];
      if (Math.abs(uAbs - 2 * f) <= 1) met.push(0);
      if (uAbs > f + 1 && uAbs < 2 * f - 1) met.push(1);
      if (uAbs < f - 1) met.push(2);

      const feedback: LiveFeedback = atFocus
        ? {
            severity: 'elevated',
            statusLabel: 'Focus Limit · Parallel Rays',
            headline: 'Object located at focal plane (u = f)',
            detail: 'Emerging rays travel parallel and converge at infinity; no sharp screen image can be captured.',
            checkpointIndicesMet: met,
          }
        : v < 0
        ? {
            severity: 'verified',
            statusLabel: 'Virtual Image Regime',
            headline: `Upright magnified virtual image (m = +${Math.abs(m).toFixed(2)}×)`,
            detail: `${isMirror ? 'Concave mirror' : 'Convex lens'} acts as a magnifier inside f = ${f} cm. Image appears ${Math.abs(v).toFixed(1)} cm behind.`,
            checkpointIndicesMet: met,
          }
        : {
            severity: 'nominal',
            statusLabel: 'Real Screen Projection',
            headline: `${nature} at v = ${v.toFixed(1)} cm`,
            detail: `Thin-element formula confirms magnification m = ${m.toFixed(2)}× (${Math.abs(uAbs - 2 * f) <= 1 ? 'exact 2F symmetry' : 'inverted real screen focus'}).`,
            checkpointIndicesMet: met,
          };

      return {
        readouts: [
          { label: 'Image Dist v', value: atFocus ? '∞' : v.toFixed(1), unit: atFocus ? '' : 'cm' },
          { label: 'Magnification', value: atFocus ? '∞' : m.toFixed(2), unit: '×' },
          { label: 'Optical Power', value: (100 / f).toFixed(2), unit: 'D' },
          { label: 'Image Type', value: v < 0 ? 'Virtual' : 'Real', unit: '' },
        ],
        observationRow: [
          `-${uAbs}`,
          String(f),
          atFocus ? '∞' : v.toFixed(1),
          atFocus ? '∞' : m.toFixed(2),
          nature,
        ],
        theoreticalErrorPct: 0.2,
        feedback,
      };
    }

    case 'acid_base_ph': {
      const vBase = params.baseAdded ?? 12;
      const vAcid = params.acidVolume ?? 25;
      const c = 0.1;
      const totalV = vAcid + vBase;
      const molesDiff = c * vAcid - c * vBase; // mmol H+ excess
      let ph = 7.0;
      if (Math.abs(molesDiff) < 1e-4) {
        ph = 7.0;
      } else if (molesDiff > 0) {
        ph = clamp(-Math.log10(molesDiff / totalV), 0.8, 6.99);
      } else {
        const poh = -Math.log10(-molesDiff / totalV);
        ph = clamp(14 - poh, 7.01, 13.2);
      }
      const hPlus = Math.pow(10, -ph);
      const state = ph < 6.6 ? 'Acidic' : ph > 7.4 ? 'Alkaline' : 'Neutral Equivalence';

      const met: number[] = [];
      if (vBase === 0) met.push(0);
      if (Math.abs(ph - 7.0) <= 0.35) met.push(1);
      if ((params.indicator ?? 0) > 0) met.push(2);

      const feedback: LiveFeedback =
        Math.abs(ph - 7.0) <= 0.35
          ? {
              severity: 'verified',
              statusLabel: 'Verified · Equivalence Point',
              headline: `Neutralization achieved at pH ${ph.toFixed(2)}`,
              detail: `${vBase.toFixed(1)} mL of 0.1 M NaOH stoichiometrically neutralized ${vAcid.toFixed(0)} mL of 0.1 M HCl.`,
              checkpointIndicesMet: met,
            }
          : {
              severity: ph < 3 || ph > 11 ? 'elevated' : 'nominal',
              statusLabel: `${ph < 7 ? 'Acidic' : 'Basic'} · pH ${ph.toFixed(2)}`,
              headline: `${state} solution ([H⁺] = ${hPlus.toExponential(2)} M)`,
              detail:
                ph < 7
                  ? `Add ${(vAcid - vBase).toFixed(1)} mL more NaOH to reach stoichiometric equivalence at pH 7.00.`
                  : `Overshot equivalence by ${(vBase - vAcid).toFixed(1)} mL NaOH; excess OH⁻ dominates.`,
              checkpointIndicesMet: met,
            };

      return {
        readouts: [
          { label: 'Digital pH', value: ph.toFixed(2), unit: '' },
          { label: '[H⁺] Conc.', value: hPlus.toExponential(1), unit: 'M' },
          { label: 'Total Volume', value: totalV.toFixed(1), unit: 'mL' },
          { label: 'Endpoint Δ', value: (vBase - vAcid).toFixed(1), unit: 'mL' },
        ],
        observationRow: [vBase.toFixed(1), String(vAcid), ph.toFixed(2), hPlus.toExponential(1), state],
        theoreticalErrorPct: Number((Math.abs(vBase - vAcid) * 0.5).toFixed(1)),
        feedback,
      };
    }

    case 'photosynthesis': {
      const light = params.lightIntensity ?? 60;
      const co2 = params.co2Level ?? 5.0;
      const temp = params.temperature ?? 26;
      const lightFactor = light / (light + 22);
      const co2Factor = co2 / (co2 + 1.8);
      const tempFactor =
        temp <= 34
          ? Math.exp(-Math.pow((temp - 30) / 16, 2))
          : Math.max(0.05, Math.exp(-Math.pow((temp - 34) / 7, 2)));
      const rate = Math.round(78 * Math.min(lightFactor, co2Factor) * tempFactor);

      let limiting = 'Balanced Optimum';
      let severity: LiveFeedback['severity'] = 'verified';
      const met: number[] = [];

      if (temp > 41) {
        limiting = 'Thermal Denaturation';
        severity = 'critical';
        met.push(2);
      } else if (co2Factor < lightFactor - 0.08) {
        limiting = 'CO₂ Concentration';
        severity = 'elevated';
        met.push(1);
      } else if (light < 45) {
        limiting = 'Light Intensity';
        severity = 'nominal';
        met.push(0);
      } else {
        met.push(0);
      }

      return {
        readouts: [
          { label: 'O₂ Bubble Rate', value: String(rate), unit: 'bubbles/min' },
          { label: 'Limiting Factor', value: limiting, unit: '' },
          { label: 'Enzyme Activity', value: `${Math.round(tempFactor * 100)}`, unit: '%' },
          { label: 'Chlorophyll Flux', value: `${Math.round(lightFactor * 100)}`, unit: '%' },
        ],
        observationRow: [String(light), co2.toFixed(1), String(temp), String(rate), limiting],
        theoreticalErrorPct: 0.5,
        feedback: {
          severity,
          statusLabel: `${severity === 'critical' ? 'Critical' : severity === 'elevated' ? 'Limited' : 'Nominal'} · ${limiting}`,
          headline:
            limiting === 'Thermal Denaturation'
              ? `RuBisCO enzyme denaturation above 41°C collapses O₂ output`
              : `Rate = ${rate} O₂ bubbles/min (governed by ${limiting})`,
          detail:
            limiting === 'CO₂ Concentration'
              ? `Light is abundant (${light}%), but low dissolved CO₂ (${co2} mM) bottlenecks the Calvin cycle.`
              : limiting === 'Thermal Denaturation'
              ? `Lower water bath temperature back toward 28–32°C to restore active-site folding.`
              : `Adjust light, NaHCO₃ CO₂, or temperature to pinpoint Blackman’s limiting plateau.`,
          checkpointIndicesMet: met,
        },
      };
    }

    case 'quadratic_roots': {
      const a = Math.abs(params.a ?? 1) < 0.1 ? 0.25 : params.a ?? 1;
      const b = params.b ?? -2;
      const c = params.c ?? -3;
      const delta = b * b - 4 * a * c;
      const vx = -b / (2 * a);
      const vy = a * vx * vx + b * vx + c;
      let rootStr = '';
      let severity: LiveFeedback['severity'] = 'nominal';
      const met: number[] = [];

      if (delta > 0.05) {
        const r1 = (-b - Math.sqrt(delta)) / (2 * a);
        const r2 = (-b + Math.sqrt(delta)) / (2 * a);
        rootStr = `${r1.toFixed(2)}, ${r2.toFixed(2)}`;
        severity = 'nominal';
        met.push(0);
      } else if (Math.abs(delta) <= 0.05) {
        rootStr = `Double root: ${vx.toFixed(2)}`;
        severity = 'verified';
        met.push(1);
      } else {
        const imag = Math.sqrt(-delta) / Math.abs(2 * a);
        rootStr = `${vx.toFixed(2)} ± ${imag.toFixed(2)}i`;
        severity = 'elevated';
        met.push(2);
      }

      return {
        readouts: [
          { label: 'Discriminant Δ', value: delta.toFixed(2), unit: '' },
          { label: 'Vertex (h, k)', value: `(${vx.toFixed(2)}, ${vy.toFixed(2)})`, unit: '' },
          { label: 'Roots', value: rootStr, unit: '' },
          { label: 'Concavity', value: a > 0 ? 'Upward (a>0)' : 'Downward (a<0)', unit: '' },
        ],
        observationRow: [a.toFixed(2), b.toFixed(1), c.toFixed(1), delta.toFixed(2), rootStr],
        theoreticalErrorPct: 0,
        feedback: {
          severity,
          statusLabel: delta > 0.05 ? 'Two Real Roots' : Math.abs(delta) <= 0.05 ? 'Tangent Equal Roots' : 'Complex Conjugate Roots',
          headline: `Vertex sits at (${vx.toFixed(2)}, ${vy.toFixed(2)}) with Δ = ${delta.toFixed(2)}`,
          detail:
            Math.abs(delta) <= 0.05
              ? 'Parabola touches the x-axis tangentially at a single repeated root.'
              : delta > 0
              ? `Curve intersects the x-axis at two distinct points: ${rootStr}.`
              : 'Curve does not cross the real x-axis; roots form complex conjugates.',
          checkpointIndicesMet: met,
        },
      };
    }

    case 'projectile': {
      const u = params.velocity ?? 28;
      const deg = params.angle ?? 45;
      const drag = params.drag ?? 0;
      const g = params.gravity ?? 9.81;
      const rad = (deg * Math.PI) / 180;
      const vx0 = u * Math.cos(rad);
      const vy0 = u * Math.sin(rad);
      // Numerical RK/Euler integration with optional quadratic-like linear drag
      let x = 0;
      let y = 0;
      let vx = vx0;
      let vy = vy0;
      let maxH = 0;
      let t = 0;
      const dt = 0.01;
      while (y >= 0 && t < 30) {
        const ax = -drag * vx;
        const ay = -g - drag * vy;
        vx += ax * dt;
        vy += ay * dt;
        x += vx * dt;
        y += vy * dt;
        if (y > maxH) maxH = y;
        t += dt;
      }

      const met: number[] = [];
      if (drag === 0 && (deg === 30 || deg === 60)) met.push(0);
      if (drag === 0 && deg === 45) met.push(1);
      if (drag >= 0.02) met.push(2);

      const feedback: LiveFeedback =
        drag === 0 && deg === 45
          ? {
              severity: 'verified',
              statusLabel: 'Verified · Optimal 45° Range',
              headline: `Maximum vacuum range R = ${x.toFixed(2)} m achieved`,
              detail: `In zero drag, sin(2θ) peaks at θ = 45° with apex height ${maxH.toFixed(2)} m and flight time ${t.toFixed(2)} s.`,
              checkpointIndicesMet: met,
            }
          : drag > 0.01
          ? {
              severity: 'elevated',
              statusLabel: 'Aerodynamic Drag Active',
              headline: `Drag reduces range to ${x.toFixed(2)} m`,
              detail: `Air resistance breaks parabolic symmetry—steepening the descent angle and shortening apex height to ${maxH.toFixed(2)} m.`,
              checkpointIndicesMet: met,
            }
          : {
              severity: 'nominal',
              statusLabel: 'Nominal · Ideal Parabola',
              headline: `Range R = ${x.toFixed(2)} m at θ = ${deg}°`,
              detail: `Complementary angle ${90 - deg}° produces the exact same vacuum range ${x.toFixed(2)} m.`,
              checkpointIndicesMet: met,
            };

      return {
        readouts: [
          { label: 'Range (R)', value: x.toFixed(2), unit: 'm' },
          { label: 'Max Height (H)', value: maxH.toFixed(2), unit: 'm' },
          { label: 'Flight Time', value: t.toFixed(2), unit: 's' },
          { label: 'Impact Speed', value: Math.hypot(vx, vy).toFixed(1), unit: 'm/s' },
        ],
        observationRow: [String(u), String(deg), maxH.toFixed(2), x.toFixed(2), t.toFixed(2)],
        theoreticalErrorPct: 0.2,
        feedback,
      };
    }

    case 'spring_shm': {
      const m = params.mass ?? 0.5;
      const k = params.stiffness ?? 24;
      const b = params.damping ?? 0.05;
      const extCm = ((m * 9.81) / k) * 100;
      const omega0 = Math.sqrt(k / m);
      const zeta = b / (2 * Math.sqrt(k * m));
      const period = (2 * Math.PI) / omega0;
      const freq = 1 / period;

      const met: number[] = [0];
      if (b === 0) met.push(1);
      if (b >= 0.35) met.push(2);

      return {
        readouts: [
          { label: 'Static Ext x₀', value: extCm.toFixed(2), unit: 'cm' },
          { label: 'Period T', value: period.toFixed(3), unit: 's' },
          { label: 'Frequency f', value: freq.toFixed(2), unit: 'Hz' },
          { label: 'Damping ζ', value: zeta.toFixed(3), unit: '' },
        ],
        observationRow: [m.toFixed(2), String(k), extCm.toFixed(2), period.toFixed(3), freq.toFixed(2)],
        theoreticalErrorPct: 0.1,
        feedback: {
          severity: b === 0 ? 'verified' : zeta >= 1 ? 'elevated' : 'nominal',
          statusLabel: b === 0 ? 'Verified · Pure Undamped SHM' : zeta >= 1 ? 'Overdamped' : 'Underdamped Decay',
          headline: b === 0 ? `Zero energy loss at f = ${freq.toFixed(2)} Hz` : `Damping ratio ζ = ${zeta.toFixed(3)}`,
          detail: `Static spring extension is ${extCm.toFixed(1)} cm under ${(m * 9.81).toFixed(2)} N weight.`,
          checkpointIndicesMet: met,
        },
      };
    }

    case 'bernoulli_flow': {
      const v1 = params.inletVelocity ?? 2.0;
      const ratio = params.throatRatio ?? 0.55;
      const rho = params.fluidDensity ?? 1000;
      const v2 = v1 / (ratio * ratio);
      const p1Kpa = 140;
      const dpKpa = (0.5 * rho * (v2 * v2 - v1 * v1)) / 1000;
      const p2Kpa = p1Kpa - dpKpa;
      const reynolds = (rho * v2 * (0.08 * ratio)) / 0.001;

      const met: number[] = [];
      if (v2 > v1 * 1.5) met.push(0);
      if (dpKpa > 4) met.push(1);
      if (p2Kpa < 80) met.push(2);

      const feedback: LiveFeedback =
        p2Kpa < 60
          ? {
              severity: 'critical',
              statusLabel: 'Critical · Cavitation Risk',
              headline: `Throat pressure drops sharply to ${p2Kpa.toFixed(1)} kPa`,
              detail: `High throat speed (${v2.toFixed(2)} m/s) pulls static pressure below vapor cavitation margin. Widen throat ratio or reduce inlet speed.`,
              checkpointIndicesMet: met,
            }
          : {
              severity: 'verified',
              statusLabel: reynolds > 4000 ? 'Nominal · Turbulent Venturi' : 'Nominal · Laminar Venturi',
              headline: `Velocity climbs ${v1.toFixed(1)} → ${v2.toFixed(2)} m/s; pressure drops ΔP = ${dpKpa.toFixed(1)} kPa`,
              detail: `Continuity A₁v₁ = A₂v₂ accelerates flow through constriction, converting pressure head into dynamic kinetic energy.`,
              checkpointIndicesMet: met,
            };

      return {
        readouts: [
          { label: 'Throat Speed v₂', value: v2.toFixed(2), unit: 'm/s' },
          { label: 'Throat Pressure P₂', value: p2Kpa.toFixed(1), unit: 'kPa' },
          { label: 'Venturi ΔP', value: dpKpa.toFixed(1), unit: 'kPa' },
          { label: 'Reynolds Re', value: Math.round(reynolds).toLocaleString(), unit: '' },
        ],
        observationRow: [v1.toFixed(1), v2.toFixed(2), p1Kpa.toFixed(1), p2Kpa.toFixed(1), dpKpa.toFixed(1)],
        theoreticalErrorPct: 0.3,
        feedback,
      };
    }

    case 'chemical_equilibrium': {
      const P = params.pressure ?? 150;
      const T = params.temperature ?? 675;
      const h2 = params.h2Ratio ?? 2.0;
      // Approximate exothermic Haber equilibrium yield %
      const pTerm = Math.pow(P / 200, 0.55);
      const tTerm = Math.exp(-(T - 550) / 260);
      const feedTerm = Math.min(1.25, 0.7 + 0.25 * h2);
      const nh3Yield = clamp(32 * pTerm * tTerm * feedTerm, 4, 82);
      const kp = Math.exp((92400 / 8.314) * (1 / T - 1 / 600)) * 0.45;
      const shift = T > 760 ? 'Reverse (Endothermic)' : P >= 180 ? 'Forward (NH₃ Favored)' : 'Balanced Dynamic';

      const met: number[] = [];
      if (P >= 200) met.push(0);
      if (T >= 800) met.push(1);
      if (nh3Yield >= 35 && T >= 650) met.push(2);

      return {
        readouts: [
          { label: 'NH₃ Yield', value: nh3Yield.toFixed(1), unit: '%' },
          { label: 'Equilibrium Kp', value: kp.toFixed(3), unit: '' },
          { label: 'Shift State', value: shift.split(' ')[0], unit: '' },
          { label: 'Gas Moles Ratio', value: '4 → 2', unit: '' },
        ],
        observationRow: [String(P), String(T), `${nh3Yield.toFixed(1)}%`, kp.toFixed(3), shift],
        theoreticalErrorPct: 0.4,
        feedback: {
          severity: nh3Yield >= 35 && T >= 650 ? 'verified' : T >= 800 ? 'elevated' : 'nominal',
          statusLabel: shift,
          headline: `Equilibrium ammonia conversion sits at ${nh3Yield.toFixed(1)}%`,
          detail:
            T >= 800
              ? 'Elevated temperature shifts exothermic synthesis backward toward N₂ + 3H₂ despite fast kinetics.'
              : 'High pressure drives 4 moles of gas toward 2 moles of NH₃ per Le Chatelier’s Principle.',
          checkpointIndicesMet: met,
        },
      };
    }

    case 'enzyme_kinetics': {
      const S = params.substrate ?? 25;
      const ph = params.ph ?? 7.2;
      const temp = params.temperature ?? 37;
      const VmaxBase = 120;
      const Km = 15;
      const phActivity = Math.exp(-Math.pow((ph - 7.2) / 1.9, 2));
      const tempActivity =
        temp <= 40 ? Math.exp(-Math.pow((temp - 37) / 18, 2)) : Math.max(0.03, Math.exp(-Math.pow((temp - 40) / 6.5, 2)));
      const effectiveVmax = VmaxBase * phActivity * tempActivity;
      const v0 = (effectiveVmax * S) / (Km + S);
      const pctMax = (v0 / VmaxBase) * 100;

      const met: number[] = [];
      if (Math.abs(S - Km) <= 5) met.push(0);
      if (S >= 80 && phActivity > 0.8) met.push(1);
      if (phActivity < 0.4 || tempActivity < 0.4) met.push(2);

      const denatured = phActivity < 0.4 || tempActivity < 0.4;

      return {
        readouts: [
          { label: 'Rate V₀', value: v0.toFixed(1), unit: 'μM/s' },
          { label: 'Active Enzyme', value: `${Math.round(phActivity * tempActivity * 100)}`, unit: '%' },
          { label: 'K_m Constant', value: String(Km), unit: 'mM' },
          { label: 'V_max Share', value: pctMax.toFixed(1), unit: '%' },
        ],
        observationRow: [String(S), ph.toFixed(1), String(temp), v0.toFixed(1), `${pctMax.toFixed(1)}%`],
        theoreticalErrorPct: 0.2,
        feedback: {
          severity: denatured ? 'critical' : S >= 80 ? 'verified' : 'nominal',
          statusLabel: denatured ? 'Critical · Denatured Active Site' : S >= 80 ? 'Saturated Plateau' : 'Nominal · Michaelis Kinetics',
          headline: denatured
            ? `Extreme ${temp > 48 ? 'temperature' : 'pH'} disrupts enzyme tertiary structure`
            : `Initial velocity V₀ = ${v0.toFixed(1)} μM/s (${pctMax.toFixed(0)}% V_max)`,
          detail: denatured
            ? 'Return buffer toward physiological pH 7.2 and 37°C to restore catalytic turnover.'
            : `At [S] = ${S} mM vs K_m = ${Km} mM, substrate binds ${((S / (Km + S)) * 100).toFixed(0)}% of active sites.`,
          checkpointIndicesMet: met,
        },
      };
    }

    case 'trig_conics': {
      const theta = params.theta ?? 45;
      const e = params.eccentricity ?? 0.65;
      const p = params.semiLatus ?? 2.0;
      const rad = (theta * Math.PI) / 180;
      const sinT = Math.sin(rad);
      const cosT = Math.cos(rad);
      const conicType =
        e === 0 ? 'Circle (e = 0)' : e < 0.99 ? 'Ellipse (0 < e < 1)' : Math.abs(e - 1) < 0.03 ? 'Parabola (e = 1)' : 'Hyperbola (e > 1)';

      const met: number[] = [0];
      if (e === 0 || (e > 0.3 && e < 0.9) || Math.abs(e - 1) < 0.03 || e > 1.1) met.push(1);
      if (p !== 2.0 || e !== 0.65) met.push(2);

      return {
        readouts: [
          { label: 'sin θ', value: sinT.toFixed(3), unit: '' },
          { label: 'cos θ', value: cosT.toFixed(3), unit: '' },
          { label: 'sin² + cos²', value: (sinT * sinT + cosT * cosT).toFixed(3), unit: '' },
          { label: 'Conic Locus', value: conicType.split(' ')[0], unit: '' },
        ],
        observationRow: [String(theta), sinT.toFixed(3), cosT.toFixed(3), e.toFixed(2), conicType.split(' ')[0]],
        theoreticalErrorPct: 0,
        feedback: {
          severity: 'verified',
          statusLabel: conicType,
          headline: `Active conic locus: ${conicType}`,
          detail: `Polar radius r(${theta}°) = ${((e * p) / Math.max(0.15, Math.abs(1 + e * cosT))).toFixed(2)} units. Unit identity sin²θ + cos²θ = 1.000 verified.`,
          checkpointIndicesMet: met,
        },
      };
    }

    case 'wheatstone_bridge': {
      const l = params.jockeyCm ?? 35;
      const R = params.knownR ?? 10;
      const RxTrue = params.unknownPreset ?? 15;
      const nullCm = (100 * RxTrue) / (RxTrue + R);
      const imbalance = l - nullCm;
      const igMa = imbalance * 0.45;
      const rxMeasured = R * (l / (100 - l));
      const errPct = Math.abs(((rxMeasured - RxTrue) / RxTrue) * 100);
      const balanced = Math.abs(igMa) < 0.28;

      const met: number[] = [];
      if (balanced) met.push(0);
      if (balanced && l >= 35 && l <= 65) met.push(1);
      if (RxTrue !== 15 && balanced) met.push(2);

      return {
        readouts: [
          { label: 'Galvanometer I_g', value: `${igMa >= 0 ? '+' : ''}${igMa.toFixed(2)}`, unit: 'mA' },
          { label: 'Calc R_x', value: rxMeasured.toFixed(2), unit: 'Ω' },
          { label: 'Null Target l*', value: nullCm.toFixed(1), unit: 'cm' },
          { label: 'Bridge Error', value: errPct.toFixed(2), unit: '%' },
        ],
        observationRow: [String(R), l.toFixed(1), (100 - l).toFixed(1), rxMeasured.toFixed(2), errPct.toFixed(2)],
        theoreticalErrorPct: Number(errPct.toFixed(2)),
        feedback: {
          severity: balanced ? 'verified' : 'elevated',
          statusLabel: balanced ? 'Verified · Null Balance' : igMa > 0 ? 'Right Deflection (+I_g)' : 'Left Deflection (−I_g)',
          headline: balanced
            ? `Zero galvanometer current at l = ${l.toFixed(1)} cm → R_x = ${rxMeasured.toFixed(2)} Ω`
            : `Slide jockey ${imbalance > 0 ? 'left' : 'right'} by ${Math.abs(imbalance).toFixed(1)} cm to zero the needle`,
          detail: balanced
            ? `Balanced Wheatstone bridge ratio R_x / R = ${(l / (100 - l)).toFixed(3)} measures unknown sample within ${errPct.toFixed(2)}% error.`
            : `Potential at jockey (${l.toFixed(1)} cm) differs from node junction; bridge current = ${igMa.toFixed(2)} mA.`,
          checkpointIndicesMet: met,
        },
      };
    }

    case 'pn_diode': {
      const V = params.biasVoltage ?? 0.7;
      const mat = params.material ?? 0; // 0=Si, 1=Ge
      const Rlim = params.seriesR ?? 100;
      const vKnee = mat === 0 ? 0.7 : 0.3;
      const vBr = -7.0;
      let iMa = 0;
      let depletionUm = 1.2;
      let regime = 'Sub-threshold';
      let severity: LiveFeedback['severity'] = 'nominal';

      if (V >= vKnee) {
        iMa = ((V - vKnee) / Rlim) * 1000;
        depletionUm = clamp(0.4 - (V - vKnee) * 0.4, 0.08, 0.4);
        regime = 'Forward Conduction';
        severity = 'verified';
      } else if (V >= 0) {
        iMa = 0.05 * Math.exp(V * 3);
        depletionUm = 1.2 - (V / vKnee) * 0.7;
        regime = 'Forward Barrier';
      } else if (V > vBr) {
        iMa = -0.002;
        depletionUm = 1.2 + Math.abs(V) * 0.35;
        regime = 'Reverse Blocking';
      } else {
        iMa = -((Math.abs(V) - Math.abs(vBr)) * 45 + 5);
        depletionUm = 3.8;
        regime = 'Avalanche Breakdown';
        severity = 'critical';
      }

      const met: number[] = [];
      if (V >= vKnee) met.push(0);
      if (V <= -1.5 && V > vBr) met.push(1);
      if (mat === 1) met.push(2);

      return {
        readouts: [
          { label: 'Diode Current', value: iMa.toFixed(2), unit: 'mA' },
          { label: 'Depletion Width', value: depletionUm.toFixed(2), unit: 'μm' },
          { label: 'Knee Threshold', value: vKnee.toFixed(1), unit: 'V' },
          { label: 'Regime', value: regime.split(' ')[0], unit: '' },
        ],
        observationRow: [V.toFixed(2), mat === 0 ? 'Silicon' : 'Germanium', iMa.toFixed(2), depletionUm.toFixed(2), regime],
        theoreticalErrorPct: 0.1,
        feedback: {
          severity,
          statusLabel: `${severity === 'critical' ? 'Critical' : 'Nominal'} · ${regime}`,
          headline:
            severity === 'critical'
              ? `Reverse breakdown at ${V.toFixed(2)} V triggers surge current`
              : `${mat === 0 ? 'Silicon' : 'Germanium'} junction in ${regime} (${iMa.toFixed(2)} mA)`,
          detail:
            V >= vKnee
              ? `Barrier collapsed to ${depletionUm.toFixed(2)} μm; majority carriers flow freely.`
              : V < 0 && V > vBr
              ? `Depletion barrier widened to ${depletionUm.toFixed(2)} μm, blocking current.`
              : `Increase bias above ${vKnee.toFixed(1)} V knee voltage to initiate forward conduction.`,
          checkpointIndicesMet: met,
        },
      };
    }

    case 'ydse_interference': {
      const lamNm = params.wavelengthNm ?? 550;
      const dMm = params.slitDistMm ?? 0.5;
      const DM = params.screenDistM ?? 1.5;
      const betaMm = ((lamNm * 1e-9 * DM) / (dMm * 1e-3)) * 1000;

      const met: number[] = [];
      if (lamNm <= 460 || lamNm >= 630) met.push(0);
      if (dMm <= 0.35 || dMm >= 0.9) met.push(1);
      met.push(2);

      return {
        readouts: [
          { label: 'Fringe Width β', value: betaMm.toFixed(2), unit: 'mm' },
          { label: 'Wavelength λ', value: String(lamNm), unit: 'nm' },
          { label: 'Order Spacing', value: `${(10 / betaMm).toFixed(1)}`, unit: 'fringes/cm' },
          { label: 'Peak Intensity', value: '4 I₀', unit: '' },
        ],
        observationRow: [String(lamNm), dMm.toFixed(2), DM.toFixed(1), betaMm.toFixed(2), '4 I₀'],
        theoreticalErrorPct: 0.1,
        feedback: {
          severity: 'verified',
          statusLabel: 'Verified · Coherent Interference',
          headline: `Uniform fringe spacing β = ${betaMm.toFixed(2)} mm`,
          detail: `Constructive maxima occur at y_n = n·(${betaMm.toFixed(2)} mm). Widening D or shortening slit spacing d expands fringe separation.`,
          checkpointIndicesMet: met,
        },
      };
    }

    case 'redox_titration': {
      const vKmno4 = params.kmno4Added ?? 8.0;
      const oxM = params.oxalicMolarity ?? 0.045;
      const tempC = params.flaskTemp ?? 60;
      // 2 MnO4- + 5 C2O4^2- => n(KMnO4) = (2/5) * n(oxalic) for 20 mL sample
      const vSample = 20.0;
      const vEq = ((2 / 5) * oxM * vSample) / 0.02;
      const diff = vKmno4 - vEq;
      const calcOxM = ((5 / 2) * 0.02 * vKmno4) / vSample;
      const errPct = Math.abs(((calcOxM - oxM) / oxM) * 100);

      const met: number[] = [];
      if (tempC >= 55 && tempC <= 68) met.push(0);
      const atEndpoint = Math.abs(diff) <= 0.45 && tempC >= 50;
      if (atEndpoint) {
        met.push(1);
        met.push(2);
      }

      let colorState = 'Colorless (Mn²⁺)';
      let severity: LiveFeedback['severity'] = 'nominal';
      let headline = 'Permanganate decolorizing rapidly';
      let detail = `Added ${vKmno4.toFixed(1)} mL. Continue swirling until first persistent pale pink tint.`;

      if (tempC < 45) {
        colorState = 'Slow Brownish Tint';
        severity = 'elevated';
        headline = 'Reaction sluggish below 50°C';
        detail = 'Warm flask to 55–65°C so MnO₄⁻ reduces cleanly to colorless Mn²⁺ without MnO₂ haze.';
      } else if (atEndpoint) {
        colorState = 'Pale Pink Endpoint';
        severity = 'verified';
        headline = `Self-indicator endpoint reached at ${vKmno4.toFixed(1)} mL`;
        detail = `Calculated Oxalic Acid molarity = ${calcOxM.toFixed(4)} M (${errPct.toFixed(1)}% error vs true ${oxM.toFixed(3)} M).`;
      } else if (diff > 0.45) {
        colorState = 'Deep Violet Overshoot';
        severity = 'critical';
        headline = `Overshot endpoint by +${diff.toFixed(1)} mL KMnO₄`;
        detail = 'Excess permanganate turns solution deep purple. Reduce burette volume back to ~' + vEq.toFixed(1) + ' mL.';
      }

      return {
        readouts: [
          { label: 'Burette Read', value: vKmno4.toFixed(1), unit: 'mL' },
          { label: 'Calc Oxalic', value: calcOxM.toFixed(4), unit: 'M' },
          { label: 'Flask State', value: colorState.split(' ')[0], unit: '' },
          { label: 'Titration Error', value: errPct.toFixed(1), unit: '%' },
        ],
        observationRow: [vKmno4.toFixed(1), String(tempC), colorState, calcOxM.toFixed(4), errPct.toFixed(1)],
        theoreticalErrorPct: Number(errPct.toFixed(1)),
        feedback: {
          severity,
          statusLabel: `${severity === 'verified' ? 'Verified' : severity === 'critical' ? 'Overshoot' : 'Titrating'} · ${colorState}`,
          headline,
          detail,
          checkpointIndicesMet: met,
        },
      };
    }

    case 'galvanic_cell': {
      const zn = params.znConc ?? 1.0;
      const cu = params.cuConc ?? 1.0;
      const T = params.temperature ?? 298;
      const E0 = 1.10;
      const Q = zn / cu;
      const nernstSlope = (8.314 * T) / (2 * 96485) * Math.LN10;
      const Ecell = E0 - nernstSlope * Math.log10(Q);
      const deltaG = (-2 * 96485 * Ecell) / 1000; // kJ/mol

      const met: number[] = [];
      if (Math.abs(zn - 1) < 0.1 && Math.abs(cu - 1) < 0.1) met.push(0);
      if (Ecell >= 1.135) met.push(1);
      if (Ecell > 0.9) met.push(2);

      return {
        readouts: [
          { label: 'Cell EMF (E)', value: Ecell.toFixed(3), unit: 'V' },
          { label: 'Reaction Q', value: Q.toFixed(2), unit: '' },
          { label: 'Gibbs ΔG', value: deltaG.toFixed(1), unit: 'kJ/mol' },
          { label: 'Anode → Cathode', value: 'Zn → Cu', unit: '' },
        ],
        observationRow: [zn.toFixed(2), cu.toFixed(2), Q.toFixed(2), Ecell.toFixed(3), deltaG.toFixed(1)],
        theoreticalErrorPct: 0.1,
        feedback: {
          severity: Ecell >= 1.13 ? 'verified' : Ecell < 1.03 ? 'elevated' : 'nominal',
          statusLabel: Ecell >= 1.13 ? 'Verified · Boosted EMF' : 'Nominal · Galvanic Discharge',
          headline: `Live Daniell cell EMF = +${Ecell.toFixed(3)} V (ΔG = ${deltaG.toFixed(1)} kJ/mol)`,
          detail: `Electrons flow from dissolving Zn anode to Cu cathode while K⁺/Cl⁻ ions maintain electroneutrality in the salt bridge.`,
          checkpointIndicesMet: met,
        },
      };
    }

    case 'bohr_effect': {
      const pO2 = params.pO2 ?? 40;
      const ph = params.bloodPh ?? 7.4;
      const pCO2 = params.pCO2 ?? 40;
      // Hill model with Bohr P50 shift
      const p50 = 26.8 * Math.pow(10, -0.48 * (ph - 7.4)) * (1 + 0.002 * (pCO2 - 40));
      const nHill = 2.7;
      const satPct = (Math.pow(pO2, nHill) / (Math.pow(pO2, nHill) + Math.pow(p50, nHill))) * 100;

      const met: number[] = [];
      if (pO2 >= 90 && ph >= 7.35) met.push(0);
      if (ph <= 7.25 && pCO2 >= 55) met.push(1);
      if (pO2 <= 45) met.push(2);

      const rightShifted = p50 > 30;
      return {
        readouts: [
          { label: 'HbO₂ Sat', value: satPct.toFixed(1), unit: '%' },
          { label: 'P₅₀ Shift', value: p50.toFixed(1), unit: 'mmHg' },
          { label: 'O₂ Unloaded', value: (97.5 - satPct).toFixed(1), unit: '%' },
          { label: 'Curve State', value: rightShifted ? 'Right-Shift' : 'Nominal', unit: '' },
        ],
        observationRow: [String(pO2), ph.toFixed(2), String(pCO2), `${satPct.toFixed(1)}%`, p50.toFixed(1)],
        theoreticalErrorPct: 0.2,
        feedback: {
          severity: rightShifted ? 'elevated' : 'verified',
          statusLabel: rightShifted ? 'Elevated CO₂ · Bohr Right Shift' : 'Nominal · Pulmonary/Standard',
          headline: rightShifted
            ? `Acidic Bohr shift raises P₅₀ to ${p50.toFixed(1)} mmHg, accelerating O₂ delivery`
            : `Hemoglobin saturation = ${satPct.toFixed(1)}% at pO₂ = ${pO2} mmHg`,
          detail: rightShifted
            ? `Low pH (${ph.toFixed(2)}) and elevated pCO₂ (${pCO2} mmHg) stabilize deoxyhemoglobin, unloading ${(97.5 - satPct).toFixed(1)}% O₂ to active tissue.`
            : `Cooperative binding across 4 heme subunits produces the sigmoidal saturation curve.`,
          checkpointIndicesMet: met,
        },
      };
    }

    case 'riemann_integral': {
      const n = params.subintervals ?? 8;
      const b = params.upperLimit ?? 3.0;
      const method = params.method ?? 0; // 0 Left, 1 Right, 2 Midpoint, 3 Trap
      const fn = (x: number) => 0.4 * x * x + 0.5;
      const exact = (0.4 / 3) * Math.pow(b, 3) + 0.5 * b;
      const dx = b / n;
      let approx = 0;
      for (let i = 0; i < n; i++) {
        const x0 = i * dx;
        const x1 = (i + 1) * dx;
        if (method === 0) approx += fn(x0) * dx;
        else if (method === 1) approx += fn(x1) * dx;
        else if (method === 2) approx += fn((x0 + x1) / 2) * dx;
        else approx += 0.5 * (fn(x0) + fn(x1)) * dx;
      }
      const errPct = Math.abs(((approx - exact) / exact) * 100);
      const names = ['Left Sum', 'Right Sum', 'Midpoint', 'Trapezoidal'];

      const met: number[] = [];
      if (method <= 1) met.push(0);
      if (method >= 2) met.push(1);
      if (errPct < 0.25) met.push(2);

      return {
        readouts: [
          { label: 'Approx Area', value: approx.toFixed(4), unit: '' },
          { label: 'Exact Integral', value: exact.toFixed(4), unit: '' },
          { label: 'Quadrature Err', value: errPct.toFixed(2), unit: '%' },
          { label: 'Step Width Δx', value: dx.toFixed(3), unit: '' },
        ],
        observationRow: [String(n), names[method], approx.toFixed(4), exact.toFixed(4), errPct.toFixed(2)],
        theoreticalErrorPct: Number(errPct.toFixed(2)),
        feedback: {
          severity: errPct < 0.25 ? 'verified' : 'nominal',
          statusLabel: errPct < 0.25 ? 'Verified · Converged' : `Nominal · ${names[method]}`,
          headline: `${names[method]} yields ${approx.toFixed(4)} vs exact ${exact.toFixed(4)} (${errPct.toFixed(2)}% error)`,
          detail:
            method >= 2
              ? 'Second-order quadrature cancels linear slope error on each partition.'
              : 'Left sum underestimates while Right sum overestimates this monotonically rising parabola.',
          checkpointIndicesMet: met,
        },
      };
    }

    case 'rlc_resonance': {
      const f = params.freqHz ?? 160;
      const R = params.resistance ?? 35;
      const L = (params.inductanceMh ?? 100) * 1e-3;
      const C = (params.capacitanceUf ?? 10) * 1e-6;
      const w = 2 * Math.PI * f;
      const xl = w * L;
      const xc = 1 / (w * C);
      const Z = Math.sqrt(R * R + (xl - xc) * (xl - xc));
      const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
      const qFactor = (1 / R) * Math.sqrt(L / C);
      const vPeak = 10;
      const iMa = (vPeak / Z) * 1000;
      const phaseDeg = (Math.atan2(xl - xc, R) * 180) / Math.PI;
      const atResonance = Math.abs(f - f0) <= 6;

      const met: number[] = [];
      if (atResonance) {
        met.push(0);
        met.push(1);
      }
      if (qFactor > 4) met.push(2);

      return {
        readouts: [
          { label: 'Resonant f₀', value: f0.toFixed(1), unit: 'Hz' },
          { label: 'Impedance Z', value: Z.toFixed(1), unit: 'Ω' },
          { label: 'Current I_pk', value: iMa.toFixed(1), unit: 'mA' },
          { label: 'Phase φ / Q', value: `${phaseDeg.toFixed(1)}° / Q=${qFactor.toFixed(1)}`, unit: '' },
        ],
        observationRow: [String(f), xl.toFixed(1), xc.toFixed(1), Z.toFixed(1), iMa.toFixed(1)],
        theoreticalErrorPct: Number((Math.abs(f - f0) / f0 * 100).toFixed(1)),
        feedback: {
          severity: atResonance ? 'verified' : 'nominal',
          statusLabel: atResonance ? 'Verified · Series Resonance' : phaseDeg < 0 ? 'Capacitive Lead' : 'Inductive Lag',
          headline: atResonance
            ? `Resonance locked at f₀ ≈ ${f0.toFixed(1)} Hz — X_L = X_C, Z = R (${R} Ω)`
            : `Drive at ${f} Hz (f₀ = ${f0.toFixed(1)} Hz), phase shift = ${phaseDeg.toFixed(1)}°`,
          detail: `Quality factor Q = ${qFactor.toFixed(2)}. Lowering resistance R sharpens the resonance bandpass peak.`,
          checkpointIndicesMet: met,
        },
      };
    }

    case 'opamp_gain': {
      const vin = params.vinAmp ?? 1.0;
      const rin = params.rInK ?? 10;
      const rf = params.rFeedbackK ?? 50;
      const topo = params.topology ?? 0; // 0 inv, 1 non-inv
      const gain = topo === 0 ? -(rf / rin) : 1 + rf / rin;
      const vOutIdeal = Math.abs(gain) * vin;
      const vRail = 12.0;
      const clipped = vOutIdeal > vRail;
      const vOutPeak = Math.min(vRail, vOutIdeal);

      const met: number[] = [];
      if (topo === 0 && !clipped) met.push(0);
      if (clipped) met.push(1);
      if (topo === 1) met.push(2);

      return {
        readouts: [
          { label: 'Closed Gain A_v', value: gain.toFixed(1), unit: 'V/V' },
          { label: 'V_out Peak', value: vOutPeak.toFixed(2), unit: 'V' },
          { label: 'Phase Shift', value: topo === 0 ? '180°' : '0°', unit: '' },
          { label: 'Output Stage', value: clipped ? 'Saturated' : 'Linear', unit: '' },
        ],
        observationRow: [topo === 0 ? 'Inverting' : 'Non-Inv', (rf / rin).toFixed(1), gain.toFixed(1), vOutPeak.toFixed(2), clipped ? 'Clipped ±12V' : 'Linear'],
        theoreticalErrorPct: clipped ? 15 : 0.1,
        feedback: {
          severity: clipped ? 'critical' : 'verified',
          statusLabel: clipped ? 'Critical · Rail Clipping (±12 V)' : 'Verified · Linear Amplification',
          headline: clipped
            ? `Ideal V_out (${vOutIdeal.toFixed(1)} V) exceeds ±12 V rails — waveform clipped`
            : `${topo === 0 ? 'Inverting' : 'Non-Inverting'} gain A_v = ${gain.toFixed(1)}× (${vOutPeak.toFixed(2)} V peak)`,
          detail: clipped
            ? 'Reduce V_in amplitude or feedback ratio R_f/R_in to recover undistorted sinusoidal output.'
            : `Negative feedback forces virtual differential zero across Op-Amp inputs.`,
          checkpointIndicesMet: met,
        },
      };
    }

    case 'logic_gates': {
      const A = params.inputA ?? 1;
      const B = params.inputB ?? 0;
      const mode = params.gateMode ?? 3;
      const names = ['AND / NAND', 'OR / NOR', 'XOR / XNOR', 'Half Adder'];
      let out1 = 0;
      let out2 = 0;
      let label1 = 'Out';
      let label2 = 'Comp';

      if (mode === 0) {
        out1 = A & B;
        out2 = out1 ? 0 : 1;
        label1 = 'AND';
        label2 = 'NAND';
      } else if (mode === 1) {
        out1 = A | B;
        out2 = out1 ? 0 : 1;
        label1 = 'OR';
        label2 = 'NOR';
      } else if (mode === 2) {
        out1 = A ^ B;
        out2 = out1 ? 0 : 1;
        label1 = 'XOR';
        label2 = 'XNOR';
      } else {
        out1 = A ^ B;
        out2 = A & B;
        label1 = 'Sum (S)';
        label2 = 'Carry (C)';
      }

      const met: number[] = [0];
      if (mode === 3 && A === 1 && B === 1) met.push(1);
      if (mode === 0 && !(A === 1 && B === 1)) met.push(2);

      return {
        readouts: [
          { label: 'Inputs (A, B)', value: `(${A}, ${B})`, unit: '' },
          { label: label1, value: `${out1} (${out1 ? 'HIGH' : 'LOW'})`, unit: '' },
          { label: label2, value: `${out2} (${out2 ? 'HIGH' : 'LOW'})`, unit: '' },
          { label: 'Module', value: names[mode], unit: '' },
        ],
        observationRow: [names[mode], String(A), String(B), `${label1}=${out1}`, `${label2}=${out2}`],
        theoreticalErrorPct: 0,
        feedback: {
          severity: 'verified',
          statusLabel: 'Verified · Combinational Logic',
          headline: `${names[mode]} evaluates (${A}, ${B}) → ${label1}=${out1}, ${label2}=${out2}`,
          detail:
            mode === 3
              ? `Binary sum ${A} + ${B} = ${out2}${out1}₂ (Carry = ${out2}, Sum = ${out1}).`
              : `Gate propagation verified cleanly with live rail-to-rail logic levels.`,
          checkpointIndicesMet: met,
        },
      };
    }

    case 'beam_bending': {
      const P = params.loadN ?? 400;
      const L = params.lengthM ?? 1.5;
      const EGpa = params.modulusGpa ?? 200;
      const E = EGpa * 1e9;
      // Rectangular cross section: width b=40mm, height h=30mm -> I = bh^3/12
      const b = 0.04;
      const h = 0.03;
      const I = (b * Math.pow(h, 3)) / 12;
      const deltaMm = ((P * Math.pow(L, 3)) / (3 * E * I)) * 1000;
      const Mmax = P * L; // N·m
      const stressMpa = ((Mmax * (h / 2)) / I) / 1e6;
      const yieldLimit = EGpa === 200 ? 250 : EGpa === 69 ? 210 : 45;
      const overstressed = stressMpa > yieldLimit;

      const met: number[] = [];
      if (EGpa === 69 || EGpa === 200) met.push(0);
      if (L >= 2.0) met.push(1);
      if (overstressed) met.push(2);

      return {
        readouts: [
          { label: 'Tip Deflect δ', value: deltaMm.toFixed(2), unit: 'mm' },
          { label: 'Root Moment', value: Mmax.toFixed(0), unit: 'N·m' },
          { label: 'Max Stress σ', value: stressMpa.toFixed(1), unit: 'MPa' },
          { label: 'Safety Margin', value: (yieldLimit / stressMpa).toFixed(2), unit: '×' },
        ],
        observationRow: [String(P), L.toFixed(1), String(EGpa), deltaMm.toFixed(2), stressMpa.toFixed(1)],
        theoreticalErrorPct: 0.1,
        feedback: {
          severity: overstressed ? 'critical' : stressMpa > yieldLimit * 0.75 ? 'elevated' : 'verified',
          statusLabel: overstressed ? 'Critical · Yield Exceeded' : 'Nominal · Elastic Bending',
          headline: overstressed
            ? `Root bending stress (${stressMpa.toFixed(1)} MPa) exceeds yield limit (${yieldLimit} MPa)`
            : `Elastic tip deflection δ = ${deltaMm.toFixed(2)} mm (SF = ${(yieldLimit / stressMpa).toFixed(2)}×)`,
          detail: `Euler-Bernoulli beam model confirms cubic L³ scaling and inverse Young's modulus stiffness.`,
          checkpointIndicesMet: met,
        },
      };
    }

    case 'otto_cycle': {
      const r = params.compRatio ?? 9.5;
      const qIn = params.heatInKj ?? 1100;
      const gamma = params.gamma ?? 1.4;
      const effPct = (1 - Math.pow(r, 1 - gamma)) * 100;
      const wNet = qIn * (effPct / 100);
      const t1 = 300;
      const t2 = t1 * Math.pow(r, gamma - 1);
      const cv = 0.718;
      const t3 = t2 + qIn / cv;
      const knockRisk = r >= 12.5;

      const met: number[] = [];
      if (r >= 9.0) met.push(0);
      if (qIn >= 1100) met.push(1);
      if (knockRisk) met.push(2);

      return {
        readouts: [
          { label: 'Efficiency η', value: effPct.toFixed(1), unit: '%' },
          { label: 'Net Work', value: wNet.toFixed(0), unit: 'kJ/kg' },
          { label: 'Peak Temp T₃', value: Math.round(t3).toString(), unit: 'K' },
          { label: 'End Comp T₂', value: Math.round(t2).toString(), unit: 'K' },
        ],
        observationRow: [r.toFixed(1), gamma.toFixed(2), Math.round(t3).toString(), wNet.toFixed(0), effPct.toFixed(1)],
        theoreticalErrorPct: 0.2,
        feedback: {
          severity: knockRisk ? 'elevated' : 'verified',
          statusLabel: knockRisk ? 'Elevated · Knock Threshold' : 'Verified · Otto P-V Loop',
          headline: knockRisk
            ? `High compression (r = ${r.toFixed(1)}) raises T₂ to ${Math.round(t2)} K — auto-ignition knock risk`
            : `Air-standard thermal efficiency η = ${effPct.toFixed(1)}%`,
          detail: `Enclosed P-V loop delivers ${wNet.toFixed(0)} kJ/kg net work per cycle.`,
          checkpointIndicesMet: met,
        },
      };
    }

    case 'pid_control': {
      const kp = params.kp ?? 5.0;
      const ki = params.ki ?? 1.5;
      const kd = params.kd ?? 2.0;
      // Simulate 2nd-order plant G(s) = 1 / (s^2 + 1.4s + 1)
      let y = 0;
      let dy = 0;
      let integral = 0;
      let prevErr = 1;
      let maxY = 0;
      let settleTime = 6.0;
      const dt = 0.01;
      const trace: number[] = [];
      for (let t = 0; t <= 6.0; t += dt) {
        const err = 1 - y;
        integral += err * dt;
        const deriv = (err - prevErr) / dt;
        const u = kp * err + ki * integral + kd * deriv;
        const ddy = u - 1.4 * dy - 1.0 * y;
        dy += ddy * dt;
        y += dy * dt;
        prevErr = err;
        if (y > maxY) maxY = y;
        if (Math.round(t * 100) % 5 === 0) trace.push(y);
      }
      // Compute settling time within ±2% of final value (1.0)
      for (let idx = trace.length - 1; idx >= 0; idx--) {
        if (Math.abs(trace[idx] - 1.0) > 0.02) {
          settleTime = Math.min(6.0, (idx + 1) * 0.05);
          break;
        }
        if (idx === 0) settleTime = 0.2;
      }
      const overshoot = Math.max(0, (maxY - 1) * 100);
      const ssError = Math.abs(1 - y) * 100;

      const met: number[] = [];
      if (ki === 0 && kd === 0) met.push(0);
      if (ki > 0 && ssError < 2.5) met.push(1);
      if (overshoot <= 10 && settleTime < 3.0 && ssError < 2.0) met.push(2);

      const tuned = overshoot <= 10 && settleTime < 3.0 && ssError < 2.0;

      return {
        readouts: [
          { label: 'Overshoot', value: overshoot.toFixed(1), unit: '%' },
          { label: 'Settling Time', value: settleTime.toFixed(2), unit: 's' },
          { label: 'Steady Error', value: ssError.toFixed(2), unit: '%' },
          { label: 'Response', value: tuned ? 'Critically Tuned' : overshoot > 25 ? 'Ringing' : 'Offset/Slow', unit: '' },
        ],
        observationRow: [kp.toFixed(1), ki.toFixed(2), kd.toFixed(2), overshoot.toFixed(1), settleTime.toFixed(2)],
        theoreticalErrorPct: Number((ssError + overshoot * 0.2).toFixed(1)),
        feedback: {
          severity: tuned ? 'verified' : overshoot > 25 ? 'critical' : 'elevated',
          statusLabel: tuned ? 'Verified · Critically Tuned' : overshoot > 25 ? 'Underdamped Ringing' : 'Steady-State Offset',
          headline: tuned
            ? `Step response settles in ${settleTime.toFixed(2)} s with ${overshoot.toFixed(1)}% overshoot`
            : overshoot > 25
            ? `Excessive overshoot (${overshoot.toFixed(1)}%) — increase Kd damping`
            : `Steady-state error ${ssError.toFixed(1)}% — increase Ki integral action`,
          detail: `Kp speeds rise time, Ki eliminates DC offset, and Kd suppresses oscillatory overshoot.`,
          checkpointIndicesMet: met,
        },
      };
    }

    case 'fourier_series': {
      const N = params.harmonics ?? 5;
      const f0 = params.baseFreq ?? 2;
      const wf = params.waveform ?? 0; // 0 square, 1 sawtooth, 2 triangle
      const wfNames = ['Square', 'Sawtooth', 'Triangle'];
      // Compute RMS approximation error over one period
      let sqErr = 0;
      let sqTarget = 0;
      const samples = 240;
      for (let s = 0; s < samples; s++) {
        const phase = (s / samples) * 2 * Math.PI;
        let target = 0;
        if (wf === 0) target = phase < Math.PI ? 1 : -1;
        else if (wf === 1) target = 1 - phase / Math.PI;
        else target = phase < Math.PI ? -1 + (2 * phase) / Math.PI : 3 - (2 * phase) / Math.PI;

        let synth = 0;
        for (let k = 1; k <= N; k++) {
          if (wf === 0) {
            const n = 2 * k - 1;
            synth += (4 / (Math.PI * n)) * Math.sin(n * phase);
          } else if (wf === 1) {
            synth += (2 / (Math.PI * k)) * Math.sin(k * phase);
          } else {
            const n = 2 * k - 1;
            const sign = (k - 1) % 2 === 0 ? -1 : 1;
            synth += sign * (8 / (Math.PI * Math.PI * n * n)) * Math.cos(n * phase);
          }
        }
        sqErr += (target - synth) * (target - synth);
        sqTarget += target * target;
      }
      const rmsErr = Math.sqrt(sqErr / sqTarget) * 100;

      const met: number[] = [];
      if (wf === 0 && N >= 5) met.push(0);
      if (wf === 0 && N >= 20) met.push(1);
      if (wf === 2) met.push(2);

      return {
        readouts: [
          { label: 'Harmonics N', value: String(N), unit: 'terms' },
          { label: 'RMS Error', value: rmsErr.toFixed(1), unit: '%' },
          { label: 'Max Freq', value: (f0 * (wf === 1 ? N : 2 * N - 1)).toFixed(1), unit: 'Hz' },
          { label: 'Gibbs Spike', value: wf <= 1 && N >= 5 ? '~8.9%' : '0.0%', unit: '' },
        ],
        observationRow: [wfNames[wf], String(N), f0.toFixed(1), rmsErr.toFixed(1), wf === 1 ? 'All n' : 'Odd 2k−1'],
        theoreticalErrorPct: Number(rmsErr.toFixed(1)),
        feedback: {
          severity: N >= 12 || wf === 2 ? 'verified' : 'nominal',
          statusLabel: wf === 0 && N >= 20 ? 'Gibbs Overshoot Visible' : 'Nominal · Harmonic Synthesis',
          headline: `${N}-term ${wfNames[wf]} reconstruction achieves ${rmsErr.toFixed(1)}% RMS error`,
          detail:
            wf === 2
              ? 'Continuous triangle wave coefficients decay as 1/n², converging rapidly without Gibbs ringing.'
              : 'Jump discontinuities leave an ~8.9% Gibbs ringing overshoot regardless of harmonic count.',
          checkpointIndicesMet: met,
        },
      };
    }
  }
}
