interface ScrapedJobData {
  title: string;
  company: string;
  description: string;
}

function scrapeLinkedInJob(): ScrapedJobData | null {
  // Try multiple common LinkedIn DOM selectors as their layout changes frequently
  const titleElement = 
    document.querySelector('.job-details-jobs-unified-top-card__job-title') || 
    document.querySelector('h1.t-24') || 
    document.querySelector('.t-24.t-bold');
    
  const companyElement = 
    document.querySelector('.job-details-jobs-unified-top-card__company-name') || 
    document.querySelector('.job-details-jobs-unified-top-card__primary-description a') ||
    document.querySelector('.app-aware-link.t-14.t-bold');
    
  const descriptionElement = 
    document.querySelector('.jobs-description__content') || 
    document.querySelector('#job-details') ||
    document.querySelector('.jobs-box__html-content');

  // We only strictly require the description to attempt a generation
  if (!descriptionElement) {
    console.error("LinkedIn Scraper: Could not find job description element.");
    return null;
  }

  return {
    title: titleElement?.textContent?.trim() || 'Software Professional',
    company: companyElement?.textContent?.trim() || 'Hiring Company',
    description: descriptionElement.textContent?.trim() || '',
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeJob') {
    const jobData = scrapeLinkedInJob();
    sendResponse({ success: true, data: jobData });
  }
  return true;
});

const observer = new MutationObserver(() => {
  const jobData = scrapeLinkedInJob();
  if (jobData && jobData.title) {
    chrome.storage.local.set({ lastScrapedJob: jobData });
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
