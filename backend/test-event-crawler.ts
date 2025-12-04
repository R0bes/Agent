/**
 * Test script for event_crawler tool
 * Run with: tsx test-event-crawler.ts
 */

import { eventCrawlerComponent } from "./src/components/tools/eventCrawler/index.js";
import type { ToolContext } from "./src/components/types.js";
import { writeFile } from "fs/promises";

// Mock ToolContext
const mockContext: ToolContext = {
  userId: "test-user",
  conversationId: "test-conv",
  source: {
    id: "test-source",
    kind: "system",
    label: "Test"
  }
};

async function testEventCrawler() {
  console.log("🚀 Starting event crawler test...\n");

  if (!eventCrawlerComponent.tool) {
    console.error("❌ Event crawler tool not available");
    process.exit(1);
  }

  try {
    console.log("⏳ Crawling club websites (this may take a while)...\n");
    const result = await eventCrawlerComponent.tool.execute({}, mockContext);

    if (!result.ok) {
      console.error("❌ Error:", result.error);
      process.exit(1);
    }

    console.log("✅ Crawl completed successfully!\n");
    console.log(`📊 Total events found: ${result.data.totalEvents}`);
    console.log(`✅ Clubs crawled: ${result.data.clubsCrawled}`);
    if (result.data.clubsFailed > 0) {
      console.log(`⚠️  Clubs failed: ${result.data.clubsFailed}`);
    }
    console.log("");

    if (result.data.events && result.data.events.length > 0) {
      console.log("📅 Events (sorted by score, then date):\n");
      result.data.events.slice(0, 20).forEach((event, index) => {
        console.log(`${index + 1}. ${event.club} - ${event.title}`);
        const date = new Date(event.date);
        const dateStr = date.toISOString().split("T")[0];
        const weekday = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][date.getDay()];
        console.log(`   📆 Date: ${weekday}, ${dateStr} (${date.toLocaleDateString("de-CH")})`);
        if (event.time) console.log(`   🕐 Time: ${event.time}`);
        if (event.artists && event.artists.length > 0) {
          console.log(`   🎵 Artists: ${event.artists.join(", ")}`);
        }
        console.log(`   ⭐ Score: ${event.score ?? 0}`);
        console.log(`   🔗 URL: ${event.url}`);
        console.log("");
      });
      
      if (result.data.events.length > 20) {
        console.log(`... and ${result.data.events.length - 20} more events\n`);
      }
      
      // Export to CSV
      console.log("💾 Exporting to CSV...\n");
      const csvRows = [
        // Header
        ["Club", "Title", "Date", "Time", "Artists", "Genre", "Description", "Venue", "Ticket URL", "Event URL", "Score"].join(",")
      ];
      
      result.data.events.forEach((event) => {
        const date = new Date(event.date);
        const dateStr = date.toISOString().split("T")[0];
        const artists = event.artists && event.artists.length > 0 
          ? event.artists.join("; ") 
          : "";
        
        // Escape CSV values (handle quotes and commas)
        const escapeCsv = (val: string | undefined) => {
          if (!val) return "";
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        };
        
        csvRows.push([
          escapeCsv(event.club),
          escapeCsv(event.title),
          dateStr,
          event.time || "",
          escapeCsv(artists),
          escapeCsv(event.genre),
          escapeCsv(event.description),
          escapeCsv(event.venue),
          escapeCsv(event.ticketUrl),
          escapeCsv(event.url),
          (event.score ?? 0).toString()
        ].join(","));
      });
      
      const csvContent = csvRows.join("\n");
      const filename = `events-${new Date().toISOString().split("T")[0]}.csv`;
      await writeFile(filename, csvContent, "utf-8");
      console.log(`✅ CSV exported to: ${filename}`);
      console.log(`   Total events: ${result.data.events.length}`);
    } else {
      console.log("ℹ️  No events found.");
    }
  } catch (error) {
    console.error("❌ Fatal error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

testEventCrawler();
