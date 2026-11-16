import { SimulationEngineId } from '../types/lab';
import { renderChemBioCanvas } from './renderChemBioCanvas';
import { renderMathEngCanvas } from './renderMathEngCanvas';
import { renderPhysicsCanvas } from './renderPhysicsCanvas';

export function renderSimulationCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  engineId: SimulationEngineId,
  params: Record<string, number>,
  timeSec: number
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  if (renderPhysicsCanvas(ctx, width, height, engineId, params, timeSec)) return;
  if (renderChemBioCanvas(ctx, width, height, engineId, params, timeSec)) return;
  renderMathEngCanvas(ctx, width, height, engineId, params, timeSec);
}

export function handleCanvasPointerInteraction(
  engineId: SimulationEngineId,
  relX: number,
  relY: number,
  width: number,
  height: number,
  params: Record<string, number>,
  onParamChange: (key: string, value: number) => void,
  isClick: boolean
): void {
  if (engineId === 'wheatstone_bridge') {
    const wx = 60;
    const ww = width - 120;
    if (relX >= wx && relX <= wx + ww) {
      const cm = Math.round(((relX - wx) / ww) * 100 * 2) / 2;
      onParamChange('jockeyCm', Math.max(5, Math.min(95, cm)));
    }
    return;
  }

  if (engineId === 'lens_mirror') {
    const cx = width * 0.5;
    if (relX < cx - 25) {
      const u = Math.round((cx - relX) / 4.2);
      onParamChange('objectDist', Math.max(8, Math.min(60, u)));
    }
    return;
  }

  if (engineId === 'snell_refraction') {
    const midX = width * 0.5;
    const midY = height * 0.5;
    if (relY < midY && relX < midX) {
      const deg = Math.round((Math.atan2(midX - relX, midY - relY) * 180) / Math.PI);
      onParamChange('angleI', Math.max(0, Math.min(85, deg)));
    }
    return;
  }

  if (engineId === 'logic_gates' && isClick) {
    if (relX >= 50 && relX <= 140) {
      if (relY >= height * 0.25 && relY <= height * 0.45) {
        onParamChange('inputA', params.inputA ? 0 : 1);
      } else if (relY >= height * 0.55 && relY <= height * 0.75) {
        onParamChange('inputB', params.inputB ? 0 : 1);
      }
    }
  }
}
