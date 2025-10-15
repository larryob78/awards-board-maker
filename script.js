/*
 * Awards Board Maker logic
 *
 * This script manages the state of multiple boards, handles user input for images,
 * text, and fonts, updates the live preview, and exports boards to PNG and PDF.
 */

// State: array of boards
const boards = [];
let currentBoardIndex = 0;

// Element references
const boardSelect = document.getElementById('board-select');
const keyImageInput = document.getElementById('key-image');
const logoImageInput = document.getElementById('logo-image');
const fontFileInput = document.getElementById('font-file');
const briefInput = document.getElementById('brief');
const insightInput = document.getElementById('insight');
const ideaInput = document.getElementById('idea');
const executionInput = document.getElementById('execution');
const resultsInput = document.getElementById('results');

const addBoardButton = document.getElementById('add-board');
const removeBoardButton = document.getElementById('remove-board');
const exportPdfButton = document.getElementById('export-pdf');
const exportPngButton = document.getElementById('export-png');
const previewContainer = document.getElementById('preview');

// Helpers to create a default board object
function createDefaultBoard() {
  return {
    keyImage: '',
    logo: '',
    brief: '',
    insight: '',
    idea: '',
    execution: '',
    results: '',
    fontData: '',
    fontName: ''
  };
}

// Initialise with one board
function init() {
  boards.push(createDefaultBoard());
  updateBoardSelectOptions();
  loadBoard(0);
  updatePreview();
}

// Update the select dropdown based on boards array
function updateBoardSelectOptions() {
  // Clear options
  while (boardSelect.firstChild) boardSelect.removeChild(boardSelect.firstChild);
  boards.forEach((board, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `Board ${index + 1}`;
    boardSelect.appendChild(option);
  });
  boardSelect.value = currentBoardIndex;
}

// Load a board's data into the form inputs
function loadBoard(index) {
  const board = boards[index];
  currentBoardIndex = index;
  boardSelect.value = index;
  // Clear file inputs (file inputs cannot be prepopulated for security)
  keyImageInput.value = '';
  logoImageInput.value = '';
  fontFileInput.value = '';
  // Set text areas
  briefInput.value = board.brief;
  insightInput.value = board.insight;
  ideaInput.value = board.idea;
  executionInput.value = board.execution;
  resultsInput.value = board.results;
}

// Save current form values into the current board
function saveCurrentBoard() {
  const board = boards[currentBoardIndex];
  board.brief = briefInput.value;
  board.insight = insightInput.value;
  board.idea = ideaInput.value;
  board.execution = executionInput.value;
  board.results = resultsInput.value;
}

// Add a new board
function addBoard() {
  saveCurrentBoard();
  boards.push(createDefaultBoard());
  currentBoardIndex = boards.length - 1;
  updateBoardSelectOptions();
  loadBoard(currentBoardIndex);
  updatePreview();
}

// Remove the current board (if more than one exists)
function removeBoard() {
  if (boards.length <= 1) return;
  boards.splice(currentBoardIndex, 1);
  // adjust current index
  if (currentBoardIndex >= boards.length) currentBoardIndex = boards.length - 1;
  updateBoardSelectOptions();
  loadBoard(currentBoardIndex);
  updatePreview();
}

// Render all boards to the preview
function updatePreview() {
  previewContainer.innerHTML = '';
  boards.forEach((board, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'board-wrapper';
    wrapper.dataset.index = index;
    // Board element
    const boardEl = document.createElement('div');
    boardEl.className = 'board';
    // Apply custom font if exists
    if (board.fontName) {
      boardEl.style.setProperty('--custom-font', `'${board.fontName}'`);
    } else {
      boardEl.style.removeProperty('--custom-font');
    }
    // Left image
    const imgDiv = document.createElement('div');
    imgDiv.className = 'board-image';
    if (board.keyImage) {
      imgDiv.style.backgroundImage = `url(${board.keyImage})`;
    } else {
      imgDiv.style.backgroundImage = 'none';
    }
    // Right content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'board-content';
    const sections = [
      { title: 'Brief', text: board.brief },
      { title: 'Insight', text: board.insight },
      { title: 'Idea', text: board.idea },
      { title: 'Execution', text: board.execution },
      { title: 'Results', text: board.results }
    ];
    sections.forEach(({ title, text }) => {
      const sectionDiv = document.createElement('div');
      sectionDiv.className = 'section';
      const h3 = document.createElement('h3');
      h3.textContent = title;
      const p = document.createElement('p');
      p.textContent = text;
      sectionDiv.appendChild(h3);
      sectionDiv.appendChild(p);
      contentDiv.appendChild(sectionDiv);
    });
    // Logo
    if (board.logo) {
      const logoImg = document.createElement('img');
      logoImg.className = 'logo';
      logoImg.src = board.logo;
      boardEl.appendChild(logoImg);
    }
    boardEl.appendChild(imgDiv);
    boardEl.appendChild(contentDiv);
    wrapper.appendChild(boardEl);
    previewContainer.appendChild(wrapper);
  });
}

