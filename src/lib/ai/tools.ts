import { tool } from 'ai';
import { submitLeadToolSchema } from '@/lib/validators';
import { createOrUpdateChatLead } from '@/lib/lead-service';
import type { UserMetadata } from '@/types/lead';

export function buildChatTools(params: {
  sessionId: string;
  userMetadata: UserMetadata;
  onLeadCaptured?: (info: { leadId: string; leadCode: string; clientName: string }) => void;
}) {
  return {
    submit_lead: tool({
      description:
        'Сохраняет квалифицированную заявку клиента и отправляет уведомление менеджеру в Telegram. Вызывать только после получения имени и контакта клиента.',
      parameters: submitLeadToolSchema,
      execute: async (args) => {
        const { lead, deduplicated } = await createOrUpdateChatLead({
          sessionId: params.sessionId,
          userMetadata: params.userMetadata,
          input: args,
        });

        params.onLeadCaptured?.({
          leadId: lead.id,
          leadCode: lead.leadCode,
          clientName: lead.clientName,
        });

        return {
          success: true,
          leadCode: lead.leadCode,
          deduplicated,
          message: `Заявка ${lead.leadCode} передана ведущему дизайнеру студии.`,
        };
      },
    }),
  };
}
