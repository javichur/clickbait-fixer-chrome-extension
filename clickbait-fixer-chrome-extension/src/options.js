let btnSave = document.getElementById("btnSave");
btnSave.addEventListener('click', saveConfig);

let btnSaveCustomContextMenu1 = document.getElementById("btnSaveCustomContextMenu1");
btnSaveCustomContextMenu1.addEventListener('click', saveCustomeContextMenu);

let checkboxInfiniteScroll = document.getElementById("checkboxInfiniteScroll");
checkboxInfiniteScroll.addEventListener('click', saveCheckInfiniteScroll);


function showDialog(txt) {
  let lbl = document.getElementById('lblGenericDialog');
  lbl.innerHTML = txt;
  document.getElementById('genericDialog').showModal();
}


function saveCheckInfiniteScroll() {
  chrome.storage.sync.set({ CHECK_INFINITE_SCROLL: checkboxInfiniteScroll.checked }, () => {});
}


function saveConfig(event) {
  let txtMaxNumLinks = document.getElementById("txtMaxNumLinks");
  if (txtMaxNumLinks.value.length == 0) {
    showDialog('Error. Please write a max number.');
  } else {
    chrome.storage.sync.set({ MAX_NUM_LINKS: txtMaxNumLinks.value }, () => {
      showDialog('Custom max number saved. Please check now the features of the extension.');
    });
  }
}


function saveCustomeContextMenu(event) {
  let txtPrompt = document.getElementById("txtCustomContextMenu1");
  chrome.storage.sync.set({ CUSTOM_PROMPT_1: txtPrompt.value }, () => {
    let title = '(your custom prompt here)';
    if (txtPrompt.value.length > 0) {
      title = txtPrompt.value.substring(0, 64);
    }

    chrome.runtime.sendMessage({ type: 'createContextMenus', title });

    showDialog('Custom prompt for Context Menu saved. Now you can explore this feature extension.');
  });
}


document.getElementById('lblNote').innerHTML = `Note: Links with less than 4 words will not be scanned nor counted.`;

chrome.storage.sync.get("MAX_NUM_LINKS", ({ MAX_NUM_LINKS }) => {
  document.getElementById("txtMaxNumLinks").value = MAX_NUM_LINKS;
});

chrome.storage.sync.get("CUSTOM_PROMPT_1", ({ CUSTOM_PROMPT_1 }) => {
  document.getElementById("txtCustomContextMenu1").value = CUSTOM_PROMPT_1;
});