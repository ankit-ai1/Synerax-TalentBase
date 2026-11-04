/** Intro copy for /blog/category/<slug> — gives each hub page a real answer above the article list (not just a count) */
export const CATEGORY_INTROS: Record<string, string> = {
  "career-advice":
    "Practical career advice from recruiters who screen thousands of profiles every year. Learn how to write a resume that gets shortlisted, prepare for HR and technical interviews, answer notice-period and CTC questions honestly, negotiate a fair offer and decide when it is the right time to switch jobs. Every guide is written for professionals in India — freshers and experienced hires alike — and focuses on what employers actually check, not generic tips.",
  "city-guides":
    "City-by-city guides to finding work in India's biggest job markets — Bangalore, Pune, Hyderabad, Chennai, Mumbai, Delhi NCR, Noida and Gurugram. Each guide covers which industries hire most in that city, typical salary ranges by experience, the tech parks and business districts where companies cluster, commute and cost-of-living trade-offs, and how to time your search. Use them alongside our live city job pages to see which employers are hiring right now.",
  "for-employers":
    "Hiring guides for HR leaders, founders and hiring managers. Read how to write job descriptions that attract the right candidates, reduce time-to-hire, choose between permanent staffing, contract staffing, contract-to-hire and RPO, budget for recruitment fees, and cut offer dropouts. The advice comes from Synerax recruiters running live mandates across IT, BFSI, healthcare, manufacturing and retail, so it reflects how the Indian hiring market works today.",
  "job-search":
    "Step-by-step help for every stage of a job search: building a target list of companies, using job portals and LinkedIn well, getting referrals, spotting fake job offers and recruitment scams, following up after an application and tracking where you stand. These articles are written by recruiters for candidates in India and focus on actions you can take this week to get more interview calls — and on how to apply free through Synerax.",
  "remote-hybrid":
    "Everything about remote and hybrid work in India: which roles and industries offer work-from-home, how hybrid office-day policies usually work, how to prove you are productive remotely, what to ask about equipment, internet and allowances, and how salaries compare with fully onsite roles. Read the guides, then browse our live remote and hybrid job pages to apply to openings that match the way you want to work.",
  "tech-careers":
    "Career guides for software, cloud, data, QA and Salesforce professionals. Find out which skills employers are hiring for, how pay moves with experience, which certifications are worth the effort, how to prepare for coding and system-design rounds, and how to move from services companies into product firms or global capability centres. Written by tech recruiters who fill developer, DevOps, testing and CRM roles for clients across India every week.",
  "working-abroad":
    "Guides for Indian professionals looking at jobs abroad — especially the UAE, the Gulf and the United States. Learn how overseas hiring works, which documents and attestations you need, how employment visas and work permits are processed, what a realistic salary and cost of living look like, and how to tell a genuine overseas offer from a scam. Always confirm visa and labour rules with the official government sources before you travel.",
};

export const categoryIntro = (slug: string, name: string) =>
  CATEGORY_INTROS[slug] ?? `Articles from the Synerax team about ${name.toLowerCase()} — practical, recruiter-written guidance for job seekers and employers in India.`;
