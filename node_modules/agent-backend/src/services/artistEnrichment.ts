/**
 * Artist Enrichment Service - Fetches additional data about artists from external sources
 */

import { logDebug, logError, logInfo, logWarn } from "../../utils/logger";
import type { Artist } from "../models/artistStore";
import { getSettings } from "../config/settings";

export interface ExternalArtistData {
  spotifyId?: string;
  musicbrainzId?: string;
  lastfmUrl?: string;
  soundcloudUrl?: string;
  website?: string;
  genres?: string[];
  popularity?: number; // 0-100
  followers?: number;
  description?: string;
  imageUrl?: string;
}

export interface ArtistEnrichmentService {
  enrichArtist(artistName: string): Promise<ExternalArtistData | null>;
  batchEnrichArtists(artistNames: string[]): Promise<Map<string, ExternalArtistData>>;
}

/**
 * Spotify API integration (requires SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET)
 */
class SpotifyEnrichment {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  private async getAccessToken(): Promise<string | null> {
    const settings = getSettings();
    if (!settings.apis.spotify?.enabled) {
      return null;
    }

    const clientId = settings.apis.spotify.clientId;
    const clientSecret = settings.apis.spotify.clientSecret;

    if (!clientId || !clientSecret) {
      return null;
    }

    // Use cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
        },
        body: "grant_type=client_credentials"
      });

      if (!response.ok) {
        logWarn("Spotify: Failed to get access token", { status: response.status });
        return null;
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min before expiry
      return this.accessToken;
    } catch (err) {
      logError("Spotify: Error getting access token", err);
      return null;
    }
  }

  async searchArtist(artistName: string): Promise<ExternalArtistData | null> {
    const token = await this.getAccessToken();
    if (!token) {
      return null;
    }

    try {
      const searchQuery = encodeURIComponent(artistName);
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${searchQuery}&type=artist&limit=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, clear cache
          this.accessToken = null;
          this.tokenExpiry = 0;
        }
        return null;
      }

      const data = await response.json();
      if (data.artists?.items?.length > 0) {
        const artist = data.artists.items[0];
        return {
          spotifyId: artist.id,
          genres: artist.genres || [],
          popularity: artist.popularity || 0,
          followers: artist.followers?.total || 0,
          imageUrl: artist.images?.[0]?.url,
          website: artist.external_urls?.spotify
        };
      }
    } catch (err) {
      logDebug("Spotify: Error searching artist", {
        artist: artistName,
        error: err instanceof Error ? err.message : String(err)
      });
    }

    return null;
  }
}

/**
 * MusicBrainz API integration (no auth required)
 */
