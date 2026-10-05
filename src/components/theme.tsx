"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";
const Ctx = createContext<{ theme: Theme; resolved: "light" | "dark"; setTheme: (t: Theme) => void }>({
  theme: "dark",
  resolved: "dark",
  setTheme: () => {},
});

/** Apply the theme before the page paints — avoids a flash */
export const themeScript = `(function(){try{var t=localStorage.getItem('theme')||'dark';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  const apply = useCallback((t: Theme) => {
    const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    setResolved(dark ? "dark" : "light");
  }, []);

  useEffect(() => {
    let t: Theme = "dark";
    try {
      t = (localStorage.getItem("theme") as Theme) || "dark";
    } catch {}
    setThemeState(t);
    apply(t);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      let cur: Theme = "dark";
      try {
        cur = (localStorage.getItem("theme") as Theme) || "dark";
      } catch {}
      if (cur === "system") apply("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [apply]);

  const setTheme = useCallback(
    (t: Theme) => {
      try {
        localStorage.setItem("theme", t);
      } catch {}
      setThemeState(t);
      apply(t);
    },
    [apply]
  );

  return <Ctx.Provider value={{ theme, resolved, setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);

export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
      className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-surface-3 hover:text-ink-900", className)}
      aria-label={resolved === "dark" ? "Light mode" : "Dark mode"}
      title={resolved === "dark" ? "Light mode" : "Dark mode"}
    >
      {resolved === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

export function ThemeSegmented() {
  const { theme, setTheme } = useTheme();
  const opts: { v: Theme; icon: React.ReactNode; label: string }[] = [
    { v: "light", icon: <Sun className="h-3.5 w-3.5" />, label: "Light" },
    { v: "dark", icon: <Moon className="h-3.5 w-3.5" />, label: "Dark" },
    { v: "system", icon: <Monitor className="h-3.5 w-3.5" />, label: "Auto" },
  ];
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-3 p-1">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => setTheme(o.v)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors",
            theme === o.v ? "bg-surface text-ink-900 shadow-card" : "text-ink-500 hover:text-ink-800"
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
