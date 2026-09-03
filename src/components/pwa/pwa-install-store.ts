export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

export function getInstallPrompt() {
  return deferredPrompt;
}

export function getAppInstalled() {
  return installed;
}

export function setAppInstalled(value: boolean) {
  installed = value;
  for (const listener of listeners) listener();
}

export function setInstallPrompt(prompt: InstallPromptEvent | null) {
  deferredPrompt = prompt;
  for (const listener of listeners) listener();
}

export function subscribeToInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
