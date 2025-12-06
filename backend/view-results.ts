/**
 * View Results Script - Shows all tracked data in a readable format
 * Run this to see all crawled events, artists, collectives, and labels
 */

import { eventStore } from "./src/models/eventStore.js";
import { artistStore } from "./src/models/artistStore.js";
import { collectiveStore } from "./src/models/collectiveStore.js";
import { labelStore } from "./src/models/labelStore.js";
import { eventCrawlerComponent } from "./src/components/tools/eventCrawler/index.js";
import type { ToolContext } from "./src/components/types.js";
import { writeFile } from "fs/promises";

async function viewResults() {
  console.log("🔄 Running event crawler to get fresh data...\n");
  
  // Run crawler first to populate data
  if (eventCrawlerComponent.tool) {
    const mockContext: ToolContext = {
      userId: "view-results",
      conversationId: "view-results",
      source: {
        id: "view-results",
        kind: "system",
        label: "View Results"
      }
    };
    
    try {
      const result = await eventCrawlerComponent.tool.execute({}, mockContext);
      if (!result.ok) {
        console.error("❌ Crawler error:", result.error);
        return;
      }
      console.log(`✅ Crawler completed: ${result.data.totalEvents} events found\n`);
    } catch (err) {
      console.error("❌ Crawler error:", err);
      return;
    }
  }
  
  console.log("📊 Event Crawler Results\n");
  console.log("=" .repeat(60) + "\n");
  console.log("📊 Event Crawler Results\n");
  console.log("=" .repeat(60) + "\n");

  // Events
  const events = await eventStore.listEvents({ limit: 50 });
  console.log(`📅 Events: ${events.length} total\n`);
  
  if (events.length > 0) {
    console.log("Top Events:");
    events.slice(0, 10).forEach((event, index) => {
      const date = new Date(event.date);
      console.log(`${index + 1}. ${event.club} - ${event.title}`);
      console.log(`   📆 ${date.toLocaleDateString("de-CH")} ${event.time || ""}`);
      if (event.artists && event.artists.length > 0) {
        console.log(`   🎵 Artists: ${event.artists.join(", ")}`);
      }
      if (event.collectives && event.collectives.length > 0) {
        console.log(`   🎪 Collectives: ${event.collectives.join(", ")}`);
      }
      if (event.labels && event.labels.length > 0) {
        console.log(`   🏷️  Labels: ${event.labels.join(", ")}`);
      }
      if (event.genres && event.genres.length > 0) {
        console.log(`   🎶 Genres: ${event.genres.join(", ")}`);
      }
      console.log(`   ⭐ Score: ${event.score ?? 0}`);
      console.log("");
    });
  }

  // Artists
  const artists = await artistStore.listArtists({ limit: 30 });
  console.log(`\n🎵 Artists: ${artists.length} total\n`);
  
  if (artists.length > 0) {
    console.log("Top Artists:");
    artists.slice(0, 15).forEach((artist, index) => {
      console.log(`${index + 1}. ${artist.name}`);
      console.log(`   Events: ${artist.eventCount} | Rating: ${(artist.rating ?? 0).toFixed(1)}/10`);
      console.log(`   Clubs: ${artist.clubs.join(", ") || "N/A"}`);
      if (artist.sounds && artist.sounds.length > 0) {
        const genres = artist.sounds
          .map(s => s.genre)
          .filter(Boolean)
          .filter((g, i, arr) => arr.indexOf(g) === i);
        if (genres.length > 0) {
          console.log(`   Genres: ${genres.join(", ")}`);
        }
      }
      if (artist.soundcloudUrl) {
        console.log(`   🔗 SoundCloud: ${artist.soundcloudUrl}`);
      }
      console.log("");
    });
  }

  // Collectives
  const collectives = await collectiveStore.listCollectives({ limit: 30 });
  console.log(`\n🎪 Collectives: ${collectives.length} total\n`);
  
  if (collectives.length > 0) {
    console.log("Top Collectives:");
    collectives.slice(0, 15).forEach((collective, index) => {
      console.log(`${index + 1}. ${collective.name}`);
      console.log(`   Events: ${collective.eventCount} | Rating: ${(collective.rating ?? 0).toFixed(1)}/10`);
      console.log(`   Clubs: ${collective.clubs.join(", ") || "N/A"}`);
      if (collective.eventSeries) {
        console.log(`   Series: ${collective.eventSeries}`);
      }
      if (collective.primaryGenres && collective.primaryGenres.length > 0) {
        console.log(`   Genres: ${collective.primaryGenres.join(", ")}`);
      }
      console.log("");
    });
  }

  // Labels
  const labels = await labelStore.listLabels({ limit: 30 });
  console.log(`\n🏷️  Labels: ${labels.length} total\n`);
  
  if (labels.length > 0) {
    console.log("Top Labels:");
    labels.slice(0, 15).forEach((label, index) => {
      console.log(`${index + 1}. ${label.name}`);
      console.log(`   Events: ${label.eventCount} | Rating: ${(label.rating ?? 0).toFixed(1)}/10`);
      console.log(`   Artists: ${label.artists.length} | Clubs: ${label.clubs.join(", ") || "N/A"}`);
      if (label.soundcloudUrl) {
        console.log(`   🔗 SoundCloud: ${label.soundcloudUrl}`);
      }
      if (label.website) {
        console.log(`   🔗 Website: ${label.website}`);
      }
      console.log("");
    });
  }

  // Export to JSON for easier viewing
  const exportData = {
    summary: {
      events: events.length,
      artists: artists.length,
      collectives: collectives.length,
      labels: labels.length
    },
    events: events.map(e => ({
      id: e.id,
      club: e.club,
      title: e.title,
      date: e.date,
      time: e.time,
      artists: e.artists,
      collectives: e.collectives,
      labels: e.labels,
      genres: e.genres,
      score: e.score,
      url: e.url
    })),
    artists: artists.map(a => ({
      name: a.name,
      eventCount: a.eventCount,
      rating: a.rating,
      clubs: a.clubs,
      genres: a.sounds?.map(s => s.genre).filter(Boolean),
      soundcloudUrl: a.soundcloudUrl
    })),
    collectives: collectives.map(c => ({
      name: c.name,
      eventCount: c.eventCount,
      rating: c.rating,
      clubs: c.clubs,
      eventSeries: c.eventSeries,
      genres: c.primaryGenres
    })),
    labels: labels.map(l => ({
      name: l.name,
      eventCount: l.eventCount,
      rating: l.rating,
      artists: l.artists.length,
      clubs: l.clubs,
      soundcloudUrl: l.soundcloudUrl,
      website: l.website
    }))
  };

  const jsonFilename = `results-${new Date().toISOString().split("T")[0]}.json`;
  await writeFile(jsonFilename, JSON.stringify(exportData, null, 2), "utf-8");
  console.log(`\n💾 Full results exported to: ${jsonFilename}`);
  console.log(`📄 CSV file: events-${new Date().toISOString().split("T")[0]}.csv`);
}

viewResults().catch(console.error);

