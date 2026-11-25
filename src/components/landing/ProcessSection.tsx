'use client';

import { useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
} from 'framer-motion';
import { Compass, FileCheck2, KeyRound, Layers, Ruler } from 'lucide-react';

interface ProcessStep {
  num: string;
  title: string;
  detail: string;
  threshold: number;
  icon: typeof Compass;
  cx: number;
  cy: number;
  image: string;
}

const PROCESS_STEPS: ProcessStep[] = [
  {
    num: '01',
    title: 'Консультация и замер',
    detail: '1–2 дня · Техническое задание и аудит объекта',
    threshold: 0.12,
    icon: Ruler,
    cx: 90,
    cy: 210,
    image: '/images/hero-interior.jpg',
  },
  {
    num: '02',
    title: 'Договор и планировка',
    detail: '30% предоплата · 3 варианта эргономичных решений',
    threshold: 0.34,
    icon: Compass,
    cx: 325,
    cy: 110,
    image: '/images/portfolio-japandi.jpg',
  },
  {
    num: '03',
    title: '3D-визуализация',
    detail: '40% оплата · Фотореалистичные кадры и 2 круга правок',
    threshold: 0.55,
    icon: Layers,
    cx: 560,
    cy: 215,
    image: '/images/portfolio-minimal.jpg',
  },
  {
    num: '04',
    title: 'Рабочие чертежи и смета',
    detail: '30% оплата · Полный альбом, ведомость и артикулы',
    threshold: 0.76,
    icon: FileCheck2,
    cx: 795,
    cy: 105,
    image: '/images/portfolio-neoclassic.jpg',
  },
  {
    num: '05',
    title: 'Ремонт под ключ и стайлинг',
    detail: 'Гарантия 2 года · Надзор, комплектация и декорирование',
    threshold: 0.94,
    icon: KeyRound,
    cx: 1015,
    cy: 205,
    image: '/images/portfolio-commercial.jpg',
  },
];

const DESKTOP_S_PATH =
  'M 90 210 C 175 210, 235 110, 325 110 C 415 110, 470 215, 560 215 C 650 215, 705 105, 795 105 C 885 105, 935 205, 1015 205';

const MOBILE_SNAKE_PATH =
  'M 28 24 C 28 70, 28 90, 28 134 C 28 180, 28 200, 28 244 C 28 290, 28 310, 28 354 C 28 400, 28 420, 28 464';

