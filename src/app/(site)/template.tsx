/** Re-mounts on every navigation inside the public site: smooth fade/slide in (CSS, always ends visible) */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
