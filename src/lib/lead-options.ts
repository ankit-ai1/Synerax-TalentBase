/** Plain constants shared by the website forms (client) and lead validation (server) */
export const LEAD_TYPES = ["contact", "employer", "candidate"] as const;
export const LEAD_STATUSES = ["New", "Contacted", "Closed"] as const;
export const ENQUIRY_TYPES = ["Hiring", "Job seeker", "Partnership", "Other"] as const;
export const HIRING_TYPES = ["Permanent", "Contract", "Contract-to-hire", "RPO", "Executive search", "Bulk hiring"] as const;
