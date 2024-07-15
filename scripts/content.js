// Constants
const BASE_URI = 'https://claude.ai/api/organizations';

const getOrganizationId = () => {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith('lastActiveOrg=')) {
      return cookie.substring('lastActiveOrg='.length, cookie.length);
    }
  }
  return null;
}

// Utility functions
const parseId = (href) => href.split('/').pop();
const getIdFromLink = (link) => parseId(link.getAttribute('href'));

// API functions
const deleteConversation = async (chatId) => {
  const response = await fetch(`${BASE_URI}/${getOrganizationId()}/chat_conversations/${chatId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response;
};

// DOM manipulation functions
const createCheckbox = (onChange) => {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.addEventListener('change', onChange);
  return checkbox;
};

const styleListItem = (element) => {
  element.style.display = 'flex';
  element.style.alignItems = 'center';
  element.style.gap = '16px';
};

const createDeleteButton = (onClick) => {
  const button = document.createElement('button');
  button.textContent = 'Delete selected';
  button.addEventListener('click', onClick);
  button.style.whiteSpace = 'nowrap';
  const sampleButton = document.querySelector('[target="_self"][href="/new"]');
  sampleButton.classList.forEach((className) => button.classList.add(className));
  return button;
};

// Main functionality
class ClaudeToolkit {
  constructor() {
    this.selectedChats = [];
    this.isSetup = false;
    this.observer = null;
  }

  init() {
    this.setupUrlChangeListener();
    this.startObserver();
  }

  setupUrlChangeListener() {
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        this.cleanupToolkit();
        this.startObserver();
      }
    }).observe(document, { subtree: true, childList: true });
  }

  startObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          const chatsList = document.querySelector('main > div > ul');
          if (chatsList && !this.isSetup) {
            this.setupToolkit(chatsList);
            this.isSetup = true;
          }
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  checkAndSetupToolkit() {
    const chatsList = document.querySelector('main > div > ul');
    if (chatsList && !this.isSetup) {
      this.setupToolkit(chatsList);
      this.isSetup = true;
    }
  }

  cleanupToolkit() {
    // Remove checkboxes and delete button
    document.querySelectorAll('input[type="checkbox"]').forEach(el => el.remove());
    const deleteButton = document.querySelector('button');
    if (deleteButton && deleteButton.textContent === 'Delete selected') {
      deleteButton.remove();
    }
    this.selectedChats = [];
    this.isSetup = false;
  }

  setupToolkit(chatsList) {
    this.setupChatCheckboxes(chatsList);
    this.setupSelectAllCheckbox(chatsList);
    this.setupDeleteButton();
    this.isSetup = true;
  }

  setupChatCheckboxes(chatsList) {
    const chatsElements = Array.from(chatsList.querySelectorAll('li'));
    chatsElements.forEach((chatElement) => {
      const link = chatElement.querySelector('a');
      const checkbox = createCheckbox(() => this.toggleChatSelection(getIdFromLink(link)));
      chatElement.insertAdjacentElement('afterbegin', checkbox);
      styleListItem(chatElement);
      link.style.flex = '1';
    });
  }

  setupSelectAllCheckbox(chatsList) {
    const selectAllRow = document.createElement('li');
    const selectAllCheckbox = createCheckbox(() => this.toggleAllChats(chatsList, selectAllCheckbox.checked));
    selectAllRow.textContent = 'Select all';
    selectAllRow.insertAdjacentElement('afterbegin', selectAllCheckbox);
    styleListItem(selectAllRow);
    chatsList.insertAdjacentElement('afterbegin', selectAllRow);
  }

  setupDeleteButton() {
    const searchField = document.querySelector('[placeholder="Search your chats..."]');
    if (searchField) {
      const searchContainer = searchField.parentElement?.parentElement;
      if (searchContainer) {
        searchContainer.style.display = 'flex';
        searchContainer.style.alignItems = 'center';
        searchContainer.style.gap = '16px';
        const deleteButton = createDeleteButton(() => this.deleteSelectedChats());
        searchContainer.insertAdjacentElement('beforeend', deleteButton);
      }
    }
  }

  toggleChatSelection(chatId) {
    const index = this.selectedChats.indexOf(chatId);
    if (index === -1) {
      this.selectedChats.push(chatId);
    } else {
      this.selectedChats.splice(index, 1);
    }
  }

  toggleAllChats(chatsList, isChecked) {
    const chatsElements = Array.from(chatsList.querySelectorAll('li'));
    chatsElements.forEach((chatElement) => {
      const checkbox = chatElement.querySelector('input');
      const link = chatElement.querySelector('a');
      if (checkbox && link) {
        checkbox.checked = isChecked;
        this.toggleChatSelection(getIdFromLink(link));
      }
    });
  }

  async deleteSelectedChats() {
    if (this.selectedChats.length === 0) return;

    const confirmDelete = confirm('Are you sure you want to delete the selected chats?');
    if (confirmDelete) {
      try {
        await Promise.all(this.selectedChats.map(deleteConversation));
        window.location.reload();
      } catch (error) {
        console.error('[CLAUDE TOOLKIT] Error deleting chats:', error);
        alert('An error occurred while deleting chats. Please try again.');
      }
    }
  }
}

// Initialize the toolkit
const claudeToolkit = new ClaudeToolkit();
claudeToolkit.init();