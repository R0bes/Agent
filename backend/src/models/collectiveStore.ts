/**
 * Collective Store - Tracks recurring events and collectives
 */

export interface Collective {
  id: string;
  name: string;
  normalizedName: string;
  
  // Event series information
  eventSeries?: string; // e.g., "BASS ARCADE", "WEIL SONNTAG"
  recurringPattern?: "weekly" | "monthly" | "seasonal" | "irregular";
  
  // Artists associated with this collective
  artists: string[]; // Artist IDs
  
  // Tracking data
  eventCount: number;
  firstSeen: string;
  lastSeen: string;
  clubs: string[]; // Clubs where this collective organizes events
  
  // Sound/genre information
  primaryGenres?: string[];
  tags?: string[];
  
  // Rating
  rating?: number; // 0-10, based on frequency, consistency, quality
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface CollectiveQuery {
  name?: string;
  eventSeries?: string;
  club?: string;
  minRating?: number;
  minEventCount?: number;
  limit?: number;
}

export interface CollectiveStore {
  addOrUpdateCollective(collective: Omit<Collective, "id" | "createdAt" | "updatedAt">): Promise<Collective>;
  getCollectiveById(id: string): Promise<Collective | null>;
  getCollectiveByName(name: string): Promise<Collective | null>;
  listCollectives(query?: CollectiveQuery): Promise<Collective[]>;
  trackCollectiveEvent(
    collectiveName: string,
    eventData: {
      eventId: string;
      club: string;
      date: string;
      eventSeries?: string;
      artists?: string[];
      genres?: string[];
    }
  ): Promise<Collective>;
  updateCollectiveRating(collectiveId: string): Promise<Collective>;
}

const collectives: Map<string, Collective> = new Map(); // key: normalizedName

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function generateCollectiveId(name: string): string {
  return `collective-${normalizeName(name).replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
}

// Detect collective names from event titles
const COLLECTIVE_PATTERNS = [
  /^(BASS ARCADE|WEIL SONNTAG|EMO NIGHT|HOUSEKEEPING|NICA|SUPERSONIC|BONEFLOWER|DER INDIE SLOT|MIND BODY SOUL)/i,
  /(presents|presents:|x |x$)/i, // e.g., "ORO NEGRO presents:"
  /(collective|kollektiv|crew|night|rave|party)$/i
];

export function detectCollectiveFromTitle(title: string): string | null {
  for (const pattern of COLLECTIVE_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      // Extract the collective name
      if (match[1]) {
        return match[1].trim();
      }
      // For "presents" patterns, get the part before "presents"
      if (pattern.source.includes("presents")) {
        const parts = title.split(/presents?:?/i);
        if (parts[0]) {
          return parts[0].trim();
        }
      }
    }
  }
  return null;
}

export class InMemoryCollectiveStore implements CollectiveStore {
  async addOrUpdateCollective(
    collectiveData: Omit<Collective, "id" | "createdAt" | "updatedAt">
  ): Promise<Collective> {
    const normalizedName = normalizeName(collectiveData.name);
    const existing = collectives.get(normalizedName);

    const now = new Date().toISOString();

    if (existing) {
      const updated: Collective = {
        ...existing,
        ...collectiveData,
        normalizedName,
        artists: [...new Set([...(existing.artists || []), ...(collectiveData.artists || [])])],
        clubs: [...new Set([...existing.clubs, ...(collectiveData.clubs || [])])],
        primaryGenres: [...new Set([
          ...(existing.primaryGenres || []),
          ...(collectiveData.primaryGenres || [])
        ])],
        tags: [...new Set([
          ...(existing.tags || []),
          ...(collectiveData.tags || [])
        ])],
        updatedAt: now
      };
      collectives.set(normalizedName, updated);
      return updated;
    } else {
      const collective: Collective = {
        id: generateCollectiveId(collectiveData.name),
        normalizedName,
        eventCount: 0,
        firstSeen: now,
        lastSeen: now,
        clubs: [],
        artists: [],
        createdAt: now,
        updatedAt: now,
        ...collectiveData
      };
      collectives.set(normalizedName, collective);
      return collective;
    }
  }

  async getCollectiveById(id: string): Promise<Collective | null> {
    for (const collective of collectives.values()) {
      if (collective.id === id) return collective;
    }
    return null;
  }

  async getCollectiveByName(name: string): Promise<Collective | null> {
    const normalizedName = normalizeName(name);
    return collectives.get(normalizedName) ?? null;
  }

  async listCollectives(query?: CollectiveQuery): Promise<Collective[]> {
    let filtered = Array.from(collectives.values());

    if (query?.name) {
      const searchName = normalizeName(query.name);
      filtered = filtered.filter(c => c.normalizedName.includes(searchName));
    }

    if (query?.eventSeries) {
      filtered = filtered.filter(c => 
        c.eventSeries?.toLowerCase().includes(query.eventSeries!.toLowerCase())
      );
    }

    if (query?.club) {
      filtered = filtered.filter(c => c.clubs.includes(query.club!));
    }

    if (query?.minRating !== undefined) {
      filtered = filtered.filter(c => (c.rating ?? 0) >= query.minRating!);
    }

    if (query?.minEventCount !== undefined) {
      filtered = filtered.filter(c => c.eventCount >= query.minEventCount!);
    }

    // Sort by rating (descending), then by event count (descending)
    filtered.sort((a, b) => {
      const ratingA = a.rating ?? 0;
      const ratingB = b.rating ?? 0;
      if (ratingA !== ratingB) {
        return ratingB - ratingA;
      }
      return b.eventCount - a.eventCount;
    });

    if (query?.limit) {
      filtered = filtered.slice(0, query.limit);
    }

    return filtered;
  }

  async trackCollectiveEvent(
    collectiveName: string,
    eventData: {
      eventId: string;
      club: string;
      date: string;
      eventSeries?: string;
      artists?: string[];
      genres?: string[];
    }
  ): Promise<Collective> {
    const normalizedName = normalizeName(collectiveName);
    let collective = await this.getCollectiveByName(collectiveName);

    if (!collective) {
      collective = await this.addOrUpdateCollective({
        name: collectiveName,
        eventCount: 0,
        firstSeen: eventData.date,
        lastSeen: eventData.date,
        clubs: [],
        artists: []
      });
    }

    const eventDate = new Date(eventData.date);
    const firstSeen = new Date(collective.firstSeen);
    const lastSeen = new Date(collective.lastSeen);

    const updated: Collective = {
      ...collective,
      eventCount: collective.eventCount + 1,
      firstSeen: eventDate < firstSeen ? eventData.date : collective.firstSeen,
      lastSeen: eventDate > lastSeen ? eventData.date : collective.lastSeen,
      clubs: collective.clubs.includes(eventData.club)
        ? collective.clubs
        : [...collective.clubs, eventData.club],
      artists: [...new Set([
        ...collective.artists,
        ...(eventData.artists || [])
      ])],
      eventSeries: eventData.eventSeries || collective.eventSeries,
      primaryGenres: [...new Set([
        ...(collective.primaryGenres || []),
        ...(eventData.genres || [])
      ])],
      updatedAt: new Date().toISOString()
    };

    collectives.set(normalizedName, updated);

    return await this.updateCollectiveRating(updated.id);
  }

  async updateCollectiveRating(collectiveId: string): Promise<Collective> {
    const collective = await this.getCollectiveById(collectiveId);
    if (!collective) {
      throw new Error(`Collective not found: ${collectiveId}`);
    }

    // Calculate rating based on:
    // - Event count (more events = higher rating)
    // - Consistency (recurring pattern = higher rating)
    // - Recency
    // - Club diversity

    let rating = 0;

    // Base rating from event count (max 4 points)
    rating += Math.min(collective.eventCount * 0.3, 4);

    // Recurring pattern bonus (max 2 points)
    if (collective.recurringPattern) {
      rating += collective.recurringPattern === "weekly" ? 2 :
                collective.recurringPattern === "monthly" ? 1.5 :
                collective.recurringPattern === "seasonal" ? 1 : 0.5;
    }

    // Recency bonus (max 2 points)
    const daysSinceLastSeen = (Date.now() - new Date(collective.lastSeen).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastSeen < 30) {
      rating += 2;
    } else if (daysSinceLastSeen < 90) {
      rating += 1;
    } else if (daysSinceLastSeen < 180) {
      rating += 0.5;
    }

    // Club diversity (max 1 point)
    rating += Math.min(collective.clubs.length * 0.2, 1);

    // Artist diversity (max 1 point)
    rating += Math.min(collective.artists.length * 0.1, 1);

    const updated: Collective = {
      ...collective,
      rating: Math.min(rating, 10),
      updatedAt: new Date().toISOString()
    };

    collectives.set(collective.normalizedName, updated);
    return updated;
  }
}

export const collectiveStore: CollectiveStore = new InMemoryCollectiveStore();

