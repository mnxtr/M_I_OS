export interface Citation {
  document_id: string;
  document_name: string;
  page: number;
  chunk_index: number;
  snippet: string;
}

export interface ChatMetadata {
  provider: string;
  model: string;
  trace_id: string;
  confidence: number;
  evidence_coverage: number;
  freshness: string;
  suggested_actions: string[];
}

export interface ChatResponse extends ChatMetadata {
  answer: string;
  citations: Citation[];
  limitations: string[];
  latency_ms: number;
}

const FIRE_CITATION: Citation = {
  document_id: "seed-fire-safety-sop",
  document_name: "Fire Safety SOP — Pilot.pdf",
  page: 12,
  chunk_index: 4,
  snippet: "Monthly exit inspection records and quarterly drill evidence must be retained.",
};

const PRODUCTION_CITATION: Citation = {
  document_id: "seed-production-report",
  document_name: "August Production Review.xlsx",
  page: 1,
  chunk_index: 7,
  snippet: "Line 07 missed target on three shifts; changeover delay was the largest recorded loss.",
};

export function createSeededChatResponse(question: string): ChatResponse {
  const normalized = question.toLocaleLowerCase();
  const isFire = /fire|আগুন|ফায়ার|audit|অডিট/.test(normalized);
  const isBangla = /[\u0980-\u09ff]/.test(question);
  const citation = isFire ? FIRE_CITATION : PRODUCTION_CITATION;
  const answer = isBangla
    ? isFire
      ? "পাইলট প্রমাণ অনুযায়ী মাসিক এক্সিট পরিদর্শনের রেকর্ড এবং ত্রৈমাসিক ড্রিলের প্রমাণ সংরক্ষণ করতে হবে। সব প্রয়োজনীয় রেকর্ড হালনাগাদ আছে কি না সিডেড ওয়ার্কস্পেস নিশ্চিত করতে পারে না, তাই ঘাটতি বন্ধ করার আগে উদ্ধৃত SOP ও সর্বশেষ ড্রিল রেজিস্টার যাচাই করুন। [doc:Fire Safety SOP — Pilot.pdf p.12]"
      : "সিডেড উৎপাদন পর্যালোচনায় লক্ষ্য পূরণ না হওয়া তিনটি শিফটে Line 07-এর চেঞ্জওভার বিলম্বকে হারানো আউটপুটের সবচেয়ে বড় কারণ হিসেবে দেখানো হয়েছে। অ্যাকশন তৈরির আগে শিফট লগ ও বর্তমান লাইনের অবস্থা যাচাই করুন। [doc:August Production Review.xlsx p.1]"
    : isFire
      ? "The pilot evidence shows that monthly exit-inspection records and quarterly drill evidence should be retained. The seeded workspace cannot confirm that every required record is current, so review the cited SOP and the latest drill register before closing the gap. [doc:Fire Safety SOP — Pilot.pdf p.12]"
      : "The seeded production review identifies Line 07 changeover delay as the largest recorded contributor to lost output across three below-target shifts. Confirm the shift log and current line conditions before creating an action. [doc:August Production Review.xlsx p.1]";

  return {
    answer,
    citations: [citation],
    provider: "seeded-pilot",
    model: "deterministic-evidence-demo",
    trace_id: crypto.randomUUID(),
    confidence: 0.72,
    evidence_coverage: 0.5,
    freshness: "seeded-demo",
    limitations: [
      isBangla
        ? "এই উত্তরটি লাইভ OpenAI অনুরোধ নয়; সিডেড পাইলট প্রমাণ ব্যবহার করছে।"
        : "This response uses seeded pilot evidence, not a live OpenAI request.",
    ],
    suggested_actions: [
      isBangla
        ? "অপারেশনাল অ্যাকশন অনুমোদনের আগে উদ্ধৃত প্রমাণ যাচাই করুন।"
        : "Review the cited evidence before approving an operational action.",
    ],
    latency_ms: 0,
  };
}
