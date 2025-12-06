/**
 * Test script to show tracked artists, collectives, and labels
 * Run this AFTER running test-event-crawler.ts to see the tracked data
 */

import { artistStore } from "./src/models/artistStore.js";
import { collectiveStore } from "./src/models/collectiveStore.js";
import { labelStore } from "./src/models/labelStore.js";
import { eventCrawlerComponent } from "./src/components/tools/eventCrawler/index.js";
import type { ToolContext } from "./src/components/types.js";

async function showTrackingData() {
  console.log("🔄 Running event crawler first to populate tracking data...\n");
  
  // Run crawler first to populate data
  if (eventCrawlerComponent.tool) {
    const mockContext: ToolContext = {
      userId: "test-user",
      conversationId: "test-conv",
      source: {
        id: "test-source",
        kind: "system",
        label: "Test"
      }
    };
    
    try {
      await eventCrawlerComponent.tool.execute({}, mockContext);
      console.log("✅ Crawler completed\n");
    } catch (err) {
      console.error("❌ Crawler error:", err);
      return;
    }
  }
  
  console.log("📊 Tracking Data Overview\n");
  console.log("📊 Tracking Data Overview\n");

  // Get all artists
  const artists = await artistStore.listArtists({ limit: 20 });
  console.log(`🎵 Artists tracked: ${artists.length}`);
  if (artists.length > 0) {
    console.log("\nTop Artists (by rating):");
    artists.slice(0, 10).forEach((artist, index) => {
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
        console.log(`   SoundCloud: ${artist.soundcloudUrl}`);
      }
      console.log("");
    });
  }

  // Get all collectives
  const collectives = await collectiveStore.listCollectives({ limit: 20 });
  console.log(`\n🎪 Collectives tracked: ${collectives.length}`);
  if (collectives.length > 0) {
    console.log("\nTop Collectives (by rating):");
    collectives.slice(0, 10).forEach((collective, index) => {
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

  // Get all labels
  const labels = await labelStore.listLabels({ limit: 20 });
  console.log(`\n🏷️  Labels tracked: ${labels.length}`);
  if (labels.length > 0) {
    console.log("\nTop Labels (by rating):");
    labels.slice(0, 10).forEach((label, index) => {
      console.log(`${index + 1}. ${label.name}`);
      console.log(`   Events: ${label.eventCount} | Rating: ${(label.rating ?? 0).toFixed(1)}/10`);
      console.log(`   Artists: ${label.artists.length} | Clubs: ${label.clubs.join(", ") || "N/A"}`);
      if (label.soundcloudUrl) {
        console.log(`   SoundCloud: ${label.soundcloudUrl}`);
      }
      if (label.website) {
        console.log(`   Website: ${label.website}`);
      }
      console.log("");
    });
  }

  // Summary
  console.log("\n📈 Summary:");
  console.log(`   Total Artists: ${artists.length}`);
  console.log(`   Total Collectives: ${collectives.length}`);
  console.log(`   Total Labels: ${labels.length}`);
}

showTrackingData().catch(console.error);

