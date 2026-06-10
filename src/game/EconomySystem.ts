import { Order, IncomeRecord, MedicineQuality } from './types';
import {
  LATE_PENALTY_RATE,
  EARLY_BONUS_RATE,
  URGENCY_BONUS_RATE,
  QUALITY_BONUS_EXCELLENT,
  QUALITY_BONUS_GOOD,
  QUALITY_PENALTY_POOR,
  QUALITY_PENALTY_SPOILED,
} from './constants';

export interface SettlementResult {
  record: IncomeRecord;
  rating: number;
  details: string[];
}

function getQualityBonus(quality: MedicineQuality, baseReward: number): number {
  switch (quality) {
    case 'excellent':
      return Math.floor(baseReward * QUALITY_BONUS_EXCELLENT);
    case 'good':
      return Math.floor(baseReward * QUALITY_BONUS_GOOD);
    default:
      return 0;
  }
}

function getQualityPenalty(quality: MedicineQuality, baseReward: number): number {
  switch (quality) {
    case 'poor':
      return Math.floor(baseReward * QUALITY_PENALTY_POOR);
    case 'spoiled':
      return Math.floor(baseReward * QUALITY_PENALTY_SPOILED);
    default:
      return 0;
  }
}

export function calculateSettlement(order: Order, playerStamina: number): SettlementResult {
  const details: string[] = [];
  const baseReward = order.reward;
  details.push(`基础报酬: ¥${baseReward}`);

  const timeRatio = order.deadline / order.maxDeadline;
  let latePenalty = 0;
  let earlyBonus = 0;

  if (timeRatio < 0.3) {
    latePenalty = Math.floor(baseReward * LATE_PENALTY_RATE * 2);
    details.push(`迟到严重: -¥${latePenalty}`);
  } else if (timeRatio < 0.6) {
    latePenalty = Math.floor(baseReward * LATE_PENALTY_RATE);
    details.push(`迟到扣款: -¥${latePenalty}`);
  } else if (timeRatio > 0.85) {
    earlyBonus = Math.floor(baseReward * EARLY_BONUS_RATE);
    details.push(`提早送达奖励: +¥${earlyBonus}`);
  }

  let urgencyBonus = 0;
  if (order.customerUrgency >= 4 && timeRatio > 0.5) {
    urgencyBonus = Math.floor(baseReward * URGENCY_BONUS_RATE * order.customerUrgency);
    details.push(`紧急单奖励: +¥${urgencyBonus}`);
  }

  let staminaPenalty = 0;
  if (playerStamina < 20) {
    staminaPenalty = Math.floor(baseReward * 0.2);
    details.push(`体力透支: -¥${staminaPenalty}`);
  } else if (playerStamina < 40) {
    staminaPenalty = Math.floor(baseReward * 0.1);
    details.push(`体力不足: -¥${staminaPenalty}`);
  }

  let qualityBonus = 0;
  let qualityPenalty = 0;
  let medicineQuality: MedicineQuality | undefined;

  if (order.type === 'emergency' && order.medicalBox) {
    medicineQuality = order.medicalBox.quality;
    qualityBonus = getQualityBonus(medicineQuality, baseReward);
    qualityPenalty = getQualityPenalty(medicineQuality, baseReward);

    if (qualityBonus > 0) {
      const qualityNames: Record<MedicineQuality, string> = {
        excellent: '药品优秀',
        good: '药品良好',
        acceptable: '',
        poor: '',
        spoiled: '',
      };
      details.push(`${qualityNames[medicineQuality] || '药品合格'}奖励: +¥${qualityBonus}`);
    }
    if (qualityPenalty > 0) {
      const qualityNames: Record<MedicineQuality, string> = {
        excellent: '',
        good: '',
        acceptable: '',
        poor: '药品较差',
        spoiled: '药品失效',
      };
      details.push(`${qualityNames[medicineQuality] || '药品不合格'}扣款: -¥${qualityPenalty}`);
    }
  }

  const bonus = earlyBonus + urgencyBonus + qualityBonus;
  let finalAmount = baseReward - latePenalty - staminaPenalty - qualityPenalty + bonus;

  if (finalAmount < 0) {
    finalAmount = 0;
  }

  const rating = calculateRating(timeRatio, order.customerUrgency, latePenalty > 0, playerStamina, order.type, medicineQuality);
  details.push(`客户评分: ${'⭐'.repeat(rating)}`);

  const finalDetails = details.join(' | ');

  return {
    record: {
      id: `income-${Date.now()}`,
      orderId: order.id,
      orderType: order.type,
      baseReward,
      latePenalty,
      bonus,
      qualityPenalty,
      qualityBonus,
      finalAmount,
      rating,
      medicineQuality,
      completedAt: Date.now(),
      details: finalDetails,
    },
    rating,
    details,
  };
}

function calculateRating(
  timeRatio: number,
  urgency: number,
  isLate: boolean,
  stamina: number,
  orderType: string,
  medicineQuality?: MedicineQuality
): number {
  let rating = 3;

  if (timeRatio > 0.9) {
    rating += 1;
  } else if (timeRatio > 0.75) {
    rating += 0.5;
  } else if (timeRatio < 0.3) {
    rating -= 2;
  } else if (timeRatio < 0.5) {
    rating -= 1;
  }

  if (urgency >= 4 && !isLate) {
    rating += 0.5;
  }

  if (stamina < 20) {
    rating -= 1;
  } else if (stamina < 40) {
    rating -= 0.5;
  }

  if (orderType === 'emergency' && medicineQuality) {
    switch (medicineQuality) {
      case 'excellent':
        rating += 1;
        break;
      case 'good':
        rating += 0.5;
        break;
      case 'poor':
        rating -= 1;
        break;
      case 'spoiled':
        rating -= 2;
        break;
    }
  }

  rating = Math.max(1, Math.min(5, rating));
  return Math.round(rating);
}

export function calculateTotalRating(records: IncomeRecord[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / records.length) * 10) / 10;
}

export function formatMoney(amount: number): string {
  return `¥${amount.toFixed(0)}`;
}

export function getRatingStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  return '⭐'.repeat(fullStars) + (hasHalf ? '☆' : '');
}
