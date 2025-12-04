/**
 * Sound Detection Utility - Extracts genre, subgenre, and style information from text
 */

export interface DetectedSound {
  genre?: string;
  subgenres?: string[];
  tags?: string[];
  style?: string;
}

// Genre mapping with keywords
const GENRE_KEYWORDS: Record<string, string[]> = {
  techno: ["techno", "tech", "minimal techno", "hard techno", "industrial techno"],
  house: ["house", "deep house", "tech house", "progressive house", "funky house"],
  electronic: ["electronic", "electronica", "eletronic"],
  "drum & bass": ["drum & bass", "drum and bass", "dnb", "jungle", "liquid dnb"],
  trance: ["trance", "psytrance", "progressive trance", "uplifting trance"],
  hardstyle: ["hardstyle", "hardcore", "hard dance"],
  psytrance: ["psytrance", "psy", "goa", "psychedelic trance"],
  goa: ["goa", "goa trance"],
  dubstep: ["dubstep", "brostep", "riddim"],
  bass: ["bass", "bass music", "bassline"],
  hiphop: ["hip hop", "hiphop", "rap", "trap"],
  indie: ["indie", "indie rock", "indie pop"],
  rock: ["rock", "punk", "post-rock", "post-punk"],
  metal: ["metal", "metalcore", "death metal", "black metal"],
  goth: ["goth", "gothic", "darkwave", "coldwave"],
  emo: ["emo", "emo night", "post-hardcore"],
  pop: ["pop", "mainstream"],
  reggae: ["reggae", "dancehall", "dub"],
  jazz: ["jazz", "nu jazz", "jazz fusion"],
  ambient: ["ambient", "chill", "downtempo"],
  experimental: ["experimental", "avant-garde", "noise"]
};

// Subgenre patterns
const SUBGENRE_PATTERNS: Record<string, string[]> = {
  techno: ["minimal", "hard", "industrial", "acid", "detroit", "berlin", "melodic", "raw"],
  house: ["deep", "tech", "progressive", "funky", "disco", "garage", "tribal", "afro"],
  "drum & bass": ["liquid", "neurofunk", "jump-up", "darkstep", "atmospheric"],
  trance: ["psy", "progressive", "uplifting", "vocal", "goa"],
  bass: ["future bass", "melodic bass", "riddim", "brostep"]
};

// Style/tag keywords
const STYLE_KEYWORDS = {
  live: ["live", "live set", "live act", "live performance", "concert"],
  "dj set": ["dj", "dj set", "dj mix", "dj session"],
  "all night long": ["all night long", "all night", "extended set"],
  b2b: ["b2b", "back to back", "back-to-back"],
  openair: ["open air", "openair", "outdoor", "garden"],
  afterparty: ["afterparty", "after party", "aftershow"],
  special: ["special", "edition", "anniversary", "birthday", "jubilee"]
};

export function detectSoundFromText(text: string): DetectedSound {
  if (!text) return {};

  const lowerText = text.toLowerCase();
  const detected: DetectedSound = {
    genre: undefined,
    subgenres: [],
    tags: [],
    style: undefined
  };

  // Detect primary genre
  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        detected.genre = genre;
        break;
      }
    }
    if (detected.genre) break;
  }

  // Detect subgenres
  if (detected.genre && SUBGENRE_PATTERNS[detected.genre]) {
    for (const subgenre of SUBGENRE_PATTERNS[detected.genre]) {
      if (lowerText.includes(subgenre.toLowerCase())) {
        detected.subgenres = detected.subgenres || [];
        if (!detected.subgenres.includes(subgenre)) {
          detected.subgenres.push(subgenre);
        }
      }
    }
  }

  // Detect style tags
  for (const [tag, keywords] of Object.entries(STYLE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        detected.tags = detected.tags || [];
        if (!detected.tags.includes(tag)) {
          detected.tags.push(tag);
        }
      }
    }
  }

  // Detect style (combination of genre + subgenre)
  if (detected.genre && detected.subgenres && detected.subgenres.length > 0) {
    detected.style = `${detected.subgenres[0]} ${detected.genre}`;
  } else if (detected.genre) {
    detected.style = detected.genre;
  }

  return detected;
}

export function extractGenresFromText(text: string): string[] {
  const genres: string[] = [];
  const lowerText = text.toLowerCase();

  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        if (!genres.includes(genre)) {
          genres.push(genre);
        }
        break;
      }
    }
  }

  return genres;
}

export function extractTagsFromText(text: string): string[] {
  const tags: string[] = [];
  const lowerText = text.toLowerCase();

  for (const [tag, keywords] of Object.entries(STYLE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
        break;
      }
    }
  }

  return tags;
}

