/**
 * Event Crawler Tool Component
 * 
 * Implements Tool interface using AbstractTool base class.
 * - Tool: Crawls club websites and extracts events
 */

import { AbstractTool } from "../../base/AbstractTool";
import type { Component, ToolContext, ToolResult } from "../../types";
import { logDebug, logError, logInfo, logWarn } from "../../../utils/logger";
import type { Event } from "../../../models/eventStore";
import { eventStore } from "../../../models/eventStore";
import { artistStore } from "../../../models/artistStore";
import { collectiveStore, detectCollectiveFromTitle } from "../../../models/collectiveStore";
import { labelStore, detectLabelFromText } from "../../../models/labelStore";
import { detectSoundFromText, extractGenresFromText, extractTagsFromText } from "../../../utils/soundDetector";
import type { ArtistSound } from "../../../models/artistStore";

// Lazy import playwright to avoid blocking server startup if not installed
let playwright: typeof import("playwright") | null = null;
let playwrightAvailable = false;

async function ensurePlaywright() {
  if (playwrightAvailable) return playwright;
  try {
    playwright = await import("playwright");
    playwrightAvailable = true;
    return playwright;
  } catch (err) {
    logWarn("Event Crawler: Playwright not available", { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

const CLUB_WEBSITES = [
  { name: "Nordstern", url: "https://www.nordstern.com/events/" },
  { name: "Kaschemme", url: "https://www.kaschemme.ch/programm" },
  { name: "Das Viertel", url: "https://www.dasviertel.ch/viertelklub" },
  { name: "Bassoverse", url: "https://www.bassoverse.space/beats" },
  { name: "Elysia", url: "https://www.elysia.ch/" },
  { name: "Kinker", url: "https://www.kinker.ch/events.html" }
];

/**
 * Event Crawler Tool implementation
 */
class EventCrawlerTool extends AbstractTool {
  readonly name = "event_crawler";
  readonly shortDescription = "Crawl club websites and extract events, then sort and display them.";
  readonly description = "Crawls multiple club websites (Nordstern, Kaschemme, Das Viertel, Bassoverse, Elysia, Kinker) to extract upcoming events. The tool parses event information including dates, titles, artists, and venues. Events are scored based on relevance (future dates, artist information, time details, keywords) and sorted by score (descending) and then by date. All events are stored in the event store for later retrieval. Use this tool to discover upcoming club events in Basel.";
  readonly parameters = {
    type: "object",
    properties: {
      clubs: {
        type: "array",
        items: { type: "string" },
        description: "Optional: Filter to specific clubs (e.g., ['Nordstern', 'Kaschemme'])"
      }
    }
  };
  readonly examples = [
    {
      input: {},
      output: {
        ok: true,
        data: {
          events: [
            {
              id: "event-123",
              club: "Nordstern",
              title: "Worakls",
              date: "2024-12-05T23:00:00.000Z",
              artists: ["Worakls", "Alicia Hahn"],
              url: "https://www.nordstern.com/events/...",
              score: 18
            }
          ],
          totalEvents: 25,
          clubsCrawled: 6
        }
      },
      description: "Crawl all club websites and extract events"
    },
    {
      input: {
        clubs: ["Nordstern", "Kaschemme"]
      },
      output: {
        ok: true,
        data: {
          events: [
            {
              id: "event-123",
              club: "Nordstern",
              title: "Worakls",
              date: "2024-12-05T23:00:00.000Z",
              artists: ["Worakls"],
              url: "https://www.nordstern.com/events/...",
              score: 18
            }
          ],
          totalEvents: 10,
          clubsCrawled: 2
        }
      },
      description: "Crawl only specific clubs"
    }
  ];

  private browser: any = null;

  async execute(args: { clubs?: string[] }, ctx: ToolContext): Promise<ToolResult> {
    try {
      logInfo("Event Crawler: Starting crawl", {
        clubs: args.clubs,
        userId: ctx.userId
      });

      // Check if playwright is available
      const pw = await ensurePlaywright();
      if (!pw) {
        return {
          ok: false,
          error: "Playwright is not installed. Please install it with: npm install playwright"
        };
      }

      // Filter clubs if specified
      const clubsToCrawl = args.clubs
        ? CLUB_WEBSITES.filter((c) => args.clubs!.includes(c.name))
        : CLUB_WEBSITES;

      if (clubsToCrawl.length === 0) {
        return {
          ok: false,
          error: "No valid clubs specified"
        };
      }

      // Launch browser
      this.browser = await pw.chromium.launch({
        headless: true
      });

      // Crawl all websites in parallel with error handling
      const crawlResults = await Promise.allSettled(
        clubsToCrawl.map((club) => this.crawlClubWebsite(club.name, club.url))
      );

      // Collect all events
      const allEvents: Omit<Event, "id" | "scrapedAt">[] = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < crawlResults.length; i++) {
        const result = crawlResults[i];
        const club = clubsToCrawl[i];

        if (result.status === "fulfilled") {
          const events = result.value;
          allEvents.push(...events);
          successCount++;
          logDebug("Event Crawler: Club crawled successfully", {
            club: club.name,
            eventCount: events.length
          });
        } else {
          errorCount++;
          logWarn("Event Crawler: Failed to crawl club", {
            club: club.name,
            error: result.reason?.message ?? String(result.reason)
          });
        }
      }

      // Close browser
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      // Filter out past events (only keep future events)
      const now = new Date();
      const futureEvents = allEvents.filter((event) => {
        const eventDate = new Date(event.date);
        return eventDate >= now;
      });

      logDebug("Event Crawler: Filtered past events", {
        total: allEvents.length,
        future: futureEvents.length,
        past: allEvents.length - futureEvents.length
      });

      // Score events
      const scoredEvents = futureEvents.map((event) => ({
        ...event,
        score: this.scoreEvent(event)
      }));

      // Store events (deduplicate by URL + date) and track artists/collectives
      const storedEvents: Event[] = [];
      const seen = new Set<string>();

      for (const event of scoredEvents) {
        const key = `${event.url}-${event.date}`;
        if (!seen.has(key)) {
          seen.add(key);
          
          // Detect sound/genre information
          const eventText = [
            event.title,
            event.description,
            event.genre,
            event.artists?.join(" ")
          ].filter(Boolean).join(" ");
          
          const detectedSound = detectSoundFromText(eventText);
          const genres = extractGenresFromText(eventText);
          const tags = extractTagsFromText(eventText);
          
          // Detect collective from title
          const collectiveName = detectCollectiveFromTitle(event.title);
          
          // Detect label from title and description
          const labelName = detectLabelFromText(eventText);
          
          // Track artists
          const artistIds: string[] = [];
          if (event.artists && event.artists.length > 0) {
            for (const artistName of event.artists) {
              try {
                const artistSound: ArtistSound = {
                  genre: detectedSound.genre,
                  subgenres: detectedSound.subgenres,
                  tags: detectedSound.tags,
                  style: detectedSound.style
                };
                
                const artist = await artistStore.trackArtistEvent(artistName, {
                  eventId: "", // Will be set after event is created
                  club: event.club,
                  date: event.date,
                  sounds: artistSound,
                  eventScore: event.score
                });
                artistIds.push(artist.id);
              } catch (err) {
                logDebug("Event Crawler: Failed to track artist", {
                  artist: artistName,
                  error: err instanceof Error ? err.message : String(err)
                });
              }
            }
          }
          
          // Track collective
          let collectives: string[] = [];
          if (collectiveName) {
            try {
              const collective = await collectiveStore.trackCollectiveEvent(collectiveName, {
                eventId: "", // Will be set after event is created
                club: event.club,
                date: event.date,
                eventSeries: collectiveName,
                artists: artistIds,
                genres: genres.length > 0 ? genres : (detectedSound.genre ? [detectedSound.genre] : undefined)
              });
              collectives = [collective.name];
            } catch (err) {
              logDebug("Event Crawler: Failed to track collective", {
                collective: collectiveName,
                error: err instanceof Error ? err.message : String(err)
              });
            }
          }
          
          // Store event with enhanced data first
          const stored = await eventStore.addEvent({
            club: event.club,
            title: event.title,
            date: event.date,
            time: event.time,
            artists: event.artists,
            artistIds: artistIds.length > 0 ? artistIds : undefined,
            collectives: collectives.length > 0 ? collectives : undefined,
            venue: event.venue,
            description: event.description,
            genre: detectedSound.genre || event.genre,
            genres: genres.length > 0 ? genres : undefined,
            subgenres: detectedSound.subgenres,
            tags: tags.length > 0 ? tags : undefined,
            ticketUrl: event.ticketUrl,
            url: event.url,
            score: event.score
          });
          
          // Track label (if detected)
          let labels: string[] = [];
          if (labelName) {
            try {
              const label = await labelStore.trackLabelEvent(labelName, {
                eventId: stored.id,
                club: event.club,
                date: event.date,
                artists: artistIds
              });
              labels = [label.name];
              
              // Link artists to label
              for (const artistId of artistIds) {
                try {
                  await labelStore.addArtistToLabel(label.id, artistId);
                } catch (err) {
                  logDebug("Event Crawler: Failed to link artist to label", {
                    artistId,
                    labelId: label.id,
                    error: err instanceof Error ? err.message : String(err)
                  });
                }
              }
              
              // Update stored event with labels
              stored.labels = labels;
            } catch (err) {
              logDebug("Event Crawler: Failed to track label", {
                label: labelName,
                error: err instanceof Error ? err.message : String(err)
              });
            }
          }
          
          storedEvents.push(stored);
        }
      }

      // Sort events: by score (descending), then by date (ascending)
      storedEvents.sort((a, b) => {
        const scoreA = a.score ?? 0;
        const scoreB = b.score ?? 0;
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      logInfo("Event Crawler: Crawl completed", {
        totalEvents: storedEvents.length,
        successCount,
        errorCount,
        userId: ctx.userId
      });

      return {
        ok: true,
        data: {
          events: storedEvents,
          totalEvents: storedEvents.length,
          clubsCrawled: successCount,
          clubsFailed: errorCount
        }
      };
    } catch (err: any) {
      logError("Event Crawler: Execution error", err, {
        userId: ctx.userId
      });

      // Ensure browser is closed on error
      if (this.browser) {
        try {
          await this.browser.close();
        } catch (closeErr) {
          // Ignore close errors
        }
        this.browser = null;
      }

      return {
        ok: false,
        error: err?.message ?? String(err)
      };
    }
  }

  /**
   * Crawl a single club website
   */
  private async crawlClubWebsite(clubName: string, url: string): Promise<Omit<Event, "id" | "scrapedAt">[]> {
    if (!this.browser) {
      throw new Error("Browser not initialized");
    }

    const page = await (this.browser as any).newPage();
    try {
      logDebug("Event Crawler: Loading page", { club: clubName, url });

      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000
      });
      
      // Wait a bit for dynamic content
      await page.waitForTimeout(2000);

      const html = await page.content();

      // Parse events based on club
      let events: Omit<Event, "id" | "scrapedAt">[] = [];
      switch (clubName) {
        case "Nordstern":
          events = this.parseNordstern(html, url);
          break;
        case "Kaschemme":
          events = this.parseKaschemme(html, url);
          break;
        case "Das Viertel":
          events = this.parseDasviertel(html, url);
          break;
        case "Bassoverse":
          events = this.parseBassoverse(html, url);
          break;
        case "Elysia":
          events = this.parseElysia(html, url);
          break;
        case "Kinker":
          events = this.parseKinker(html, url);
          break;
        default:
          logWarn("Event Crawler: Unknown club", { club: clubName });
      }

      return events;
    } finally {
      await page.close();
    }
  }

  /**
   * Parse Nordstern events
   * Nordstern uses Nuxt.js and stores events in __NUXT_DATA__ JSON with reference-based compression
   */
  private parseNordstern(html: string, baseUrl: string): Omit<Event, "id" | "scrapedAt">[] {
    const events: Omit<Event, "id" | "scrapedAt">[] = [];
    
    try {
      // Extract JSON from __NUXT_DATA__ script tag
      const nuxtDataMatch = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (!nuxtDataMatch) {
        logDebug("Event Crawler: No __NUXT_DATA__ found for Nordstern");
        return events;
      }
      
      const jsonStr = nuxtDataMatch[1];
      const nuxtData = JSON.parse(jsonStr);
      
      if (!Array.isArray(nuxtData)) {
        logDebug("Event Crawler: Nordstern data is not an array");
        return events;
      }
      
      // Helper function to resolve references
      const resolveRef = (ref: any): any => {
        if (typeof ref === "number" && ref >= 0 && ref < nuxtData.length) {
          return nuxtData[ref];
        }
        return ref;
      };
      
      // Helper function to resolve a value (handles nested references)
      const resolveValue = (val: any): any => {
        if (typeof val === "number" && val >= 0 && val < nuxtData.length) {
          const resolved = nuxtData[val];
          if (typeof resolved === "object" && resolved !== null) {
            // Resolve nested references in objects
            const resolvedObj: any = {};
            for (const [key, value] of Object.entries(resolved)) {
              resolvedObj[key] = resolveValue(value);
            }
            return resolvedObj;
          }
          return resolved;
        }
        if (Array.isArray(val)) {
          return val.map(resolveValue);
        }
        if (typeof val === "object" && val !== null) {
          const resolvedObj: any = {};
          for (const [key, value] of Object.entries(val)) {
            resolvedObj[key] = resolveValue(value);
          }
          return resolvedObj;
        }
        return val;
      };
      
      // Find all event objects in the array
      for (let i = 0; i < nuxtData.length; i++) {
        const item = nuxtData[i];
        if (typeof item === "object" && item !== null && !Array.isArray(item)) {
          // Check if this looks like an event (has date and label fields, even if they're references)
          if (("date" in item || "dateraw" in item) && ("label" in item || "mainArtists" in item)) {
            try {
              // Resolve all references in this event object
              const eventData = resolveValue(item);
              
              // Get date - prefer dateraw (ISO format) over date (formatted string)
              let dateStr: string | undefined;
              if (eventData.dateraw !== undefined) {
                const daterawVal = resolveValue(eventData.dateraw);
                if (typeof daterawVal === "string" && daterawVal.includes("T")) {
                  dateStr = daterawVal;
                }
              }
              if (!dateStr && eventData.date !== undefined) {
                const dateVal = resolveValue(eventData.date);
                if (typeof dateVal === "string" && dateVal.includes("T")) {
                  dateStr = dateVal;
                }
              }
              
              if (!dateStr) continue;
              
              const eventDate = new Date(dateStr);
              if (isNaN(eventDate.getTime())) continue;
              
              // Get label/title - resolve reference if needed
              let title: string | undefined;
              if (eventData.label !== undefined) {
                const labelVal = resolveValue(eventData.label);
                if (typeof labelVal === "string" && labelVal.length > 0) {
                  title = labelVal;
                }
              }
              
              // If no title from label, try to get from mainArtists
              if (!title && eventData.mainArtists && Array.isArray(eventData.mainArtists) && eventData.mainArtists.length > 0) {
                const firstArtist = resolveValue(eventData.mainArtists[0]);
                if (firstArtist?.name && typeof firstArtist.name === "string") {
                  title = firstArtist.name;
                }
              }
              
              // Fallback: try to extract from URL
              if (!title && eventData.ticket_url) {
                const urlVal = resolveValue(eventData.ticket_url);
                if (typeof urlVal === "string") {
                  const urlMatch = urlVal.match(/\/([^\/]+)-(\d{4}-\d{2}-\d{2})/);
                  if (urlMatch) {
                    title = urlMatch[1].replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
                  }
                }
              }
              
              // Final fallback
              if (!title) {
                title = "Untitled Event";
              }
              
              // Extract artists
              const artists: string[] = [];
              if (eventData.mainArtists && Array.isArray(eventData.mainArtists)) {
                eventData.mainArtists.forEach((artistRef: any) => {
                  const artist = resolveValue(artistRef);
                  if (artist?.name && typeof artist.name === "string") {
                    artists.push(artist.name);
                  }
                });
              }
              if (eventData.supportArtists && Array.isArray(eventData.supportArtists)) {
                eventData.supportArtists.forEach((artistRef: any) => {
                  const artist = resolveValue(artistRef);
                  if (artist?.name && typeof artist.name === "string" && !artists.includes(artist.name)) {
                    artists.push(artist.name);
                  }
                });
              }
              
              // Extract description
              let description: string | undefined;
              if (eventData.description) {
                const descVal = resolveValue(eventData.description);
                if (typeof descVal === "string" && descVal.length > 0) {
                  // Clean HTML from description
                  description = descVal
                    .replace(/<[^>]+>/g, " ")
                    .replace(/&nbsp;/g, " ")
                    .replace(/&amp;/g, "&")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&quot;/g, '"')
                    .replace(/\s+/g, " ")
                    .trim();
                  if (description.length > 500) {
                    description = description.substring(0, 500) + "...";
                  }
                }
              }
              
              // Extract lineup (additional artist info)
              if (eventData.lineup) {
                const lineupVal = resolveValue(eventData.lineup);
                if (typeof lineupVal === "string" && lineupVal.length > 0) {
                  // Try to extract artist names from lineup HTML
                  const lineupArtists = lineupVal.match(/>\s*([A-Z][A-Z\s&]+?)\s*</g);
                  if (lineupArtists) {
                    lineupArtists.forEach((match) => {
                      const artistName = match.replace(/[<>]/g, "").trim();
                      if (artistName && artistName.length > 2 && !artists.includes(artistName)) {
                        artists.push(artistName);
                      }
                    });
                  }
                }
              }
              
              // Extract time
              let time: string | undefined;
              if (eventData.time) {
                const timeVal = resolveValue(eventData.time);
                time = typeof timeVal === "string" ? timeVal : undefined;
              }
              if (!time && dateStr) {
                const date = new Date(dateStr);
                time = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
              }
              
              // Get URLs
              let url = baseUrl;
              let ticketUrl: string | undefined;
              if (eventData.ticket_url) {
                const urlVal = resolveValue(eventData.ticket_url);
                if (typeof urlVal === "string" && urlVal.startsWith("http")) {
                  ticketUrl = urlVal;
                  url = urlVal;
                }
              }
              
              // Extract genre from eventBrand or description
              let genre: string | undefined;
              if (eventData.eventBrand) {
                const brandVal = resolveValue(eventData.eventBrand);
                if (typeof brandVal === "string") {
                  genre = brandVal;
                }
              }
              
              events.push({
                club: "Nordstern",
                title: title,
                date: eventDate.toISOString(),
                time,
                artists: artists.length > 0 ? artists : undefined,
                description,
                genre,
                ticketUrl,
                url
              });
            } catch (err) {
              logDebug("Event Crawler: Failed to parse Nordstern event", { error: err, index: i });
              continue;
            }
          }
        }
      }
    } catch (err) {
      logError("Event Crawler: Failed to parse Nordstern JSON", err);
    }
    
    // Deduplicate by title + date
    const seen = new Set<string>();
    return events.filter((e) => {
      const key = `${e.title}-${e.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Parse Kaschemme events (Squarespace)
   */
  private parseKaschemme(html: string, baseUrl: string): Omit<Event, "id" | "scrapedAt">[] {
    const events: Omit<Event, "id" | "scrapedAt">[] = [];
    
    const monthMap: Record<string, number> = {
      "jan": 0, "januar": 0, "feb": 1, "februar": 1, "mär": 2, "märz": 2, "mar": 2, "march": 2,
      "apr": 3, "april": 3, "mai": 4, "may": 4, "jun": 5, "juni": 5, "june": 5,
      "jul": 6, "juli": 6, "july": 6, "aug": 7, "august": 7, "sep": 8, "september": 8,
      "okt": 9, "oktober": 9, "oct": 9, "october": 9, "nov": 10, "november": 10,
      "dez": 11, "dezember": 11, "dec": 11, "december": 11
    };
    
    // Squarespace event structure: <article class="eventlist-event">
    const eventBlockRegex = /<article[^>]*class="[^"]*eventlist-event[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    
    let eventMatch;
    while ((eventMatch = eventBlockRegex.exec(html)) !== null) {
      try {
        const eventBlock = eventMatch[1];
        
        // Extract title from <h1 class="eventlist-title">
        const titleMatch = eventBlock.match(/<h1[^>]*class="[^"]*eventlist-title[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
        if (!titleMatch) continue;
        
        const title = this.stripHtml(titleMatch[1]).trim();
        if (!title || title.length < 3) continue;
        
        // Extract date from eventlist-datetag
        const dateTagMatch = eventBlock.match(/<div[^>]*class="[^"]*eventlist-datetag[^"]*"[^>]*>[\s\S]*?<div[^>]*class="[^"]*eventlist-datetag-startdate[^"]*eventlist-datetag-startdate--month[^"]*"[^>]*>([^<]+)<\/div>[\s\S]*?<div[^>]*class="[^"]*eventlist-datetag-startdate[^"]*eventlist-datetag-startdate--day[^"]*"[^>]*>(\d+)<\/div>/i);
        if (!dateTagMatch) continue;
        
        const monthStr = dateTagMatch[1].trim().toLowerCase().replace(/\./g, "");
        const day = parseInt(dateTagMatch[2]);
        const month = monthMap[monthStr] ?? monthMap[monthStr.substring(0, 3)];
        
        if (month === undefined || isNaN(day)) continue;
        
        // Get current year or next year if date is in the past
        const now = new Date();
        let year = now.getFullYear();
        const eventDate = new Date(year, month, day);
        if (eventDate < now) {
          year++;
          eventDate.setFullYear(year);
        }
        
        // Extract time from eventlist-time or eventlist-time-format
        let time: string | undefined;
        const timeMatch = eventBlock.match(/<div[^>]*class="[^"]*eventlist-time[^"]*"[^>]*>([^<]+)<\/div>/i);
        if (timeMatch) {
          time = this.stripHtml(timeMatch[1]).trim();
        }
        
        // Extract artists from title (e.g., "w/ ARTIST" or "ARTIST live")
        const artists: string[] = [];
        const titleArtists = title.match(/(?:w\/|with|feat\.?|featuring)\s+([^,]+)/i);
        if (titleArtists) {
          const artist = titleArtists[1].trim();
          if (artist && artist.length > 2) artists.push(artist);
        }
        
        // Extract description
        let description: string | undefined;
        const descMatch = eventBlock.match(/<div[^>]*class="[^"]*eventlist-excerpt[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        if (descMatch) {
          description = this.stripHtml(descMatch[1]).trim();
          if (description && description.length > 500) description = description.substring(0, 500) + "...";
        }
        
        // Extract genre from title
        let genre: string | undefined;
        const genreKeywords = ["techno", "house", "electronic", "drum & bass", "drum and bass", "dnb", "trance", "hardstyle", "psytrance", "goa"];
        const titleLower = title.toLowerCase();
        for (const keyword of genreKeywords) {
          if (titleLower.includes(keyword)) {
            genre = keyword;
            break;
          }
        }
        
        // Extract URL
        const urlMatch = eventBlock.match(/<a[^>]*href="([^"]+)"[^>]*class="[^"]*eventlist-title-link[^"]*"/i);
        const eventUrl = urlMatch ? (urlMatch[1].startsWith("http") ? urlMatch[1] : `https://www.kaschemme.ch${urlMatch[1]}`) : baseUrl;
        
        events.push({
          club: "Kaschemme",
          title,
          date: eventDate.toISOString(),
          time,
          artists: artists.length > 0 ? artists : undefined,
          description,
          genre,
          url: eventUrl
        });
      } catch (err) {
        logDebug("Event Crawler: Error parsing Kaschemme event block", { error: err instanceof Error ? err.message : String(err) });
        continue;
      }
    }
    
    // Deduplicate
    const seen = new Set<string>();
    return events.filter((e) => {
      const key = `${e.title}-${e.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Parse Das Viertel events
   */
  private parseDasviertel(html: string, baseUrl: string): Omit<Event, "id" | "scrapedAt">[] {
    const events: Omit<Event, "id" | "scrapedAt">[] = [];
    
    // Try multiple patterns for Das Viertel
    const patterns = [
      // Pattern 1: Event cards with dates
      /<div[^>]*class="[^"]*event[^"]*"[^>]*>[\s\S]*?<h[23][^>]*>([^<]+)<\/h[23]>[\s\S]*?(\d{1,2})\.(\d{1,2})\.(\d{4})/gi,
      // Pattern 2: Simple headings with dates nearby
      /<h[23][^>]*>([^<]+)<\/h[23]>[\s\S]{0,500}?(\d{1,2})\.(\d{1,2})\.(\d{4})/gi
    ];
    
    const seen = new Set<string>();
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        try {
          const title = match[1]?.trim();
          if (!title || title.length < 3) continue;
          
          const day = match[2];
          const month = match[3];
          const year = match[4];
          
          if (!day || !month || !year) continue;
          
          const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (isNaN(eventDate.getTime())) continue;
          
          // Skip past events
          if (eventDate < new Date()) continue;
          
          const key = `${title}-${eventDate.toISOString()}`;
          if (seen.has(key)) continue;
          seen.add(key);
          
          // Extract artists from content
          const artists: string[] = [];
          const content = html.substring(match.index, match.index + 1000);
          const artistMatches = content.match(/(?:DJ|Live|w\/|with|feat\.?)\s+([A-Z][A-Za-z\s&]+?)(?:\s|,|$|<\/)/g);
          if (artistMatches) {
            artistMatches.forEach((m) => {
              const artist = m.replace(/(?:DJ|Live|w\/|with|feat\.?)\s*/i, "").trim();
              if (artist && artist.length > 2 && !artists.includes(artist)) {
                artists.push(artist);
              }
            });
          }
          
          events.push({
            club: "Das Viertel",
            title,
            date: eventDate.toISOString(),
            artists: artists.length > 0 ? artists : undefined,
            url: baseUrl
          });
        } catch (err) {
          continue;
        }
      }
    }
    
    return events;
  }

  /**
   * Parse Bassoverse events
   * Bassoverse uses a format like "06.12.2025 • AB 15:00"
   */
  private parseBassoverse(html: string, baseUrl: string): Omit<Event, "id" | "scrapedAt">[] {
    const events: Omit<Event, "id" | "scrapedAt">[] = [];
    
    // Pattern 1: Date format "DD.MM.YYYY • AB HH:MM" or "DD.MM.YYYY"
    const dateTimePattern = /(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s*•\s*AB\s*(\d{1,2}):(\d{2}))?/gi;
    
    // Pattern 2: Look for dates in ISO format "YYYY-MM-DD"
    const isoDatePattern = /(\d{4})-(\d{2})-(\d{2})/g;
    
    const seen = new Set<string>();
    
    // Try DD.MM.YYYY format
    let match;
    while ((match = dateTimePattern.exec(html)) !== null) {
      try {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]);
        const year = parseInt(match[3]);
        const hour = match[4] ? parseInt(match[4]) : 22; // Default 22:00
        const minute = match[5] ? parseInt(match[5]) : 0;
        
        const eventDate = new Date(year, month - 1, day, hour, minute);
        if (isNaN(eventDate.getTime())) continue;
        
        // Skip past events
        if (eventDate < new Date()) continue;
        
        // Extract title from surrounding context (look backwards and forwards)
        const startPos = Math.max(0, match.index - 200);
        const endPos = Math.min(html.length, match.index + match[0].length + 200);
        const context = html.substring(startPos, endPos);
        
        // Try to find title before the date
        const titleMatch = context.match(/(?:<h[123][^>]*>|<p[^>]*>|<div[^>]*>|<span[^>]*>)([^<]{10,100}?)(?:<\/h[123]>|<\/p>|<\/div>|<\/span>)/i);
        let title = titleMatch ? this.stripHtml(titleMatch[1]).trim() : undefined;
        
        // If no title found, try to extract from text nodes
        if (!title || title.length < 3) {
          const textBefore = context.substring(0, context.indexOf(match[0]));
          const lines = textBefore.split(/[<>]/).filter(l => l.length > 10 && l.length < 100);
          if (lines.length > 0) {
            title = lines[lines.length - 1].trim();
          }
        }
        
        if (!title || title.length < 3) {
          title = `Event ${day}.${month}.${year}`;
        }
        
        const key = `${title}-${eventDate.toISOString()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        
        // Extract time
        const time = match[4] ? `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}` : undefined;
        
        // Extract artists from context
        const artists: string[] = [];
        const artistMatches = context.match(/(?:DJ|Live|w\/|with|feat\.?|featuring)\s+([A-Z][A-Za-z\s&]+?)(?:\s|,|$|<\/)/gi);
        if (artistMatches) {
          artistMatches.forEach((m) => {
            const artist = m.replace(/(?:DJ|Live|w\/|with|feat\.?|featuring)\s*/i, "").trim();
            if (artist && artist.length > 2 && !artists.includes(artist)) {
              artists.push(artist);
            }
          });
        }
        
        events.push({
          club: "Bassoverse",
          title,
          date: eventDate.toISOString(),
          time,
          artists: artists.length > 0 ? artists : undefined,
          url: baseUrl
        });
      } catch (err) {
        continue;
      }
    }
    
    // Try ISO date format
    while ((match = isoDatePattern.exec(html)) !== null) {
      try {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        
        const eventDate = new Date(year, month - 1, day, 22, 0);
        if (isNaN(eventDate.getTime())) continue;
        
        // Skip past events
        if (eventDate < new Date()) continue;
        
        // Extract title from context
        const startPos = Math.max(0, match.index - 200);
        const endPos = Math.min(html.length, match.index + match[0].length + 200);
        const context = html.substring(startPos, endPos);
        
        const titleMatch = context.match(/(?:<h[123][^>]*>|<p[^>]*>|<div[^>]*>)([^<]{10,100}?)(?:<\/h[123]>|<\/p>|<\/div>)/i);
        let title = titleMatch ? this.stripHtml(titleMatch[1]).trim() : undefined;
        
        if (!title || title.length < 3) {
          title = `Event ${day}.${month}.${year}`;
        }
        
        const key = `${title}-${eventDate.toISOString()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        
        events.push({
          club: "Bassoverse",
          title,
          date: eventDate.toISOString(),
          url: baseUrl
        });
      } catch (err) {
        continue;
      }
    }
    
    return events;
  }

  /**
   * Parse Elysia events
   * Elysia uses classes: "events", "event-row", "event-title", "date"
   */
  private parseElysia(html: string, baseUrl: string): Omit<Event, "id" | "scrapedAt">[] {
    const events: Omit<Event, "id" | "scrapedAt">[] = [];
    
    // Pattern 1: Look for event-row divs with event-title and date
    const eventRowPattern = /<div[^>]*class="[^"]*event-row[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    
    // Pattern 2: Date format DD/MM/YYYY
    const datePattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
    
    const seen = new Set<string>();
    
    // Try to find event rows
    let rowMatch;
    while ((rowMatch = eventRowPattern.exec(html)) !== null) {
      try {
        const rowHtml = rowMatch[1];
        
        // Extract date
        const dateMatch = rowHtml.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (!dateMatch) continue;
        
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]);
        const year = parseInt(dateMatch[3]);
        
        const eventDate = new Date(year, month - 1, day, 22, 0);
        if (isNaN(eventDate.getTime())) continue;
        
        // Skip past events
        if (eventDate < new Date()) continue;
        
        // Extract title from event-title class
        const titleMatch = rowHtml.match(/<[^>]*class="[^"]*event-title[^"]*"[^>]*>([^<]+)<\/[^>]*>/i);
        let title = titleMatch ? this.stripHtml(titleMatch[1]).trim() : undefined;
        
        // Fallback: extract from any heading or strong tag
        if (!title || title.length < 3) {
          const headingMatch = rowHtml.match(/<(h[123]|strong|b)[^>]*>([^<]{10,100})<\/(h[123]|strong|b)>/i);
          title = headingMatch ? this.stripHtml(headingMatch[2]).trim() : undefined;
        }
        
        if (!title || title.length < 3) {
          title = `Event ${day}/${month}/${year}`;
        }
        
        const key = `${title}-${eventDate.toISOString()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        
        // Extract artists
        const artists: string[] = [];
        const artistMatches = rowHtml.match(/(?:DJ|Live|w\/|with|feat\.?|featuring)\s+([A-Z][A-Za-z\s&]+?)(?:\s|,|$|<\/)/gi);
        if (artistMatches) {
          artistMatches.forEach((m) => {
            const artist = m.replace(/(?:DJ|Live|w\/|with|feat\.?|featuring)\s*/i, "").trim();
            if (artist && artist.length > 2 && !artists.includes(artist)) {
              artists.push(artist);
            }
          });
        }
        
        events.push({
          club: "Elysia",
          title,
          date: eventDate.toISOString(),
          artists: artists.length > 0 ? artists : undefined,
          url: baseUrl
        });
      } catch (err) {
        continue;
      }
    }
    
    // Fallback: try simple date pattern
    let match;
    while ((match = datePattern.exec(html)) !== null) {
      try {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]);
        const year = parseInt(match[3]);
        
        const eventDate = new Date(year, month - 1, day, 22, 0);
        if (isNaN(eventDate.getTime())) continue;
        
        // Skip past events
        if (eventDate < new Date()) continue;
        
        // Extract title from context
        const startPos = Math.max(0, match.index - 200);
        const endPos = Math.min(html.length, match.index + match[0].length + 200);
        const context = html.substring(startPos, endPos);
        
        const titleMatch = context.match(/(?:<h[123][^>]*>|<div[^>]*class="[^"]*event-title[^"]*"[^>]*>)([^<]{10,100}?)(?:<\/h[123]>|<\/div>)/i);
        let title = titleMatch ? this.stripHtml(titleMatch[1]).trim() : undefined;
        
        if (!title || title.length < 3) {
          title = `Event ${day}/${month}/${year}`;
        }
        
        const key = `${title}-${eventDate.toISOString()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        
        events.push({
          club: "Elysia",
          title,
          date: eventDate.toISOString(),
          url: baseUrl
        });
      } catch (err) {
        continue;
      }
    }
    
    return events;
  }

  /**
   * Parse Kinker events (uses eventfrog iframe - limited parsing)
   */
  private parseKinker(html: string, baseUrl: string): Omit<Event, "id" | "scrapedAt">[] {
    const events: Omit<Event, "id" | "scrapedAt">[] = [];
    
    // Kinker uses eventfrog iframe, which is hard to scrape
    // Try to find any event information in the page
    const iframeMatch = html.match(/<iframe[^>]*src="([^"]*eventfrog[^"]*)"[^>]*>/i);
    if (iframeMatch) {
      logDebug("Event Crawler: Kinker uses eventfrog iframe - cannot scrape directly", { url: iframeMatch[1] });
      // Could potentially fetch the iframe URL, but it's complex
      // For now, return empty array
    }
    
    // Try to find any event listings outside the iframe
    const patterns = [
      /<h[23][^>]*>([^<]+)<\/h[23]>[\s\S]{0,500}?(\d{1,2})\.(\d{1,2})\.(\d{4})/gi,
      /<div[^>]*class="[^"]*event[^"]*"[^>]*>[\s\S]*?<h[23][^>]*>([^<]+)<\/h[23]>[\s\S]*?(\d{1,2})\.(\d{1,2})\.(\d{4})/gi
    ];
    
    const seen = new Set<string>();
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        try {
          const title = match[1]?.trim();
          if (!title || title.length < 3) continue;
          
          const day = match[2];
          const month = match[3];
          const year = match[4];
          
          if (!day || !month || !year) continue;
          
          const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (isNaN(eventDate.getTime())) continue;
          
          // Skip past events
          if (eventDate < new Date()) continue;
          
          const key = `${title}-${eventDate.toISOString()}`;
          if (seen.has(key)) continue;
          seen.add(key);
          
          // Extract artists
          const artists: string[] = [];
          const content = html.substring(match.index, match.index + 1000);
          const artistMatches = content.match(/(?:DJ|Live|w\/|with|feat\.?)\s+([A-Z][A-Za-z\s&]+?)(?:\s|,|$|<\/)/g);
          if (artistMatches) {
            artistMatches.forEach((m) => {
              const artist = m.replace(/(?:DJ|Live|w\/|with|feat\.?)\s*/i, "").trim();
              if (artist && artist.length > 2 && !artists.includes(artist)) {
                artists.push(artist);
              }
            });
          }
          
          events.push({
            club: "Kinker",
            title,
            date: eventDate.toISOString(),
            artists: artists.length > 0 ? artists : undefined,
            url: baseUrl
          });
        } catch (err) {
          continue;
        }
      }
    }
    
    return events;
  }

  /**
   * Strip HTML tags from a string
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, "").trim();
  }

  /**
   * Score an event based on relevance criteria
   */
  private scoreEvent(event: Omit<Event, "id" | "scrapedAt">): number {
    let score = 0;
    
    // Future date: +10
    const eventDate = new Date(event.date);
    if (eventDate > new Date()) {
      score += 10;
    }
    
    // Has artist information: +5
    if (event.artists && event.artists.length > 0) {
      score += 5;
    }
    
    // Has time information: +3
    if (event.time) {
      score += 3;
    }
    
    // Title contains relevant keywords: +2-5
    const keywords = ["live", "dj", "techno", "house", "electronic", "party", "event"];
    const titleLower = event.title.toLowerCase();
    keywords.forEach((keyword) => {
      if (titleLower.includes(keyword)) {
        score += 2;
      }
    });
    
    return score;
  }
}

// Create singleton instance (auto-registers on construction)
const eventCrawlerToolInstance = new EventCrawlerTool();

/**
 * Event Crawler Tool Component
 */
export const eventCrawlerComponent: Component = {
  id: "event-crawler-tool",
  name: "Event Crawler Tool Component",
  description: "Crawls club websites and extracts events",
  tool: eventCrawlerToolInstance
};

