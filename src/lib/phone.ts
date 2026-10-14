/**
 * Phone numbers for every country (libphonenumber-js, full metadata).
 * Storage format: E.164 — e.g. "+919876543210", "+971501744908".
 * Older rows may still hold a bare Indian 10-digit number ("9876543210"); every helper here reads both.
 */
import { AsYouType, getCountryCallingCode, isSupportedCountry, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

export type Country = { iso: string; name: string; dial: string };

// [ISO 3166-1 alpha-2, name, international dialling code]
const RAW: [string, string, string][] = [
  ["AF", "Afghanistan", "93"], ["AX", "Åland Islands", "358"], ["AL", "Albania", "355"], ["DZ", "Algeria", "213"], ["AS", "American Samoa", "1"],
  ["AD", "Andorra", "376"], ["AO", "Angola", "244"], ["AI", "Anguilla", "1"], ["AG", "Antigua and Barbuda", "1"], ["AR", "Argentina", "54"],
  ["AM", "Armenia", "374"], ["AW", "Aruba", "297"], ["AU", "Australia", "61"], ["AT", "Austria", "43"], ["AZ", "Azerbaijan", "994"],
  ["BS", "Bahamas", "1"], ["BH", "Bahrain", "973"], ["BD", "Bangladesh", "880"], ["BB", "Barbados", "1"], ["BY", "Belarus", "375"],
  ["BE", "Belgium", "32"], ["BZ", "Belize", "501"], ["BJ", "Benin", "229"], ["BM", "Bermuda", "1"], ["BT", "Bhutan", "975"],
  ["BO", "Bolivia", "591"], ["BQ", "Caribbean Netherlands", "599"], ["BA", "Bosnia and Herzegovina", "387"], ["BW", "Botswana", "267"], ["BR", "Brazil", "55"],
  ["IO", "British Indian Ocean Territory", "246"], ["VG", "British Virgin Islands", "1"], ["BN", "Brunei", "673"], ["BG", "Bulgaria", "359"], ["BF", "Burkina Faso", "226"],
  ["BI", "Burundi", "257"], ["KH", "Cambodia", "855"], ["CM", "Cameroon", "237"], ["CA", "Canada", "1"], ["CV", "Cape Verde", "238"],
  ["KY", "Cayman Islands", "1"], ["CF", "Central African Republic", "236"], ["TD", "Chad", "235"], ["CL", "Chile", "56"], ["CN", "China", "86"],
  ["CX", "Christmas Island", "61"], ["CC", "Cocos (Keeling) Islands", "61"], ["CO", "Colombia", "57"], ["KM", "Comoros", "269"], ["CG", "Congo", "242"],
  ["CD", "Congo (DRC)", "243"], ["CK", "Cook Islands", "682"], ["CR", "Costa Rica", "506"], ["CI", "Côte d'Ivoire", "225"], ["HR", "Croatia", "385"],
  ["CU", "Cuba", "53"], ["CW", "Curaçao", "599"], ["CY", "Cyprus", "357"], ["CZ", "Czechia", "420"], ["DK", "Denmark", "45"],
  ["DJ", "Djibouti", "253"], ["DM", "Dominica", "1"], ["DO", "Dominican Republic", "1"], ["EC", "Ecuador", "593"], ["EG", "Egypt", "20"],
  ["SV", "El Salvador", "503"], ["GQ", "Equatorial Guinea", "240"], ["ER", "Eritrea", "291"], ["EE", "Estonia", "372"], ["SZ", "Eswatini", "268"],
  ["ET", "Ethiopia", "251"], ["FK", "Falkland Islands", "500"], ["FO", "Faroe Islands", "298"], ["FJ", "Fiji", "679"], ["FI", "Finland", "358"],
  ["FR", "France", "33"], ["GF", "French Guiana", "594"], ["PF", "French Polynesia", "689"], ["GA", "Gabon", "241"], ["GM", "Gambia", "220"],
  ["GE", "Georgia", "995"], ["DE", "Germany", "49"], ["GH", "Ghana", "233"], ["GI", "Gibraltar", "350"], ["GR", "Greece", "30"],
  ["GL", "Greenland", "299"], ["GD", "Grenada", "1"], ["GP", "Guadeloupe", "590"], ["GU", "Guam", "1"], ["GT", "Guatemala", "502"],
  ["GG", "Guernsey", "44"], ["GN", "Guinea", "224"], ["GW", "Guinea-Bissau", "245"], ["GY", "Guyana", "592"], ["HT", "Haiti", "509"],
  ["HN", "Honduras", "504"], ["HK", "Hong Kong", "852"], ["HU", "Hungary", "36"], ["IS", "Iceland", "354"], ["IN", "India", "91"],
  ["ID", "Indonesia", "62"], ["IR", "Iran", "98"], ["IQ", "Iraq", "964"], ["IE", "Ireland", "353"], ["IM", "Isle of Man", "44"],
  ["IL", "Israel", "972"], ["IT", "Italy", "39"], ["JM", "Jamaica", "1"], ["JP", "Japan", "81"], ["JE", "Jersey", "44"],
  ["JO", "Jordan", "962"], ["KZ", "Kazakhstan", "7"], ["KE", "Kenya", "254"], ["KI", "Kiribati", "686"], ["XK", "Kosovo", "383"],
  ["KW", "Kuwait", "965"], ["KG", "Kyrgyzstan", "996"], ["LA", "Laos", "856"], ["LV", "Latvia", "371"], ["LB", "Lebanon", "961"],
  ["LS", "Lesotho", "266"], ["LR", "Liberia", "231"], ["LY", "Libya", "218"], ["LI", "Liechtenstein", "423"], ["LT", "Lithuania", "370"],
  ["LU", "Luxembourg", "352"], ["MO", "Macao", "853"], ["MG", "Madagascar", "261"], ["MW", "Malawi", "265"], ["MY", "Malaysia", "60"],
  ["MV", "Maldives", "960"], ["ML", "Mali", "223"], ["MT", "Malta", "356"], ["MH", "Marshall Islands", "692"], ["MQ", "Martinique", "596"],
  ["MR", "Mauritania", "222"], ["MU", "Mauritius", "230"], ["YT", "Mayotte", "262"], ["MX", "Mexico", "52"], ["FM", "Micronesia", "691"],
  ["MD", "Moldova", "373"], ["MC", "Monaco", "377"], ["MN", "Mongolia", "976"], ["ME", "Montenegro", "382"], ["MS", "Montserrat", "1"],
  ["MA", "Morocco", "212"], ["MZ", "Mozambique", "258"], ["MM", "Myanmar", "95"], ["NA", "Namibia", "264"], ["NR", "Nauru", "674"],
  ["NP", "Nepal", "977"], ["NL", "Netherlands", "31"], ["NC", "New Caledonia", "687"], ["NZ", "New Zealand", "64"], ["NI", "Nicaragua", "505"],
  ["NE", "Niger", "227"], ["NG", "Nigeria", "234"], ["NU", "Niue", "683"], ["NF", "Norfolk Island", "672"], ["KP", "North Korea", "850"],
  ["MK", "North Macedonia", "389"], ["MP", "Northern Mariana Islands", "1"], ["NO", "Norway", "47"], ["OM", "Oman", "968"], ["PK", "Pakistan", "92"],
  ["PW", "Palau", "680"], ["PS", "Palestine", "970"], ["PA", "Panama", "507"], ["PG", "Papua New Guinea", "675"], ["PY", "Paraguay", "595"],
  ["PE", "Peru", "51"], ["PH", "Philippines", "63"], ["PL", "Poland", "48"], ["PT", "Portugal", "351"], ["PR", "Puerto Rico", "1"],
  ["QA", "Qatar", "974"], ["RE", "Réunion", "262"], ["RO", "Romania", "40"], ["RU", "Russia", "7"], ["RW", "Rwanda", "250"],
  ["BL", "Saint Barthélemy", "590"], ["SH", "Saint Helena", "290"], ["KN", "Saint Kitts and Nevis", "1"], ["LC", "Saint Lucia", "1"], ["MF", "Saint Martin", "590"],
  ["PM", "Saint Pierre and Miquelon", "508"], ["VC", "Saint Vincent and the Grenadines", "1"], ["WS", "Samoa", "685"], ["SM", "San Marino", "378"], ["ST", "São Tomé and Príncipe", "239"],
  ["SA", "Saudi Arabia", "966"], ["SN", "Senegal", "221"], ["RS", "Serbia", "381"], ["SC", "Seychelles", "248"], ["SL", "Sierra Leone", "232"],
  ["SG", "Singapore", "65"], ["SX", "Sint Maarten", "1"], ["SK", "Slovakia", "421"], ["SI", "Slovenia", "386"], ["SB", "Solomon Islands", "677"],
  ["SO", "Somalia", "252"], ["ZA", "South Africa", "27"], ["KR", "South Korea", "82"], ["SS", "South Sudan", "211"], ["ES", "Spain", "34"],
  ["LK", "Sri Lanka", "94"], ["SD", "Sudan", "249"], ["SR", "Suriname", "597"], ["SJ", "Svalbard and Jan Mayen", "47"], ["SE", "Sweden", "46"],
  ["CH", "Switzerland", "41"], ["SY", "Syria", "963"], ["TW", "Taiwan", "886"], ["TJ", "Tajikistan", "992"], ["TZ", "Tanzania", "255"],
  ["TH", "Thailand", "66"], ["TL", "Timor-Leste", "670"], ["TG", "Togo", "228"], ["TK", "Tokelau", "690"], ["TO", "Tonga", "676"],
  ["TT", "Trinidad and Tobago", "1"], ["TN", "Tunisia", "216"], ["TR", "Türkiye", "90"], ["TM", "Turkmenistan", "993"], ["TC", "Turks and Caicos Islands", "1"],
  ["TV", "Tuvalu", "688"], ["VI", "U.S. Virgin Islands", "1"], ["UG", "Uganda", "256"], ["UA", "Ukraine", "380"], ["AE", "United Arab Emirates", "971"],
  ["GB", "United Kingdom", "44"], ["US", "United States", "1"], ["UY", "Uruguay", "598"], ["UZ", "Uzbekistan", "998"], ["VU", "Vanuatu", "678"],
  ["VA", "Vatican City", "39"], ["VE", "Venezuela", "58"], ["VN", "Vietnam", "84"], ["WF", "Wallis and Futuna", "681"], ["EH", "Western Sahara", "212"],
  ["YE", "Yemen", "967"], ["ZM", "Zambia", "260"], ["ZW", "Zimbabwe", "263"],
];

export const COUNTRIES: Country[] = RAW.map(([iso, name, dial]) => ({ iso, name, dial }));
/** shown first in the picker (where most of our candidates and clients are) */
export const PINNED = ["IN", "AE", "SA", "QA", "OM", "KW", "BH", "SG", "US", "GB"];
export const DEFAULT_COUNTRY = "IN";

export const byIso = (iso: string) => COUNTRIES.find((c) => c.iso === iso) ?? COUNTRIES.find((c) => c.iso === DEFAULT_COUNTRY)!;
/** SVG flag (public/flags, from country-flag-icons) — emoji flags don't render on Windows */
export const flagSrc = (iso: string) => `/flags/${iso.toUpperCase()}.svg`;

const onlyDigits = (s: string) => s.replace(/\D/g, "");
const asCode = (iso: string) => (isSupportedCountry(iso) ? (iso as CountryCode) : (DEFAULT_COUNTRY as CountryCode));
const DIALS = [...new Set(COUNTRIES.map((c) => c.dial))].sort((a, b) => b.length - a.length);
const PREFERRED: Record<string, string> = { "1": "US", "7": "RU", "44": "GB", "39": "IT", "47": "NO", "61": "AU", "212": "MA", "262": "RE", "358": "FI", "590": "GP", "599": "CW" };

/** "+971…", "00971…" → "+971…"; anything else unchanged */
const intl = (v: string) => (v.startsWith("00") ? "+" + v.slice(2) : v);

/** parse a stored or typed value; numbers without a code are read as `defaultIso` (India) */
export function parse(value: string | null | undefined, defaultIso = DEFAULT_COUNTRY) {
  const v = intl(String(value ?? "").trim());
  if (!v) return undefined;
  return parsePhoneNumberFromString(v, asCode(defaultIso));
}

/** split into country + national digits (also works for half-typed numbers) */
export function parsePhone(value: string | null | undefined, fallbackIso = DEFAULT_COUNTRY): { iso: string; national: string } {
  const v = intl(String(value ?? "").trim());
  if (!v) return { iso: fallbackIso, national: "" };
  const p = parse(v, fallbackIso);
  if (p?.country) return { iso: p.country, national: p.nationalNumber };
  if (v.startsWith("+")) {
    const d = onlyDigits(v);
    const dial = p?.countryCallingCode ?? DIALS.find((x) => d.startsWith(x));
    if (dial) {
      const iso = byIso(fallbackIso).dial === dial ? fallbackIso : PREFERRED[dial] ?? COUNTRIES.find((c) => c.dial === dial)?.iso ?? fallbackIso;
      return { iso, national: d.slice(dial.length) };
    }
  }
  return { iso: fallbackIso, national: p?.nationalNumber ?? onlyDigits(v) };
}

/** the value we store: E.164 when it parses, otherwise "+<code><digits>" */
export function formatPhone(iso: string, national: string) {
  const n = onlyDigits(national);
  if (!n) return "";
  const p = parsePhoneNumberFromString(n, asCode(iso));
  return p ? p.number : `+${byIso(iso).dial}${n}`;
}

/** normalise anything typed or stored ("98765 43210", "+971 50 174 4908", "00971…") to E.164 */
export function normalizePhone(value: string | null | undefined, defaultIso = DEFAULT_COUNTRY) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  const p = parse(v, defaultIso);
  return p ? p.number : v;
}

