let MAX_NUM_LINKS = '150';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ MAX_NUM_LINKS });

  chrome.contextMenus.create({
    id: 'contextMenuCheckClickbaitLink',
    title: 'Check if the link is clickbait',
    type: 'normal',
    contexts: ['link']
  });
});

let count_links_analyzed = 0;


chrome.contextMenus.onClicked.addListener(async (item, tab) => {
  if (item.menuItemId == 'contextMenuCheckClickbaitLink') {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { type: item.menuItemId, linkUrl: item.linkUrl }, function (response) {});
  }
});
