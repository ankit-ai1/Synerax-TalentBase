/**
 * Money: ISO 4217 currencies, salary formatting and parsing (pure — unit-tested in tests/money.test.ts).
 *
 * A salary is { amount, currency, period }. Units: INR + annual = lakhs ("12.5" = ₹12.5 LPA, as the app always
 * stored it); any other combination = plain units ("30550" AED / month). The database also keeps an INR-annual
 * equivalent in LPA (current_ctc, expected_ctc, ctc_min/max, offered_ctc) for search, filters and matching.
 */

export type Period = "annual" | "monthly";
export type Money = { amount: number | null; currency: string; period: Period };
export type Currency = { code: string; name: string; symbol: string; countries: string[]; aliases?: string };

// [code, name, symbol, countries (ISO 3166-1 alpha-2, first = flag), extra search words]
const RAW: [string, string, string, string, string?][] = [
  ["INR", "Indian Rupee", "₹", "IN BT", "rupee rupees india"],
  ["AED", "UAE Dirham", "AED", "AE", "dirham dirhams uae emirates dubai abu dhabi"],
  ["USD", "US Dollar", "$", "US EC SV PA PR GU AS VG TC MH FM PW TL ZW BQ IO UM VI", "dollar dollars usa america"],
  ["SAR", "Saudi Riyal", "SAR", "SA", "riyal riyals saudi ksa riyadh jeddah"],
  ["QAR", "Qatari Riyal", "QAR", "QA", "riyal qatar doha"],
  ["OMR", "Omani Rial", "OMR", "OM", "rial oman muscat"],
  ["KWD", "Kuwaiti Dinar", "KWD", "KW", "dinar kuwait"],
  ["BHD", "Bahraini Dinar", "BHD", "BH", "dinar bahrain manama"],
  ["SGD", "Singapore Dollar", "S$", "SG", "singapore dollar"],
  ["GBP", "British Pound", "£", "GB IM JE GG", "pound sterling uk britain england"],
  ["EUR", "Euro", "€", "EU DE FR IT ES NL BE AT IE PT FI GR LU SK SI EE LV LT MT CY HR AD MC SM VA ME XK", "euro europe"],
  ["CAD", "Canadian Dollar", "C$", "CA", "canada dollar"],
  ["AUD", "Australian Dollar", "A$", "AU KI NR TV CX CC NF", "australia dollar"],
  ["AFN", "Afghan Afghani", "AFN", "AF"],
  ["ALL", "Albanian Lek", "ALL", "AL"],
  ["AMD", "Armenian Dram", "AMD", "AM"],
  ["ANG", "Netherlands Antillean Guilder", "ANG", "CW SX"],
  ["AOA", "Angolan Kwanza", "AOA", "AO"],
  ["ARS", "Argentine Peso", "ARS", "AR"],
  ["AWG", "Aruban Florin", "AWG", "AW"],
  ["AZN", "Azerbaijani Manat", "AZN", "AZ"],
  ["BAM", "Bosnia-Herzegovina Convertible Mark", "BAM", "BA"],
  ["BBD", "Barbadian Dollar", "BBD", "BB"],
  ["BDT", "Bangladeshi Taka", "৳", "BD", "taka bangladesh"],
  ["BGN", "Bulgarian Lev", "BGN", "BG"],
  ["BIF", "Burundian Franc", "BIF", "BI"],
  ["BMD", "Bermudian Dollar", "BMD", "BM"],
  ["BND", "Brunei Dollar", "BND", "BN"],
  ["BOB", "Bolivian Boliviano", "BOB", "BO"],
  ["BRL", "Brazilian Real", "R$", "BR", "real brazil"],
  ["BSD", "Bahamian Dollar", "BSD", "BS"],
  ["BWP", "Botswana Pula", "BWP", "BW"],
  ["BYN", "Belarusian Ruble", "BYN", "BY"],
  ["BZD", "Belize Dollar", "BZD", "BZ"],
  ["CDF", "Congolese Franc", "CDF", "CD"],
  ["CHF", "Swiss Franc", "CHF", "CH LI", "franc switzerland swiss"],
  ["CLP", "Chilean Peso", "CLP", "CL"],
  ["CNY", "Chinese Yuan", "CN¥", "CN", "yuan renminbi rmb china"],
  ["COP", "Colombian Peso", "COP", "CO"],
  ["CRC", "Costa Rican Colón", "CRC", "CR"],
  ["CUP", "Cuban Peso", "CUP", "CU"],
  ["CVE", "Cape Verdean Escudo", "CVE", "CV"],
  ["CZK", "Czech Koruna", "CZK", "CZ"],
  ["DJF", "Djiboutian Franc", "DJF", "DJ"],
  ["DKK", "Danish Krone", "DKK", "DK GL FO"],
  ["DOP", "Dominican Peso", "DOP", "DO"],
  ["DZD", "Algerian Dinar", "DZD", "DZ"],
  ["EGP", "Egyptian Pound", "EGP", "EG", "egypt pound"],
  ["ERN", "Eritrean Nakfa", "ERN", "ER"],
  ["ETB", "Ethiopian Birr", "ETB", "ET"],
  ["FJD", "Fijian Dollar", "FJD", "FJ"],
  ["FKP", "Falkland Islands Pound", "FKP", "FK"],
  ["GEL", "Georgian Lari", "GEL", "GE"],
  ["GHS", "Ghanaian Cedi", "GHS", "GH"],
  ["GIP", "Gibraltar Pound", "GIP", "GI"],
  ["GMD", "Gambian Dalasi", "GMD", "GM"],
  ["GNF", "Guinean Franc", "GNF", "GN"],
  ["GTQ", "Guatemalan Quetzal", "GTQ", "GT"],
  ["GYD", "Guyanese Dollar", "GYD", "GY"],
  ["HKD", "Hong Kong Dollar", "HK$", "HK", "hong kong"],
  ["HNL", "Honduran Lempira", "HNL", "HN"],
  ["HTG", "Haitian Gourde", "HTG", "HT"],
  ["HUF", "Hungarian Forint", "HUF", "HU"],
  ["IDR", "Indonesian Rupiah", "IDR", "ID", "rupiah indonesia"],
  ["ILS", "Israeli New Shekel", "₪", "IL PS", "shekel israel"],
  ["IQD", "Iraqi Dinar", "IQD", "IQ"],
  ["IRR", "Iranian Rial", "IRR", "IR"],
  ["ISK", "Icelandic Króna", "ISK", "IS"],
  ["JMD", "Jamaican Dollar", "JMD", "JM"],
  ["JOD", "Jordanian Dinar", "JOD", "JO", "dinar jordan"],
  ["JPY", "Japanese Yen", "¥", "JP", "yen japan"],
  ["KES", "Kenyan Shilling", "KES", "KE", "shilling kenya"],
  ["KGS", "Kyrgyzstani Som", "KGS", "KG"],
  ["KHR", "Cambodian Riel", "KHR", "KH"],
  ["KMF", "Comorian Franc", "KMF", "KM"],
  ["KPW", "North Korean Won", "KPW", "KP"],
  ["KRW", "South Korean Won", "₩", "KR", "won korea"],
  ["KYD", "Cayman Islands Dollar", "KYD", "KY"],
  ["KZT", "Kazakhstani Tenge", "KZT", "KZ"],
  ["LAK", "Lao Kip", "LAK", "LA"],
  ["LBP", "Lebanese Pound", "LBP", "LB"],
  ["LKR", "Sri Lankan Rupee", "LKR", "LK", "rupee sri lanka"],
  ["LRD", "Liberian Dollar", "LRD", "LR"],
  ["LSL", "Lesotho Loti", "LSL", "LS"],
  ["LYD", "Libyan Dinar", "LYD", "LY"],
  ["MAD", "Moroccan Dirham", "MAD", "MA EH", "dirham morocco"],
  ["MDL", "Moldovan Leu", "MDL", "MD"],
  ["MGA", "Malagasy Ariary", "MGA", "MG"],
  ["MKD", "Macedonian Denar", "MKD", "MK"],
  ["MMK", "Myanmar Kyat", "MMK", "MM"],
  ["MNT", "Mongolian Tögrög", "MNT", "MN"],
  ["MOP", "Macanese Pataca", "MOP", "MO"],
  ["MRU", "Mauritanian Ouguiya", "MRU", "MR"],
  ["MUR", "Mauritian Rupee", "MUR", "MU", "rupee mauritius"],
  ["MVR", "Maldivian Rufiyaa", "MVR", "MV", "maldives"],
  ["MWK", "Malawian Kwacha", "MWK", "MW"],
  ["MXN", "Mexican Peso", "MX$", "MX", "peso mexico"],
  ["MYR", "Malaysian Ringgit", "RM", "MY", "ringgit malaysia"],
  ["MZN", "Mozambican Metical", "MZN", "MZ"],
  ["NAD", "Namibian Dollar", "NAD", "NA"],
  ["NGN", "Nigerian Naira", "₦", "NG", "naira nigeria"],
  ["NIO", "Nicaraguan Córdoba", "NIO", "NI"],
  ["NOK", "Norwegian Krone", "NOK", "NO SJ BV"],
  ["NPR", "Nepalese Rupee", "NPR", "NP", "rupee nepal"],
  ["NZD", "New Zealand Dollar", "NZ$", "NZ CK NU PN TK", "new zealand"],
  ["PEN", "Peruvian Sol", "PEN", "PE"],
  ["PGK", "Papua New Guinean Kina", "PGK", "PG"],
  ["PHP", "Philippine Peso", "₱", "PH", "peso philippines"],
  ["PKR", "Pakistani Rupee", "PKR", "PK", "rupee pakistan"],
  ["PLN", "Polish Złoty", "PLN", "PL", "zloty poland"],
  ["PYG", "Paraguayan Guaraní", "PYG", "PY"],
  ["RON", "Romanian Leu", "RON", "RO"],
  ["RSD", "Serbian Dinar", "RSD", "RS"],
  ["RUB", "Russian Ruble", "RUB", "RU", "ruble russia"],
  ["RWF", "Rwandan Franc", "RWF", "RW"],
  ["SBD", "Solomon Islands Dollar", "SBD", "SB"],
  ["SCR", "Seychellois Rupee", "SCR", "SC"],
  ["SDG", "Sudanese Pound", "SDG", "SD"],
  ["SEK", "Swedish Krona", "SEK", "SE", "krona sweden"],
  ["SHP", "Saint Helena Pound", "SHP", "SH"],
  ["SLE", "Sierra Leonean Leone", "SLE", "SL"],
  ["SOS", "Somali Shilling", "SOS", "SO"],
  ["SRD", "Surinamese Dollar", "SRD", "SR"],
  ["SSP", "South Sudanese Pound", "SSP", "SS"],
  ["STN", "São Tomé and Príncipe Dobra", "STN", "ST"],
  ["SYP", "Syrian Pound", "SYP", "SY"],
  ["SZL", "Swazi Lilangeni", "SZL", "SZ"],
  ["THB", "Thai Baht", "฿", "TH", "baht thailand"],
  ["TJS", "Tajikistani Somoni", "TJS", "TJ"],
  ["TMT", "Turkmenistani Manat", "TMT", "TM"],
  ["TND", "Tunisian Dinar", "TND", "TN"],
  ["TOP", "Tongan Paʻanga", "TOP", "TO"],
  ["TRY", "Turkish Lira", "TRY", "TR", "lira turkey"],
  ["TTD", "Trinidad and Tobago Dollar", "TTD", "TT"],
  ["TWD", "New Taiwan Dollar", "NT$", "TW", "taiwan"],
  ["TZS", "Tanzanian Shilling", "TZS", "TZ"],
  ["UAH", "Ukrainian Hryvnia", "UAH", "UA"],
  ["UGX", "Ugandan Shilling", "UGX", "UG"],
  ["UYU", "Uruguayan Peso", "UYU", "UY"],
  ["UZS", "Uzbekistani Som", "UZS", "UZ"],
  ["VES", "Venezuelan Bolívar", "VES", "VE"],
  ["VND", "Vietnamese Đồng", "₫", "VN", "dong vietnam"],
  ["VUV", "Vanuatu Vatu", "VUV", "VU"],
  ["WST", "Samoan Tālā", "WST", "WS"],
  ["XAF", "Central African CFA Franc", "FCFA", "CM CF TD CG GQ GA"],
  ["XCD", "East Caribbean Dollar", "XCD", "AG DM GD KN LC VC AI MS"],
  ["XOF", "West African CFA Franc", "CFA", "BJ BF CI GW ML NE SN TG"],
  ["XPF", "CFP Franc", "XPF", "PF NC WF"],
  ["YER", "Yemeni Rial", "YER", "YE"],
  ["ZAR", "South African Rand", "R", "ZA", "rand south africa"],
  ["ZMW", "Zambian Kwacha", "ZMW", "ZM"],
  ["ZWG", "Zimbabwe Gold", "ZWG", "ZW"],
];

