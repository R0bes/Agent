import asyncio
import aiohttp
from typing import Dict, Any, List
from urllib.parse import quote_plus
from agent.utils.log import get_logger
from ..base import BaseTool
from ..schemas import WebSearchParameters, WebSearchResult

logger = get_logger(__name__)

class WebSearch(BaseTool):
    """Web search tool using DuckDuckGo Instant Answer API."""
    
    def __init__(self):
        self.base_url = "https://api.duckduckgo.com/"
        super().__init__()
    
    def _get_description(self) -> str:
        return "Search the web using DuckDuckGo API. Returns abstracts, related topics, and direct answers."
    
    def _get_parameter_schema(self):
        return WebSearchParameters
    
    def _get_result_schema(self):
        return WebSearchResult
    
    async def execute(self, parameters: WebSearchParameters) -> WebSearchResult:
        """Execute the web search tool."""
        query = parameters.query
        max_results = parameters.max_results or 3
        
        try:
            # Use DuckDuckGo Instant Answer API
            search_url = f"{self.base_url}?q={quote_plus(query)}&format=json&no_html=1&skip_disambig=1"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(search_url, timeout=10) as response:
                    if response.status != 200:
                        return WebSearchResult(
                            success=False,
                            message=f"Search request failed with status {response.status}",
                            data={"error": "http_error", "status": response.status}
                        )
                    
                    data = await response.json()
                    
                    # Extract results
                    results = []
                    
                    # Get abstract if available
                    if data.get('Abstract'):
                        results.append({
                            "type": "abstract",
                            "content": data['Abstract'],
                            "source": data.get('AbstractSource', 'Unknown')
                        })
                    
                    # Get related topics
                    if data.get('RelatedTopics'):
                        for topic in data['RelatedTopics'][:max_results]:
                            if isinstance(topic, dict) and topic.get('Text'):
                                results.append({
                                    "type": "related_topic",
                                    "content": topic['Text'],
                                    "source": "DuckDuckGo"
                                })
                    
                    # Get answer if available
                    if data.get('Answer'):
                        results.append({
                            "type": "direct_answer",
                            "content": data['Answer'],
                            "source": "DuckDuckGo"
                        })
                    
                    if not results:
                        return WebSearchResult(
                            success=True,
                            message=f"No results found for query: '{query}'",
                            query=query,
                            results=[],
                            result_count=0
                        )
                    
                    logger.info(f"Web search completed for: {query}", result_count=len(results))
                    
                    return WebSearchResult(
                        success=True,
                        message=f"Found {len(results)} results for '{query}'",
                        query=query,
                        results=results,
                        result_count=len(results)
                    )
                    
        except asyncio.TimeoutError:
            return WebSearchResult(
                success=False,
                message=f"Search request timed out for query: '{query}'",
                data={"error": "timeout"}
            )
        except Exception as e:
            logger.error(f"Web search error for query '{query}'", error=str(e))
            return WebSearchResult(
                success=False,
                message=f"Error performing web search for '{query}': {str(e)}",
                data={"error": str(e)}
            )
