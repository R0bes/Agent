/**
 * Event Publisher (Output/Driven Port)
 * 
 * Defines the interface for event publishing
 */

export interface Event {
  type: string;
  payload: Record<string, unknown>;
  timestamp?: string;
  traceId?: string;
}

export interface IEventPublisher {
  /**
   * Publish an event
   */
  publish(event: Event): Promise<void>;
  
  /**
   * Publish multiple events
   */
  publishBatch(events: Event[]): Promise<void>;
  
  /**
   * Check if the publisher is connected
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

