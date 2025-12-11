/**
 * Dependency Injection Container
 * 
 * Simple DI container for managing dependencies
 */

// Simple DI container implementation
class Container {
  private services = new Map<string, any>();
  private factories = new Map<string, () => any>();

  /**
   * Register a singleton service
   */
  register<T>(key: string, instance: T): void {
    this.services.set(key, instance);
  }

  /**
   * Register a factory function
   */
  registerFactory<T>(key: string, factory: () => T): void {
    this.factories.set(key, factory);
  }

  /**
   * Resolve a service
   */
  resolve<T>(key: string): T {
    if (this.services.has(key)) {
      return this.services.get(key);
    }

    if (this.factories.has(key)) {
      const factory = this.factories.get(key)!;
      const instance = factory();
      this.services.set(key, instance); // Cache the instance
      return instance;
    }

    throw new Error(`Service not found: ${key}`);
  }

  /**
   * Check if a service is registered
   */
  has(key: string): boolean {
    return this.services.has(key) || this.factories.has(key);
  }

  /**
   * Clear all services
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}

export const container = new Container();