// Handle file input for images
function handleImageUpload(inputElement, callback) {
  const file = inputElement.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    callback(reader.result);
    updatePreview();
  };
  reader.readAsDataURL(file);
}

// Handle font upload
function handleFontUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const fontData = reader.result.split(',')[1]; // base64 part
    // Determine mime type based on file extension
    const ext = file.name.split('.').pop().toLowerCase();
    let format;
    switch (ext) {
      case 'ttf':
        format = 'truetype';
        break;
      case 'otf':
        format = 'opentype';
        break;
      default:
        format = 'truetype';
    }
    const fontName = `CustomFont${Date.now()}`;
    // Create @font-face style
    const style = document.createElement('style');
    style.appendChild(
      document.createTextNode(
        `@font-face {\n` +
        `  font-family: '${fontName}';\n` +
        `  src: url(data:font/${ext};base64,${fontData}) format('${format}');\n` +
        `  font-weight: normal;\n` +
        `  font-style: normal;\n` +
        `}`
      )
    );
    document.head.appendChild(style);
    // Save to current board
    const board = boards[currentBoardIndex];
    board.fontData = fontData;
    board.fontName = fontName;
    updatePreview();
  };
  reader.readAsDataURL(file);
}

// Export all boards as PDF
async function exportAsPdf() {
  saveCurrentBoard();
  updatePreview();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  for (let i = 0; i < boards.length; i++) {
    if (i > 0) pdf.addPage();
    const wrapper = previewContainer.children[i];
    // Use html2canvas to capture the board
    const canvas = await html2canvas(wrapper, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    // Fit image into page; use width of page minus margins
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    // Maintain aspect ratio of canvas
    const ratio = canvas.width / canvas.height;
    let imgWidth = pageWidth - 40; // margins
    let imgHeight = imgWidth / ratio;
    if (imgHeight > pageHeight - 40) {
      imgHeight = pageHeight - 40;
      imgWidth = imgHeight * ratio;
    }
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;
    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
  }
  pdf.save('boards.pdf');
}

// Export selected board as PNG (or all boards)
async function exportAsPng() {
  saveCurrentBoard();
  updatePreview();
  // Export current board only
  const wrapper = previewContainer.children[currentBoardIndex];
  const canvas = await html2canvas(wrapper, { scale: 2 });
  const imgData = canvas.toDataURL('image/png');
  // Create a download link
  const link = document.createElement('a');
  link.href = imgData;
  link.download = `board-${currentBoardIndex + 1}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Event listeners
boardSelect.addEventListener('change', () => {
  saveCurrentBoard();
  const newIndex = parseInt(boardSelect.value, 10);
  loadBoard(newIndex);
});

keyImageInput.addEventListener('change', () => {
  handleImageUpload(keyImageInput, (dataUrl) => {
    boards[currentBoardIndex].keyImage = dataUrl;
  });
});

logoImageInput.addEventListener('change', () => {
  handleImageUpload(logoImageInput, (dataUrl) => {
    boards[currentBoardIndex].logo = dataUrl;
  });
});

fontFileInput.addEventListener('change', () => {
  const file = fontFileInput.files[0];
  if (file) handleFontUpload(file);
});

briefInput.addEventListener('input', () => {
  boards[currentBoardIndex].brief = briefInput.value;
  updatePreview();
});
insightInput.addEventListener('input', () => {
  boards[currentBoardIndex].insight = insightInput.value;
  updatePreview();
});
ideaInput.addEventListener('input', () => {
  boards[currentBoardIndex].idea = ideaInput.value;
  updatePreview();
});
executionInput.addEventListener('input', () => {
  boards[currentBoardIndex].execution = executionInput.value;
  updatePreview();
});
resultsInput.addEventListener('input', () => {
  boards[currentBoardIndex].results = resultsInput.value;
  updatePreview();
});

addBoardButton.addEventListener('click', () => {
  addBoard();
});
removeBoardButton.addEventListener('click', () => {
  removeBoard();
});
exportPdfButton.addEventListener('click', () => {
  exportAsPdf();
});
exportPngButton.addEventListener('click', () => {
  exportAsPng();
});

// Initialize app
window.addEventListener('load', init);