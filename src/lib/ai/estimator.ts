import { generateObject } from 'ai';
import { z } from 'zod';
import type { LeadTemperature } from '@prisma/client';
import { extractTariffRatesFromMarkdown, getKnowledgeBase } from '@/lib/knowledge';
import type { QuizAnswers, QuizResult } from '@/types/lead';
import { resolveActiveAiClient } from './client';
import { buildQuizEstimatorPrompt } from './prompts';

export interface DeterministicCalculation {
  effectiveAreaSqm: number;
  minAreaApplied: boolean;
  recommendedTariff: string;
  designCostUsd: number;
  formattedDesignCost: string;
  renovationCostUsd: number | null;
  formattedRenovationCost: string;
  estimatedTimeline: string;
  leadTemperature: LeadTemperature;
}

export function formatUsd(amount: number): string {
  const rounded = Math.round(amount);
  return `$${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
}

export function calculateQuizDeterministic(
  answers: QuizAnswers,
  rates = {
    sketchRate: 35,
    fullRate: 55,
    vipRate: 85,
    renovationRate: 350,
    minAreaSqm: 35,
  }
): DeterministicCalculation {
  const minAreaApplied = answers.areaSqm < rates.minAreaSqm;
  const effectiveAreaSqm = Math.max(answers.areaSqm, rates.minAreaSqm);

  let recommendedTariff = 'Полный дизайн-проект';
  let designRate = rates.fullRate;
  let renovationCostUsd: number | null = null;
  let estimatedTimeline = '6–8 недель на проект';

  if (answers.serviceNeeded === 'Только эскиз и планировка') {
    recommendedTariff = 'Эскизный проект';
    designRate = rates.sketchRate;
    estimatedTimeline = '3–4 недели на проект';
  } else if (answers.serviceNeeded === 'Только дизайн-проект') {
    recommendedTariff = 'Полный дизайн-проект';
    designRate = rates.fullRate;
    estimatedTimeline = '6–8 недель на проект';
  } else {
    recommendedTariff = 'Под ключ (VIP)';
    designRate = rates.vipRate;
    renovationCostUsd = effectiveAreaSqm * rates.renovationRate;
    const renovationDuration = answers.areaSqm > 100 ? 'от 6 мес.' : 'от 4–6 мес.';
    estimatedTimeline = `6–8 недель на проект + ${renovationDuration} ремонт`;
  }

  const designCostUsd = effectiveAreaSqm * designRate;
  const formattedDesignCost = formatUsd(designCostUsd);
  const formattedRenovationCost =
    renovationCostUsd !== null ? `от ${formatUsd(renovationCostUsd)}` : 'Не требуется';

  let leadTemperature: LeadTemperature = 'COLD';
  if (answers.timeline === 'Уже есть ключи') {
    leadTemperature = 'HOT';
  } else if (answers.timeline === 'В течение 1–2 месяцев') {
    leadTemperature = 'WARM';
  }

  return {
    effectiveAreaSqm,
    minAreaApplied,
    recommendedTariff,
    designCostUsd,
    formattedDesignCost,
    renovationCostUsd,
    formattedRenovationCost,
    estimatedTimeline,
    leadTemperature,
  };
}

const creativeConceptSchema = z.object({
  style_concept_title: z.string().min(4).max(90),
  personal_recommendations: z.tuple([z.string(), z.string(), z.string()]),
  manager_pitch: z.string().min(10).max(260),
});

export function buildFallbackCreative(
  answers: QuizAnswers,
  calc: DeterministicCalculation
): z.infer<typeof creativeConceptSchema> {
  const styleLabel =
    answers.style === 'Пока не определился' ? 'Архитектурный баланс и чистая фактура' : answers.style;

  const titleByStyle: Record<string, string> = {
    Минимализм: 'Тихая геометрия и чистый свет',
    Джапанди: 'Теплый минимализм и природный баланс',
    Контемпорари: 'Сдержанная пластика и тактильный комфорт',
    Неоклассика: 'Современная классика в спокойных тонах',
    'Пока не определился': 'Минеральная архитектура для спокойной жизни',
  };

  const rec1 =
    answers.objectType === 'Вторичка'
      ? `Для вторичного фонда (${answers.areaSqm} м²) заложите первичную ревизию несущих перегородок и мокрых зон — это снизит риски при согласовании перепланировки.`
      : answers.objectType === 'Коммерция'
        ? `Для коммерческого объекта (${answers.areaSqm} м²) выделите в приоритете акустику, износостойкость покрытий и сценарии дневного/вечернего освещения.`
        : `Для объекта типа «${answers.objectType}» (${answers.areaSqm} м²) сфокусируйтесь на проработке 3 вариантов эргономичной планировки с единой системой скрытого хранения.`;

  const rec2 = `В эстетике «${styleLabel}» используйте единую матовую палитру (известняк, микроцемент, выбеленный дуб) и трехуровневый свет без перегруза декора.`;

  const rec3 =
    answers.serviceNeeded === 'Дизайн + ремонт под ключ'
      ? `Формат «${calc.recommendedTariff}» позволит зафиксировать бюджет до старта стройки и сэкономить до 10–15% за счет партнерских скидок при комплектации.`
      : `При расчете по тарифу «${calc.recommendedTariff}» этапность оплаты 30% / 40% / 30% поможет комфортно распределить бюджет на ${calc.estimatedTimeline}.`;

  return {
    style_concept_title: titleByStyle[answers.style] ?? 'Архитектурный баланс и чистый свет',
    personal_recommendations: [rec1, rec2, rec3],
    manager_pitch:
      'На бесплатной 15-минутной встрече ведущий дизайнер разберет вашу планировку и уточнит точную смету реализации под ваш бюджет.',
  };
}

export async function generateQuizEstimate(answers: QuizAnswers): Promise<{
  result: QuizResult;
  leadTemperature: LeadTemperature;
}> {
  let rates = {
    sketchRate: 35,
    fullRate: 55,
    vipRate: 85,
    renovationRate: 350,
    minAreaSqm: 35,
  };

  try {
    const kb = await getKnowledgeBase();
    rates = extractTariffRatesFromMarkdown(kb);
  } catch {
    // Keep default rates
  }

  const calc = calculateQuizDeterministic(answers, rates);
  let creative = buildFallbackCreative(answers, calc);
  const aiClient = await resolveActiveAiClient();

  if (aiClient.model) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);

      const { object } = await generateObject({
        model: aiClient.model,
        temperature: 0.5,
        schema: creativeConceptSchema,
        system: buildQuizEstimatorPrompt(),
        prompt: JSON.stringify({
          objectType: answers.objectType,
          areaSqm: answers.areaSqm,
          effectiveAreaSqm: calc.effectiveAreaSqm,
          minAreaApplied: calc.minAreaApplied,
          style: answers.style,
          serviceNeeded: answers.serviceNeeded,
          timeline: answers.timeline,
          recommendedTariff: calc.recommendedTariff,
          estimatedDesignCostUsd: calc.formattedDesignCost,
          estimatedRenovationCostUsd: calc.formattedRenovationCost,
          estimatedTimeline: calc.estimatedTimeline,
        }),
        abortSignal: controller.signal,
      });

      clearTimeout(timeout);
      creative = object;
    } catch (err) {
      console.warn('[estimator] LLM unavailable or timed out, using deterministic fallback:', err);
    }
  }

  return {
    leadTemperature: calc.leadTemperature,
    result: {
      recommended_tariff: calc.recommendedTariff,
      estimated_design_cost_usd: calc.formattedDesignCost,
      estimated_renovation_cost_usd: calc.formattedRenovationCost,
      estimated_timeline: calc.estimatedTimeline,
      style_concept_title: creative.style_concept_title,
      personal_recommendations: creative.personal_recommendations,
      manager_pitch: creative.manager_pitch,
      effective_area_sqm: calc.effectiveAreaSqm,
      min_area_applied: calc.minAreaApplied,
    },
  };
}
