export type GermanCountryData = {
  names: string[];
  nameToCode: Map<string, string>;
};

const COMMON_COUNTRIES: Array<{ name: string; code: string }> = [
  { name: "Deutschland", code: "de" },
  { name: "Österreich", code: "at" },
  { name: "Schweiz", code: "ch" },
  { name: "Frankreich", code: "fr" },
  { name: "Italien", code: "it" },
  { name: "Spanien", code: "es" },
  { name: "Niederlande", code: "nl" },
  { name: "Belgien", code: "be" },
  { name: "Luxemburg", code: "lu" },
  { name: "Dänemark", code: "dk" },
  { name: "Polen", code: "pl" },
  { name: "Tschechien", code: "cz" },
];

let cached: GermanCountryData | null = null;

const normalize = (s: string) => s.trim().toLowerCase();

const FALLBACK_REGION_CODES = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ",
  "CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ",
  "DE","DJ","DK","DM","DO","DZ",
  "EC","EE","EG","EH","ER","ES","ET",
  "FI","FJ","FK","FM","FO","FR",
  "GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY",
  "HK","HM","HN","HR","HT","HU",
  "ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT",
  "JE","JM","JO","JP",
  "KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ",
  "LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY",
  "MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ",
  "NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ",
  "OM",
  "PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY",
  "QA",
  "RE","RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ",
  "TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ",
  "UA","UG","UM","US","UY","UZ",
  "VA","VC","VE","VG","VI","VN","VU",
  "WF","WS",
  "YE","YT",
  "ZA","ZM","ZW",
];

export function getGermanCountryData(): GermanCountryData {
  if (cached) return cached;

  const names: string[] = [];
  const nameToCode = new Map<string, string>();

  try {
    const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
      .supportedValuesOf;

    const regionCodes =
      typeof supportedValuesOf === "function" ? supportedValuesOf("region") : FALLBACK_REGION_CODES;
    const displayNames = new Intl.DisplayNames(["de"], { type: "region" });

    for (const code of regionCodes) {
      const label = displayNames.of(code);
      if (!label) continue;
      const key = normalize(label);
      if (!key) continue;
      if (!nameToCode.has(key)) {
        nameToCode.set(key, code.toLowerCase());
        names.push(label);
      }
    }
  } catch {
    // ignore
  }

  if (!nameToCode.has("deutschland")) {
    nameToCode.set("deutschland", "de");
    names.push("Deutschland");
  }

  for (const c of COMMON_COUNTRIES) {
    const key = normalize(c.name);
    if (!nameToCode.has(key)) {
      nameToCode.set(key, c.code);
    }
    if (!names.some((n) => normalize(n) === key)) {
      names.push(c.name);
    }
  }

  names.sort((a, b) => a.localeCompare(b, "de"));

  cached = { names, nameToCode };
  return cached;
}

export function isValidGermanCountryName(country: string): boolean {
  const c = normalize(country);
  if (!c) return false;
  return getGermanCountryData().nameToCode.has(c);
}

export function getCountryCodeFromGermanName(country: string): string | null {
  const c = normalize(country);
  if (!c) return null;
  return getGermanCountryData().nameToCode.get(c) ?? null;
}
