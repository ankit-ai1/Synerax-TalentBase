import Script from "next/script";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
// GA4 measurement IDs are public (they ship in every page), so the live one is the default
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-C4PE3LJRN7";

/**
 * Google Tag Manager (when an ID is set — GA4 is then configured inside the container) or the GA4 gtag, public site only.
 * The gtag is a plain async <script> (React hoists it into <head>), so it is in the server HTML where Tag Assistant
 * and site audits look for it, and it never blocks rendering.
 */
export function Analytics() {
  if (GTM_ID)
    return (
      <Script id="gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
    );
  if (!GA_ID) return null;
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
      <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');` }} />
    </>
  );
}