export const CURRENCIES: Currency[] = RAW.map(([code, name, symbol, c, aliases]) => ({ code, name, symbol, countries: c.split(" "), aliases }));
const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));
export const currencyOf = (code: string | null | undefined) => BY_CODE.get((code ?? "INR").toUpperCase()) ?? BY_CODE.get("INR")!;
export const isCurrency = (code: string | null | undefined) => !!code && BY_CODE.has(code.toUpperCase());

/** pinned at the top of the picker */
export const PINNED_CURRENCIES = ["INR", "AED", "USD", "SAR", "QAR", "OMR", "KWD", "BHD", "SGD", "GBP", "EUR", "CAD", "AUD"];
/** Gulf currencies: salaries there are quoted per month */
export const GULF = new Set(["AED", "SAR", "QAR", "OMR", "KWD", "BHD"]);
export const defaultPeriod = (currency: string): Period => (GULF.has(currency.toUpperCase()) ? "monthly" : "annual");

/** currency used in a country (ISO 3166-1 alpha-2) */
export function currencyForCountry(iso: string | null | undefined): string {
  const i = (iso ?? "").toUpperCase();
  if (!i || i === "IN") return "INR";
  // a country's own currency first (USD is listed for several territories, EUR for the EU)
  const own = CURRENCIES.find((c) => c.countries[0] === i);
  return (own ?? CURRENCIES.find((c) => c.countries.includes(i)))?.code ?? "INR";
}

