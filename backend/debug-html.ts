/**
 * Debug script to save HTML from each club website for analysis
 */

import playwright from "playwright";
import { writeFile } from "fs/promises";

const CLUBS = [
  { name: "Das Viertel", url: "https://www.dasviertel.ch/viertelklub" },
  { name: "Bassoverse", url: "https://www.bassoverse.space/beats" },
  { name: "Elysia", url: "https://www.elysia.ch/" },
  { name: "Kinker", url: "https://www.kinker.ch/events.html" }
];

async function debugHTML() {
  const browser = await playwright.chromium.launch({ headless: true });

  for (const club of CLUBS) {
    console.log(`\n🔍 Fetching HTML for ${club.name}...`);
    
    try {
      const page = await browser.newPage();
      await page.goto(club.url, {
        waitUntil: "domcontentloaded",
        timeout: 30000
      });
      
      // Wait a bit for dynamic content
      await page.waitForTimeout(3000);
      
      const html = await page.content();
      const filename = `debug-${club.name.toLowerCase().replace(/\s+/g, "-")}.html`;
      await writeFile(filename, html, "utf-8");
      
      console.log(`✅ Saved HTML to: ${filename}`);
      console.log(`   HTML length: ${html.length} characters`);
      
      // Try to find some event indicators
      const eventIndicators = [
        /event/i,
        /datum|date/i,
        /veranstaltung/i,
        /programm/i,
        /\d{1,2}\.\d{1,2}\.\d{4}/, // Date pattern
        /\d{4}-\d{2}-\d{2}/ // ISO date
      ];
      
      const foundIndicators = eventIndicators.filter(pattern => pattern.test(html));
      console.log(`   Found indicators: ${foundIndicators.length > 0 ? foundIndicators.map(p => p.source).join(", ") : "none"}`);
      
      await page.close();
    } catch (err) {
      console.error(`❌ Error for ${club.name}:`, err instanceof Error ? err.message : String(err));
    }
  }

  await browser.close();
  console.log("\n✅ Debug complete! Check the HTML files to see the structure.");
}

debugHTML().catch(console.error);

