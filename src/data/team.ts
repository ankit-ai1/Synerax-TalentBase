/**
 * Leadership team shown on the About page (in this order).
 *
 * Photos: put the file in /public/team/ and set `photo`, e.g. photo: "/team/shubham-singh.jpg".
 * Without a photo, an initials avatar is shown.
 * LinkedIn: set `linkedin` to the full profile URL; the icon is hidden when it is missing.
 */
export type TeamMember = {
  name: string;
  role: string;
  /** path under /public, e.g. "/team/shubham-singh.jpg" */
  photo?: string;
  linkedin?: string;
};

export const team: TeamMember[] = [
  { name: "Shubham Singh", role: "CEO & Founder" },
  { name: "Amit Saxena", role: "CEO & Founder" },
  { name: "Sonali Srivastava", role: "Director, HR Operations" },
  { name: "Ankit Raj", role: "Director of Technology" },
  { name: "Kushal Singh", role: "HR Lead" },
  { name: "Ajay Yadav", role: "HR, Sourcing" },
];
