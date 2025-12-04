/**
 * Artist Store - Tracks artists across events with sound/genre information
 */

export interface ArtistSound {
  genre?: string;
  subgenres?: string[];
  tags?: string[]; // e.g., "techno", "minimal", "live", "dj set"
  style?: string; // e.g., "hard techno", "melodic techno"
}

export interface Artist {
  id: string;
  name: string;
  normalizedName: string; // normalized for matching (lowercase, trimmed)
  
  // Sound information
  sounds: ArtistSound[];
  
  // Collective information
  collectives?: string[]; // IDs of collectives this artist belongs to
  
  // Label information
  labels?: string[]; // IDs of labels this artist belongs to
  
  // Tracking data
  eventCount: number; // Total number of events this artist appeared in
  firstSeen: string; // ISO date
  lastSeen: string; // ISO date
  clubs: string[]; // Clubs where this artist has performed
  
  // External data
  spotifyId?: string;
  musicbrainzId?: string;
  lastfmUrl?: string;
  soundcloudUrl?: string;
  website?: string;
  
  // Metadata from external sources
  externalGenres?: string[]; // Genres from Spotify/Last.fm
  popularity?: number; // 0-100, from external sources
  followers?: number; // Social media followers
  
  // Rating/Quality metrics
  averageEventScore?: number; // Average score of events this artist appeared in
  rating?: number; // 0-10, calculated based on frequency, quality, etc.
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface ArtistQuery {
  name?: string;
  genre?: string;
  collective?: string;
  minRating?: number;
  minEventCount?: number;
  club?: string;
  limit?: number;
}

export interface ArtistStore {
  addOrUpdateArtist(artist: Omit<Artist, "id" | "createdAt" | "updatedAt">): Promise<Artist>;
  getArtistById(id: string): Promise<Artist | null>;
  getArtistByName(name: string): Promise<Artist | null>;
  listArtists(query?: ArtistQuery): Promise<Artist[]>;
  trackArtistEvent(artistName: string, eventData: {
    eventId: string;
    club: string;
    date: string;
    sounds?: ArtistSound;
    eventScore?: number;
  }): Promise<Artist>;
  updateArtistRating(artistId: string): Promise<Artist>;
  enrichArtist(artistId: string, externalData: {
    spotifyId?: string;
    musicbrainzId?: string;
    lastfmUrl?: string;
    soundcloudUrl?: string;
    website?: string;
    externalGenres?: string[];
    popularity?: number;
    followers?: number;
  }): Promise<Artist>;
}

const artists: Map<string, Artist> = new Map(); // key: normalizedName

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function generateArtistId(name: string): string {
  return `artist-${normalizeName(name).replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
}

export class InMemoryArtistStore implements ArtistStore {
  async addOrUpdateArtist(artistData: Omit<Artist, "id" | "createdAt" | "updatedAt">): Promise<Artist> {
    const normalizedName = normalizeName(artistData.name);
    const existing = artists.get(normalizedName);
    
    const now = new Date().toISOString();
    
    if (existing) {
      // Update existing artist
      const updated: Artist = {
        ...existing,
        ...artistData,
        normalizedName,
        updatedAt: now,
        // Merge sounds
        sounds: [...existing.sounds, ...(artistData.sounds || [])].filter((s, i, arr) => 
          arr.findIndex(s2 => JSON.stringify(s2) === JSON.stringify(s)) === i
        ),
        // Merge clubs
        clubs: [...new Set([...existing.clubs, ...(artistData.clubs || [])])],
        // Merge collectives
        collectives: [...new Set([...(existing.collectives || []), ...(artistData.collectives || [])])]
      };
      artists.set(normalizedName, updated);
      return updated;
    } else {
      // Create new artist
      const artist: Artist = {
        id: generateArtistId(artistData.name),
        normalizedName,
        eventCount: 0,
        firstSeen: now,
        lastSeen: now,
        clubs: [],
        sounds: [],
        createdAt: now,
        updatedAt: now,
        ...artistData
      };
      artists.set(normalizedName, artist);
      return artist;
    }
  }

  async getArtistById(id: string): Promise<Artist | null> {
    for (const artist of artists.values()) {
      if (artist.id === id) return artist;
    }
    return null;
  }

  async getArtistByName(name: string): Promise<Artist | null> {
    const normalizedName = normalizeName(name);
    return artists.get(normalizedName) ?? null;
  }

  async listArtists(query?: ArtistQuery): Promise<Artist[]> {
    let filtered = Array.from(artists.values());

    if (query?.name) {
      const searchName = normalizeName(query.name);
      filtered = filtered.filter(a => a.normalizedName.includes(searchName));
    }

    if (query?.genre) {
      filtered = filtered.filter(a => 
        a.sounds.some(s => 
          s.genre?.toLowerCase().includes(query.genre!.toLowerCase()) ||
          s.subgenres?.some(g => g.toLowerCase().includes(query.genre!.toLowerCase()))
        )
      );
    }

    if (query?.collective) {
      filtered = filtered.filter(a => 
        a.collectives?.includes(query.collective!)
      );
    }

    if (query?.minRating !== undefined) {
      filtered = filtered.filter(a => (a.rating ?? 0) >= query.minRating!);
    }

    if (query?.minEventCount !== undefined) {
      filtered = filtered.filter(a => a.eventCount >= query.minEventCount!);
    }

    if (query?.club) {
      filtered = filtered.filter(a => a.clubs.includes(query.club!));
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

  async trackArtistEvent(
    artistName: string,
    eventData: {
      eventId: string;
      club: string;
      date: string;
      sounds?: ArtistSound;
      eventScore?: number;
    }
  ): Promise<Artist> {
    const normalizedName = normalizeName(artistName);
    let artist = await this.getArtistByName(artistName);

    if (!artist) {
      artist = await this.addOrUpdateArtist({
        name: artistName,
        eventCount: 0,
        firstSeen: eventData.date,
        lastSeen: eventData.date,
        clubs: [],
        sounds: []
      });
    }

    // Update tracking data
    const updatedClubs = artist.clubs.includes(eventData.club)
      ? artist.clubs
      : [...artist.clubs, eventData.club];

    const eventDate = new Date(eventData.date);
    const firstSeen = new Date(artist.firstSeen);
    const lastSeen = new Date(artist.lastSeen);

    const updated: Artist = {
      ...artist,
      eventCount: artist.eventCount + 1,
      firstSeen: eventDate < firstSeen ? eventData.date : artist.firstSeen,
      lastSeen: eventDate > lastSeen ? eventData.date : artist.lastSeen,
      clubs: updatedClubs,
      sounds: eventData.sounds
        ? [...artist.sounds, eventData.sounds].filter((s, i, arr) =>
            arr.findIndex(s2 => JSON.stringify(s2) === JSON.stringify(s)) === i
          )
        : artist.sounds,
      updatedAt: new Date().toISOString()
    };

    artists.set(normalizedName, updated);

    // Update rating
    return await this.updateArtistRating(updated.id);
  }

  async updateArtistRating(artistId: string): Promise<Artist> {
    const artist = await this.getArtistById(artistId);
    if (!artist) {
      throw new Error(`Artist not found: ${artistId}`);
    }

    // Calculate rating based on:
    // - Event count (more events = higher rating)
    // - Average event score (if available)
    // - Recency (recent events = higher rating)
    // - Club diversity (more clubs = higher rating)
    // - External popularity (if available)

    let rating = 0;

    // Base rating from event count (max 4 points)
    rating += Math.min(artist.eventCount * 0.5, 4);

    // Average event score contribution (max 3 points)
    if (artist.averageEventScore) {
      rating += (artist.averageEventScore / 20) * 3; // Assuming max score is 20
    }

    // Recency bonus (max 1 point)
    const daysSinceLastSeen = (Date.now() - new Date(artist.lastSeen).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastSeen < 30) {
      rating += 1;
    } else if (daysSinceLastSeen < 90) {
      rating += 0.5;
    }

    // Club diversity (max 1 point)
    rating += Math.min(artist.clubs.length * 0.2, 1);

    // External popularity (max 1 point)
    if (artist.popularity) {
      rating += artist.popularity / 100;
    }

    const updated: Artist = {
      ...artist,
      rating: Math.min(rating, 10), // Cap at 10
      updatedAt: new Date().toISOString()
    };

    artists.set(artist.normalizedName, updated);
    return updated;
  }

  async enrichArtist(
    artistId: string,
    externalData: {
      spotifyId?: string;
      musicbrainzId?: string;
      lastfmUrl?: string;
      website?: string;
      externalGenres?: string[];
      popularity?: number;
      followers?: number;
    }
  ): Promise<Artist> {
    const artist = await this.getArtistById(artistId);
    if (!artist) {
      throw new Error(`Artist not found: ${artistId}`);
    }

    const updated: Artist = {
      ...artist,
      spotifyId: externalData.spotifyId || artist.spotifyId,
      musicbrainzId: externalData.musicbrainzId || artist.musicbrainzId,
      lastfmUrl: externalData.lastfmUrl || artist.lastfmUrl,
      soundcloudUrl: externalData.soundcloudUrl || artist.soundcloudUrl,
      website: externalData.website || artist.website,
      externalGenres: externalData.externalGenres
        ? [...new Set([...(artist.externalGenres || []), ...externalData.externalGenres])]
        : artist.externalGenres,
      popularity: externalData.popularity ?? artist.popularity,
      followers: externalData.followers ?? artist.followers,
      updatedAt: new Date().toISOString()
    };

    artists.set(artist.normalizedName, updated);

    // Update rating after enrichment (popularity affects rating)
    return await this.updateArtistRating(updated.id);
  }
}

export const artistStore: ArtistStore = new InMemoryArtistStore();

