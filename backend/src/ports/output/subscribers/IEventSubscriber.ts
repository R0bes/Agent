/**
 * Event Subscriber (Output/Driven Port)
 * 
 * Defines the interface for event subscription
 */

export interface Event {
  type: string;
  payload: Record<string, unknown>;
  timestamp?: string;
  traceId?: string;
}

export type EventHandler = (event: Event) => Promise<void> | void;

export interface IEventSubscriber {
  /**
   * Subscribe to an event type
   */
  subscribe(eventType: string, handler: EventHandler): void;
  
  /**
   * Unsubscribe from an event type
   */
  unsubscribe(eventType: string, handler: EventHandler): void;
  
  /**
   * Check if the subscriber is connected
   */
  isConnected(): boolean;
  
  /**
   * Connect to the event bus
   */
  connect(): Promise<void>;
  
  /**
   * Disconnect from the event bus
   */
  disconnect(): Promise<void>;
}

