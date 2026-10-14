/** Where the assistant button and window sit (shared by the light button and the full chat) */
export const PLACE = {
  // portals: above the phone tab bar
  portal: { button: "bottom-[84px] md:bottom-6", panel: "bottom-[152px] md:bottom-[92px] h-[min(640px,calc(100dvh-170px))]" },
  // public site: above the back-to-top button
  site: { button: "bottom-[76px]", panel: "bottom-[144px] h-[min(640px,calc(100dvh-160px))]" },
  // staff app
  staff: { button: "bottom-5", panel: "bottom-[84px] h-[min(640px,calc(100dvh-110px))]" },
};
