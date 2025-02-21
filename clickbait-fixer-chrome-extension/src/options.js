let btnSave = document.getElementById("btnSave");
btnSave.addEventListener('click', saveConfig);


function showDialog(txt) {
  let lbl = document.getElementById('lblGenericDialog');
  lbl.innerHTML = txt;
  document.getElementById('genericDialog').showModal();
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

document.getElementById('lblNote').innerHTML = `Note: Links with less than 4 words will not be scanned nor counted.`;

chrome.storage.sync.get("MAX_NUM_LINKS", ({ MAX_NUM_LINKS }) => {
  document.getElementById("txtMaxNumLinks").value = MAX_NUM_LINKS;
});