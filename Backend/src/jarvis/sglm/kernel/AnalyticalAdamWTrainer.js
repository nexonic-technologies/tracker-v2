import { ITrainer } from '../core/Contracts.js';

/**
 * AnalyticalAdamWTrainer
 * Conforms to ITrainer with AdamW momentum updates and gradient clipping.
 * (Zero Hardcoding: Configurable hyper-parameters passed via constructor)
 */
export class AnalyticalAdamWTrainer extends ITrainer {
  constructor({
    model,
    learningRate = 0.005,
    weightDecay = 0.0001,
    beta1 = 0.9,
    beta2 = 0.999,
    eps = 1e-8,
    clipNorm = 1.0,
  } = {}) {
    super();
    this.model = model;
    this.lr = learningRate;
    this.weightDecay = weightDecay;
    this.beta1 = beta1;
    this.beta2 = beta2;
    this.eps = eps;
    this.clipNorm = clipNorm;
    this.t = 0;

    this._initMoments();
  }

  _initMoments() {
    this.m = {};
    this.v = {};
    for (const key of Object.keys(this.model.weights)) {
      this.m[key] = new Float64Array(this.model.weights[key].length);
      this.v[key] = new Float64Array(this.model.weights[key].length);
    }
  }

  get currentStep() {
    return this.t;
  }

  /**
   * Applies global norm gradient clipping
   */
  _clipGradients(grads) {
    let sumSq = 0;
    for (const g of Object.values(grads)) {
      for (let i = 0; i < g.length; i++) {
        sumSq += g[i] * g[i];
      }
    }
    const globalNorm = Math.sqrt(sumSq);
    if (globalNorm > this.clipNorm) {
      const scale = this.clipNorm / (globalNorm + 1e-12);
      for (const g of Object.values(grads)) {
        for (let i = 0; i < g.length; i++) {
          g[i] *= scale;
        }
      }
    }
    return globalNorm;
  }

  /**
   * Performs an AdamW optimization step
   * @param {Object} grads
   */
  step(grads) {
    this.t++;
    this._clipGradients(grads);

    const lr = this.lr;
    const beta1 = this.beta1;
    const beta2 = this.beta2;
    const eps = this.eps;
    const wd = this.weightDecay;
    const t = this.t;

    for (const key of Object.keys(this.model.weights)) {
      const w = this.model.weights[key];
      const g = grads[key];
      if (!g) continue;

      if (!this.m[key] || this.m[key].length !== w.length) {
        const newM = new Float64Array(w.length);
        const newV = new Float64Array(w.length);
        if (this.m[key]) newM.set(this.m[key].subarray(0, Math.min(this.m[key].length, w.length)));
        if (this.v[key]) newV.set(this.v[key].subarray(0, Math.min(this.v[key].length, w.length)));
        this.m[key] = newM;
        this.v[key] = newV;
      }

      const m = this.m[key];
      const v = this.v[key];

      let gNorm = 0, wBefore = 0, updateNorm = 0, wAfter = 0;
      const traceKey = Boolean(globalThis.__SGLM_TRACE__ && ['wcq', 'wck', 'wqr', 'wkr', 'wvr', 'wq0', 'w10', 'wte'].includes(key));

      if (traceKey) {
        for (let i = 0; i < w.length; i++) {
          gNorm += g[i] * g[i];
          wBefore += w[i] * w[i];
        }
      }

      for (let i = 0; i < w.length; i++) {
        // Weight decay
        w[i] -= lr * wd * w[i];

        // Momentum updates
        m[i] = beta1 * m[i] + (1 - beta1) * g[i];
        v[i] = beta2 * v[i] + (1 - beta2) * (g[i] * g[i]);

        // Bias correction
        const mHat = m[i] / (1 - Math.pow(beta1, t));
        const vHat = v[i] / (1 - Math.pow(beta2, t));

        // Parameter update
        const delta = (lr * mHat) / (Math.sqrt(vHat) + eps);
        w[i] -= delta;
        if (traceKey) {
          updateNorm += delta * delta;
          wAfter += w[i] * w[i];
        }
      }

      if (traceKey) {
        console.log(`[FILE: AnalyticalAdamWTrainer.js]`);
        console.log(`[LINE: 122]`);
        console.log(`[FUNCTION: step()]`);
        console.log(`[ACTION: WEIGHT_UPDATE]\n`);
        console.log(`Parameter:     "${key}"`);
        console.log(`Gradient norm: ${Math.sqrt(gNorm).toFixed(6)}`);
        console.log(`Weight before: ${Math.sqrt(wBefore).toFixed(6)}`);
        console.log(`Update norm:   ${Math.sqrt(updateNorm).toFixed(6)}`);
        console.log(`Weight after:  ${Math.sqrt(wAfter).toFixed(6)}\n`);
      }
    }
  }

  /**
   * Trains on a batch of { input, target, lossMask?, preventSelfCopy? } pairs
   * @param {Array<{ input: number[], target: number[], lossMask?: number[], preventSelfCopy?: boolean }>} batch
   * @returns {{ meanLoss: number }}
   */
  trainBatch(batch) {
    if (!Array.isArray(batch) || batch.length === 0) return { meanLoss: 0, lastGrads: null };
    let totalLoss = 0;
    let lastGrads = null;

    for (const sample of batch) {
      const { loss, grads } = this.model.lossAndGrad(
        sample.input,
        sample.target,
        sample.lossMask || null,
        Boolean(sample.preventSelfCopy),
        Boolean(sample.maskBOS),
        Boolean(sample.normQK),
        sample.copyScale || 1.0,
        sample.querySpan || null
      );
      this.step(grads);
      totalLoss += loss;
      lastGrads = grads;
    }

    return { meanLoss: totalLoss / batch.length, lastGrads };
  }
}