/** valid mobile or fixed-line number for its country (bare numbers are read as Indian) */
export function isValidPhone(value: string | null | undefined, defaultIso = DEFAULT_COUNTRY) {
  return !!parse(value, defaultIso)?.isValid();
}

/** inline message for an invalid number, or null when it's fine / empty */
export function phoneError(value: string | null | undefined, iso?: string) {
  if (!String(value ?? "").trim()) return null;
  if (isValidPhone(value, iso)) return null;
  const country = byIso(parse(value, iso)?.country ?? iso ?? parsePhone(value).iso);
  return `Enter a valid mobile number for ${country.name}`;
}

/** human-readable international format: "+971 50 174 4908", "+91 98765 43210" */
export function displayPhone(value: string | null | undefined) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  const p = parse(v);
  return p ? p.formatInternational() : v;
}

/** "tel:+971501744908" */
export function telHref(value: string | null | undefined) {
  const n = normalizePhone(value);
  return n ? `tel:${n.startsWith("+") ? n : onlyDigits(n)}` : undefined;
}

/** digits for wa.me (full international number, no "+") */
export function waNumber(value: string | null | undefined) {
  const n = normalizePhone(value);
  return n.startsWith("+") ? onlyDigits(n) : "";
}

/** format progressively while typing (national part only) */
export function formatAsYouType(iso: string, national: string) {
  return new AsYouType(asCode(iso)).input(national);
}

