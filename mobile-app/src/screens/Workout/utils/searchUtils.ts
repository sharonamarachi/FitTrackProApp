import { exercisesData } from "../../../data/exercises";

export const getShortName = (name: string): string => {
  let short = name.trim();
  short = short.replace(
    /^(FYR\d?\s|KV\s|30\s|MetaBurn\s|Holman\s|Dumbbell Fix\s|FYR\s|HM\s|FYR2\s)/gi,
    "",
  );
  short = short.replace(/\s-\s.*$/gi, "");
  short = short.replace(/\s\(.*\)/gi, "");
  short = short.replace(/high-cable/gi, "Cable");
  short = short.replace(/low-cable/gi, "Cable");
  short = short.replace(/outward-facing/gi, "");
  short = short.replace(/inward-facing/gi, "");
  short = short.replace(/single-arm/gi, "Single-arm");
  short = short.replace(/one-arm/gi, "Single-arm");
  short = short.replace(/biceps/gi, "Bicep");
  short = short.replace(/\s+/g, " ").trim();
  return short
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

export const weightedSearch = (query: string) => {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const words = q.split(/\s+/);

  return exercisesData
    .map((item: any) => {
      const name = item["Exercise Name"].toLowerCase();
      let score = 0;
      if (name === q) score += 100;
      if (name.startsWith(q)) score += 50;
      const nameWords = name.split(/\s+/);
      words.forEach((word) => {
        if (nameWords.some((nw) => nw.startsWith(word))) score += 20;
        if (name.includes(word)) score += 5;
      });
      return { item, score };
    })
    .filter((res) => res.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15) // Increased slice for more suggestions
    .map((res) => res.item);
};
