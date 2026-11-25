'use client';

import { useState } from 'react';
import { useUserMetadata } from '@/hooks/useUserMetadata';
import { AlinaChatDrawer } from '@/components/chat/AlinaChatDrawer';
import { FooterSection } from '@/components/landing/FooterSection';
import { Header } from '@/components/landing/Header';
import { HeroSection } from '@/components/landing/HeroSection';
import { PortfolioSection } from '@/components/landing/PortfolioSection';
import { ProcessSection } from '@/components/landing/ProcessSection';
import { TariffsSection } from '@/components/landing/TariffsSection';
import { QuizWorkbench } from '@/components/quiz/QuizWorkbench';
import type { QuizServiceNeeded, QuizStyle } from '@/types/lead';

export function LandingClient() {
  const { sessionId, metadata } = useUserMetadata();
  const [chatOpen, setChatOpen] = useState(false);
  const [prefilledPrompt, setPrefilledPrompt] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<QuizStyle | null>(null);
  const [selectedService, setSelectedService] = useState<QuizServiceNeeded | null>(null);

  function handleDiscussInChat(prompt: string) {
    setPrefilledPrompt(prompt);
    setChatOpen(true);
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)]">
      <Header onOpenChat={() => setChatOpen(true)} />

      <main>
        <HeroSection onOpenChat={() => setChatOpen(true)} />
        <PortfolioSection onSelectStyleForQuiz={(style) => setSelectedStyle(style)} />
        <ProcessSection />
        <TariffsSection onSelectTariffForQuiz={(service) => setSelectedService(service)} />
        <QuizWorkbench
          sessionId={sessionId}
          userMetadata={metadata}
          preselectedStyle={selectedStyle}
          preselectedService={selectedService}
          onDiscussResultInChat={handleDiscussInChat}
        />
      </main>

      <FooterSection onOpenChat={() => setChatOpen(true)} />

      <AlinaChatDrawer
        open={chatOpen}
        onOpenChange={setChatOpen}
        sessionId={sessionId}
        userMetadata={metadata}
        prefilledPrompt={prefilledPrompt}
        onPrefilledConsumed={() => setPrefilledPrompt(null)}
      />
    </div>
  );
}