const COUNTRY_NAMES: Record<string, string> = { india: "IN", uae: "AE", "united arab emirates": "AE", dubai: "AE", "abu dhabi": "AE", "saudi arabia": "SA", ksa: "SA", qatar: "QA", oman: "OM", kuwait: "KW", bahrain: "BH", singapore: "SG", "united kingdom": "GB", uk: "GB", "united states": "US", usa: "US", us: "US", canada: "CA", australia: "AU" };
/** default currency from the candidate's country (name or ISO) and/or phone number (+971…) */
export function defaultCurrency(opts: { country?: string | null; phone?: string | null }): string {
  const c = (opts.country ?? "").trim();
  if (c) {
    const iso = c.length === 2 ? c.toUpperCase() : COUNTRY_NAMES[c.toLowerCase()];
    if (iso && iso !== "IN") return currencyForCountry(iso);
  }
  const p = (opts.phone ?? "").replace(/[^\d+]/g, "");
  const DIAL: [string, string][] = [["+971", "AED"], ["+966", "SAR"], ["+974", "QAR"], ["+968", "OMR"], ["+965", "KWD"], ["+973", "BHD"], ["+65", "SGD"], ["+44", "GBP"], ["+61", "AUD"], ["+1", "USD"]];
  for (const [dial, cur] of DIAL) if (p.startsWith(dial)) return cur;
  return "INR";
}

