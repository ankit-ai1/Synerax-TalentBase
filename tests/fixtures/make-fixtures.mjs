/**
 * Generates the sample resumes used by tests/resume-parser.test.ts (all people and companies are fictional).
 *   node tests/fixtures/make-fixtures.mjs
 * PDFs are printed with headless Chrome (playwright-core), DOCX files are built with the `docx` package.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle } from "docx";

const dir = path.dirname(fileURLToPath(import.meta.url));

const css = `body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#111;margin:36px}h1{font-size:22pt;margin:0}h2{font-size:12pt;text-transform:uppercase;border-bottom:1px solid #999;margin:18px 0 6px}p{margin:3px 0}ul{margin:4px 0 4px 18px;padding:0}.muted{color:#444}`;

const PDFS = {
  "aarav-sharma-single.pdf": `
<h1>Aarav Sharma</h1>
<p class="muted">Senior Java Developer · Bengaluru, Karnataka</p>
<p>aarav.sharma.dev@gmail.com | +91 98765 43210 | linkedin.com/in/aarav-sharma-java</p>
<h2>Professional Summary</h2>
<p>Backend engineer with 7+ years of experience building payment and lending platforms on Java and AWS.</p>
<h2>Technical Skills</h2>
<p>Java, Spring Boot, Microservices, Hibernate, MySQL, Kafka, Docker, Kubernetes, AWS, Git, Jenkins</p>
<h2>Work Experience</h2>
<p><b>Senior Software Engineer</b> | Infosys Limited | Aug 2021 – Present</p>
<ul><li>Lead a team of 5 engineers on a lending microservices platform.</li><li>Cut API latency by 40% with Redis caching.</li></ul>
<p><b>Software Engineer</b> | Tata Consultancy Services | Jul 2018 – Jul 2021</p>
<ul><li>Built REST APIs for a retail banking client.</li></ul>
<h2>Education</h2>
<p>B.Tech, Computer Science — RV College of Engineering, Bengaluru, 2018</p>
<h2>Personal Details</h2>
<p>Notice period: 60 days</p>
<p>Current CTC: 18 LPA · Expected CTC: 24 LPA</p>`,

  "priya-nair-two-column.pdf": `
<div style="display:flex;gap:28px">
<div style="width:32%;background:#f2f2f2;padding:14px">
<h1 style="font-size:18pt">Priya Nair</h1>
<p>Pune, Maharashtra</p>
<p>priya.nair.fe@outlook.com</p>
<p>09123456780</p>
<p>github.com/priyanair-dev</p>
<h2>Skills</h2>
<p>React.js</p><p>TypeScript</p><p>Redux</p><p>NodeJS</p><p>HTML5 / CSS3</p><p>Figma</p><p>Jest</p>
<h2>Education</h2>
<p>B.E. Information Technology</p><p>Pune Institute of Computer Technology</p><p>2013 – 2017</p>
</div>
<div style="width:68%">
<h2>Profile</h2>
<p>Frontend engineer who loves fast, accessible interfaces for SaaS dashboards.</p>
<h2>Experience</h2>
<p><b>Senior Frontend Developer</b></p>
<p>Persistent Systems Ltd · Jun 2019 – Present</p>
<ul><li>Own the design system used by 14 product teams.</li></ul>
<p><b>Software Engineer</b></p>
<p>Tech Mahindra Limited · Jul 2017 – May 2019</p>
<ul><li>Built Angular and React modules for a telecom CRM.</li></ul>
<h2>Projects</h2>
<p>Realtime analytics dashboard — React, WebSockets</p>
</div></div>`,

  "sneha-kulkarni-nurse.pdf": `
<h1>SNEHA KULKARNI</h1>
<p>Staff Nurse (ICU)</p>
<p>Phone: 98450-12345 · Email: sneha.kulkarni.rn@yahoo.co.in</p>
<p>Address: 14, 3rd Cross, Jayanagar, Bengaluru – 560041</p>
<h2>Career Objective</h2>
<p>Registered nurse with 5 years of experience in critical care, seeking a senior nursing role.</p>
<h2>Key Skills</h2>
<ul><li>Patient Care</li><li>ICU / Critical Care</li><li>Ventilator management</li><li>Infection control</li></ul>
<h2>Employment History</h2>
<p>Staff Nurse – ICU, Manipal Hospitals, Bengaluru (March 2021 – Present)</p>
<p>Staff Nurse, Narayana Health City (June 2019 – February 2021)</p>
<h2>Educational Qualification</h2>
<p>B.Sc Nursing, Rajiv Gandhi University of Health Sciences, 2019</p>
<p>12th (PCB), Karnataka PU Board, 2015</p>
<h2>Personal Information</h2>
<p>Date of Birth: 12/04/1997</p>
<p>Notice period: 30 days</p>`,

  "ananya-iyer-senior.pdf": `
<h1>Ananya Iyer</h1>
<p>Director of Engineering · Chennai</p>
<p>ananya.iyer@protonmail.com · +91-90030 11223 · www.ananyaiyer.dev · linkedin.com/in/ananyaiyer</p>
<h2>Executive Summary</h2>
<p>Engineering leader with 15+ years of experience scaling platform teams from 10 to 120 engineers across fintech and e-commerce.</p>
<h2>Core Competencies</h2>
<p>Engineering Leadership | Python | AWS | Microservices | Kubernetes | Kafka | System Design | Team Management</p>
<h2>Professional Experience</h2>
<p><b>Director of Engineering</b>, Zentrix Software Pvt Ltd — 2019 – Present</p>
<ul><li>Run 9 teams (120 engineers) across payments, risk and data.</li><li>Moved 300 services to Kubernetes with zero-downtime releases.</li></ul>
<p><b>Engineering Manager</b>, Orbit Retail Technologies — 2014 – 2019</p>
<ul><li>Built the order management platform handling 2M orders/day.</li></ul>
<p><b>Senior Software Engineer</b>, Cognizant Technology Solutions — 2010 – 2014</p>
<p><b>Software Engineer</b>, Wipro Limited — 2009 – 2010</p>
<div style="page-break-before:always"></div>
<h2>Education</h2>
<p>M.Tech, Computer Science — National Institute of Technology, Tiruchirappalli, 2009</p>
<p>B.E., Electronics — Anna University, 2007</p>
<h2>Certifications</h2>
<p>AWS Certified Solutions Architect – Professional</p>
<h2>Additional Information</h2>
<p>Serving notice period of 90 days, LWD: 30 Nov 2026</p>
<p>Expected CTC: 85 LPA</p>`,
};

// ---------------------------------------------------------------- DOCX
const P = (text, opts = {}) => new Paragraph({ children: [new TextRun({ text, bold: opts.bold, size: opts.size })], heading: opts.heading, alignment: opts.align });
const H = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_2 });
const doc = (children) => new Document({ sections: [{ children }] });

const DOCX = {
  "rahul-verma-fresher.docx": doc([
    P("Rahul Verma", { bold: true, size: 40 }),
    P("Lucknow, Uttar Pradesh | rahulverma2003@gmail.com | 7007123456"),
    H("Objective"),
    P("Fresher with a BCA degree looking for an entry-level data analyst or developer role."),
    H("Education"),
    P("BCA — Amity University, Lucknow — 2025 — 8.1 CGPA"),
    P("12th — City Montessori School, Lucknow — 2022"),
    P("10th — City Montessori School, Lucknow — 2020"),
    H("Skills"),
    P("Python, SQL, MS Excel, HTML, CSS, Power BI, Communication"),
    H("Internship"),
    P("Data Analyst Intern — Brightpath Technologies Pvt Ltd — Jan 2025 - Mar 2025"),
    P("• Cleaned and visualised sales data for 40 stores."),
    H("Projects"),
    P("Student attendance tracker using Python and MySQL"),
    H("Declaration"),
    P("I hereby declare that the information given above is true."),
  ]),
  "vikram-singh-accountant.docx": doc([
    P("CURRICULUM VITAE", { bold: true, align: AlignmentType.CENTER }),
    P("Vikram Singh", { bold: true, size: 36 }),
    P("Mobile: +91-9988776655"),
    P("Email: vikram.singh.accounts@rediffmail.com"),
    P("Location: Gurgaon, Haryana"),
    H("Profile Summary"),
    P("Total Experience: 8 years 6 months in accounting, GST compliance and statutory audits."),
    H("Key Skills"),
    P("Tally ERP 9, GST Filing, TDS, Advanced Excel, Accounts Payable, Financial Reporting, SAP FICO"),
    H("Work Experience"),
    P("Senior Accountant"),
    P("Kairo Logistics Pvt. Ltd., Gurgaon | 04/2020 - Present"),
    P("Accountant"),
    P("Finedge Capital Services | 06/2016 - 03/2020"),
    P("Accounts Executive"),
    P("Greenline Energy Ltd | 01/2016 - 05/2016"),
    H("Education"),
    P("M.Com — Delhi University, 2015"),
    P("B.Com — Shri Ram College of Commerce, 2013"),
    H("Other Details"),
    P("Current CTC: 9.5 LPA"),
    P("Expected CTC: 12 LPA"),
    P("Notice Period: Immediate joiner"),
    P("DOB: 5th March 1991"),
  ]),
  "mohammed-arif-logistics.docx": doc([
    P("Mohammed Arif", { bold: true, size: 36 }),
    P("Warehouse Supervisor"),
    P("Hyderabad | 9849012345 | arif.warehouse@gmail.com"),
    H("Summary"),
    P("Warehouse operations professional with 10 years of experience in inventory control, dispatch and team supervision."),
    H("Skills"),
    P("Inventory Management • Warehouse Management • Supply Chain • MS Excel • SAP MM • Team Leadership"),
    H("Experience"),
    P("Warehouse Supervisor at Swiftcart Logistics Pvt Ltd (2019 – Present)"),
    P("Store Executive at Zentra Retail Ltd (2014 – 2019)"),
    P("Store Assistant at Kairo Logistics (2016 – 2017)"),
    H("Education"),
    P("Diploma in Mechanical Engineering — Govt Polytechnic, Hyderabad — 2014"),
    P("SSC — Board of Secondary Education, Telangana — 2011"),
    H("Personal Details"),
    P("Notice period: 15 days"),
  ]),
  "kavya-reddy-table.docx": new Document({
    sections: [
      {
        children: [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    children: [P("Kavya Reddy", { bold: true, size: 36 }), P("Data Analyst"), P("Noida, Uttar Pradesh"), P("kavya.reddy.data@gmail.com"), P("+91 8800 123 456"), H("Technical Skills"), P("Power BI"), P("SQL"), P("Python (Pandas)"), P("Tableau"), P("Advanced Excel")],
                  }),
                  new TableCell({
                    width: { size: 65, type: WidthType.PERCENTAGE },
                    children: [
                      H("Professional Experience"),
                      P("Data Analyst | EXL Services | 07/2023 - Present"),
                      P("Built churn dashboards used by the retention team."),
                      P("Junior Analyst | Genpact India Pvt Ltd | 03/2020 - 06/2023"),
                      P("Automated weekly MIS reports with SQL and Python."),
                      H("Education"),
                      P("M.Sc Statistics — University of Hyderabad — 2019"),
                      P("B.Sc Mathematics — Osmania University — 2017"),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  }),
};

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
for (const [name, body] of Object.entries(PDFS)) {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`);
  await page.pdf({ path: path.join(dir, name), format: "A4", printBackground: true });
}
await browser.close();
for (const [name, d] of Object.entries(DOCX)) fs.writeFileSync(path.join(dir, name), await Packer.toBuffer(d));
console.log("fixtures written:", [...Object.keys(PDFS), ...Object.keys(DOCX)].join(", "));
