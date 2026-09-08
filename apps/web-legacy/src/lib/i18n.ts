export type Lang = "en" | "bn";

const en = {
  appName: "MIOS",
  tagline: "Manufacturing OS Intelligence — ask your factory anything.",
  signIn: "Sign in",
  registerFactory: "Register factory",
  companyName: "Company name (e.g. Meghna Apparels Ltd)",
  yourName: "Your name",
  email: "Email",
  password: "Password (min 8 chars)",
  pleaseWait: "Please wait…",
  createAccount: "Create account",
  workspace: "MIOS Workspace",
  signOut: "Sign out",
  knowledgeBase: "Knowledge Base",
  uploadDoc: "Upload document (PDF/TXT/Excel)",
  noDocsYet: "No documents yet. Upload SOPs, audit reports, production sheets.",
  pages: "pages",
  rows: "rows",
  askFactory: "Ask your factory",
  complianceCopilot: "Compliance Copilot",
  hideAnalytics: "Hide analytics",
  analyticsWithCount: (n: number) => `Analytics (${n})`,
  analyticsHint:
    "Upload an Excel/CSV production sheet to enable analytics.",
  tablesPrefix: "Tables:",
  tryPrompt:
    "Try: \u201cWhat was Line 7's efficiency last week?\u201d or \u201cShow fire drill records.\u201d",
  thinking: "Thinking…",
  askPlaceholder: "Ask a question… (Bangla or English)",
  ask: "Ask",
  run: "Run",
  analyticsPlaceholder: "e.g. total output by line",
  sources: (n: number) => `Sources (${n})`,
  newAuditCheck: "New audit readiness check",
  createAssessment: "Create assessment",
  assessments: "Assessments",
  noAssessments: "No assessments yet — create one above.",
  autoAssess: "Auto-assess",
  binder: "Binder",
  assessing: (ref: string) => `Assessing ${ref}…`,
  selectItemHint: "Select an item row below to review evidence.",
  draftCap: "Draft CAP",
  aiNotes: "AI notes:",
  evidence: "Evidence:",
  exampleTitle: "e.g. Buyer audit prep — Nov",
};

type Dict = typeof en;

const bn: Dict = {
  appName: "এমআইওএস",
  tagline: "ম্যানুফ্যাকচারিং ওএস ইন্টেলিজেন্স — আপনার কারখানাকে যা খুশি জিজ্ঞেস করুন।",
  signIn: "সাইন ইন",
  registerFactory: "কারখানা নিবন্ধন",
  companyName: "প্রতিষ্ঠানের নাম (যেমন: মেঘনা অ্যাপারেলস লিমিটেড)",
  yourName: "আপনার নাম",
  email: "ইমেইল",
  password: "পাসওয়ার্ড (সর্বনিম্ন ৮ অক্ষর)",
  pleaseWait: "অপেক্ষা করুন…",
  createAccount: "একাউন্ট তৈরি করুন",
  workspace: "এমআইওএস ওয়ার্কস্পেস",
  signOut: "সাইন আউট",
  knowledgeBase: "নলেজ বেস",
  uploadDoc: "ডকুমেন্ট আপলোড (PDF/TXT/এক্সেল)",
  noDocsYet: "এখনো কোনো ডকুমেন্ট নেই। এসওপি, অডিট রিপোর্ট, প্রোডাকশন শিট আপলোড করুন।",
  pages: "পৃষ্ঠা",
  rows: "সারি",
  askFactory: "আপনার কারখানাকে জিজ্ঞেস করুন",
  complianceCopilot: "কম্প্লায়েন্স কোপাইলট",
  hideAnalytics: "অ্যানালিটিক্স লুকান",
  analyticsWithCount: (n: number) => `অ্যানালিটিক্স (${n})`,
  analyticsHint: "অ্যানালিটিক্স চালু করতে এক্সেল/সিএসভি প্রোডাকশন শিট আপলোড করুন।",
  tablesPrefix: "টেবিল:",
  tryPrompt:
    "যেমন: \u201cগত সপ্তাহে লাইন ৭ এর দক্ষতা কেমন ছিল?\u201d অথবা \u201cফায়ার ড্রিলের রেকর্ড দেখাও।\u201d",
  thinking: "ভাবছি…",
  askPlaceholder: "প্রশ্ন করুন… (বাংলা বা ইংরেজি)",
  ask: "জিজ্ঞাসা",
  run: "চালান",
  analyticsPlaceholder: "যেমন: লাইন অনুযায়ী মোট আউটপুট",
  sources: (n: number) => `উৎস (${n})`,
  newAuditCheck: "নতুন অডিট প্রস্তুতি পরীক্ষা",
  createAssessment: "অ্যাসেসমেন্ট তৈরি করুন",
  assessments: "অ্যাসেসমেন্ট",
  noAssessments: "এখনো অ্যাসেসমেন্ট নেই — উপরে তৈরি করুন।",
  autoAssess: "অটো-মূল্যায়ন",
  binder: "বাইন্ডার",
  assessing: (ref: string) => `${ref} মূল্যায়ন চলছে…`,
  selectItemHint: "প্রমাণ দেখতে নিচের আইটেমে ক্লিক করুন।",
  draftCap: "ক্যাপ খসড়া",
  aiNotes: "এআই নোট:",
  evidence: "প্রমাণ:",
  exampleTitle: "যেমন: ক্রেতা অডিট প্রস্তুতি — নভেম্বর",
};

const dictionaries: Record<Lang, Dict> = { en, bn };

export function t(lang: Lang): Dict {
  return dictionaries[lang] ?? en;
}

export const LANG_STORAGE_KEY = "mios_lang";

export function loadLang(): Lang {
  if (typeof window === "undefined") return "en";
  return localStorage.getItem(LANG_STORAGE_KEY) === "bn" ? "bn" : "en";
}

export function saveLang(lang: Lang): void {
  localStorage.setItem(LANG_STORAGE_KEY, lang);
}
