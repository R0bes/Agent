/**
 * Website Search Tool Component
 * 
 * Implements Tool interface using AbstractTool base class.
 * - Tool: Search websites and fetch URL content
 */

import { AbstractTool } from "../../base/AbstractTool";
import type { Component, ToolContext, ToolResult } from "../../types";
import { logDebug, logError } from "../../../utils/logger";

/**
 * Website Search Tool implementation
 */
class WebsiteSearchTool extends AbstractTool {
  readonly name = "website_search";
  readonly shortDescription = "Search websites and fetch content from URLs without metadata.";
  readonly description = "This tool provides two main functions: (1) Search the web for websites matching a query - returns a list of relevant URLs with titles and snippets. (2) Fetch the text content from a specific URL - returns only the main text content without metadata, scripts, styles, or navigation elements. Use the 'action' parameter to choose between 'search' (requires 'query') or 'fetch' (requires 'url').";
  readonly parameters = {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["search", "fetch"],
        description: "Action to perform: 'search' for web search, 'fetch' for URL content"
      },
      query: {
        type: "string",
        description: "Search query (required for 'search' action)"
      },
      url: {
        type: "string",
        description: "URL to fetch content from (required for 'fetch' action)"
      }
    },
    required: ["action"]
  };
  readonly examples = [
    {
      input: {
        action: "search",
        query: "TypeScript best practices"
      },
      output: {
        ok: true,
        data: {
          results: [
            {
              title: "TypeScript Best Practices",
              url: "https://example.com/typescript",
              snippet: "Learn TypeScript best practices..."
            }
          ]
        }
      },
      description: "Search for websites matching a query"
    },
    {
      input: {
        action: "fetch",
        url: "https://example.com/article"
      },
      output: {
        ok: true,
        data: {
          content: "Article content text here...",
          url: "https://example.com/article"
        }
      },
      description: "Fetch text content from a URL"
    }
  ];

  async execute(args: { action: string; query?: string; url?: string }, ctx: ToolContext): Promise<ToolResult> {
    try {
      if (args.action === "search") {
        if (!args.query) {
          return {
            ok: false,
            error: "Query parameter is required for search action"
          };
        }
        return await this.searchWeb(args.query, ctx);
      } else if (args.action === "fetch") {
        if (!args.url) {
          return {
            ok: false,
            error: "URL parameter is required for fetch action"
          };
        }
        return await this.fetchUrlContent(args.url, ctx);
      } else {
        return {
          ok: false,
          error: `Unknown action: ${args.action}. Must be 'search' or 'fetch'`
        };
      }
    } catch (err: any) {
      logError("Website Search Tool: Execution error", err, {
        action: args.action,
        userId: ctx.userId
      });
      return {
        ok: false,
        error: err?.message ?? String(err)
      };
    }
  }

  /**
   * Search the web using DuckDuckGo Instant Answer API
   */
  private async searchWeb(query: string, ctx: ToolContext): Promise<ToolResult> {
    logDebug("Website Search: Performing web search", {
      query,
      userId: ctx.userId
    });

    try {
      // Use DuckDuckGo HTML search (no API key required)
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });

      if (!response.ok) {
        throw new Error(`Search request failed: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      
      // Simple HTML parsing to extract results
      // This is a basic implementation - could be improved with a proper HTML parser
      const results = this.parseSearchResults(html, query);

      logDebug("Website Search: Search completed", {
        query,
        resultCount: results.length,
        userId: ctx.userId
      });

      return {
        ok: true,
        data: {
          results,
          query
        }
      };
    } catch (err: any) {
      logError("Website Search: Search failed", err, {
        query,
        userId: ctx.userId
      });
      throw err;
    }
  }

  /**
   * Fetch content from a URL (text only, no metadata)
   */
  private async fetchUrlContent(url: string, ctx: ToolContext): Promise<ToolResult> {
    logDebug("Website Search: Fetching URL content", {
      url,
      userId: ctx.userId
    });

    try {
      // Validate URL
      try {
        new URL(url);
      } catch {
        return {
          ok: false,
          error: `Invalid URL: ${url}`
        };
      }

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        },
        // Timeout after 10 seconds
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      
      // Extract text content (remove HTML tags, scripts, styles, etc.)
      const content = this.extractTextContent(html);

      logDebug("Website Search: URL content fetched", {
        url,
        contentLength: content.length,
        userId: ctx.userId
      });

      return {
        ok: true,
        data: {
          content,
          url
        }
      };
    } catch (err: any) {
      logError("Website Search: URL fetch failed", err, {
        url,
        userId: ctx.userId
      });
      
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        return {
          ok: false,
          error: `Request timeout: Could not fetch URL within 10 seconds`
        };
      }
      
      throw err;
    }
  }

  /**
   * Parse HTML search results (basic implementation)
   */
  private parseSearchResults(html: string, query: string): Array<{ title: string; url: string; snippet: string }> {
    const results: Array<{ title: string; url: string; snippet: string }> = [];
    
    // Basic regex-based parsing (could be improved with a proper HTML parser)
    // This is a simplified implementation for DuckDuckGo HTML results
    
    // Try to find result links
    const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]+)<\/a>/gi;
    
    const links: Array<{ url: string; title: string }> = [];
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const url = match[1];
      const title = this.stripHtml(match[2]);
      if (url && title) {
        links.push({ url, title });
      }
    }
    
    const snippets: string[] = [];
    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(this.stripHtml(match[1]));
    }
    
    // Combine links and snippets
    for (let i = 0; i < Math.min(links.length, 10); i++) {
      results.push({
        title: links[i].title,
        url: links[i].url,
        snippet: snippets[i] || ""
      });
    }
    
    // If no results found with regex, return a simple fallback
    if (results.length === 0) {
      // Try alternative parsing
      const altLinkRegex = /<a[^>]*href="([^"]+)"[^>]*>([^<]*<strong[^>]*>([^<]+)<\/strong>[^<]*)<\/a>/gi;
      while ((match = altLinkRegex.exec(html)) !== null && results.length < 10) {
        const url = match[1];
        const title = this.stripHtml(match[3] || match[2]);
        if (url && title && url.startsWith("http")) {
          results.push({
            title,
            url,
            snippet: ""
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Extract text content from HTML (remove tags, scripts, styles, etc.)
   */
  private extractTextContent(html: string): string {
    // Remove script and style tags and their content
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
    text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "");
    
    // Remove comments
    text = text.replace(/<!--[\s\S]*?-->/g, "");
    
    // Remove all HTML tags
    text = text.replace(/<[^>]+>/g, " ");
    
    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
    
    // Clean up whitespace
    text = text
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .trim();
    
    // Limit content length (first 50000 characters)
    if (text.length > 50000) {
      text = text.substring(0, 50000) + "... [content truncated]";
    }
    
    return text;
  }

  /**
   * Strip HTML tags from a string
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
}

// Create singleton instance (auto-registers on construction)
const websiteSearchToolInstance = new WebsiteSearchTool();

/**
 * Website Search Tool Component
 */
export const websiteSearchToolComponent: Component = {
  id: "website-search-tool",
  name: "Website Search Tool Component",
  description: "Search websites and fetch content from URLs",
  tool: websiteSearchToolInstance
};

