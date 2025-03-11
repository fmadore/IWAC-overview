import type { Language } from '../stores/translationStore';

/**
 * Generates a URL for a specific language and tab combination
 * @param lang The language code ('en' or 'fr')
 * @param tab The tab ID
 * @param baseUrl Optional base URL (defaults to current location)
 * @returns The full URL with language and tab parameters
 */
export function generateUrl(lang: Language, tab: string, baseUrl?: string): string {
  // Use provided baseUrl or current location
  const url = new URL(baseUrl || window.location.href);
  
  // Set language and tab parameters
  url.searchParams.set('lang', lang);
  url.searchParams.set('tab', tab);
  
  return url.toString();
}

/**
 * Parses URL parameters to extract language and tab
 * @returns Object containing language and tab from URL parameters
 */
export function parseUrlParams(): { lang: Language | null, tab: string | null } {
  if (typeof window === 'undefined') return { lang: null, tab: null };
  
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang') as Language | null;
  const tabParam = urlParams.get('tab');
  
  // Only return valid language values
  const validLang = langParam === 'en' || langParam === 'fr' ? langParam : null;
  
  return { 
    lang: validLang, 
    tab: tabParam 
  };
}

/**
 * Updates the current URL with language and tab parameters
 * @param lang The language code
 * @param tab The tab ID
 */
export function updateUrl(lang: Language, tab: string): void {
  if (typeof window === 'undefined') return;
  
  const url = generateUrl(lang, tab);
  
  // Update URL without reloading the page
  window.history.pushState({}, '', url);
} 