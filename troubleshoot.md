# Troubleshoot: Status Column Shows "Not Found" Even When the SBU Name Looks Correct

## The Short Answer

The matching logic in the code compares names using **exact string equality** — after converting both sides to lowercase and trimming leading/trailing spaces. So if a single character is different anywhere — an extra space in the middle, a different bracket style, a hidden character — the match fails silently and the row is marked "Not Found".

---

## Where the Matching Happens in the Code

File: `/src/app/components/import/ImportDataPage.tsx`, around line 750.

```ts
const norm  = r.business.toLowerCase().trim();
const match = businesses.find(b => b.name.toLowerCase().trim() === norm);
```

What this does, step by step:

1. Takes the business name from your CSV row (`r.business`)
2. Converts it to lowercase and strips leading/trailing spaces
3. Fetches the full list of active businesses from the `businesses` table in Supabase
4. Tries to find **one exact match** against each `b.name` (also lowercased and trimmed)
5. If found → `matchStatus = 'matched'`
6. If not found → `matchStatus = 'unmatched'` → row shows **"Not Found"** and is **skipped** during import

The problem is that `.trim()` only removes spaces at the **very beginning and very end** of the string. It does **not** fix spaces in the middle, double spaces, tab characters, non-breaking spaces, or any other invisible characters.

---

## The Most Common Causes — One by One

---

### Cause 1 — Extra space in the middle of the name

**Example:**

| CSV name | Database name |
|---|---|
| `ACI  Foods` (two spaces) | `ACI Foods` (one space) |

The lowercase + trim step cannot catch this. Both strings end up different.

**How to check:**
Open your CSV in a text editor (not Excel — Excel hides extra spaces). Look carefully at any SBU name showing "Not Found" and count the spaces inside the name.

**Fix in the database:**
```sql
UPDATE businesses
SET name = regexp_replace(name, '\s+', ' ', 'g')
WHERE name ~ '\s{2,}';
```
This collapses any run of multiple spaces into one, across all names in the table.

**Permanent fix in the code** (normalise both sides before comparing):
```ts
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const match = businesses.find(b => norm(b.name) === norm(r.business));
```

---

### Cause 2 — Trailing space inside the CSV value that `.trim()` misses

Wait — doesn't `.trim()` remove trailing spaces? Yes, but **only if the CSV was parsed correctly**.

If your CSV has values wrapped in quotes like `"ACI Foods "`, some parsers include the space *inside* the quotes as part of the value, and `.trim()` does catch that one. But if the CSV has an embedded non-breaking space (`\u00A0`) — which Excel sometimes inserts — `.trim()` does **not** remove it because `\u00A0` is not a regular ASCII space.

**How to check:**
In your browser's developer console (F12 → Console), paste this while the page is open after uploading the file:

```js
// This will print the exact character codes for the first "Not Found" row name
// Replace 0 with the index of the Not Found row
```

Or simply retype the SBU name manually in a plain text file and compare character counts.

**Fix in the code:**
```ts
const norm = (s: string) =>
  s.replace(/[\u00A0\u200B\uFEFF]/g, ' ')  // replace non-breaking spaces etc.
   .replace(/\s+/g, ' ')
   .toLowerCase()
   .trim();
```

---

### Cause 3 — The name in the `businesses` table has `is_active = false`

The code fetches businesses with this query:

```ts
supabase
  .from('businesses')
  .select('id,name')
  .eq('is_active', true)   // ← only active businesses are loaded
```

If the SBU was marked inactive in the database — even by accident — it will not appear in the matching list at all, so any CSV row for that SBU will always show "Not Found".

**How to check:**
```sql
SELECT id, name, is_active
FROM businesses
WHERE name ILIKE '%ACI Foods%';  -- replace with the actual SBU name
```

**Fix:**
```sql
UPDATE businesses SET is_active = true WHERE name = 'ACI Foods';
```

---

### Cause 4 — The name in the database uses a different character for brackets or dashes

