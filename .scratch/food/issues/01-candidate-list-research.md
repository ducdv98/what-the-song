# Draft the candidate Dish list

Status: ready-for-agent

Draft about 80 candidate Dishes as a seed file at `.scratch/food/candidates.jsonl` (and a short human-readable table in `.scratch/food/candidates.md`). Each has: Vietnamese name, proposed Aliases, proposed Tier (national fame), region (Bắc, Trung, Nam, Tây Nguyên, Toàn quốc), and a Wikimedia Commons file URL with licence. Follow the `research` skill: primary sources, Commons for licences.

- Balance across the five Tiers (fewer impossible) and the regions; include traditional and regional dishes (Tết, Huế court food, Tây Nguyên specialties) as well as everyday street food, drinks and desserts.
- Only include a Dish if a CC BY, CC BY-SA or CC0 photo exists where the dish is clearly the main subject. Record the licence and author.
- Flag Alias collisions: no Alias may equal another Dish's name or Alias after accent folding.
- Flag any Dish whose region is uncertain; default to Toàn quốc.

## Done when
- The list exists, every entry has a verified Commons URL and licence, and the owner can review it by table.
- The owner corrects Tiers, regions and Aliases before issue 05 starts.

## Comments

Drafted 80 candidates (`candidates.jsonl`, `candidates.md`); every Commons licence and author read from the API. Waiting on the owner's review of Tiers, regions, Aliases, Credit wording, and the thin Tây Nguyên set, then issue 05.
