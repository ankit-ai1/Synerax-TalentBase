/**
 * ============================================================================
 *  SYNERAX WEBSITE CONTENT — edit this file to change text on the public site.
 *  No component changes needed.
 *
 *  ⚠️ Everything marked "TODO: replace with real data" is a PLACEHOLDER.
 *  Do not publish invented numbers, reviews, logos or people as genuine.
 *  While `showSampleBadges` is true, placeholder sections show a small
 *  "Sample data" tag on the website. Set it to false only after replacing
 *  ALL placeholder metrics, testimonials, client logos and team members.
 * ============================================================================
 */

export const site = {
  name: "Synerax TalentBase",
  legalName: "Synerax", // TODO: replace with the registered company name
  tagline: "Staffing & recruitment partner",
  description:
    "Synerax helps companies hire faster with permanent, contract and executive staffing — and helps professionals find roles that move their careers forward.",
  // live domain (NEXT_PUBLIC_SITE_URL in Vercel overrides it)
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://staffing.synerax.in",

  /** Show "Sample data" tags on placeholder sections. Set to false once real data is in. */
  showSampleBadges: true,

  contact: {
    email: "hr@synerax.in",
    phone: "+91 9306917180",
    whatsapp: "+91 9306917180",
    address: ["Noida, India"],
    hours: [
      { days: "Monday – Saturday", time: "9:00 AM – 8:00 PM IST" },
      { days: "Sunday", time: "Closed" },
    ],
    responseTime: "We reply within 24 hours",
    mapEmbedUrl: "", // TODO: paste a Google Maps embed URL to show a live map
  },

  // TODO: replace "#" with real profile URLs (leave "" to hide an icon)
  social: {
    linkedin: "#",
    x: "#",
    instagram: "#",
    facebook: "#",
    youtube: "",
  },

  nav: [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services", mega: "services" },
    { href: "/industries", label: "Industries", mega: "industries" },
    { href: "/employers", label: "Employers" },
    { href: "/job-seekers", label: "Candidates" },
    { href: "/careers", label: "Careers" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],

  hero: {
    eyebrow: "Staffing & recruitment, done right",
    title: "The right people, hired smarter.",
    highlight: "hired smarter.", // serif ember phrase; its last word rolls (smarter. / faster. / better.)
    subtitle:
      "Synerax connects growing companies with pre-screened talent across tech, BFSI, healthcare and more — permanent, contract or at scale.",
    primaryCta: { label: "Hire talent", href: "/employers" },
    secondaryCta: { label: "Find a job", href: "/careers" },
    trust: [
      { icon: "BadgeCheck", label: "Pre-screened profiles" },
      { icon: "Globe", label: "Pan-India reach" },
      { icon: "ShieldCheck", label: "No fees for candidates" },
    ],
  },

  // TODO: replace with real data — these numbers are placeholders
  metrics: [
    // honest commitments, not achievement numbers (we are a new company)
    { icon: "Timer", value: 72, suffix: " hrs", label: "To first shortlist", context: "Our target time for standard roles" },
    { icon: "ShieldCheck", value: 100, suffix: "%", label: "Profiles screened", context: "Every profile is screened by a recruiter" },
    { icon: "Layers", value: 6, suffix: "+", label: "Industries we hire for", context: "From IT and BFSI to healthcare and logistics" },
    { icon: "IndianRupee", value: 0, prefix: "₹", label: "Fees for candidates", context: "Job seekers never pay us anything" },
  ],

  services: [
    {
      slug: "permanent",
      icon: "Briefcase",
      title: "Permanent staffing",
      summary: "Full-time hires who fit your role, team and culture — screened end to end.",
      description:
        "We source, screen and assess candidates against your exact brief, then manage interviews, offers and joining so you only meet people worth hiring.",
      whoFor: "Companies building long-term teams and filling critical full-time roles.",
      benefits: ["Role-specific screening & assessments", "Salary benchmarking and offer support", "Replacement guarantee period"],
      process: ["Brief & role calibration", "Sourcing & screening", "Shortlist within days", "Interviews, offer & joining"],
      pricing: "Success fee — a percentage of annual CTC, payable only when the candidate joins.",
    },
    {
      slug: "contract",
      icon: "Repeat",
      title: "Contract staffing",
      summary: "Skilled professionals on flexible terms, with payroll and compliance handled.",
      description:
        "Scale teams up or down for projects and peak demand. We manage onboarding, payroll, statutory compliance and attendance so your team stays focused.",
      whoFor: "Project-based work, seasonal peaks and teams that need to scale quickly.",
      benefits: ["Fast deployment for urgent projects", "Payroll, PF/ESI and compliance managed", "Flexible extensions and conversions"],
      process: ["Requirement & duration", "Shortlist & client interviews", "Onboarding & deployment", "Ongoing payroll & support"],
      pricing: "Monthly billing per resource — salary plus a transparent service margin.",
    },
    {
      slug: "contract-to-hire",
      icon: "Handshake",
      title: "Contract-to-hire",
      summary: "Evaluate talent on the job before making a permanent offer.",
      description:
        "Start on contract and convert when you are confident. It reduces hiring risk for you and gives candidates a clear path to a permanent role.",
      whoFor: "Teams that want to see real work before committing to a permanent hire.",
      benefits: ["Lower hiring risk", "Real on-the-job evaluation", "Pre-agreed, transparent conversion terms"],
      process: ["Define role & conversion terms", "Deploy on contract", "Performance check-ins", "Seamless permanent conversion"],
      pricing: "Monthly billing during the contract, then a pre-agreed conversion fee.",
    },
    {
      slug: "rpo",
      icon: "Layers",
      title: "Recruitment process outsourcing",
      summary: "An embedded recruiting team that runs hiring as an extension of yours.",
      description:
        "From employer branding to offer management, our RPO teams own the full hiring funnel with clear SLAs, dashboards and a dedicated account lead.",
      whoFor: "Companies with ongoing, high-volume hiring that want predictable cost and speed.",
      benefits: ["Dedicated recruiters & account lead", "SLA-driven reporting and dashboards", "Lower cost per hire at scale"],
      process: ["Discovery & workforce plan", "Team setup & tooling", "Run the hiring funnel", "Review, report, optimise"],
      pricing: "Monthly retainer plus a per-hire fee, scoped to your hiring plan.",
    },
    {
      slug: "executive",
      icon: "Crown",
      title: "Executive search",
      summary: "Confidential search for senior and leadership roles.",
      description:
        "A research-led, discreet approach to finding leaders — mapping the market, approaching passive candidates and assessing leadership fit.",
      whoFor: "CXO, VP and director-level mandates, including confidential replacements.",
      benefits: ["Confidential, research-led search", "Access to passive leadership talent", "In-depth leadership assessment"],
      process: ["Mandate & success profile", "Market mapping & outreach", "Assessment & references", "Offer & onboarding support"],
      pricing: "Retained search — staged fee across mandate, shortlist and joining.",
    },
    {
      slug: "bulk",
      icon: "Users",
      title: "Bulk & volume hiring",
      summary: "High-volume hiring drives delivered on time, at quality.",
      description:
        "For new sites, launches and seasonal peaks — walk-in drives, campus hiring and assessment centres run with consistent quality checks.",
      whoFor: "New site launches, BPO/retail ramp-ups, campus and seasonal hiring.",
      benefits: ["Hundreds of hires per drive", "Assessment centres & walk-in drives", "Consistent quality at speed"],
      process: ["Volume plan & timelines", "Multi-channel sourcing", "Assessment drives", "Offers, joining & tracking"],
      pricing: "Per-hire pricing with volume tiers, agreed before the drive starts.",
    },
  ],

  process: [
    { title: "Understand", text: "A short call to understand the role, team, budget and timelines — then we calibrate must-haves with you." },
    { title: "Source", text: "Our recruiters search our talent database, job boards and referrals to find strong, relevant matches." },
    { title: "Screen", text: "Every candidate is screened for skills, experience, notice period and salary expectations." },
    { title: "Deliver", text: "You get a curated shortlist with notes; we coordinate interviews, offers and joining." },
  ],

  industries: [
    {
      icon: "Cpu",
      title: "IT & software",
      description: "Product companies, IT services and GCCs hiring engineers across the stack.",
      roles: ["Full-stack developers", "Cloud & DevOps", "QA & automation", "Data engineers"],
      skills: ["Java", "React", "Node.js", "AWS", "Python", "SQL"],
    },
    {
      icon: "Landmark",
      title: "BFSI",
      description: "Banks, NBFCs, insurers and fintechs across sales, risk and operations.",
      roles: ["Relationship managers", "Credit & risk analysts", "Operations", "Compliance"],
      skills: ["Retail banking", "Credit appraisal", "KYC/AML", "Collections"],
    },
    {
      icon: "HeartPulse",
      title: "Healthcare",
      description: "Hospitals, diagnostics, pharma and health-tech, clinical and non-clinical.",
      roles: ["Nurses & paramedics", "Medical coders", "Pharma sales", "Lab technicians"],
      skills: ["Patient care", "ICD-10 coding", "Field sales", "Lab operations"],
    },
    {
      icon: "Factory",
      title: "Manufacturing",
      description: "Plants and engineering firms needing shop-floor and engineering talent.",
      roles: ["Plant engineers", "Quality inspectors", "Production supervisors", "Maintenance"],
      skills: ["Lean / Six Sigma", "QA/QC", "PLC", "Preventive maintenance"],
    },
    {
      icon: "ShoppingBag",
      title: "Retail & e-commerce",
      description: "Brands, marketplaces and quick-commerce from stores to warehouses.",
      roles: ["Store managers", "Category managers", "Customer support", "Warehouse staff"],
      skills: ["Merchandising", "Inventory", "CX", "Last-mile ops"],
    },
    {
      icon: "RadioTower",
      title: "Telecom",
      description: "Operators, tower companies and network vendors, field to NOC.",
      roles: ["Network engineers", "Field technicians", "RF engineers", "NOC analysts"],
      skills: ["RF planning", "4G/5G", "Fibre", "Network monitoring"],
    },
    {
      icon: "Truck",
      title: "Logistics",
      description: "3PLs, courier networks and supply-chain teams that run on time.",
      roles: ["Fleet managers", "Supply chain analysts", "Delivery associates", "Warehouse leads"],
      skills: ["WMS", "Route planning", "Inventory control", "Vendor management"],
    },
  ],

  roleMarquee: [
    "Java Developer", "Staff Nurse", "Plant Supervisor", "Relationship Manager", "DevOps Engineer", "Medical Coder",
    "Store Manager", "RF Engineer", "Supply Chain Analyst", "QA Engineer", "Data Analyst", "Credit Analyst",
    "Field Technician", "Category Manager", "React Developer", "Warehouse Lead",
  ],

  comparison: {
    columns: ["Synerax", "Typical agency"],
    rows: [
      { label: "Screened shortlist with notes on fit, CTC and notice", values: [true, false] },
      { label: "First profiles within 48–72 hours", values: [true, false] },
      { label: "Single account manager for your roles", values: [true, true] },
      { label: "Live pipeline updates at every stage", values: [true, false] },
      { label: "Replacement guarantee", values: [true, true] },
      { label: "Payroll & compliance for contract staff", values: [true, false] },
    ],
  },

  // TODO: replace with real data — these testimonials are placeholders, not real reviews (names and companies are fictional)
  testimonials: [
    { audience: "employers", name: "Ritika Malhotra", role: "Head of Talent Acquisition", company: "Nimbus Fintech", rating: 5, metric: "Hired 4 engineers in 18 days", quote: "Synerax shared a shortlist within three days and two of the first five candidates joined. The screening notes on fit, CTC and notice saved my team hours every week." },
    { audience: "employers", name: "Vikas Bansal", role: "HR Manager", company: "Tidewater Logistics", rating: 5, metric: "120 hires for a new site in 5 weeks", quote: "They ran our bulk hiring drive for a new warehouse end to end — on time, with very few early drop-offs and daily updates." },
    { audience: "employers", name: "Ananya Rao", role: "Engineering Manager", company: "Stackline SaaS", rating: 5, metric: "3 contract-to-hire conversions", quote: "Contract-to-hire let us evaluate engineers on real work before converting. Paperwork and payroll were completely hands-off for us." },
    { audience: "employers", name: "Dr. Sameer Kulkarni", role: "Founder", company: "Lumen Health", rating: 5, metric: "Closed a niche role in 11 days", quote: "Honest advice on salary benchmarks helped us close a hard-to-fill role without overpaying. It felt like an extension of our own team." },
    { audience: "candidates", name: "Karthik Iyer", role: "Senior Software Engineer", company: "Placed via Synerax", rating: 5, metric: "38% salary hike", quote: "I always knew where my application stood. My recruiter prepared me for every round and negotiated a much better offer than I expected." },
    { audience: "candidates", name: "Neha Sharma", role: "Relationship Manager", company: "Placed via Synerax", rating: 5, metric: "Offer in 9 days", quote: "The interview prep and constant updates made a stressful job switch feel easy. No spam calls — only roles that actually fit me." },
    { audience: "candidates", name: "Mohammed Arif", role: "ICU Staff Nurse", company: "Placed via Synerax", rating: 5, metric: "Relocated to Bengaluru", quote: "They found me a hospital role close to family and helped with every document. I never paid a single rupee." },
    { audience: "candidates", name: "Pooja Desai", role: "Data Analyst", company: "Placed via Synerax", rating: 5, metric: "First job after a career break", quote: "After a two-year break I was nervous. Synerax was honest about what employers wanted and got me back in, fully remote." },
  ],

  // TODO: replace with real client names/logos (with permission). These are neutral placeholders.
  // Fictional company wordmarks (illustrative only — not real clients)
  clientLogos: [
    { name: "Nimbuspay", mark: "circle", color: "#857358", hires: 48 },
    { name: "Orbitly", mark: "ring", color: "#713600", hires: 31 },
    { name: "kitecart", mark: "kite", color: "#C05800", hires: 66 },
    { name: "LUMEN", mark: "spark", color: "#713600", hires: 22 },
    { name: "Stackline", mark: "stack", color: "#9A5A1E", hires: 39 },
    { name: "Bluefin", mark: "wave", color: "#857358", hires: 27 },
    { name: "NORTHSTAR", mark: "star", color: "#CE7D38", hires: 54 },
    { name: "Tidewater", mark: "drop", color: "#2F7D4A", hires: 73 },
  ],

  faq: {
    employers: [
      { q: "How quickly can you share candidates?", a: "For most roles we share a first shortlist within 2–5 working days, depending on seniority and how niche the skills are." },
      { q: "What does it cost to hire through Synerax?", a: "Permanent hiring is usually a percentage of the annual CTC, payable only when a candidate joins. Contract staffing is billed monthly. We share exact terms after understanding your requirement." },
      { q: "Do you offer a replacement guarantee?", a: "Yes. Permanent placements include a replacement period agreed in your contract. If a candidate leaves within that period, we find a replacement at no extra fee." },
      { q: "Which locations do you hire for?", a: "We hire across India for onsite, hybrid and remote roles, with strong networks in major metros and growing tier-2 cities." },
    ],
    candidates: [
      { q: "I'm a job seeker — do I pay anything?", a: "No. Synerax never charges candidates. Be cautious of anyone asking for money in our name." },
      { q: "How do you keep my data safe?", a: "Your information is stored securely, accessed only by our recruiting team, and shared with employers only for roles you have agreed to." },
      { q: "Will you share my profile without asking?", a: "Never. A recruiter always discusses the role with you and gets your consent before your profile goes to an employer." },
      { q: "How long until I hear back?", a: "If your profile matches an open role, a recruiter usually calls within a few working days. We also keep your profile for future openings." },
    ],
  },

  servicesFaq: [
    { q: "Can we combine engagement models?", a: "Yes. Many clients use permanent hiring for core roles and contract staffing for projects. We'll recommend a mix after understanding your plan." },
    { q: "Who handles payroll for contract staff?", a: "Synerax does — including salary, statutory compliance (PF/ESI), attendance and exits — so you get one monthly invoice." },
    { q: "Is there a minimum number of hires?", a: "No minimum for permanent or contract hiring. RPO and bulk hiring are scoped around a hiring plan." },
  ],

  about: {
    statement: "We help great companies and great people find each other.",
    story: [
      "Synerax was founded to fix what frustrates both sides of hiring: slow shortlists, poorly matched profiles and candidates left without updates.",
      "We combine experienced recruiters with a structured process and our own talent platform, so every shortlist is fast, relevant and transparent.",
    ],
    mission: "Help every company we work with build great teams — and help every candidate we meet take the next right step in their career.",
    vision: "To be India's most trusted staffing partner, known for speed, quality and honesty.",
    values: [
      { icon: "ShieldCheck", title: "Integrity", text: "Honest advice to clients and candidates, even when it's not what they want to hear." },
      { icon: "Zap", title: "Speed with quality", text: "Fast shortlists that never compromise on fit." },
      { icon: "Heart", title: "Candidate respect", text: "Clear communication and timely feedback at every stage." },
      { icon: "Target", title: "Ownership", text: "We treat every mandate as if we were hiring for our own team." },
    ],
    culture: ["Integrity", "Ownership", "Speed", "Empathy", "Transparency", "Craft", "Curiosity", "Respect"],
    // TODO: replace with real milestones
    timeline: [
      { year: "Year 1", title: "Founded", text: "Started with a small recruiting team focused on tech hiring." },
      { year: "Year 2", title: "Expanded sectors", text: "Added BFSI, healthcare and manufacturing practices." },
      { year: "Year 3", title: "Contract staffing", text: "Launched contract staffing with in-house payroll and compliance." },
      { year: "Today", title: "Talent platform", text: "Running hiring on our own platform for faster, transparent shortlists." },
    ],
    // TODO: replace with real leadership team (names, roles, bios, LinkedIn URLs)
    team: [
      { name: "Aarav Mehta", role: "Founder & CEO", bio: "Leads strategy and key client partnerships.", linkedin: "#" },
      { name: "Priya Nair", role: "Head of Delivery", bio: "Runs recruiting operations and quality.", linkedin: "#" },
      { name: "Rohan Gupta", role: "Head of Contract Staffing", bio: "Owns payroll, compliance and deployments.", linkedin: "#" },
      { name: "Sneha Iyer", role: "Head of Talent Experience", bio: "Makes sure every candidate is heard.", linkedin: "#" },
    ],
  },

  employers: {
    reasons: [
      { icon: "Gauge", title: "Speed", text: "Shortlists in days, not weeks, from a ready talent pool." },
      { icon: "BadgeCheck", title: "Pre-screened talent", text: "Skills, notice period and expectations verified before you see a profile." },
      { icon: "LineChart", title: "Transparent reporting", text: "Clear pipeline updates and hiring metrics at every stage." },
      { icon: "ShieldCheck", title: "Compliance handled", text: "Contracts, payroll and statutory compliance managed for contract staff." },
      { icon: "UsersRound", title: "One point of contact", text: "A dedicated account manager who knows your roles and culture." },
    ],
    // TODO: replace with your real SLA commitments
    sla: [
      { icon: "Timer", value: 48, suffix: " hrs", label: "To first profiles", context: "Standard roles" },
      { icon: "ListChecks", value: 5, suffix: " days", label: "To a full shortlist", context: "Most mandates" },
      { icon: "MessageSquare", value: 24, suffix: " hrs", label: "Feedback turnaround", context: "After each interview" },
      { icon: "ShieldCheck", value: 90, suffix: " days", label: "Replacement guarantee", context: "Permanent placements" },
    ],
    hiringSteps: [
      { title: "Share your requirement", text: "Tell us the role, skills, budget and timelines using the form or a quick call." },
      { title: "Role calibration", text: "We align on must-haves, nice-to-haves and the interview process." },
      { title: "Curated shortlist", text: "You receive screened profiles with notes on fit, CTC and notice period." },
      { title: "Interviews & offer", text: "We schedule rounds, collect feedback and support offer negotiation." },
      { title: "Joining & follow-up", text: "We stay in touch until the candidate joins and settles in." },
    ],
    models: {
      columns: ["Permanent", "Contract", "Contract-to-hire", "RPO"],
      recommended: 0, // index of the highlighted column
      rows: [
        { label: "Best for", values: ["Long-term roles", "Projects & peaks", "Low-risk evaluation", "Ongoing high volume"] },
        { label: "Commercials", values: ["% of annual CTC", "Monthly billing", "Monthly, then conversion fee", "Monthly retainer + per hire"] },
        { label: "Payroll & compliance", values: ["Your company", "Synerax", "Synerax, then your company", "Your company"] },
        { label: "Replacement guarantee", values: ["Yes", "Replacement on request", "Yes", "Per SLA"] },
        { label: "Typical time to hire", values: ["2–4 weeks", "1–2 weeks", "1–2 weeks", "Per hiring plan"] },
      ],
    },
  },

  careers: {
    heroRoles: ["Java Developer", "Staff Nurse", "Relationship Manager", "Data Analyst", "Plant Supervisor", "QA Engineer"],
    help: [
      { icon: "Compass", title: "Career guidance", text: "Honest advice on roles, salary expectations and next steps." },
      { icon: "FileCheck2", title: "Profile review", text: "Tips to present your experience clearly to employers." },
      { icon: "CalendarCheck", title: "Interview prep", text: "Briefings on the company, role and interview rounds." },
      { icon: "Handshake", title: "Offer support", text: "Help with negotiation, notice period and joining." },
    ],
    steps: [
      { title: "Submit your profile", text: "Share your details and resume using the form below." },
      { title: "Recruiter call", text: "A recruiter calls to understand your experience and goals." },
      { title: "Matched roles", text: "We share roles that fit — only with your consent." },
      { title: "Interviews to joining", text: "We prepare you for each round and support you through the offer." },
    ],
    // TODO: replace with live openings (see TODO in src/app/(site)/careers/page.tsx)
    openings: [
      { title: "Full-stack Developer (React, Node.js)", city: "Bengaluru", mode: "Hybrid", experience: "3–6 yrs", type: "Full-time" },
      { title: "Relationship Manager – Retail Banking", city: "Mumbai", mode: "Onsite", experience: "2–5 yrs", type: "Full-time" },
      { title: "QA Automation Engineer", city: "Pune", mode: "Hybrid", experience: "2–4 yrs", type: "Contract" },
      { title: "Warehouse Supervisor", city: "Gurugram", mode: "Onsite", experience: "3–7 yrs", type: "Full-time" },
      { title: "Staff Nurse – ICU", city: "Bengaluru", mode: "Onsite", experience: "1–4 yrs", type: "Full-time" },
      { title: "Data Analyst (SQL, Power BI)", city: "Pune", mode: "Remote", experience: "2–5 yrs", type: "Contract" },
    ],
  },

  candidates: {
    hero: {
      eyebrow: "For candidates",
      title: "A recruiter in your corner — always free",
      highlight: "always free",
      subtitle: "Create one profile and get matched to roles that fit your skills, salary and location. Track every application in your own portal, with a real recruiter guiding you.",
    },
    stats: [
      { icon: "IndianRupee", value: 0, prefix: "₹", label: "Fees, ever", context: "Synerax never charges candidates" },
      { icon: "Layers", value: 7, label: "Industries", context: "From tech to healthcare" },
      { icon: "Timer", value: 48, suffix: " hrs", label: "To hear back", context: "When your profile matches a role" },
      { icon: "Bell", value: 6, label: "Stages tracked", context: "Applied to joined, in your portal" },
    ],
    perks: [
      { icon: "Sparkles", title: "Matched, not spammed", text: "We only reach out with roles that fit your skills, salary and location." },
      { icon: "LineChart", title: "Track every step", text: "See exactly where each application stands — from applied to joined." },
      { icon: "CalendarCheck", title: "Interview prep", text: "Company briefings, likely questions and honest feedback after each round." },
      { icon: "Handshake", title: "Offer support", text: "Salary negotiation, notice period and joining — handled with you." },
      { icon: "ShieldCheck", title: "Your data, your consent", text: "Your profile goes to an employer only after you say yes." },
      { icon: "Bell", title: "Smart job alerts", text: "At most one email a day with new roles that match your profile." },
    ],
  },

  footer: {
    statement: "Hiring is a people business. We keep it that way.",
    newsletter: "Hiring insights and salary trends, once a month. No spam.",
  },
} as const;

export type SiteContent = typeof site;