class MusicBrainzEnrichment {
  async searchArtist(artistName: string): Promise<ExternalArtistData | null> {
    try {
      const searchQuery = encodeURIComponent(artistName);
      const response = await fetch(
        `https://musicbrainz.org/ws/2/artist?query=${searchQuery}&limit=1&fmt=json`,
        {
          headers: {
            "User-Agent": "EventCrawler/1.0 (https://github.com/your-repo)",
            Accept: "application/json"
          }
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data.artists?.length > 0) {
        const artist = data.artists[0];
        return {
          musicbrainzId: artist.id,
          website: artist["relations"]?.find((r: any) => r.type === "official homepage")?.url?.resource
        };
      }
    } catch (err) {
      logDebug("MusicBrainz: Error searching artist", {
        artist: artistName,
        error: err instanceof Error ? err.message : String(err)
      });
    }

    return null;
  }
}

/**
 * Last.fm API integration (requires LASTFM_API_KEY)
 */
class LastFMEnrichment {
  async searchArtist(artistName: string): Promise<ExternalArtistData | null> {
    const settings = getSettings();
    if (!settings.apis.lastfm?.enabled) {
      return null;
    }

    const apiKey = settings.apis.lastfm.apiKey;
    if (!apiKey) {
      return null;
    }

    try {
      const searchQuery = encodeURIComponent(artistName);
      const response = await fetch(
        `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${searchQuery}&api_key=${apiKey}&format=json`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data.artist) {
        const artist = data.artist;
        const tags = artist.tags?.tag || [];
        const genres = tags.map((t: any) => t.name).filter(Boolean);

        return {
          lastfmUrl: artist.url,
          genres: genres.length > 0 ? genres : undefined,
          description: artist.bio?.content,
          imageUrl: artist.image?.find((img: any) => img.size === "large")?.["#text"]
        };
      }
    } catch (err) {
      logDebug("Last.fm: Error searching artist", {
        artist: artistName,
        error: err instanceof Error ? err.message : String(err)
      });
    }

    return null;
  }
}

/**
 * SoundCloud API integration
 * Note: SoundCloud doesn't have an official public API anymore, so we use web scraping
 */
class SoundCloudEnrichment {
  async searchArtist(artistName: string): Promise<ExternalArtistData | null> {
    const settings = getSettings();
    if (!settings.apis.soundcloud?.enabled) {
      return null;
    }

    try {
      // SoundCloud search URL (public, no API key needed for basic search)
      const searchQuery = encodeURIComponent(artistName);
      const searchUrl = `https://soundcloud.com/search?q=${searchQuery}`;
      
      // Try to find artist profile URL
      // Since SoundCloud doesn't have a public API, we construct the profile URL
      // based on common patterns and verify it exists
      const normalizedName = artistName.toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      
      const possibleUrls = [
        `https://soundcloud.com/${normalizedName}`,
        `https://soundcloud.com/${normalizedName.replace(/\s+/g, "-")}`,
        `https://soundcloud.com/${normalizedName.replace(/\s+/g, "")}`
      ];

      // Try to verify URL exists by checking if it's accessible
      // We use a simple HEAD request to check
      for (const url of possibleUrls) {
        try {
          const response = await fetch(url, { method: "HEAD", redirect: "follow" });
          if (response.ok || response.status === 200) {
            return {
              soundcloudUrl: url
            };
          }
        } catch (err) {
          // Continue to next URL
          continue;
        }
      }

      // If direct URL doesn't work, return search URL as fallback
      // Users can manually verify
      return {
        soundcloudUrl: searchUrl
      };
    } catch (err) {
      logDebug("SoundCloud: Error searching artist", {
        artist: artistName,
        error: err instanceof Error ? err.message : String(err)
      });
    }

    return null;
  }
}

/**
 * Main enrichment service that combines all sources
 */
export class ArtistEnrichmentService implements ArtistEnrichmentService {
  private spotify: SpotifyEnrichment;
  private musicbrainz: MusicBrainzEnrichment;
  private lastfm: LastFMEnrichment;
  private soundcloud: SoundCloudEnrichment;

  constructor() {
    this.spotify = new SpotifyEnrichment();
    this.musicbrainz = new MusicBrainzEnrichment();
    this.lastfm = new LastFMEnrichment();
    this.soundcloud = new SoundCloudEnrichment();
  }

  async enrichArtist(artistName: string): Promise<ExternalArtistData | null> {
    logDebug("Artist Enrichment: Enriching artist", { artist: artistName });

    // Try all sources in parallel
    const [spotifyData, musicbrainzData, lastfmData, soundcloudData] = await Promise.all([
      this.spotify.searchArtist(artistName),
      this.musicbrainz.searchArtist(artistName),
      this.lastfm.searchArtist(artistName),
      this.soundcloud.searchArtist(artistName)
    ]);

    // Merge data from all sources
    const enriched: ExternalArtistData = {
      ...spotifyData,
      ...musicbrainzData,
      ...lastfmData,
      ...soundcloudData,
      // Merge genres from all sources
      genres: [
        ...(spotifyData?.genres || []),
        ...(lastfmData?.genres || [])
      ].filter((g, i, arr) => arr.indexOf(g) === i), // Remove duplicates
      // Prefer Spotify popularity if available
      popularity: spotifyData?.popularity ?? undefined,
      // Prefer Spotify followers if available
      followers: spotifyData?.followers ?? undefined
    };

    // Return null if no data was found
    if (!enriched.spotifyId && !enriched.musicbrainzId && !enriched.lastfmUrl && !enriched.soundcloudUrl && !enriched.genres?.length) {
      return null;
    }

    logDebug("Artist Enrichment: Enrichment completed", {
      artist: artistName,
      hasSpotify: !!enriched.spotifyId,
      hasMusicBrainz: !!enriched.musicbrainzId,
      hasLastFM: !!enriched.lastfmUrl,
      hasSoundCloud: !!enriched.soundcloudUrl,
      genresCount: enriched.genres?.length || 0
    });

    return enriched;
  }

  async batchEnrichArtists(artistNames: string[]): Promise<Map<string, ExternalArtistData>> {
    const results = new Map<string, ExternalArtistData>();

    // Process in batches of 5 to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < artistNames.length; i += batchSize) {
      const batch = artistNames.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (name) => {
          const data = await this.enrichArtist(name);
          return { name, data };
        })
      );

      for (const { name, data } of batchResults) {
        if (data) {
          results.set(name, data);
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < artistNames.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

export const artistEnrichmentService = new ArtistEnrichmentService();

