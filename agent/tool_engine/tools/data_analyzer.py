import re
import json
from typing import Dict, Any, List
from collections import Counter
from agent.utils.log import get_logger
from ..base import BaseTool
from ..schemas import DataAnalyzerParameters, DataAnalyzerResult

logger = get_logger(__name__)

class DataAnalyzer(BaseTool):
    """Data analysis tool for text and structured data."""
    
    def __init__(self):
        self.supported_analyses = ['word_count', 'character_count', 'line_count', 'json_parse', 'frequency_analysis', 'comprehensive']
        super().__init__()
    
    def _get_description(self) -> str:
        return "Analyze text data with various methods: word count, character analysis, line analysis, JSON parsing, frequency analysis, or comprehensive analysis."
    
    def _get_parameter_schema(self):
        return DataAnalyzerParameters
    
    def _get_result_schema(self):
        return DataAnalyzerResult
    
    async def execute(self, parameters: DataAnalyzerParameters) -> DataAnalyzerResult:
        """Execute the data analysis tool."""
        data = parameters.data
        analysis_type = parameters.analysis_type or 'comprehensive'
        
        try:
            if analysis_type == 'word_count':
                analysis = self._analyze_word_count(data)
            elif analysis_type == 'character_count':
                analysis = self._analyze_character_count(data)
            elif analysis_type == 'line_count':
                analysis = self._analyze_line_count(data)
            elif analysis_type == 'json_parse':
                analysis = self._analyze_json(data)
            elif analysis_type == 'frequency_analysis':
                analysis = self._analyze_frequency(data)
            else:
                # Default: comprehensive analysis
                analysis = self._comprehensive_analysis(data)
            
            return DataAnalyzerResult(
                success=True,
                message=f"Successfully performed {analysis_type} analysis",
                analysis=analysis,
                analysis_type=analysis_type,
                data_length=len(data)
            )
                
        except Exception as e:
            logger.error(f"Data analysis error", error=str(e))
            return DataAnalyzerResult(
                success=False,
                message=f"Error analyzing data: {str(e)}",
                data={"error": str(e)}
            )
    
    def _analyze_word_count(self, data: str) -> Dict[str, Any]:
        """Analyze word count and basic statistics."""
        words = re.findall(r'\b\w+\b', data.lower())
        word_count = len(words)
        unique_words = len(set(words))
        
        return {
            "total_words": word_count,
            "unique_words": unique_words,
            "average_word_length": sum(len(w) for w in words) / word_count if word_count > 0 else 0
        }
    
    def _analyze_character_count(self, data: str) -> Dict[str, Any]:
        """Analyze character count and types."""
        return {
            "total_characters": len(data),
            "letters": len(re.findall(r'[a-zA-Z]', data)),
            "digits": len(re.findall(r'\d', data)),
            "spaces": len(re.findall(r'\s', data)),
            "punctuation": len(re.findall(r'[^\w\s]', data))
        }
    
    def _analyze_line_count(self, data: str) -> Dict[str, Any]:
        """Analyze line count and structure."""
        lines = data.split('\n')
        non_empty_lines = [line for line in lines if line.strip()]
        
        return {
            "total_lines": len(lines),
            "non_empty_lines": len(non_empty_lines),
            "average_line_length": sum(len(line) for line in lines) / len(lines) if lines else 0
        }
    
    def _analyze_json(self, data: str) -> Dict[str, Any]:
        """Analyze JSON structure."""
        try:
            parsed = json.loads(data)
            return {
                "is_valid_json": True,
                "json_type": type(parsed).__name__,
                "size_characters": len(str(parsed))
            }
        except json.JSONDecodeError as e:
            return {
                "is_valid_json": False,
                "error": str(e)
            }
    
    def _analyze_frequency(self, data: str) -> Dict[str, Any]:
        """Analyze word frequency."""
        words = re.findall(r'\b\w+\b', data.lower())
        if not words:
            return {"error": "No words found for frequency analysis"}
        
        word_freq = Counter(words)
        top_words = word_freq.most_common(10)
        
        return {
            "top_words": [{"word": word, "count": count} for word, count in top_words],
            "total_unique_words": len(word_freq)
        }
    
    def _comprehensive_analysis(self, data: str) -> Dict[str, Any]:
        """Perform comprehensive analysis."""
        # Basic stats
        basic_stats = {
            "length_characters": len(data),
            "lines": len(data.split('\n')),
            "words": len(re.findall(r'\b\w+\b', data))
        }
        
        # Word frequency (top 5)
        words = re.findall(r'\b\w+\b', data.lower())
        if words:
            word_freq = Counter(words)
            top_words = word_freq.most_common(5)
            basic_stats["most_common_words"] = [{"word": word, "count": count} for word, count in top_words]
        
        # Character distribution
        basic_stats["character_distribution"] = {
            'letters': len(re.findall(r'[a-zA-Z]', data)),
            'digits': len(re.findall(r'\d', data)),
            'spaces': len(re.findall(r'\s', data)),
            'punctuation': len(re.findall(r'[^\w\s]', data))
        }
        
        return basic_stats
