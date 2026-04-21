// ===== ТЕМА =====
const themeToggleBtn = document.getElementById("themeToggle");

function getSystemTheme() {
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function applyTheme(mode) {
  document.body.setAttribute("data-theme", mode);
}

(function initTheme() {
  const saved = localStorage.getItem("theme");
  const mode = saved || getSystemTheme();
  applyTheme(mode);
})();

themeToggleBtn.addEventListener("click", () => {
  const current = document.body.getAttribute("data-theme") || "light";
  const next = current === "light" ? "dark" : "light";
  applyTheme(next);
  localStorage.setItem("theme", next);
});

// ===== ХАФФМАН =====
class HuffmanNode {
  constructor(char, freq, left = null, right = null) {
    this.char = char;
    this.freq = freq;
    this.left = left;
    this.right = right;
  }
}

function buildFrequencyMap(text) {
  const freq = {};
  for (const ch of text) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  return freq;
}

function buildHuffmanTree(freqMap) {
  const nodes = Object.entries(freqMap).map(
    ([char, freq]) => new HuffmanNode(char, freq)
  );

  if (nodes.length === 0) return null;
  if (nodes.length === 1) {
    const only = nodes[0];
    const dummy = new HuffmanNode(null, 0);
    return new HuffmanNode(null, only.freq, only, dummy);
  }

  const pq = nodes.slice();
  while (pq.length > 1) {
    pq.sort((a, b) => a.freq - b.freq);
    const left = pq.shift();
    const right = pq.shift();
    const parent = new HuffmanNode(null, left.freq + right.freq, left, right);
    pq.push(parent);
  }
  return pq[0];
}

function buildCodeMap(root) {
  const codes = {};
  function dfs(node, prefix) {
    if (!node) return;
    if (node.char !== null) {
      codes[node.char] = prefix || "0";
      return;
    }
    dfs(node.left, prefix + "0");
    dfs(node.right, prefix + "1");
  }
  dfs(root, "");
  return codes;
}

function encode(text, codes) {
  let result = "";
  for (const ch of text) {
    result += codes[ch];
  }
  return result;
}

function decode(binary, root) {
  let result = "";
  let node = root;
  for (const bit of binary) {
    node = bit === "0" ? node.left : node.right;
    if (!node.left && !node.right) {
      result += node.char ?? "";
      node = root;
    }
  }
  return result;
}

function bytesCountForBits(bitCount) {
  return Math.ceil(bitCount / 8);
}

function exportHuff(text, binary, codes) {
  return JSON.stringify({
    textLength: text.length,
    binary,
    codes
  });
}

function importHuff(jsonStr) {
  const obj = JSON.parse(jsonStr);
  return obj;
}

// ===== Состояние & DOM =====
let currentTree = null;
let currentCodes = null;
let currentBinary = "";
let currentText = "";

const inputTextEl = document.getElementById("inputText");
const compressBtn = document.getElementById("compressBtn");
const decompressBtn = document.getElementById("decompressBtn");
const clearBtn = document.getElementById("clearBtn");
const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");
const fileInput = document.getElementById("fileInput");

const originalLengthTopEl = document.getElementById("originalLength");
const originalLengthMetricEl = document.getElementById("originalLengthMetric");
const compressedLengthEl = document.getElementById("compressedLength");
const compressionRatioEl = document.getElementById("compressionRatio");

const binaryOutputEl = document.getElementById("binaryOutput");
const decodedOutputEl = document.getElementById("decodedOutput");
const codesOutputEl = document.getElementById("codesOutput");

function renderCodesTable(codes) {
  const entries = Object.entries(codes).sort((a, b) => a[0].localeCompare(b[0]));
  if (entries.length === 0) {
    codesOutputEl.textContent = "";
    return;
  }

  const freqMap = buildFrequencyMap(currentText || "");
  let html = '<table class="codes-table"><thead><tr><th>Символ</th><th>Код</th><th>Частота</th></tr></thead><tbody>';
  for (const [ch, code] of entries) {
    const displayChar =
      ch === " " ? "пробел" :
        ch === "\n" ? "\\n" :
          ch === "\t" ? "\\t" : ch;
    html += `<tr><td>${displayChar}</td><td>${code}</td><td>${freqMap[ch] ?? 0}</td></tr>`;
  }
  html += "</tbody></table>";
  codesOutputEl.innerHTML = html;
}

function warn(message) {
  alert(message);
}

// ===== Обработчики =====
compressBtn.addEventListener("click", () => {
  const text = inputTextEl.value;
  if (!text) {
    warn("Введите текст, который нужно сжать.");
    return;
  }

  const freqMap = buildFrequencyMap(text);
  const tree = buildHuffmanTree(freqMap);
  const codes = buildCodeMap(tree);
  const binary = encode(text, codes);

  currentTree = tree;
  currentCodes = codes;
  currentBinary = binary;
  currentText = text;

  const originalBytes = new TextEncoder().encode(text).length;
  const compressedBits = binary.length;
  const compressedBytes = bytesCountForBits(compressedBits);

  originalLengthTopEl.textContent = text.length;
  originalLengthMetricEl.textContent = text.length;
  compressedLengthEl.textContent = compressedBits;

  let ratio = 0;
  if (compressedBytes > 0) {
    ratio = (originalBytes / compressedBytes).toFixed(2);
  }
  compressionRatioEl.textContent = ratio;

  binaryOutputEl.textContent = binary;
  decodedOutputEl.textContent = "";
  renderCodesTable(codes);
});

decompressBtn.addEventListener("click", () => {
  if (!currentTree || !currentBinary) {
    warn("Сначала выполните сжатие текста или загрузите файл .huff.");
    return;
  }
  const decoded = decode(currentBinary, currentTree);
  decodedOutputEl.textContent = decoded;
});

clearBtn.addEventListener("click", () => {
  inputTextEl.value = "";
  originalLengthTopEl.textContent = "0";
  originalLengthMetricEl.textContent = "0";
  compressedLengthEl.textContent = "0";
  compressionRatioEl.textContent = "0";
  binaryOutputEl.textContent = "";
  decodedOutputEl.textContent = "";
  codesOutputEl.textContent = "";
  currentTree = null;
  currentCodes = null;
  currentBinary = "";
  currentText = "";
});

// Сохранение .huff
saveBtn.addEventListener("click", () => {
  if (!currentBinary || !currentCodes) {
    warn("Сначала выполните сжатие текста, чтобы было что сохранить.");
    return;
  }
  const data = exportHuff(currentText, currentBinary, currentCodes);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "compressed.huff";
  a.click();
  URL.revokeObjectURL(url);
});

// Загрузка .huff
loadBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const obj = importHuff(e.target.result);
      if (!obj || !obj.binary || !obj.codes) {
        warn("Некорректный формат файла .huff.");
        return;
      }

      currentBinary = obj.binary;
      currentCodes = obj.codes;

      const root = new HuffmanNode(null, 0);
      for (const [ch, code] of Object.entries(currentCodes)) {
        let node = root;
        for (const bit of code) {
          if (bit === "0") {
            if (!node.left) node.left = new HuffmanNode(null, 0);
            node = node.left;
          } else {
            if (!node.right) node.right = new HuffmanNode(null, 0);
            node = node.right;
          }
        }
        node.char = ch;
      }
      currentTree = root;

      const decoded = decode(currentBinary, currentTree);
      currentText = decoded;
      inputTextEl.value = decoded;

      const originalBytes = new TextEncoder().encode(decoded).length;
      const compressedBits = currentBinary.length;
      const compressedBytes = bytesCountForBits(compressedBits);

      originalLengthTopEl.textContent = decoded.length;
      originalLengthMetricEl.textContent = decoded.length;
      compressedLengthEl.textContent = compressedBits;

      let ratio = 0;
      if (compressedBytes > 0) {
        ratio = (originalBytes / compressedBytes).toFixed(2);
      }
      compressionRatioEl.textContent = ratio;

      binaryOutputEl.textContent = currentBinary;
      decodedOutputEl.textContent = decoded;
      renderCodesTable(currentCodes);
    } catch (err) {
      console.error(err);
      warn("Ошибка при чтении файла .huff.");
    }
  };
  reader.readAsText(file);
});