/** picker search: code, name, symbol, country name (via the caller's country list), aliases */
export function searchCurrencies(q: string, countryName: (iso: string) => string = () => ""): Currency[] {
  const s = q.trim().toLowerCase();
  if (!s) return CURRENCIES;
  return CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(s) ||
      c.name.toLowerCase().includes(s) ||
      (c.aliases ?? "").includes(s) ||
      c.symbol.toLowerCase() === s ||
      c.countries.some((i) => countryName(i).toLowerCase().includes(s))
  ).sort((a, b) => Number(b.code.toLowerCase() === s) - Number(a.code.toLowerCase() === s) || Number(PINNED_CURRENCIES.includes(b.code)) - Number(PINNED_CURRENCIES.includes(a.code)));
}

// ---------------------------------------------------------------- formatting
const trim0 = (n: number, max = 2) => n.toLocaleString("en-US", { maximumFractionDigits: max });
/** 12.5 → "₹12.5 LPA" (the app's long-standing INR style) */
export function lpaLabel(lpa: number | string | null | undefined) {
  if (lpa == null || lpa === "") return "—";
  const n = Number(lpa);
  if (!Number.isFinite(n)) return "—";
  return `₹${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(/0$/, "")} LPA`;
}

/** amount in the salary's own units, e.g. "AED 30,550" / "$65,000" / "₹50,000" / "₹12.5 LPA" */
export function amountLabel(amount: number, currency: string, period: Period) {
  const c = currencyOf(currency);
  if (c.code === "INR" && period === "annual") return lpaLabel(amount);
  if (c.code === "INR") return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const sym = c.symbol;
  const n = trim0(amount, amount >= 1000 ? 0 : 2);
  return /^[A-Z]{3}$/.test(sym) || sym.length > 2 ? `${sym} ${n}` : `${sym}${n}`;
}
export const periodSuffix = (currency: string, period: Period) => (currency.toUpperCase() === "INR" && period === "annual" ? "" : period === "monthly" ? " / month" : " / year");

