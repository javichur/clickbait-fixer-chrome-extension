let MAX_NUM_LINKS = '150';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ MAX_NUM_LINKS });
});

let count_links_analyzed = 0;