export function ProcessSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const [progress, setProgress] = useState(prefersReduced ? 1 : 0.15);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 75%', 'end 65%'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    restDelta: 0.001,
  });
  const fullPath = useMotionValue(1);

  useMotionValueEvent(smoothProgress, 'change', (latest) => {
    if (!prefersReduced) {
      setProgress(latest);
    }
  });

  const activeProgress = prefersReduced ? 1 : progress;

  return (
    <section id="process" ref={sectionRef} className="mx-3 sm:mx-6">
      {/* Centrysk Glacial Ice-White & Sky-Cyan Atmospheric Backdrop */}
      <div
        className="relative mx-auto max-w-[1360px] overflow-hidden rounded-[24px] border border-[#0D1014]/10 px-5 py-16 text-[var(--text-primary)] shadow-[0_32px_80px_-24px_rgba(10,12,15,0.12)] sm:rounded-[32px] sm:px-10 sm:py-24"
        style={{
          background:
            'radial-gradient(ellipse 75% 65% at 50% 42%, #FFFFFF 0%, #E7F5FC 50%, #AEDEF3 100%)',
        }}
      >
        {/* Subtle monochrome architectural backdrop silhouette (Centrysk aesthetic) */}
        <img
          src="/images/portfolio-commercial.jpg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.11] grayscale contrast-125 mix-blend-multiply"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 35%, rgba(255,255,255,0.72) 0%, rgba(214,239,250,0.45) 60%, rgba(160,217,242,0.55) 100%)',
          }}
        />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="inline-flex items-center rounded-full border border-[#0D1014]/12 bg-white/85 px-3.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#0088CC] backdrop-blur-sm">
                02 / МАРШРУТ ПРОЕКТА
              </span>
              <h2 className="mt-4 font-serif text-[clamp(2.1rem,3.8vw,3.4rem)] font-semibold leading-[1.08] tracking-[-0.015em] text-[#0D1014]">
                От замера до ключей —{' '}
                <span className="italic text-[#0088CC]">5 понятных этапов</span>
              </h2>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.08em] text-[#495460]">
              <span>Прогресс маршрута:</span>
              <span className="tabular-nums rounded-full border border-white bg-white/90 px-3 py-1 font-semibold text-[#0088CC] shadow-sm">
                {Math.round(Math.min(1, Math.max(0, activeProgress)) * 100)}%
              </span>
            </div>
          </div>

          {/* Desktop S-Route */}
          <div className="relative mt-14 hidden lg:block">
            <svg
              viewBox="0 0 1100 320"
              className="h-[310px] w-full overflow-visible"
              fill="none"
            >
              <defs>
                <linearGradient id="aura-route-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0088CC" />
                  <stop offset="100%" stopColor="#38BDF8" />
                </linearGradient>
              </defs>

              {/* Soft shadow groove on ice canvas */}
              <path
                d={DESKTOP_S_PATH}
                stroke="rgba(13, 16, 20, 0.10)"
                strokeWidth="16"
                strokeLinecap="round"
              />

              {/* Active Centrysk electric ice-blue stream */}
              <motion.path
                d={DESKTOP_S_PATH}
                stroke="url(#aura-route-grad)"
                strokeWidth="8"
                strokeLinecap="round"
                style={{ pathLength: prefersReduced ? fullPath : smoothProgress }}
              />

              {/* Crisp white inner highlight vein */}
              <motion.path
                d={DESKTOP_S_PATH}
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ pathLength: prefersReduced ? fullPath : smoothProgress }}
              />

              {/* Node markers on SVG */}
              {PROCESS_STEPS.map((step) => {
                const isActive = activeProgress >= step.threshold;
                return (
                  <g key={step.num}>
                    <circle
                      cx={step.cx}
                      cy={step.cy}
                      r={isActive ? 14 : 11}
                      fill={isActive ? '#0088CC' : '#FFFFFF'}
                      stroke={isActive ? '#FFFFFF' : 'rgba(13, 16, 20, 0.22)'}
                      strokeWidth="3"
                      className="transition-all duration-300"
                    />
                    <circle
                      cx={step.cx}
                      cy={step.cy}
                      r="4"
                      fill={isActive ? '#FFFFFF' : 'rgba(13, 16, 20, 0.35)'}
                    />
                  </g>
                );
              })}
            </svg>

            {/* 5 Atmospheric Monochrome Photo Cards floating on Sky-Ice Backdrop */}
            <div className="mt-4 grid grid-cols-5 gap-4">
              {PROCESS_STEPS.map((step) => {
                const isActive = activeProgress >= step.threshold;
                const Icon = step.icon;
                return (
                  <div
                    key={step.num}
                    className={`group relative overflow-hidden rounded-[22px] border p-4 text-white transition-all duration-500 ${
                      isActive
                        ? '-translate-y-1.5 border-[#38BDF8]/70 opacity-100 shadow-[0_24px_48px_-14px_rgba(0,136,204,0.35)]'
                        : 'translate-y-0 border-[#0D1014]/20 opacity-65 shadow-[0_14px_30px_-14px_rgba(10,12,15,0.25)]'
                    }`}
                  >
                    {/* Monochrome interior photo backdrop inside card */}
                    <img
                      src={step.image}
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover grayscale contrast-125 transition-transform duration-700 group-hover:scale-105"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: isActive
                          ? 'linear-gradient(165deg, rgba(10,13,18,0.82) 0%, rgba(10,14,20,0.88) 65%, rgba(0,115,175,0.72) 100%)'
                          : 'linear-gradient(165deg, rgba(12,15,20,0.86) 0%, rgba(12,15,20,0.92) 100%)',
                      }}
                    />

                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-medium tracking-[0.1em] text-[#8CE6FF]">
                          {step.num} / 05
                        </span>
                        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-sm">
                          <Icon size={16} strokeWidth={1.5} />
                        </span>
                      </div>
                      <h3 className="mt-3 font-serif text-xl font-semibold leading-snug text-white">
                        {step.title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/75">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Vertical Snake Route */}
          <div className="relative mt-10 lg:hidden">
            <div className="relative pl-12">
              <svg
                viewBox="0 0 56 488"
                className="pointer-events-none absolute left-0 top-2 h-[calc(100%-16px)] w-10"
                fill="none"
                preserveAspectRatio="none"
              >
                <path
                  d={MOBILE_SNAKE_PATH}
                  stroke="rgba(13, 16, 20, 0.12)"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <motion.path
                  d={MOBILE_SNAKE_PATH}
                  stroke="#0088CC"
                  strokeWidth="4"
                  strokeLinecap="round"
                  style={{ pathLength: prefersReduced ? fullPath : smoothProgress }}
                />
              </svg>

              <div className="flex flex-col gap-4">
                {PROCESS_STEPS.map((step) => {
                  const isActive = activeProgress >= step.threshold;
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.num}
                      className={`relative overflow-hidden rounded-[20px] border p-4 text-white transition-all duration-300 ${
                        isActive
                          ? 'border-[#38BDF8]/70 opacity-100 shadow-lg'
                          : 'border-[#0D1014]/20 opacity-80'
                      }`}
                    >
                      <img
                        src={step.image}
                        alt=""
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 h-full w-full object-cover grayscale contrast-125"
                      />
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0B0E13]/88 via-[#0B0E13]/85 to-[#064A70]/80"
                      />

                      <span
                        className={`absolute -left-[36px] top-6 z-20 h-4 w-4 rounded-full border-2 transition-colors duration-300 ${
                          isActive
                            ? 'border-white bg-[#0088CC]'
                            : 'border-[#0D1014]/25 bg-white'
                        }`}
                      />
                      <div className="relative z-10">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-[#8CE6FF]">
                            {step.num} / 05
                          </span>
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
                            <Icon size={16} strokeWidth={1.5} />
                          </span>
                        </div>
                        <h3 className="mt-2 font-serif text-xl font-semibold text-white">
                          {step.title}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-white/75">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Frosted Ice Payment Summary Bar */}
          <div className="mt-10 grid grid-cols-1 gap-3 rounded-2xl border border-white/90 bg-white/80 p-4 text-[#0D1014] shadow-sm backdrop-blur-md sm:grid-cols-3 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="tabular-nums font-mono text-lg font-semibold text-[#0088CC]">
                30%
              </span>
              <span className="text-xs text-[#495460]">
                Предоплата при подписании договора и старте планировки
              </span>
            </div>
            <div className="flex items-center gap-3 border-t border-[#0D1014]/10 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <span className="tabular-nums font-mono text-lg font-semibold text-[#0088CC]">
                40%
              </span>
              <span className="text-xs text-[#495460]">
                После утверждения планировки и 3D-визуализаций
              </span>
            </div>
            <div className="flex items-center gap-3 border-t border-[#0D1014]/10 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <span className="tabular-nums font-mono text-lg font-semibold text-[#0088CC]">
                30%
              </span>
              <span className="text-xs text-[#495460]">
                При передаче готового альбома чертежей и спецификаций
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