/**
 * Display a salary. INR annual → "₹12.5 LPA". Others → "AED 30,550 / month" with hint "≈ ₹83.2 LPA" (from the stored
 * INR-annual equivalent, so the hint always matches what search and matching use).
 */
export function moneyLabel(m: Partial<Money> & { lpa?: number | string | null }, opts: { hint?: boolean } = {}): string {
  const currency = (m.currency || "INR").toUpperCase();
  const period: Period = m.period === "monthly" ? "monthly" : "annual";
  const amount = m.amount != null && (m.amount as unknown) !== "" ? Number(m.amount) : null;
  if (amount == null || !Number.isFinite(amount)) return m.lpa != null && m.lpa !== "" ? lpaLabel(m.lpa) : "—";
  const main = `${amountLabel(amount, currency, period)}${periodSuffix(currency, period)}`;
  if (opts.hint === false || (currency === "INR" && period === "annual")) return main;
  const h = hintLpa(m.lpa);
  return h ? `${main} (≈ ${h})` : main;
}
export const hintLpa = (lpa: number | string | null | undefined) => (lpa == null || lpa === "" || !Number.isFinite(Number(lpa)) ? null : `₹${trim0(Number(lpa), Number(lpa) >= 10 ? 1 : 2)} LPA`);

/** "₹18–30 LPA" / "AED 20,000–30,000 / month (≈ ₹54–81 LPA)" for job budgets */
export function rangeLabel(r: { min?: number | string | null; max?: number | string | null; currency?: string | null; period?: string | null; minLpa?: number | string | null; maxLpa?: number | string | null }, opts: { hint?: boolean } = {}) {
  const currency = (r.currency || "INR").toUpperCase();
  const period: Period = r.period === "monthly" ? "monthly" : "annual";
  const min = r.min != null && r.min !== "" ? Number(r.min) : null;
  const max = r.max != null && r.max !== "" ? Number(r.max) : null;
  if (min == null && max == null) return null;
  const inrAnnual = currency === "INR" && period === "annual";
  const c = currencyOf(currency);
  const lead = c.code === "INR" ? "₹" : /^[A-Z]{3}$/.test(c.symbol) || c.symbol.length > 2 ? `${c.symbol} ` : c.symbol;
  const one = (n: number) => (inrAnnual ? String(n % 1 === 0 ? n : Number(n.toFixed(2))) : c.code === "INR" ? n.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : trim0(n, n >= 1000 ? 0 : 2));
  const body = min != null && max != null ? `${lead}${one(min)}–${one(max)}` : min != null ? `${lead}${one(min)}+` : `Up to ${lead}${one(max!)}`;
  const main = `${body}${inrAnnual ? " LPA" : periodSuffix(currency, period)}`;
  if (inrAnnual || opts.hint === false) return main;
  const lo = hintLpa(r.minLpa), hi = hintLpa(r.maxLpa);
  const hint = lo && hi ? `${lo.replace(/ LPA$/, "")}–${hi.replace(/^₹/, "")}` : lo ?? hi;
  return hint ? `${main} (≈ ${hint})` : main;
}

