chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "CRM_MAXI_TOGGLE_PANEL" }).catch(() => {
    // The content script may not be available on unsupported pages.
  });
});