export const dialCode = (iso: string) => (isSupportedCountry(iso) ? getCountryCallingCode(iso as CountryCode) : byIso(iso).dial);

/** values a number may be stored as (E.164, and the bare 10-digit form older Indian rows used) — for duplicate checks */
export function phoneVariants(value: string | null | undefined) {
  const e164 = normalizePhone(value);
  if (!e164) return [];
  const out = new Set([e164]);
  if (e164.startsWith("+91") && e164.length === 13) out.add(e164.slice(3));
  return [...out];
}

/** phone-like search text ("+971 50 174 4908", "98765-43210") → national digits to match stored numbers; null otherwise */
export function phoneSearchDigits(q: string | null | undefined) {
  const t = String(q ?? "").trim();
  if (!/^[\d\s()+.-]+$/.test(t) || (t.match(/\d/g)?.length ?? 0) < 4) return null;
  return parsePhone(t).national || null;
}

/**
 * Best guess for numbers from CVs / spreadsheets: an explicit code wins ("+971…", "00971…");
 * otherwise Indian when it is a valid Indian number; otherwise digits that already start with a country code.
 */
export function normalizeLoosePhone(value: string | null | undefined) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  if (/^(\+|00)/.test(v)) return normalizePhone(v);
  if (isValidPhone(v, "IN")) return normalizePhone(v, "IN");
  const d = onlyDigits(v);
  if (d.length >= 8 && isValidPhone("+" + d)) return normalizePhone("+" + d);
  return normalizePhone(v, "IN");
}

/** a number found in a CV: "+<code>" / "00<code>" is parsed for that country; otherwise only Indian mobiles (+91 / 91 / 0 prefixes) */
export function cvPhone(raw: string): string | null {
  const t = raw.trim();
  if (/^(\+|00)/.test(t)) return isValidPhone(t) ? normalizePhone(t) : null;
  let d = onlyDigits(t);
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null;
}
