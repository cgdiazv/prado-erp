"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import appIcon from "@/app/icon.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running as an installed PWA
    const inStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(inStandaloneMode);

    // Only register the service worker in production to prevent corrupting Turbopack dev streams
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "development") {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
      } else {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
          console.warn("[PWA] Service Worker registration error:", err);
        });
      }
    }

    // Detect iOS Safari (no native install prompt)
    const ua = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("[PWA] User accepted the install prompt");
    }
    setDeferredPrompt(null);
  };

  // Hide when already installed or dismissed
  if (isStandalone || isDismissed) return null;

  // Show only when Chrome/Edge install prompt is available OR on iOS
  if (!deferredPrompt && !isIos) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border border-emerald-500/30 bg-slate-900 p-4 text-white shadow-2xl backdrop-blur-md sm:left-auto">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="shrink-0 overflow-hidden rounded-xl border border-emerald-500/40 shadow-sm">
            <Image
              src={appIcon}
              alt="Prado Jobs App Icon"
              width={44}
              height={44}
              className="h-11 w-11 object-cover"
            />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-100">
              Install Prado Jobs App
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-slate-300">
              Add to home screen for instant 1-tap access from any device.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1 text-slate-400 hover:text-white"
          aria-label="Close install prompt"
        >
          <X size={16} />
        </button>
      </div>

      {isIos ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-[11px] text-emerald-300">
          <Share size={16} className="shrink-0 text-emerald-400" />
          <span>
            Tap <strong>Share</strong> then select{" "}
            <strong>&quot;Add to Home Screen&quot;</strong> to install.
          </span>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            Later
          </button>
          <button
            type="button"
            onClick={handleInstall}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-600"
          >
            <Download size={14} />
            Install App
          </button>
        </div>
      )}
    </div>
  );
}
