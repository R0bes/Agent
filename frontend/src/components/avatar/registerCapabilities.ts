import { avatarCapabilities } from './AvatarCapabilities';
import { waveCapability } from '../../capabilities/expressions/WaveCapability';
import { danceCapability } from '../../capabilities/expressions/DanceCapability';
import { celebrationCapability } from '../../capabilities/expressions/CelebrationCapability';
import { mimikriCapability } from '../../capabilities/expressions/MimikriCapability';
import { clickButtonCapability } from '../../capabilities/actions/ClickButtonCapability';
import { openPanelCapability } from '../../capabilities/actions/OpenPanelCapability';
import { navigateMenuCapability } from '../../capabilities/actions/NavigateMenuCapability';

// Register all capabilities
export function registerAllCapabilities() {
  // Expression capabilities
  avatarCapabilities.register(waveCapability);
  avatarCapabilities.register(danceCapability);
  avatarCapabilities.register(celebrationCapability);
  avatarCapabilities.register(mimikriCapability);

  // Action capabilities
  avatarCapabilities.register(clickButtonCapability);
  avatarCapabilities.register(openPanelCapability);
  avatarCapabilities.register(navigateMenuCapability);
}