// ---------------------------------------------------------------- parsing ("30 AED", "AED 30,550 per month", "12 LPA", "$120k")
const SYMBOLS: [RegExp, string][] = [
  [/₹|\brs\.?|\binr\b|\brupees?\b/i, "INR"],
  [/\bdhs?\b|\baed\b|\bdirhams?\b/i, "AED"],
  [/\bsar\b|\bsaudi riyals?\b/i, "SAR"],
  [/\bqar\b|\bqatari riyals?\b/i, "QAR"],
  [/\bomr\b|\bomani rials?\b/i, "OMR"],
  [/\bkwd\b|\bkuwaiti dinars?\b/i, "KWD"],
  [/\bbhd\b|\bbahraini dinars?\b/i, "BHD"],
  [/s\$|\bsgd\b/i, "SGD"],
  [/c\$|\bcad\b/i, "CAD"],
  [/a\$|\baud\b/i, "AUD"],
  [/£|\bgbp\b|\bpounds?\b/i, "GBP"],
  [/€|\beur\b|\beuros?\b/i, "EUR"],
  [/\$|\busd\b|\bdollars?\b/i, "USD"],
  [/\briyals?\b/i, "SAR"],
];

/**
 * Parse free text into a salary. Returns null when there's no number.
 * "30 AED" → 30 AED (monthly, the Gulf default) · "AED 30,550 per month" · "$120k" → 120000 USD annual ·
 * "12 LPA" / "12" → 12 INR annual (lakhs) · "1.2 crore" → 120 INR annual · "₹50,000 per month" → 50000 INR monthly
 */
export function parseMoney(text: string | number | null | undefined, fallbackCurrency = "INR"): Money | null {
  if (text == null) return null;
  if (typeof text === "number") return Number.isFinite(text) ? { amount: text, currency: fallbackCurrency, period: defaultPeriod(fallbackCurrency) } : null;
  const s = text.trim();
  const m = /(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|l|lakhs?|lacs?|lpa|cr|crores?|m|mn|million)?\b/i.exec(s.replace(/(\d),(?=\d)/g, "$1,"));
  if (!m) return null;
  let amount = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(amount)) return null;
  const unit = (m[2] ?? "").toLowerCase();
  let currency = SYMBOLS.find(([re]) => re.test(s))?.[1] ?? null;
  if (!currency && /\b(lpa|lakhs?|lacs?|crores?|cr)\b/i.test(s)) currency = "INR";
  currency = currency ?? fallbackCurrency.toUpperCase();
  const monthly = /(per\s*month|\/\s*m(on(th)?)?\b|\bpm\b|\bp\.m\.?|monthly|a month|\bmonth\b)/i.test(s);
  const annual = /(per\s*(annum|year)|\/\s*(yr|year|annum)\b|\bpa\b|\bp\.a\.?|annual|yearly|lpa|a year)/i.test(s);
  if (unit === "k" || unit === "thousand") amount *= 1000;
  if (unit === "m" || unit === "mn" || unit === "million") amount *= 1_000_000;
  let period: Period = monthly ? "monthly" : annual ? "annual" : defaultPeriod(currency);
  if (currency === "INR") {
    if (unit === "cr" || unit.startsWith("crore")) { amount *= 100; period = "annual"; }
    else if (unit === "l" || unit.startsWith("lakh") || unit.startsWith("lac") || unit === "lpa") { period = monthly ? "monthly" : "annual"; if (monthly) amount *= 100000; }
    else if (!monthly && amount >= 1000) amount = amount / 100000; // "₹12,00,000" per year → 12 LPA
    // plain small numbers ("12") are already lakhs for INR annual
  }
  return { amount: Math.round(amount * 100) / 100, currency, period };
}

/** INR-annual LPA from a salary and a rate table (INR per unit) — the same maths as fx_lpa() in the database */
export function toLpa(m: Money, rates: Record<string, number>): number | null {
  if (m.amount == null) return null;
  const cur = m.currency.toUpperCase();
  if (cur === "INR" && m.period === "annual") return Math.round(m.amount * 100) / 100;
  const r = cur === "INR" ? 1 : rates[cur];
  if (!r) return null;
  return Math.round(((m.amount * r * (m.period === "monthly" ? 12 : 1)) / 100000) * 100) / 100;
}

