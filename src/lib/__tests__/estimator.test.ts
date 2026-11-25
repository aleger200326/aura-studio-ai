import { describe, expect, it } from 'vitest';
import { calculateQuizDeterministic } from '@/lib/ai/estimator';
import type { QuizAnswers } from '@/types/lead';

describe('calculateQuizDeterministic', () => {
  it('applies minimum 35 sqm rule when areaSqm < 35', () => {
    const answers: QuizAnswers = {
      objectType: 'Новостройка',
      areaSqm: 28,
      style: 'Минимализм',
      serviceNeeded: 'Только дизайн-проект',
      timeline: 'Уже есть ключи',
    };

    const result = calculateQuizDeterministic(answers);
    expect(result.minAreaApplied).toBe(true);
    expect(result.effectiveAreaSqm).toBe(35);
    expect(result.recommendedTariff).toBe('Полный дизайн-проект');
    expect(result.designCostUsd).toBe(35 * 55);
    expect(result.formattedDesignCost).toBe('$1 925');
    expect(result.formattedRenovationCost).toBe('Не требуется');
    expect(result.leadTemperature).toBe('HOT');
  });

  it('calculates 78 sqm VIP turnkey accurately as in PRD example', () => {
    const answers: QuizAnswers = {
      objectType: 'Новостройка',
      areaSqm: 78,
      style: 'Джапанди',
      serviceNeeded: 'Дизайн + ремонт под ключ',
      timeline: 'Уже есть ключи',
    };

    const result = calculateQuizDeterministic(answers);
    expect(result.minAreaApplied).toBe(false);
    expect(result.effectiveAreaSqm).toBe(78);
    expect(result.recommendedTariff).toBe('Под ключ (VIP)');
    expect(result.designCostUsd).toBe(6630);
    expect(result.formattedDesignCost).toBe('$6 630');
    expect(result.renovationCostUsd).toBe(27300);
    expect(result.formattedRenovationCost).toBe('от $27 300');
    expect(result.leadTemperature).toBe('HOT');
  });

  it('calculates 150 sqm sketch tariff accurately and assigns WARM/COLD temperature', () => {
    const answers: QuizAnswers = {
      objectType: 'Загородный дом',
      areaSqm: 150,
      style: 'Неоклассика',
      serviceNeeded: 'Только эскиз и планировка',
      timeline: 'В течение 1–2 месяцев',
    };

    const result = calculateQuizDeterministic(answers);
    expect(result.recommendedTariff).toBe('Эскизный проект');
    expect(result.designCostUsd).toBe(150 * 35);
    expect(result.formattedDesignCost).toBe('$5 250');
    expect(result.leadTemperature).toBe('WARM');

    const coldResult = calculateQuizDeterministic({
      ...answers,
      timeline: 'Прицениваюсь',
    });
    expect(coldResult.leadTemperature).toBe('COLD');
  });
});
