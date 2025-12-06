/**
 * Debug script to test each club individually and see what's happening
 */

import { eventCrawlerComponent } from "./src/components/tools/eventCrawler/index.js";
import type { ToolContext } from "./src/components/types.js";

const mockContext: ToolContext = {
  userId: "debug-user",
  conversationId: "debug-conv",
  source: {
    id: "debug-source",
    kind: "system",
    label: "Debug"
  }
};

async function testClubs() {
  console.log("🔍 Testing each club individually...\n");

  const clubs = ["Nordstern", "Kaschemme", "Das Viertel", "Bassoverse", "Elysia", "Kinker"];

  if (!eventCrawlerComponent.tool) {
    console.error("❌ Event crawler tool not available");
    return;
  }

  for (const club of clubs) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Testing: ${club}`);
    console.log("=".repeat(60));

    try {
      const result = await eventCrawlerComponent.tool.execute({ clubs: [club] }, mockContext);

      if (!result.ok) {
        console.error(`❌ Error for ${club}:`, result.error);
        continue;
      }

      console.log(`✅ Success! Found ${result.data.totalEvents} events`);
      console.log(`   Clubs crawled: ${result.data.clubsCrawled}`);
      console.log(`   Clubs failed: ${result.data.clubsFailed}`);

      if (result.data.events && result.data.events.length > 0) {
        console.log(`\n   Sample events:`);
        result.data.events.slice(0, 3).forEach((event, index) => {
          console.log(`   ${index + 1}. ${event.title}`);
          console.log(`      Date: ${event.date}`);
          if (event.artists && event.artists.length > 0) {
            console.log(`      Artists: ${event.artists.join(", ")}`);
          }
        });
      } else {
        console.log(`   ⚠️  No events found for ${club}`);
      }
    } catch (err) {
      console.error(`❌ Exception for ${club}:`, err);
    }

    // Small delay between clubs
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

testClubs().catch(console.error);

