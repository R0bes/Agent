/**
 * Settings Configuration
 * Loads configuration from settings.json file
 */

import { readFileSync } from "fs";
import { join } from "path";
import { logWarn } from "../utils/logger";

export interface ApiSettings {
  spotify?: {
    clientId?: string;
    clientSecret?: string;
    enabled: boolean;
  };
  lastfm?: {
    apiKey?: string;
    enabled: boolean;
  };
  soundcloud?: {
    clientId?: string;
    enabled: boolean;
  };
}

export interface Settings {
  apis: ApiSettings;
  eventCrawler?: {
    enabledClubs?: string[]; // If empty, all clubs are enabled
    crawlInterval?: number; // Minutes between crawls
  };
}

const DEFAULT_SETTINGS: Settings = {
  apis: {
    spotify: {
      enabled: false
    },
    lastfm: {
      enabled: false
    },
    soundcloud: {
      enabled: false
    }
  },
  eventCrawler: {
    enabledClubs: [],
    crawlInterval: 60
  }
};

let settings: Settings = DEFAULT_SETTINGS;

/**
 * Load settings from settings.json file
 */
export function loadSettings(): Settings {
  try {
    const settingsPath = join(process.cwd(), "settings.json");
    const settingsContent = readFileSync(settingsPath, "utf-8");
    const loadedSettings = JSON.parse(settingsContent) as Partial<Settings>;

    // Merge with defaults
    settings = {
      apis: {
        spotify: {
          ...DEFAULT_SETTINGS.apis.spotify,
          ...loadedSettings.apis?.spotify
        },
        lastfm: {
          ...DEFAULT_SETTINGS.apis.lastfm,
          ...loadedSettings.apis?.lastfm
        },
        soundcloud: {
          ...DEFAULT_SETTINGS.apis.soundcloud,
          ...loadedSettings.apis?.soundcloud
        }
      },
      eventCrawler: {
        ...DEFAULT_SETTINGS.eventCrawler,
        ...loadedSettings.eventCrawler
      }
    };

    // Validate required fields for enabled APIs
    if (settings.apis.spotify?.enabled) {
      if (!settings.apis.spotify.clientId || !settings.apis.spotify.clientSecret) {
        logWarn("Settings: Spotify enabled but credentials missing, disabling Spotify");
        settings.apis.spotify.enabled = false;
      }
    }

    if (settings.apis.lastfm?.enabled) {
      if (!settings.apis.lastfm.apiKey) {
        logWarn("Settings: Last.fm enabled but API key missing, disabling Last.fm");
        settings.apis.lastfm.enabled = false;
      }
    }

    if (settings.apis.soundcloud?.enabled) {
      if (!settings.apis.soundcloud.clientId) {
        logWarn("Settings: SoundCloud enabled but client ID missing, disabling SoundCloud");
        settings.apis.soundcloud.enabled = false;
      }
    }

    return settings;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      // settings.json doesn't exist, use defaults
      logWarn("Settings: settings.json not found, using default settings");
      return DEFAULT_SETTINGS;
    }
    logWarn("Settings: Error loading settings.json", {
      error: err instanceof Error ? err.message : String(err)
    });
    return DEFAULT_SETTINGS;
  }
}

/**
 * Get current settings
 */
export function getSettings(): Settings {
  return settings;
}

/**
 * Initialize settings (call this at startup)
 */
export function initializeSettings(): void {
  settings = loadSettings();
}

// Initialize on module load
initializeSettings();

