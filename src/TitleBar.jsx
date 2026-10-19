
import React, { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let active = true;

    async function syncWindowState() {
      try {
        const appWindow = getCurrentWindow();
        const value = await appWindow.isMaximized();
        if (active) setMaximized(value);
      } catch (error) {
        console.error("Could not read window state:", error);
      }
    }

    syncWindowState();

    return () => {
      active = false;
    };
  }, []);

  async function handleWindowAction(action) {
    try {
      const appWindow = getCurrentWindow();

      if (action === "close") {
        await appWindow.close();
      } else if (action === "minimize") {
        await appWindow.minimize();
      } else if (action === "maximize") {
        await appWindow.toggleMaximize();
        setMaximized(await appWindow.isMaximized());
      }
    } catch (error) {
      console.error(`Window ${action} failed:`, error);
    }
  }

  return (
    <header
      data-tauri-drag-region
      className="relative flex h-12 shrink-0 items-center
        justify-between border-b border-white/[0.07]
        bg-[#171719]/95 px-4 text-white backdrop-blur-xl
        select-none"
    >
      {/* macOS traffic-light controls */}
      <div className="z-10 flex items-center gap-[9px]">
        <button
          onClick={() => handleWindowAction("close")}
          aria-label="Close window"
          title="Close"
          className="group flex h-3 w-3 items-center justify-center
            rounded-full border border-black/15 bg-[#ff5f57]
            transition hover:brightness-110 active:brightness-90"
        >
          <span className="text-[9px] leading-none text-black/70
            opacity-0 group-hover:opacity-100">×</span>
        </button>

        <button
          onClick={() => handleWindowAction("minimize")}
          aria-label="Minimize window"
          title="Minimize"
          className="group flex h-3 w-3 items-center justify-center
            rounded-full border border-black/15 bg-[#febc2e]
            transition hover:brightness-110 active:brightness-90"
        >
          <span className="text-[9px] leading-none text-black/70
            opacity-0 group-hover:opacity-100">−</span>
        </button>

        <button
          onClick={() => handleWindowAction("maximize")}
          aria-label={maximized ? "Restore window" : "Maximize window"}
          title={maximized ? "Restore" : "Maximize"}
          className="group flex h-3 w-3 items-center justify-center
            rounded-full border border-black/15 bg-[#28c840]
            transition hover:brightness-110 active:brightness-90"
        >
          <span className="text-[8px] leading-none text-black/70
            opacity-0 group-hover:opacity-100">
            {maximized ? "↙" : "↗"}
          </span>
        </button>
      </div>

      {/* Centered title */}
      <div
        data-tauri-drag-region
        className="pointer-events-none absolute inset-0
          flex items-center justify-center"
      >
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400
            shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <span className="text-[12px] font-medium tracking-wide
            text-white/85">
            LISA
          </span>
          <span className="text-[11px] text-white/35">
            — Desktop Assistant
          </span>
        </div>
      </div>

      {/* Right-side status */}
      <div className="z-10 flex items-center gap-2">
        <span className="text-[10px] tracking-wider text-white/35">
          SYSTEM ONLINE
        </span>
      </div>
    </header>
  );
}