**Examples:**

| CSV | Database |
|---|---|
| `ACI Salt (BD)` | `ACI Salt [BD]` |
| `ACI Agri–Business` (en-dash) | `ACI Agri-Business` (hyphen) |
| `ACI Consumer Brands` | `ACI Consumer Brands Ltd.` |

These look identical on screen but are different strings. The `===` check will fail.

**How to check:**
```sql
SELECT name FROM businesses ORDER BY name;
```
Copy the exact name from this result into your CSV (or the other way around) to guarantee they match.

---

### Cause 5 — The business simply does not exist in the `businesses` table yet

If an SBU was recently added to your reporting scope but nobody has added it to the `businesses` table in Supabase, it will always be "Not Found" — legitimately.

**How to check:**
```sql
SELECT COUNT(*) FROM businesses WHERE is_active = true;
```
If the count is less than 55, some SBUs are missing.

**Fix — add the missing SBU:**
```sql
INSERT INTO businesses (name, sbu_code, is_active, sort_order)
VALUES ('New SBU Name', 'NEW001', true, 56);
```

---

### Cause 6 — The `businesses` table data has not loaded yet when the CSV is parsed

This is a **race condition**. The page loads the businesses list from Supabase asynchronously (it happens in the background). If you upload a CSV file **very quickly** right after opening the page — before the businesses list has finished loading — the matching runs against an **empty array**, and every single row is marked "Not Found".

**How to recognise it:**
Every single row shows "Not Found", not just a few. And if you remove the file and re-upload it a moment later, the matches appear correctly.

**Fix in the code** — disable the upload zone until businesses are loaded:
```tsx
// Add a loading state
const [bizLoaded, setBizLoaded] = useState(false);

// In the useEffect that fetches businesses:
.then(({ data }) => {
  if (data) setBusinesses(data as Business[]);
  setBizLoaded(true);  // mark as ready
});

// Conditionally disable the drop zone:
<FileDropZone
  file={file}
  onFile={bizLoaded ? handleFile : () => {}}
  onClear={handleClear}
  disabled={!bizLoaded}
/>
```

---

## Quick Diagnostic Checklist

Run through this list whenever you see unexpected "Not Found" rows:

- [ ] **Open the CSV in a plain text editor** (Notepad, VS Code — not Excel). Look at the exact characters in the "Not Found" SBU names.
- [ ] **Query the database** with `SELECT name FROM businesses WHERE is_active = true ORDER BY name;` and compare each name character-for-character with the CSV.
- [ ] **Check `is_active`** — run `SELECT name, is_active FROM businesses;` and confirm the SBU is `true`.
- [ ] **Check for double spaces** inside names — use `SELECT name FROM businesses WHERE name LIKE '%  %';` (two spaces in the LIKE pattern).
- [ ] **Try re-uploading** the CSV after waiting 3–5 seconds on the page (rules out the race condition).
- [ ] **Count active businesses** — `SELECT COUNT(*) FROM businesses WHERE is_active = true;` — confirm you have 55 rows.

---

## The Safest Long-Term Fix

Replace the strict equality in the matching function with a **normalised comparison** that handles all the invisible-character cases at once. In `ImportDataPage.tsx`, change line ~752:

**Before:**
```ts
const norm  = r.business.toLowerCase().trim();
const match = businesses.find(b => b.name.toLowerCase().trim() === norm);
```

**After:**
```ts
const norm = (s: string) =>
  s.replace(/[\u00A0\u200B\uFEFF\t]/g, ' ')  // non-breaking space, zero-width, BOM, tab → regular space
   .replace(/\s+/g, ' ')                       // collapse multiple spaces into one
   .toLowerCase()
   .trim();

const rowNorm = norm(r.business);
const match   = businesses.find(b => norm(b.name) === rowNorm);
```

This one change will silently fix Causes 1, 2, and most of 4 without any change to the database.

---

*Last updated: 23 Apr 2026*
