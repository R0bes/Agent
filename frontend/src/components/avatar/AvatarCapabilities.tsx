import type { AvatarCapability, AvatarContext, AvatarCapabilityCategory } from './types';

class AvatarCapabilitiesRegistry {
  private capabilities = new Map<string, AvatarCapability>();

  register(capability: AvatarCapability): void {
    this.capabilities.set(capability.id, capability);
  }

  unregister(id: string): void {
    this.capabilities.delete(id);
  }

  get(id: string): AvatarCapability | undefined {
    return this.capabilities.get(id);
  }

  getAll(): AvatarCapability[] {
    return Array.from(this.capabilities.values());
  }

  getByCategory(category: AvatarCapabilityCategory): AvatarCapability[] {
    return this.getAll().filter(cap => cap.category === category);
  }

  getByHotkey(hotkey: string): AvatarCapability | undefined {
    return this.getAll().find(cap => cap.hotkey === hotkey);
  }

  async execute(id: string, context: AvatarContext): Promise<void> {
    const capability = this.capabilities.get(id);
    if (!capability) {
      throw new Error(`Capability not found: ${id}`);
    }
    await capability.execute(context);
  }
}

export const avatarCapabilities = new AvatarCapabilitiesRegistry();

