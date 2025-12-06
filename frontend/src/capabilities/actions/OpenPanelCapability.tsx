import type { AvatarContext } from '../../components/avatar/types';

export const openPanelCapability = {
  id: 'open_panel',
  category: 'action' as const,
  name: 'Open Panel',
  description: 'Öffnet ein Panel (z.B. Toolbox, Scheduler)',
  execute: async (context: AvatarContext) => {
    console.log('[OpenPanelCapability] Executing open panel action');
    // TODO: Find panel button and toggle it
    // This will be implemented after AI-Controllable Interface is ready
    await new Promise(resolve => setTimeout(resolve, 500));
  }
};

