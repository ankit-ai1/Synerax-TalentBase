// npm run test:unit — job-description parser
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractSalary, parseJd } from "../src/lib/jd/rules";

const JD = `Senior Java Developer
Location: Bengaluru / Pune
Work mode: Hybrid (3 days in office)
Experience: 5 - 8 years
Employment type: Full-time, Permanent
CTC: 18 - 28 LPA
No. of openings: 3

About the role
We are hiring a Senior Java Developer to build payment services for a large fintech client.

Key Responsibilities:
• Design and build microservices in Java and Spring Boot
• Own services end to end, from design to production
• Mentor junior engineers and review code

Requirements:
- 5+ years of experience with Java, Spring Boot and REST APIs
- Hands-on with Kafka, PostgreSQL and AWS
- Experience with Docker and Kubernetes is a plus

Benefits
- Health insurance
`;

test("JD: title, locations, mode, experience, type, salary, openings", () => {
  const f = parseJd(JD, [{ name: "Java" }, { name: "Spring Boot" }, { name: "Kafka" }, { name: "PostgreSQL" }, { name: "AWS" }, { name: "Docker" }, { name: "Kubernetes" }, { name: "REST API", aliases: ["REST APIs", "REST"] }]);
  assert.equal(f.title?.value, "Senior Java Developer");
  assert.deepEqual(f.locations?.value, ["Bangalore", "Pune"]);
  assert.equal(f.work_mode?.value, "Hybrid");
  assert.equal(f.exp_min?.value, 5);
  assert.equal(f.exp_max?.value, 8);
  assert.equal(f.employment_type?.value, "Full-time");
  assert.deepEqual(f.salary?.value, { min: 18, max: 28, currency: "INR", period: "annual" });
  assert.equal(f.openings?.value, 3);
  assert.deepEqual(f.responsibilities?.value, ["Design and build microservices in Java and Spring Boot", "Own services end to end, from design to production", "Mentor junior engineers and review code"]);
  assert.equal(f.requirements?.value.length, 3);
  for (const s of ["Java", "Spring Boot", "Kafka", "PostgreSQL", "AWS", "Docker", "Kubernetes"]) assert.ok(f.skills?.value.includes(s), s);
  assert.ok(f.description?.value.includes("payment services"));
});

test("JD: remote, freshers, Gulf salary per month, title from a label", () => {
  const f = parseJd(`Job Title: Accountant
Location: Dubai
Fully remote is not possible — work from office
Freshers can apply
Salary: AED 8,000 - 10,000 per month
Job type: Contract`);
  assert.equal(f.title?.value, "Accountant");
  assert.deepEqual(f.locations?.value, ["Dubai"]);
  assert.equal(f.work_mode?.value, "Onsite");
  assert.equal(f.exp_min?.value, 0);
  assert.equal(f.employment_type?.value, "Contract");
  assert.deepEqual(f.salary?.value, { min: 8000, max: 10000, currency: "AED", period: "monthly" });
});

test("salary variants", () => {
  assert.deepEqual(extractSalary("Salary: up to 25 LPA")?.value, { min: null, max: 25, currency: "INR", period: "annual" });
  assert.deepEqual(extractSalary("Compensation: $90k - $110k per year")?.value, { min: 90000, max: 110000, currency: "USD", period: "annual" });
  assert.deepEqual(extractSalary("CTC: ₹12,00,000 - ₹18,00,000 per annum")?.value, { min: 12, max: 18, currency: "INR", period: "annual" });
  assert.equal(extractSalary("Salary: Best in industry"), undefined);
});
