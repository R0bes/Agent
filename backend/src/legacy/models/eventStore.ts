export interface Event {
  id: string;
  club: string;
  title: string;
  date: string; // ISO format
  time?: string;
  artists?: string[];
  artistIds?: string[]; // References to Artist entities
  collectives?: string[]; // Collective names/IDs
  labels?: string[]; // Label names/IDs that organize this event
  venue?: string;
  description?: string;
  genre?: string;
  genres?: string[]; // Multiple genres
  subgenres?: string[]; // More specific genre classifications
  tags?: string[]; // Additional tags (e.g., "live", "dj set", "all night long")
  ticketUrl?: string;
  url: string;
  scrapedAt: string;
  score?: number; // Bewertung
}

export interface EventQuery {
  club?: string;
  fromDate?: string;
  limit?: number;
}

export interface EventStore {
  addEvent(event: Omit<Event, "id" | "scrapedAt">): Promise<Event>;
  listEvents(query?: EventQuery): Promise<Event[]>;
  getEventById(id: string): Promise<Event | null>;
}

const events: Event[] = [];

export class InMemoryEventStore implements EventStore {
  async addEvent(eventData: Omit<Event, "id" | "scrapedAt">): Promise<Event> {
    const event: Event = {
      id: `event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      scrapedAt: new Date().toISOString(),
      ...eventData
    };
    events.push(event);
    return event;
  }

  async listEvents(query?: EventQuery): Promise<Event[]> {
    let filtered = [...events];

    if (query?.club) {
      filtered = filtered.filter((e) => e.club === query.club);
    }

    if (query?.fromDate) {
      const fromDate = new Date(query.fromDate);
      filtered = filtered.filter((e) => {
        const eventDate = new Date(e.date);
        return eventDate >= fromDate;
      });
    }

    // Sort by score (descending), then by date (ascending)
    filtered.sort((a, b) => {
      const scoreA = a.score ?? 0;
      const scoreB = b.score ?? 0;
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    if (query?.limit) {
      filtered = filtered.slice(0, query.limit);
    }

    return filtered;
  }

  async getEventById(id: string): Promise<Event | null> {
    return events.find((e) => e.id === id) ?? null;
  }
}

export const eventStore: EventStore = new InMemoryEventStore();

