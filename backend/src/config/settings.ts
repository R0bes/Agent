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

export interface DatabaseSettings {
  postgres: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  qdrant: {
    host: string;
    port: number;
  };
}

export interface EmbeddingSettings {
  provider: "ollama";
  model: "nomic-embed-text" | "mxbai-embed-large";
  baseUrl: string;
}

export interface MemorySettings {
  enabled: boolean;
  autoExtract: boolean;
  compaktification: {
    enabled: boolean;
    strategy: "count" | "time" | "hybrid";
    afterMessages?: number;
    afterDays?: number;
    similarityThreshold?: number;
    keepOriginals: boolean;
    maxDepth: number;
  };
}

export interface ConversationSettings {
  // Context Window Configuration
  maxContextTokens?: number;           // Default: 4000
  maxHistoryMessages?: number;         // Default: 10
  
  // Memory Configuration
  memoryLimit?: number;                // Default: 10
  memoryKinds?: Array<"fact" | "preference" | "summary" | "episode">;
  
  // Compaction Triggers (deprecated, use MemorySettings.compaktification)
  compactionTriggers?: {
    messageThreshold?: number;         // Default: 40
    tokenThreshold?: number;           // Default: 3000
    timeIntervalMinutes?: number;      // Default: 60
  };
}

export interface Settings {
  apis: ApiSettings;
  database?: DatabaseSettings;
  embedding?: EmbeddingSettings;
  memory?: MemorySettings;
  eventCrawler?: {
    enabledClubs?: string[]; // If empty, all clubs are enabled
    crawlInterval?: number; // Minutes between crawls
  };
  conversation?: ConversationSettings;
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
  database: {
    postgres: {
      host: process.env.POSTGRES_HOST || "localhost",
      port: parseInt(process.env.POSTGRES_PORT || "5432"),
      database: process.env.POSTGRES_DB || "agent",
      user: process.env.POSTGRES_USER || "agent",
      password: process.env.POSTGRES_PASSWORD || "agentpassword"
    },
    qdrant: {
      host: process.env.QDRANT_HOST || "localhost",
      port: parseInt(process.env.QDRANT_PORT || "6333")
    }
  },
  embedding: {
    provider: "ollama",
    model: (process.env.EMBEDDING_MODEL as any) || "mxbai-embed-large",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434"
  },
  memory: {
    enabled: true,
    autoExtract: true,
    compaktification: {
      enabled: true,
      strategy: "hybrid",
      afterMessages: 50,
      afterDays: 7,
      similarityThreshold: 0.82,
      keepOriginals: true,
      maxDepth: 3
    }
  },
  eventCrawler: {
    enabledClubs: [],
    crawlInterval: 60
  },
  conversation: {
    maxContextTokens: 4000,
    maxHistoryMessages: 10,
    memoryLimit: 10,
    memoryKinds: ["fact", "preference", "summary"],
    compactionTriggers: {
      messageThreshold: 40,
      tokenThreshold: 3000,
      timeIntervalMinutes: 60
    }
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
          enabled: false,
          ...DEFAULT_SETTINGS.apis.spotify,
          ...loadedSettings.apis?.spotify
        },
        lastfm: {
          enabled: false,
          ...DEFAULT_SETTINGS.apis.lastfm,
          ...loadedSettings.apis?.lastfm
        },
        soundcloud: {
          enabled: false,
          ...DEFAULT_SETTINGS.apis.soundcloud,
          ...loadedSettings.apis?.soundcloud
        }
      },
      database: {
        postgres: {
          ...DEFAULT_SETTINGS.database!.postgres,
          ...loadedSettings.database?.postgres
        },
        qdrant: {
          ...DEFAULT_SETTINGS.database!.qdrant,
          ...loadedSettings.database?.qdrant
        }
      },
      embedding: {
        provider: "ollama",
        model: "mxbai-embed-large",
        baseUrl: "http://localhost:11434",
        ...DEFAULT_SETTINGS.embedding,
        ...loadedSettings.embedding
      },
      memory: {
        enabled: true,
        autoExtract: true,
        ...DEFAULT_SETTINGS.memory,
        ...loadedSettings.memory,
        compaktification: {
          ...DEFAULT_SETTINGS.memory!.compaktification,
          ...loadedSettings.memory?.compaktification
        }
      },
      eventCrawler: {
        ...DEFAULT_SETTINGS.eventCrawler,
        ...loadedSettings.eventCrawler
      },
      conversation: {
        ...DEFAULT_SETTINGS.conversation,
        ...loadedSettings.conversation,
        compactionTriggers: {
          ...DEFAULT_SETTINGS.conversation!.compactionTriggers,
          ...loadedSettings.conversation?.compactionTriggers
        }
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

/**
 * Get conversation settings with defaults
 */
export function getConversationSettings(): Required<ConversationSettings> {
  return {
    maxContextTokens: settings.conversation?.maxContextTokens ?? DEFAULT_SETTINGS.conversation!.maxContextTokens!,
    maxHistoryMessages: settings.conversation?.maxHistoryMessages ?? DEFAULT_SETTINGS.conversation!.maxHistoryMessages!,
    memoryLimit: settings.conversation?.memoryLimit ?? DEFAULT_SETTINGS.conversation!.memoryLimit!,
    memoryKinds: settings.conversation?.memoryKinds ?? DEFAULT_SETTINGS.conversation!.memoryKinds!,
    compactionTriggers: {
      messageThreshold: settings.conversation?.compactionTriggers?.messageThreshold ?? 
        DEFAULT_SETTINGS.conversation!.compactionTriggers!.messageThreshold!,
      tokenThreshold: settings.conversation?.compactionTriggers?.tokenThreshold ?? 
        DEFAULT_SETTINGS.conversation!.compactionTriggers!.tokenThreshold!,
      timeIntervalMinutes: settings.conversation?.compactionTriggers?.timeIntervalMinutes ?? 
        DEFAULT_SETTINGS.conversation!.compactionTriggers!.timeIntervalMinutes!
    }
  };
}

/**
 * Get database settings with defaults
 */
export function getDatabaseSettings(): Required<DatabaseSettings> {
  return {
    postgres: {
      host: settings.database?.postgres?.host ?? DEFAULT_SETTINGS.database!.postgres.host,
      port: settings.database?.postgres?.port ?? DEFAULT_SETTINGS.database!.postgres.port,
      database: settings.database?.postgres?.database ?? DEFAULT_SETTINGS.database!.postgres.database,
      user: settings.database?.postgres?.user ?? DEFAULT_SETTINGS.database!.postgres.user,
      password: settings.database?.postgres?.password ?? DEFAULT_SETTINGS.database!.postgres.password
    },
    qdrant: {
      host: settings.database?.qdrant?.host ?? DEFAULT_SETTINGS.database!.qdrant.host,
      port: settings.database?.qdrant?.port ?? DEFAULT_SETTINGS.database!.qdrant.port
    }
  };
}

/**
 * Get embedding settings with defaults
 */
export function getEmbeddingSettings(): Required<EmbeddingSettings> {
  return {
    provider: settings.embedding?.provider ?? DEFAULT_SETTINGS.embedding!.provider,
    model: settings.embedding?.model ?? DEFAULT_SETTINGS.embedding!.model,
    baseUrl: settings.embedding?.baseUrl ?? DEFAULT_SETTINGS.embedding!.baseUrl
  };
}

/**
 * Get memory settings with defaults
 */
export function getMemorySettings(): Required<MemorySettings> {
  return {
    enabled: settings.memory?.enabled ?? DEFAULT_SETTINGS.memory!.enabled,
    autoExtract: settings.memory?.autoExtract ?? DEFAULT_SETTINGS.memory!.autoExtract,
    compaktification: {
      enabled: settings.memory?.compaktification?.enabled ?? DEFAULT_SETTINGS.memory!.compaktification.enabled,
      strategy: settings.memory?.compaktification?.strategy ?? DEFAULT_SETTINGS.memory!.compaktification.strategy,
      afterMessages: settings.memory?.compaktification?.afterMessages ?? DEFAULT_SETTINGS.memory!.compaktification.afterMessages,
      afterDays: settings.memory?.compaktification?.afterDays ?? DEFAULT_SETTINGS.memory!.compaktification.afterDays,
      similarityThreshold: settings.memory?.compaktification?.similarityThreshold ?? DEFAULT_SETTINGS.memory!.compaktification.similarityThreshold,
      keepOriginals: settings.memory?.compaktification?.keepOriginals ?? DEFAULT_SETTINGS.memory!.compaktification.keepOriginals,
      maxDepth: settings.memory?.compaktification?.maxDepth ?? DEFAULT_SETTINGS.memory!.compaktification.maxDepth
    }
  };
}

// Initialize on module load
initializeSettings();

