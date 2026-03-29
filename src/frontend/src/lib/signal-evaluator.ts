// Signal Evaluator — pure TypeScript, no external calls
// Receives scanner signals + enriched market metrics, returns a structured decision.

import type { SignalResult } from "./pre-pump-scanner";

export type EvalDecision = "approve" | "manual_review" | "reject";

export interface EvaluatorMetrics {
  /** Long/Short Ratio: < 1 = squeeze potential, 1-2 = ok, > 2.1 = crowding, > 3 = severe */
  lsr: number | null;
  /** OI direction inferred from last 6 candles */
  oiTrend: "up" | "down" | "neutral";
  /** Recent trade volume > 1.5x average */
  tradeHeatOk: boolean;
  /** BTC RSI on 1h */
  btcRsi1h: number;
  /** Coin RSI on 1h */
  coinRsi1h: number;
  /** Avg (coin_return - btc_return) over last 12 x 1h candles */
  expBetaBtc: number;
  /** Coin stayed relatively stronger than BTC when BTC had its biggest drop in window */
  expResetGate: boolean;
  /** Coin is outperforming BTC in the last 2h */
  expNowGate: boolean;
  /** BTC RSI dropped below 45 in the recent 12h window */
  inResetWindow: boolean;
  /** Raw funding rate value (null if unavailable) */
  fundingRateVal: number | null;
}

export interface EvalResult {
  decision: EvalDecision;
  /** 0.0 – 10.0 */
  confidence: number;
  reason_short: string;
  pros: string[];
  cons: string[];
  risk_flags: string[];
}

