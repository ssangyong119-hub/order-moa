const STORAGE_KEY = "order-moa-mvp-data";

export function loadData(fallbackData) {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return structuredClone(fallbackData);
  }

  try {
    return JSON.parse(raw);
  } catch {
    return structuredClone(fallbackData);
  }
}

export function saveData(data) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetData(fallbackData) {
  const nextData = structuredClone(fallbackData);
  saveData(nextData);
  return nextData;
}

export function exportData(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `order-moa-data-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function importDataFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
