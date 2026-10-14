export const LOADER_KEY = "synerax-intro-seen";
export const PROMO_KEY = "synerax-promo-seen-at";
export const LOADER_MS = 3300;
export const WORDS = ["Pre-screened talent", "Faster shortlists", "Real recruiters", "Hiring, simplified"];

export const read = (k: string, store: "session" | "local") => {
  try {
    return (store === "session" ? sessionStorage : localStorage).getItem(k);
  } catch {
    return null;
  }
};
export const write = (k: string, v: string, store: "session" | "local") => {
  try {
    (store === "session" ? sessionStorage : localStorage).setItem(k, v);
  } catch {}
};
