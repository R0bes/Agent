/**
 * Label Store - Tracks record labels and their artists/events
 */

export interface Label {
  id: string;
  name: string;
  normalizedName: string;
  
  // Artist associations
  artists: string[]; // Artist IDs
  
  // Event associations
  eventCount: number;
  events: string[]; // Event IDs organized by this label
  
  // External data
  soundcloudUrl?: string;
  website?: string;
  spotifyId?: string;
  
  // Metadata
  firstSeen: string;
  lastSeen: string;
  clubs: string[]; // Clubs where this label organizes events
  
  // Rating
  rating?: number; // 0-10, based on activity, artist quality, etc.
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface LabelQuery {
  name?: string;
  artist?: string; // Find labels by artist ID
  club?: string;
  minRating?: number;
  minEventCount?: number;
  limit?: number;
}

export interface LabelStore {
  addOrUpdateLabel(label: Omit<Label, "id" | "createdAt" | "updatedAt">): Promise<Label>;
  getLabelById(id: string): Promise<Label | null>;
  getLabelByName(name: string): Promise<Label | null>;
  listLabels(query?: LabelQuery): Promise<Label[]>;
  trackLabelEvent(
    labelName: string,
    eventData: {
      eventId: string;
      club: string;
      date: string;
      artists?: string[];
    }
  ): Promise<Label>;
  addArtistToLabel(labelId: string, artistId: string): Promise<Label>;
  updateLabelRating(labelId: string): Promise<Label>;
}

const labels: Map<string, Label> = new Map(); // key: normalizedName

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function generateLabelId(name: string): string {
  return `label-${normalizeName(name).replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
}

// Detect label names from event titles/descriptions
const LABEL_PATTERNS = [
  /(presents?|presents?:|presents|presents:)/i, // e.g., "Label presents: Artist"
  /(records?|recordings?|music|audio|sound|studios?)$/i, // e.g., "Label Records"
  /(x |x$)/i, // e.g., "Label x Artist"
];

export function detectLabelFromText(text: string): string | null {
  // Look for "Label presents:" pattern
  const presentsMatch = text.match(/([A-Z][A-Za-z0-9\s&]+?)\s+(?:presents?|presents?:)/i);
  if (presentsMatch && presentsMatch[1]) {
    const labelName = presentsMatch[1].trim();
    // Filter out common false positives
    if (!labelName.match(/^(the|a|an|and|or|with|feat|featuring)$/i)) {
      return labelName;
    }
  }
  
  // Look for "Label x Artist" pattern
  const xMatch = text.match(/([A-Z][A-Za-z0-9\s&]+?)\s+x\s+/i);
  if (xMatch && xMatch[1]) {
    const labelName = xMatch[1].trim();
    if (!labelName.match(/^(the|a|an|and|or|with|feat|featuring)$/i)) {
      return labelName;
    }
  }
  
  return null;
}

export class InMemoryLabelStore implements LabelStore {
  async addOrUpdateLabel(labelData: Omit<Label, "id" | "createdAt" | "updatedAt">): Promise<Label> {
    const normalizedName = normalizeName(labelData.name);
    const existing = labels.get(normalizedName);

    const now = new Date().toISOString();

    if (existing) {
      const updated: Label = {
        ...existing,
        ...labelData,
        normalizedName,
        artists: [...new Set([...(existing.artists || []), ...(labelData.artists || [])])],
        events: [...new Set([...(existing.events || []), ...(labelData.events || [])])],
        clubs: [...new Set([...existing.clubs, ...(labelData.clubs || [])])],
        updatedAt: now
      };
      labels.set(normalizedName, updated);
      return updated;
    } else {
      const label: Label = {
        ...labelData,
        id: generateLabelId(labelData.name),
        normalizedName,
        createdAt: now,
        updatedAt: now,
        // Ensure defaults if not provided
        eventCount: labelData.eventCount ?? 0,
        events: labelData.events ?? [],
        artists: labelData.artists ?? [],
        firstSeen: labelData.firstSeen ?? now,
        lastSeen: labelData.lastSeen ?? now,
        clubs: labelData.clubs ?? []
      };
      labels.set(normalizedName, label);
      return label;
    }
  }

  async getLabelById(id: string): Promise<Label | null> {
    for (const label of labels.values()) {
      if (label.id === id) return label;
    }
    return null;
  }

  async getLabelByName(name: string): Promise<Label | null> {
    const normalizedName = normalizeName(name);
    return labels.get(normalizedName) ?? null;
  }

  async listLabels(query?: LabelQuery): Promise<Label[]> {
    let filtered = Array.from(labels.values());

    if (query?.name) {
      const searchName = normalizeName(query.name);
      filtered = filtered.filter(l => l.normalizedName.includes(searchName));
    }

    if (query?.artist) {
      filtered = filtered.filter(l => l.artists.includes(query.artist!));
    }

    if (query?.club) {
      filtered = filtered.filter(l => l.clubs.includes(query.club!));
    }

    if (query?.minRating !== undefined) {
      filtered = filtered.filter(l => (l.rating ?? 0) >= query.minRating!);
    }

    if (query?.minEventCount !== undefined) {
      filtered = filtered.filter(l => l.eventCount >= query.minEventCount!);
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

  async trackLabelEvent(
    labelName: string,
    eventData: {
      eventId: string;
      club: string;
      date: string;
      artists?: string[];
    }
  ): Promise<Label> {
    const normalizedName = normalizeName(labelName);
    let label = await this.getLabelByName(labelName);

    if (!label) {
      label = await this.addOrUpdateLabel({
        name: labelName,
        normalizedName: normalizeName(labelName),
        eventCount: 0,
        events: [],
        artists: [],
        firstSeen: eventData.date,
        lastSeen: eventData.date,
        clubs: []
      });
    }

    const eventDate = new Date(eventData.date);
    const firstSeen = new Date(label.firstSeen);
    const lastSeen = new Date(label.lastSeen);

    const updated: Label = {
      ...label,
      eventCount: label.eventCount + 1,
      events: label.events.includes(eventData.eventId)
        ? label.events
        : [...label.events, eventData.eventId],
      artists: [...new Set([
        ...label.artists,
        ...(eventData.artists || [])
      ])],
      firstSeen: eventDate < firstSeen ? eventData.date : label.firstSeen,
      lastSeen: eventDate > lastSeen ? eventData.date : label.lastSeen,
      clubs: label.clubs.includes(eventData.club)
        ? label.clubs
        : [...label.clubs, eventData.club],
      updatedAt: new Date().toISOString()
    };

    labels.set(normalizedName, updated);

    return await this.updateLabelRating(updated.id);
  }

  async addArtistToLabel(labelId: string, artistId: string): Promise<Label> {
    const label = await this.getLabelById(labelId);
    if (!label) {
      throw new Error(`Label not found: ${labelId}`);
    }

    if (label.artists.includes(artistId)) {
      return label;
    }

    const updated: Label = {
      ...label,
      artists: [...label.artists, artistId],
      updatedAt: new Date().toISOString()
    };

    labels.set(label.normalizedName, updated);
    return await this.updateLabelRating(updated.id);
  }

  async updateLabelRating(labelId: string): Promise<Label> {
    const label = await this.getLabelById(labelId);
    if (!label) {
      throw new Error(`Label not found: ${labelId}`);
    }

    // Calculate rating based on:
    // - Event count (more events = higher rating)
    // - Artist count (more artists = higher rating)
    // - Recency
    // - Club diversity

    let rating = 0;

    // Base rating from event count (max 4 points)
    rating += Math.min(label.eventCount * 0.3, 4);

    // Artist diversity (max 2 points)
    rating += Math.min(label.artists.length * 0.2, 2);

    // Recency bonus (max 2 points)
    const daysSinceLastSeen = (Date.now() - new Date(label.lastSeen).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastSeen < 30) {
      rating += 2;
    } else if (daysSinceLastSeen < 90) {
      rating += 1;
    } else if (daysSinceLastSeen < 180) {
      rating += 0.5;
    }

    // Club diversity (max 1 point)
    rating += Math.min(label.clubs.length * 0.2, 1);

    // External presence (max 1 point)
    if (label.soundcloudUrl || label.website || label.spotifyId) {
      rating += 1;
    }

    const updated: Label = {
      ...label,
      rating: Math.min(rating, 10),
      updatedAt: new Date().toISOString()
    };

    labels.set(label.normalizedName, updated);
    return updated;
  }
}

export const labelStore: LabelStore = new InMemoryLabelStore();