export function evaluateSignals(
  scanSignals: SignalResult,
  metrics: EvaluatorMetrics,
): EvalResult {
  const pros: string[] = [];
  const cons: string[] = [];
  const risk_flags: string[] = [];
  let score = 0;

  // ── LSR (crowding / squeeze potential) ──────────────────────────────────────
  if (metrics.lsr !== null) {
    if (metrics.lsr < 1) {
      pros.push(`LSR ${metrics.lsr.toFixed(2)}: potencial de short squeeze`);
      score += 2;
    } else if (metrics.lsr <= 2) {
      pros.push(`LSR ${metrics.lsr.toFixed(2)}: faixa saudável para long`);
      score += 1;
    } else if (metrics.lsr <= 3) {
      cons.push(`LSR ${metrics.lsr.toFixed(2)}: crowding moderado`);
      risk_flags.push("Crowding moderado — LSR > 2.1");
      score -= 1;
    } else {
      cons.push(`LSR ${metrics.lsr.toFixed(2)}: crowding severo`);
      risk_flags.push("Crowding extremo — LSR > 3");
      score -= 3;
    }
  }

  // ── EXP beta vs BTC (relative strength) ─────────────────────────────────────
  if (metrics.expBetaBtc > 0.015) {
    pros.push("Força relativa positiva vs BTC (EXP beta)");
    score += 2;
  } else if (metrics.expBetaBtc > 0) {
    pros.push("Leve superdesempenho vs BTC");
    score += 0.5;
  } else if (metrics.expBetaBtc < -0.015) {
    cons.push("Moeda consistentemente mais fraca que o BTC");
    score -= 1;
  } else {
    cons.push("EXP beta neutro vs BTC — sem liderança clara");
  }

  // ── EXP gates (reset coherence) ──────────────────────────────────────────────
  if (metrics.expResetGate && metrics.expNowGate) {
    pros.push("Força confirmada no reset do BTC e mantida agora");
    score += 2;
  } else if (metrics.expResetGate && !metrics.expNowGate) {
    cons.push("Força no reset mas enfraquecendo no momento atual");
    risk_flags.push("Força relativa deteriorando");
    score -= 1;
  } else if (!metrics.expResetGate && metrics.expNowGate) {
    pros.push("Força emergindo agora");
    score += 0.5;
    risk_flags.push("Sem confirmação no reset — pode ser entrada tardia");
  } else {
    cons.push("Sem força relativa no reset nem agora");
    score -= 0.5;
  }

  // ── OI direction ─────────────────────────────────────────────────────────────
  if (metrics.oiTrend === "up") {
    pros.push("Open Interest crescendo: entrada de capital confirmada");
    score += 1;
  } else if (metrics.oiTrend === "down") {
    cons.push("Open Interest caindo: possível unwind de posições");
    risk_flags.push("OI em queda");
    score -= 1;
  }

  // ── Trade heat ───────────────────────────────────────────────────────────────
  if (metrics.tradeHeatOk) {
    pros.push("Volume de trades acima da média: mercado vivo");
    score += 1;
  } else {
    cons.push("Atividade de trades abaixo da média");
    risk_flags.push("Baixa participação");
    score -= 0.5;
  }

  // ── RSI context ──────────────────────────────────────────────────────────────
  if (metrics.coinRsi1h > 40 && metrics.coinRsi1h > metrics.btcRsi1h + 5) {
    pros.push(
      `RSI moeda (${metrics.coinRsi1h.toFixed(0)}) acima de 40 e superior ao BTC (${metrics.btcRsi1h.toFixed(0)})`,
    );
    score += 1;
  } else if (metrics.coinRsi1h < 40) {
    cons.push(`RSI moeda (${metrics.coinRsi1h.toFixed(0)}) abaixo de 40 no 1h`);
    score -= 0.5;
  } else if (metrics.coinRsi1h <= metrics.btcRsi1h) {
    cons.push(
      `RSI moeda (${metrics.coinRsi1h.toFixed(0)}) não supera o BTC (${metrics.btcRsi1h.toFixed(0)})`,
    );
  }

  // ── BTC reset window ─────────────────────────────────────────────────────────
  if (metrics.inResetWindow) {
    pros.push("Força mantida durante janela de reset/sobrevenda do BTC");
    score += 1;
  }

  // ── Funding rate ─────────────────────────────────────────────────────────────
  if (metrics.fundingRateVal !== null) {
    if (metrics.fundingRateVal < 0) {
      pros.push(
        `Funding negativo (${(metrics.fundingRateVal * 100).toFixed(4)}%): shorts financiando longs`,
      );
      score += 0.5;
    } else if (metrics.fundingRateVal > 0.0005) {
      risk_flags.push("Funding positivo elevado");
      score -= 0.5;
    }
  }

  // ── Base signal score blending (0-6 from scanner) ───────────────────────────
  // Neutral at 3; each signal above/below 3 adds/subtracts 0.5
  score += (scanSignals.score - 3) * 0.5;

  // ── Decision ─────────────────────────────────────────────────────────────────
  const hasHardReject = risk_flags.some((f) => f.includes("Crowding extremo"));
  const hasDeterioration = risk_flags.includes("Força relativa deteriorando");

  let decision: EvalDecision;
  let reason_short: string;

  if (hasHardReject || score < -2) {
    decision = "reject";
    reason_short = hasHardReject
      ? "Crowding extremo — LSR acima de 3"
      : (cons[0] ?? "Contexto fraco ou inconsistente");
  } else if (
    score >= 4 &&
    pros.length >= 3 &&
    cons.length <= 1 &&
    risk_flags.length === 0
  ) {
    decision = "approve";
    reason_short = pros[0] ?? "Contexto forte e coerente";
  } else if (score >= 2 && !hasDeterioration && risk_flags.length <= 1) {
    // borderline — could be approve or manual_review
    // only approve if scanner signals are strong (5+) too
    if (scanSignals.score >= 5 && pros.length >= 3) {
      decision = "approve";
      reason_short = pros[0] ?? "Confluência forte com contexto favorável";
    } else {
      decision = "manual_review";
      reason_short =
        risk_flags[0] ?? cons[0] ?? "Sinais mistos — revisar contexto";
    }
  } else {
    decision = "manual_review";
    reason_short =
      risk_flags[0] ??
      cons[0] ??
      "Contexto ambíguo — revisão manual recomendada";
  }

  const confidence = Math.max(
    0,
    Math.min(10, Math.round((5 + score) * 10) / 10),
  );

  return { decision, confidence, reason_short, pros, cons, risk_flags };
}
