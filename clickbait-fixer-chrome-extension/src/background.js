let MAX_NUM_LINKS = '150';

function createContextMenus(customPromptTitle) {
  chrome.contextMenus.removeAll();

  chrome.contextMenus.create({
    id: 'contextMenuCheckClickbaitLink',
    title: 'Check if the link is clickbait',
    type: 'normal',
    contexts: ['link']
  });

  chrome.contextMenus.create({
    id: 'contextMenuCustomPrompt1',
    title: customPromptTitle,
    type: 'normal',
    contexts: ['link']
  });

  chrome.contextMenus.create({
    id: 'contextMenuAskAnything',
    title: 'Ask anything!',
    type: 'normal',
    contexts: ['link']
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ CHECK_INFINITE_SCROLL: true });
  chrome.storage.sync.set({ MAX_NUM_LINKS });

  let prompt = '(your custom prompt here)';

  chrome.storage.sync.get("CUSTOM_PROMPT_1", async ({ CUSTOM_PROMPT_1 }) => {
    if (CUSTOM_PROMPT_1 != null && CUSTOM_PROMPT_1.length != 0) {
      prompt = CUSTOM_PROMPT_1;
    }

    createContextMenus(prompt);
  });

});

let count_links_analyzed = 0;


chrome.contextMenus.onClicked.addListener(async (item, tab) => {
  if (item.menuItemId == 'contextMenuCheckClickbaitLink' || item.menuItemId == 'contextMenuCustomPrompt1'  || item.menuItemId == 'contextMenuAskAnything') {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { type: item.menuItemId, linkUrl: item.linkUrl }, function (response) {});
  }
});


chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse){
    if(request.type == 'createContextMenus') {
      createContextMenus(request.title);
    }
  }
);
