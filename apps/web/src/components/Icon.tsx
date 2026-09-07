type IconName = "overview" | "knowledge" | "assistant" | "facility" | "arrow";
const paths: Record<IconName, string> = {
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  knowledge: "M4 4h6l2 3h8v13H4z M8 11h8 M8 15h6",
  assistant: "M4 4h16v12H9l-5 4z M8 8h8 M8 12h5",
  facility: "M3 21V9l6 3V7l6 3V3h6v18z M7 16v2 M12 16v2 M17 16v2",
  arrow: "M5 12h14 M13 6l6 6-6 6",
};
export default function Icon({ name }: { name: IconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