/** keys for writing a salary through the save RPCs */
export const moneyKeys = (prefix: "current_ctc" | "expected_ctc" | "offered_ctc", m: Money) => ({ [`${prefix}_amount`]: m.amount, [`${prefix}_currency`]: m.currency, [`${prefix}_period`]: m.period });
/** read a salary from a row ({prefix}_amount / _currency / _period, falling back to the LPA column) */
export function moneyFrom(obj: object | null | undefined, prefix: "current_ctc" | "expected_ctc" | "offered_ctc"): Money & { lpa: number | null } {
  const row = obj as Record<string, unknown> | null | undefined;
  const lpa = row?.[prefix] != null ? Number(row[prefix]) : null;
  const amount = row?.[`${prefix}_amount`] != null ? Number(row[`${prefix}_amount`]) : lpa;
  const currency = String(row?.[`${prefix}_currency`] ?? "INR").toUpperCase();
  const period = row?.[`${prefix}_period`] === "monthly" ? "monthly" : "annual";
  return { amount, currency: amount === lpa && row?.[`${prefix}_amount`] == null ? "INR" : currency, period: amount === lpa && row?.[`${prefix}_amount`] == null ? "annual" : period, lpa };
}
export const ctcLabel = (row: object | null | undefined, prefix: "current_ctc" | "expected_ctc" | "offered_ctc", opts?: { hint?: boolean }) => moneyLabel(moneyFrom(row, prefix), opts);
export const budgetLabel = (job: object | null | undefined, opts?: { hint?: boolean }) => {
  const j = job as Record<string, unknown> | null | undefined;
  return j ? rangeLabel({ min: (j.ctc_min_amount ?? j.ctc_min) as number, max: (j.ctc_max_amount ?? j.ctc_max) as number, currency: j.ctc_min_amount != null || j.ctc_max_amount != null ? (j.ctc_currency as string) : "INR", period: j.ctc_min_amount != null || j.ctc_max_amount != null ? (j.ctc_period as string) : "annual", minLpa: j.ctc_min as number, maxLpa: j.ctc_max as number }, opts) : null;
};

/**
 * Bulk import: a CTC cell plus optional "Currency" / "Period" columns → salary.
 * "30 AED" / "AED 30,550 pm" / "$90k" are detected from the cell; the columns win when given.
 * INR annual plain numbers: up to 1000 = lakhs ("12.5"), above = rupees ("1200000" → 12 LPA).
 */
export function importSalary(cell: string | null | undefined, currencyCol?: string | null, periodCol?: string | null): Money | null {
  const text = (cell ?? "").trim();
  if (!text) return null;
  const colCur = (() => {
    const c = (currencyCol ?? "").trim();
    if (!c) return null;
    if (isCurrency(c)) return c.toUpperCase();
    return SYMBOLS.find(([re]) => re.test(c))?.[1] ?? searchCurrencies(c)[0]?.code ?? null;
  })();
  const colPer = (() => {
    const p = (periodCol ?? "").trim().toLowerCase();
    if (!p) return null;
    if (/^(m|pm|p\.m\.?|month|monthly|per month|mo)$/.test(p)) return "monthly" as const;
    if (/^(a|y|pa|p\.a\.?|year|yearly|annual|annually|per annum|lpa)$/.test(p)) return "annual" as const;
    return null;
  })();
  const m = parseMoney(text, colCur ?? "INR");
  if (!m || m.amount == null) return null;
  const cellHasCurrency = SYMBOLS.some(([re]) => re.test(text)) || /\b(lpa|lakhs?|lacs?|crores?|cr)\b/i.test(text);
  let { amount, currency, period } = m;
  if (colCur && !cellHasCurrency) currency = colCur;
  if (colPer) period = colPer;
  else if (colCur && !cellHasCurrency && !/(month|year|annum|\bpm\b|\bpa\b)/i.test(text)) period = defaultPeriod(currency);
  // INR typed as a plain number: re-read with the final period
  if (currency === "INR" && !cellHasCurrency) {
    const raw = Number(text.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(raw)) amount = period === "annual" ? (raw > 1000 ? Math.round((raw / 100000) * 100) / 100 : raw) : raw;
  }
  return { amount, currency, period };
}

/** public job listing salary ("₹18–30 LPA" or "AED 20,000–30,000 / month (≈ ₹55–83 LPA)"); null when hidden */
export function publicSalaryLabel(j: { salary_min?: number | null; salary_max?: number | null; salary_min_amount?: number | null; salary_max_amount?: number | null; salary_currency?: string | null; salary_period?: string | null }, opts?: { hint?: boolean }) {
  const own = j.salary_min_amount != null || j.salary_max_amount != null;
  return rangeLabel({ min: own ? j.salary_min_amount : j.salary_min, max: own ? j.salary_max_amount : j.salary_max, currency: own ? j.salary_currency : "INR", period: own ? j.salary_period : "annual", minLpa: j.salary_min, maxLpa: j.salary_max }, opts);
}
