import './app.css';
import OpenAI from 'openai';

let oldPlaylistEditModal = null;
let playlistEditModal = null;
let playlistEditModalObserver = null;
let fileInput = null;
let loadingOverlay = null;
let content = null;
let input = null;

function updateTracklist() {
  content = playlistEditModal.querySelector('.main-playlistEditDetailsModal-content');

  if (content.querySelector('.spicetify-ai-playlist-images-key-input')) return;

  const div = document.createElement('div');
  div.classList.add('spicetify-ai-playlist-images-key-input');
  content.appendChild(div);

  const label = document.createElement('label');
  label.classList.add(
    'TextElement-marginalBold-text',
    'encore-text-marginal-bold',
    'main-playlistEditDetailsModal-textElementLabel'
  );
  label.innerText = 'OpenAI API Key';
  div.appendChild(label);

  input = document.createElement('input');
  input.type = 'password';
  input.classList.add(
    'main-playlistEditDetailsModal-textElement',
    'main-playlistEditDetailsModal-titleInput'
  );
  input.placeholder = 'Paste your OpenAI API key here'
  input.addEventListener('focus', () => {
    label.style.opacity = 1;
  });
  input.addEventListener('blur', () => {
    label.style.opacity = 0;
  });
  input.addEventListener('input', () => {
    localStorage.setItem('spicetify-ai-playlist-images:openai-api-key', JSON.stringify(input.value));
  });
  let key = JSON.parse(localStorage.getItem('spicetify-ai-playlist-images:openai-api-key'))
  if (key)
    input.value = key;
  div.appendChild(input);

  loadingOverlay = document.createElement('div');
  loadingOverlay.classList.add('spicetify-ai-playlist-images-loading-overlay');
  loadingOverlay.appendChild(document.createElement('span'));
  loadingOverlay.appendChild(document.createElement('span'));
  loadingOverlay.appendChild(document.createElement('span'));

  const image = content.querySelector('.main-playlistEditDetailsModal-imageChangeButton');
  image.appendChild(loadingOverlay);

  fileInput = content.querySelector('input');
}

async function observerCallback() {
  oldPlaylistEditModal = playlistEditModal;
  playlistEditModal = document.querySelector('.main-playlistEditDetailsModal-container');
  if (playlistEditModal && !playlistEditModal.isEqualNode(oldPlaylistEditModal)) {
    if (oldPlaylistEditModal) {
      playlistEditModalObserver.disconnect();
    }
    updateTracklist();
    playlistEditModalObserver.observe(playlistEditModal, {
      childList: true,
      subtree: true,
    });
  }
}

async function main() {
  while (!Spicetify?.showNotification) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  playlistEditModalObserver = new MutationObserver(() => {
    updateTracklist();
  });

  const observer = new MutationObserver(async () => {
    await observerCallback();
  });
  await observerCallback();
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  const menuItem = new Spicetify.ContextMenuV2.Item({
    children: 'Generate photo',
    leadingIcon: '<svg class="Svg-img-icon-small-textSubdued" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M234.7 42.7L197 56.8c-3 1.1-5 4-5 7.2s2 6.1 5 7.2l37.7 14.1L248.8 123c1.1 3 4 5 7.2 5s6.1-2 7.2-5l14.1-37.7L315 71.2c3-1.1 5-4 5-7.2s-2-6.1-5-7.2L277.3 42.7 263.2 5c-1.1-3-4-5-7.2-5s-6.1 2-7.2 5L234.7 42.7zM46.1 395.4c-18.7 18.7-18.7 49.1 0 67.9l34.6 34.6c18.7 18.7 49.1 18.7 67.9 0L529.9 116.5c18.7-18.7 18.7-49.1 0-67.9L495.3 14.1c-18.7-18.7-49.1-18.7-67.9 0L46.1 395.4zM484.6 82.6l-105 105-23.3-23.3 105-105 23.3 23.3zM7.5 117.2C3 118.9 0 123.2 0 128s3 9.1 7.5 10.8L64 160l21.2 56.5c1.7 4.5 6 7.5 10.8 7.5s9.1-3 10.8-7.5L128 160l56.5-21.2c4.5-1.7 7.5-6 7.5-10.8s-3-9.1-7.5-10.8L128 96 106.8 39.5C105.1 35 100.8 32 96 32s-9.1 3-10.8 7.5L64 96 7.5 117.2zm352 256c-4.5 1.7-7.5 6-7.5 10.8s3 9.1 7.5 10.8L416 416l21.2 56.5c1.7 4.5 6 7.5 10.8 7.5s9.1-3 10.8-7.5L480 416l56.5-21.2c4.5-1.7 7.5-6 7.5-10.8s-3-9.1-7.5-10.8L480 352l-21.2-56.5c-1.7-4.5-6-7.5-10.8-7.5s-9.1 3-10.8 7.5L416 352l-56.5 21.2z"/></svg>',
    onClick: async () => {
      if (!fileInput) return;

      try {
        const title = content.querySelector('.main-playlistEditDetailsModal-title > input').value;
        const description = content.querySelector('.main-playlistEditDetailsModal-description > textarea').value;

        loadingOverlay.style.visibility = 'visible';

        const openai = new OpenAI({
          apiKey: input.value,
          dangerouslyAllowBrowser: true
        });

        const image = await openai.images.generate({ model: 'dall-e-3', prompt: `A playlist image for "${title}: ${description}." Do not include any text in the image."` });
        let url = image?.data?.[0]?.url;
        if (!url) return;
        url = 'https://corsproxy.org/?' + encodeURIComponent(url);
        const response = await fetch(url);
        console.log(response);
        const blob = await response.blob();

        const file = new File([blob], "image.png", { type: "image/png" });
        const fileList = new DataTransfer();
        fileList.items.add(file);
        fileInput.files = fileList.files;
        const event = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(event);
        console.log(fileInput);
      } finally {
        loadingOverlay.style.visibility = 'hidden';
      }
    },
    shouldAdd: (e) => {
      return e?.children?.[0]?.props?.children === 'Change photo';
    }
  });

  menuItem.register();
}

export default main;
