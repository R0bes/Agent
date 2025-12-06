/**
 * Analyze HTML structure to find event patterns
 */

import { readFileSync } from "fs";

const files = [
  { name: "Das Viertel", file: "debug-das-viertel.html" },
  { name: "Bassoverse", file: "debug-bassoverse.html" },
  { name: "Elysia", file: "debug-elysia.html" },
  { name: "Kinker", file: "debug-kinker.html" }
];

function analyzeHTML(clubName: string, html: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Analyzing: ${clubName}`);
  console.log("=".repeat(60));

  // Look for common event-related class names
  const eventClassPatterns = [
    /class="[^"]*event[^"]*"/gi,
    /class="[^"]*programm[^"]*"/gi,
    /class="[^"]*veranstaltung[^"]*"/gi,
    /class="[^"]*date[^"]*"/gi,
    /class="[^"]*datum[^"]*"/gi,
    /data-event/gi,
    /data-date/gi
  ];

  console.log("\n📋 Event-related class names found:");
  for (const pattern of eventClassPatterns) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      const unique = [...new Set(matches)].slice(0, 5);
      console.log(`   ${pattern.source}: ${unique.length} matches`);
      unique.forEach(m => console.log(`      ${m.substring(0, 80)}`));
    }
  }

  // Look for date patterns
  console.log("\n📅 Date patterns found:");
  const datePatterns = [
    /\d{1,2}\.\d{1,2}\.\d{4}/g,
    /\d{4}-\d{2}-\d{2}/g,
    /\d{1,2}\/\d{1,2}\/\d{4}/g
  ];

  for (const pattern of datePatterns) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      const unique = [...new Set(matches)].slice(0, 10);
      console.log(`   ${pattern.source}: ${unique.length} unique dates`);
      console.log(`      Examples: ${unique.slice(0, 5).join(", ")}`);
    }
  }

  // Look for JSON data
  console.log("\n📦 JSON data found:");
  const jsonMatches = html.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonMatches) {
    console.log(`   Found ${jsonMatches.length} JSON script tags`);
  }

  const nuxtData = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>/i);
  if (nuxtData) {
    console.log(`   Found __NUXT_DATA__ (Nuxt.js)`);
  }

  // Look for common event structures
  console.log("\n🏗️  HTML structure patterns:");
  const structurePatterns = [
    { name: "Article tags", pattern: /<article[^>]*>/gi },
    { name: "Event list items", pattern: /<li[^>]*class="[^"]*event[^"]*"[^>]*>/gi },
    { name: "Event divs", pattern: /<div[^>]*class="[^"]*event[^"]*"[^>]*>/gi },
    { name: "Time elements", pattern: /<time[^>]*>/gi },
    { name: "Data attributes", pattern: /data-event/gi }
  ];

  for (const { name, pattern } of structurePatterns) {
    const matches = html.match(pattern);
    if (matches) {
      console.log(`   ${name}: ${matches.length} found`);
    }
  }

  // Sample of HTML around dates
  console.log("\n🔍 Sample HTML around dates:");
  const dateMatch = html.match(/(.{0,200}\d{1,2}\.\d{1,2}\.\d{4}.{0,200})/i);
  if (dateMatch) {
    console.log(`   ${dateMatch[0].substring(0, 300)}...`);
  }
}

for (const { name, file } of files) {
  try {
    const html = readFileSync(file, "utf-8");
    analyzeHTML(name, html);
  } catch (err) {
    console.error(`❌ Error reading ${file}:`, err);
  }
}

