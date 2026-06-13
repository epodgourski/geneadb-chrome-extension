export function debugLog(msg) {
  const el = document.getElementById('debug-log');
  if (el) {
    el.textContent += msg + '\n';
    el.scrollTop = el.scrollHeight;
  }
  console.log('[debug]', msg);
}

export async function runInPage(tabId, func, args = [], world) {
  const options = { target: { tabId }, func, args };
  if (world) options.world = world;
  const results = await chrome.scripting.executeScript(options);
  return results && results[0] ? results[0].result : undefined;
}
