// assets/js/utils/templateLoader.js
// Utility for loading HTML templates

/**
 * Load HTML template from file
 * @param {string} templatePath - Path to template file
 * @returns {Promise<string>} HTML content
 */
export async function loadTemplate(templatePath) {
  try {
    const response = await fetch(templatePath);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Error loading template:', error);
    return '';
  }
}

/**
 * Load and parse HTML template into DOM elements
 * @param {string} templatePath - Path to template file
 * @returns {Promise<DocumentFragment>} Parsed DOM fragment
 */
export async function loadTemplateFragment(templatePath) {
  const html = await loadTemplate(templatePath);
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const fragment = document.createDocumentFragment();
  
  // Move all child nodes to fragment
  while (doc.body.firstChild) {
    fragment.appendChild(doc.body.firstChild);
  }
  
  return fragment;
}
