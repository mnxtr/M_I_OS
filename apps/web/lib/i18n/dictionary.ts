import type { Lang } from "@mios/shared";
import { en, type Dict } from "./en";
import { bn } from "./bn";

const dictionaries: Record<Lang, Dict> = { en, bn };

export function getDict(lang: Lang): Dict {
  return dictionaries[lang] ?? en;
}

export type { Dict };
export { en, bn };
