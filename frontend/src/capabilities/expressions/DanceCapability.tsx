import type { AvatarContext } from '../../components/avatar/types';

export const danceCapability = {
  id: 'dance',
  category: 'expression' as const,
  name: 'Dance',
  description: 'Avatar tanzt',
  hotkey: 'a+3',
  execute: async (context: AvatarContext) => {
    console.log('[DanceCapability] Executing dance animation');
    // TODO: Implement dance animation
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate animation duration
  }
};

