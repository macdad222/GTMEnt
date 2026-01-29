"""Web scraper for competitor business websites."""

import httpx
from bs4 import BeautifulSoup
from datetime import datetime
from typing import Optional, List
import re

from .models import ScrapedWebContent


class WebScraper:
    """Scrapes and extracts content from business websites."""
    
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }
    
    def __init__(self):
        self._client = httpx.Client(timeout=30.0, headers=self.HEADERS, follow_redirects=True)
    
    def scrape_url(self, url: str) -> ScrapedWebContent:
        """Scrape a single URL and extract business-relevant content."""
        try:
            response = self._client.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract title
            title = soup.title.string if soup.title else url
            
            # Extract meta description
            meta_desc = None
            meta_tag = soup.find('meta', attrs={'name': 'description'})
            if meta_tag:
                meta_desc = meta_tag.get('content', '')
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.decompose()
            
            # Get main text content
            main_text = self._extract_main_text(soup)
            
            # Extract products/services
            products = self._extract_products(soup, main_text)
            
            # Extract features
            features = self._extract_features(soup, main_text)
            
            # Extract target segments
            segments = self._extract_segments(main_text)
            
            # Extract differentiators
            differentiators = self._extract_differentiators(main_text)
            
            # Look for pricing info
            pricing = self._extract_pricing(soup, main_text)
            
            return ScrapedWebContent(
                url=url,
                title=title,
                scraped_at=datetime.utcnow(),
                main_text=main_text[:10000],  # Limit size
                products=products,
                features=features,
                pricing_info=pricing,
                target_segments=segments,
                key_differentiators=differentiators,
                meta_description=meta_desc,
            )
            
        except Exception as e:
            # Return minimal content with error info
            return ScrapedWebContent(
                url=url,
                title=f"Error scraping {url}",
                scraped_at=datetime.utcnow(),
                main_text=f"Failed to scrape: {str(e)}",
                products=[],
                features=[],
            )
    
    def _extract_main_text(self, soup: BeautifulSoup) -> str:
        """Extract main text content from page."""
        # Try to find main content areas
        main_areas = soup.find_all(['main', 'article', 'section', 'div'], 
                                    class_=re.compile(r'(content|main|body|article)', re.I))
        
        if main_areas:
            text_parts = []
            for area in main_areas[:5]:  # Limit to first 5 main areas
                text_parts.append(area.get_text(separator=' ', strip=True))
            return ' '.join(text_parts)
        
        # Fallback to body text
        body = soup.find('body')
        if body:
            return body.get_text(separator=' ', strip=True)
        
        return soup.get_text(separator=' ', strip=True)
    
    def _extract_products(self, soup: BeautifulSoup, text: str) -> List[str]:
        """Extract product/service names."""
        products = set()
        
        # Common product-related keywords for telecom/enterprise
        product_patterns = [
            r'(?:our\s+)?(\w+\s+(?:solution|service|platform|network|connectivity|internet|fiber|ethernet|sd-wan|sase|cloud|security|voice|ucaas|ccaas)s?)',
            r'(business\s+\w+\s+(?:internet|phone|network|fiber))',
            r'(enterprise\s+\w+)',
            r'(managed\s+\w+\s+services?)',
        ]
        
        text_lower = text.lower()
        for pattern in product_patterns:
            matches = re.findall(pattern, text_lower)
            for match in matches[:10]:
                if len(match) > 5:
                    products.add(match.title())
        
        # Also look for h2/h3 headers that might be product names
        for header in soup.find_all(['h2', 'h3'])[:20]:
            header_text = header.get_text(strip=True)
            if 5 < len(header_text) < 50:
                products.add(header_text)
        
        return list(products)[:15]
    
    def _extract_features(self, soup: BeautifulSoup, text: str) -> List[str]:
        """Extract key features and capabilities."""
        features = []
        
        # Look for lists (ul/ol) which often contain features
        for list_elem in soup.find_all(['ul', 'ol'])[:10]:
            for li in list_elem.find_all('li')[:5]:
                li_text = li.get_text(strip=True)
                if 10 < len(li_text) < 200:
                    features.append(li_text)
        
        return features[:20]
    
    def _extract_segments(self, text: str) -> List[str]:
        """Extract target customer segments."""
        segments = set()
        
        segment_patterns = [
            r'(small\s+business(?:es)?)',
            r'(mid-?size(?:d)?\s+business(?:es)?)',
            r'(enterprise\s+(?:customer|client|organization)s?)',
            r'(large\s+(?:business|enterprise|organization)s?)',
            r'(healthcare|retail|financial|manufacturing|education|government)',
        ]
        
        text_lower = text.lower()
        for pattern in segment_patterns:
            matches = re.findall(pattern, text_lower)
            for match in matches:
                segments.add(match.title())
        
        return list(segments)[:10]
    
    def _extract_differentiators(self, text: str) -> List[str]:
        """Extract key differentiators and value props."""
        differentiators = []
        
        # Look for phrases that indicate differentiators
        diff_patterns = [
            r'(?:only|first|leading|largest|fastest|most\s+reliable|award-winning)\s+[^.]{10,100}',
            r'(?:unlike|different from)\s+[^.]{10,100}',
            r'(?:\d+%\s+(?:faster|better|more|uptime|reliability))[^.]{0,50}',
        ]
        
        text_lower = text.lower()
        for pattern in diff_patterns:
            matches = re.findall(pattern, text_lower)
            for match in matches[:3]:
                differentiators.append(match.strip().capitalize())
        
        return differentiators[:10]
    
    def _extract_pricing(self, soup: BeautifulSoup, text: str) -> Optional[str]:
        """Extract any pricing information."""
        # Look for pricing-related content
        pricing_patterns = [
            r'\$\d+(?:\.\d{2})?(?:\s*(?:per|/)\s*(?:month|mo|user|seat))?',
            r'starting\s+(?:at|from)\s+\$\d+',
            r'(?:pricing|plans?|packages?)\s*(?:start|from|at)',
        ]
        
        text_lower = text.lower()
        for pattern in pricing_patterns:
            match = re.search(pattern, text_lower)
            if match:
                # Get surrounding context
                start = max(0, match.start() - 50)
                end = min(len(text), match.end() + 100)
                return text[start:end].strip()
        
        return None
    
    def close(self):
        """Close the HTTP client."""
        self._client.close()


# Singleton
_scraper: Optional[WebScraper] = None


def get_web_scraper() -> WebScraper:
    """Get the singleton WebScraper instance."""
    global _scraper
    if _scraper is None:
        _scraper = WebScraper()
    return _scraper

