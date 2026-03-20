// Synapse System - Global JS

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
});

// Helper: API fetch with error handling
async function apiFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Helper: Format date
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('sk-SK', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Helper: Heat score color class
function heatClass(score) {
  if (score >= 70) return 'heat-high';
  if (score >= 40) return 'heat-medium';
  return 'heat-low';
}
