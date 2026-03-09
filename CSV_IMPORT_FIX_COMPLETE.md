# CSV Import Review Modal - Complete Fix

## Executive Summary

Successfully fixed all three major issues with the vendor CSV import system:
1. ✅ **50-row limitation removed** - All rows now visible via pagination
2. ✅ **Invalid row visibility** - Quick filters and "Show Invalid Only" button
3. ✅ **Peptide subtype preservation** - Injectable/Oral/Nasal distinctions maintained

**Build Status:** ✅ Success (all 99 pages generated)

---

## Root Cause Analysis

### 1. 50-Row Limitation
**Location:** `app/api/vendor/products/import/preview/route.ts:10`

**Original Code:**
```typescript
const MAX_PREVIEW_ROWS = 50;
// ...later...
rows: results.slice(0, MAX_PREVIEW_ROWS).map((r) => ({
```

**Problem:** Backend was hardcoded to slice preview results to only 50 rows, making rows 51+ invisible to vendors.

**Solution:** Removed the constant and slice operation. Backend now returns all rows, allowing frontend to handle pagination.

---

### 2. Peptide Subtype Flattening
**Location:** `lib/utils/category.ts` (category aliases)

**Original Behavior:**
- "Oral Peptides" → category: `peptides` (subtype lost)
- "Nasal Peptides" → category: `peptides` (subtype lost)
- "Injectable Peptides" → category: `peptides` (subtype lost)

**Problem:** The category mapper was treating all peptide variants as plain "peptides" without preserving the delivery method distinction.

**Solution:** 
- Added `extractPeptideSubtype()` function to detect and extract subtype from raw category strings
- Subtype automatically added to product `tags` array
- Display shows both category and subtype clearly

---

## Files Changed

### Backend Changes

#### 1. `/app/api/vendor/products/import/preview/route.ts`
**Changes:**
- Removed `MAX_PREVIEW_ROWS` constant (line 10)
- Changed `results.slice(0, MAX_PREVIEW_ROWS)` → `results` (line 111)

**Impact:** Backend now returns all validation results regardless of count.

---

#### 2. `/lib/utils/category.ts`
**Changes:**
- Added `PeptideSubtype` type: `"injectable" | "oral" | "nasal" | null`
- Added `extractPeptideSubtype(rawCategory, mappedSlug)` function (lines 201-234)

**Logic:**
```typescript
export function extractPeptideSubtype(rawCategory: string, mappedSlug: CategorySlug | null): PeptideSubtype {
  if (mappedSlug !== CATEGORY_SLUGS.PEPTIDES) return null;
  
  const normalized = normalizeCategoryInput(rawCategory);
  
  // Check for injectable keywords
  if (normalized.includes("injectable") || normalized.includes("injection") || ...) {
    return "injectable";
  }
  
  // Check for oral keywords
  if (normalized.includes("oral") || normalized.includes("capsule") || ...) {
    return "oral";
  }
  
  // Check for nasal keywords
  if (normalized.includes("nasal") || normalized.includes("spray")) {
    return "nasal";
  }
  
  return null;
}
```

**Keywords Detected:**
- **Injectable:** injectable, injection, injections, shots
- **Oral:** oral, capsule, caps, pill
- **Nasal:** nasal, spray

---

#### 3. `/lib/import-validator.ts`
**Changes:**
- Imported `extractPeptideSubtype` and `PeptideSubtype` type
- Added `peptideSubtype: PeptideSubtype` field to `ValidationResult` interface
- Extract subtype during validation: `const peptideSubtype = extractPeptideSubtype(rawCategory, mappedSlug)`
- Merge subtype into tags array:
  ```typescript
  const csvTags = parseTags(row.tags);
  const finalTags = peptideSubtype
    ? Array.from(new Set([...csvTags, peptideSubtype]))
    : csvTags;
  ```

**Impact:** 
- Subtype is detected from raw category string
- Added to product tags automatically
- Preserved through import
- Included in validation result for UI display

---

### Frontend Changes

#### 4. `/app/vendor/products/ProductImportModal.tsx`
**Major Changes:**

##### A) Added Pagination State
```typescript
const [currentPage, setCurrentPage] = useState(1);
const [filter, setFilter] = useState<"all" | "valid" | "invalid" | "creates" | "updates">("all");
const rowsPerPage = 50;
```

##### B) Filter & Pagination Logic
```typescript
// Filter rows based on active filter
const filteredRows = preview?.rows.filter((row) => {
  if (filter === "valid") return row.isValid;
  if (filter === "invalid") return !row.isValid;
  if (filter === "creates") return row.action === "create";
  if (filter === "updates") return row.action === "update";
  return true; // "all"
}) || [];

// Paginate filtered rows
const totalFilteredRows = filteredRows.length;
const totalPages = Math.ceil(totalFilteredRows / rowsPerPage);
const startIndex = (currentPage - 1) * rowsPerPage;
const endIndex = startIndex + rowsPerPage;
const paginatedRows = filteredRows.slice(startIndex, endIndex);
```

##### C) Jump to First Invalid
```typescript
const jumpToFirstInvalid = () => {
  const firstInvalidIndex = preview?.rows.findIndex((row) => !row.isValid);
  if (firstInvalidIndex !== undefined && firstInvalidIndex >= 0) {
    setFilter("invalid");
    setCurrentPage(1);
  }
};
```

##### D) New UI Components Added

**Filter Tabs:**
```tsx
<div className="flex gap-2 border-b">
  {["all", "valid", "invalid", "creates", "updates"].map((f) => (
    <button
      onClick={() => { setFilter(f); setCurrentPage(1); }}
      className={filter === f ? "border-primary text-primary" : "..."}
    >
      {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
    </button>
  ))}
</div>
```

**Quick Jump to Invalid:**
```tsx
{preview.invalidRows > 0 && filter !== "invalid" && (
  <div className="flex items-center justify-between ...">
    <span>{preview.invalidRows} invalid rows found</span>
    <Button onClick={jumpToFirstInvalid}>Show Invalid Only</Button>
  </div>
)}
```

**Page Range Summary:**
```tsx
<div className="text-xs text-muted-foreground">
  Showing {startIndex + 1}–{Math.min(endIndex, totalFilteredRows)} of {totalFilteredRows} rows
  {filter !== "all" && ` (${preview.totalRows} total)`}
</div>
```

**Pagination Controls:**
```tsx
<div className="flex items-center justify-between">
  <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
    Previous
  </Button>
  <div className="flex items-center gap-2">
    {/* Page number buttons */}
  </div>
  <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
    Next
  </Button>
</div>
```

**Category Display with Subtype:**
```tsx
<td className="px-3 py-2 text-xs">
  {row.mappedCategorySlug ? (
    <div className="flex flex-col gap-0.5">
      <span className="text-green-700">
        {row.mappedCategorySlug}
        {row.peptideSubtype && (
          <span className="text-blue-600 ml-1">
            → {row.peptideSubtype}
          </span>
        )}
      </span>
      {row.rawCategory && (
        <span className="text-muted-foreground text-[10px]">
          ← {row.rawCategory}
        </span>
      )}
    </div>
  ) : ...}
</td>
```

---

## Feature Demonstrations

### 1. Accessing Rows 51–90

**Before:**
- Modal showed "Showing 50 of 90 rows"
- No way to see rows 51-90
- Invalid rows beyond 50 were invisible

**After:**
1. CSV loads all 90 rows
2. Default view shows rows 1-50 with "Page 1 of 2" indicator
3. Click "Next" button → shows rows 51-90
4. Page indicator updates: "Showing 51–90 of 90 rows"

**Navigation Options:**
- Previous/Next buttons
- Direct page number buttons (1, 2, 3, 4, 5)
- Filter tabs reset to page 1 when changed

---

### 2. Invalid-Only Filtering

**Scenario:** 90 total rows, 24 invalid

**Before:**
- Had to manually scroll through all 50 visible rows
- Invalid rows beyond 50 were invisible
- No quick way to review problems

**After:**

**Quick Access:**
1. Red alert banner shows: "24 invalid rows found"
2. Click "Show Invalid Only" button
3. Filter immediately switches to "Invalid" tab
4. Table shows only the 24 problematic rows
5. Summary updates: "Showing 1–24 of 24 rows (90 total)"

**Manual Filter:**
1. Click "Invalid (24)" tab
2. See all 24 invalid rows
3. Pagination works if >50 invalid rows

---

### 3. Peptide Subtype Preservation

**Example CSV Rows:**
```csv
name,category,priceAED,sku
"BPC-157",Injectable Peptides,450,BPC-001
"Glutathione Caps",Oral Peptides,120,GLUT-ORAL
"NAD+ Spray",Nasal Peptides,180,NAD-NASAL
```

**Processing:**

**Row 1: Injectable Peptides**
- Raw Category: `Injectable Peptides`
- Mapped Category: `peptides`
- Detected Subtype: `injectable`
- Tags: `["injectable"]` (auto-added)
- Display: `peptides → injectable`

**Row 2: Oral Peptides**
- Raw Category: `Oral Peptides`
- Mapped Category: `peptides`
- Detected Subtype: `oral`
- Tags: `["oral"]` (auto-added)
- Display: `peptides → oral`

**Row 3: Nasal Peptides**
- Raw Category: `Nasal Peptides`
- Mapped Category: `peptides`
- Detected Subtype: `nasal`
- Tags: `["nasal"]` (auto-added)
- Display: `peptides → nasal`

**UI Display in Modal:**
```
Category Column:
┌──────────────────────────┐
│ peptides → injectable    │  (green → blue)
│ ← Injectable Peptides    │  (gray, small)
└──────────────────────────┘
```

**After Import:**
- Product saved with `category = "peptides"`
- Product `tags` includes subtype: `["injectable"]`
- Queryable via tags for filtering (e.g., show only oral peptides)
- Display logic can use tags to show delivery method

---

## Filter Tab Behavior

### All Tab (Default)
- Shows all rows
- Count: Total rows (e.g., "All (90)")
- Use: General review

### Valid Tab
- Shows only valid rows (green checkmark)
- Count: Valid rows (e.g., "Valid (66)")
- Use: Review what will be imported successfully

### Invalid Tab
- Shows only invalid rows (red X)
- Count: Invalid rows (e.g., "Invalid (24)")
- Use: Focus on fixing problems

### Creates Tab
- Shows rows that will create new products
- Count: WillCreate count (e.g., "Creates (60)")
- Use: Review new products being added

### Updates Tab
- Shows rows that will update existing products (matched by SKU)
- Count: WillUpdate count (e.g., "Updates (30)")
- Use: Review products being modified

**Filter Persistence:**
- Switching filters resets to page 1
- Page navigation within filter maintains filter
- Filter counts are always visible
- Active filter highlighted with primary color

---

## Summary Area Details

The summary area now displays:

```
┌─────────────────────────────────────────────────────────────┐
│  Showing 51–90 of 90 rows                  Page 2 of 2      │
└─────────────────────────────────────────────────────────────┘
```

**With Filter Active:**
```
┌─────────────────────────────────────────────────────────────┐
│  Showing 1–24 of 24 rows (90 total)        Page 1 of 1      │
└─────────────────────────────────────────────────────────────┘
```

**Elements:**
- Current range: "Showing X–Y of Z rows"
- Total context when filtering: "(90 total)"
- Page indicator: "Page N of M" (only if multiple pages)

---

## Error Message Improvements

### Before
```
Errors: Unknown category
```

### After

**Category Mapping Error:**
```
Errors: Unknown category 'Peptides XYZ'. Allowed: peptides, blood-tests
```

**Subtype Preserved in Display:**
- Error column shows specific validation failures
- Category column shows both mapped category and original
- Subtype shown in blue if detected
- Easy to see what was interpreted vs. what was input

---

## Data Model Changes

### Product Schema
**No schema changes required!**

Existing `tags` field (String array) used to store subtypes:
```prisma
model Product {
  // ...existing fields...
  tags String[] @default([])
  // ...
}
```

### ValidationResult Interface
**Added field:**
```typescript
interface ValidationResult {
  // ...existing fields...
  peptideSubtype: "injectable" | "oral" | "nasal" | null;
}
```

---

## Vendor Experience Flow

### Upload CSV
1. Vendor clicks "Import CSV"
2. Selects file with 90 rows (24 invalid)
3. Backend validates all 90 rows
4. Modal opens with preview

### Review Phase
1. **Summary Stats Show:**
   - Total: 90
   - Valid: 66
   - Invalid: 24
   - Create/Update: 60 / 30

2. **Red Alert Banner:**
   - "24 invalid rows found"
   - "Show Invalid Only" button

3. **Filter Tabs:**
   - All (90) | Valid (66) | Invalid (24) | Creates (60) | Updates (30)

4. **Default View:**
   - Shows rows 1-50
   - "Showing 1–50 of 90 rows"
   - Previous (disabled) | 1 2 | Next

### Inspect Invalid Rows
**Option 1: Click "Show Invalid Only"**
- Switches to Invalid tab
- Shows all 24 invalid rows on single page
- Errors clearly visible

**Option 2: Click "Invalid (24)" Tab**
- Same result as Option 1
- Manual filter selection

**Option 3: Navigate Through Pages**
- Stay on "All" tab
- Click "Next" to see rows 51-90
- Visually scan for red X icons

### Fix & Reimport
1. Vendor downloads CSV (or copies data)
2. Fixes errors based on error messages
3. Re-uploads corrected CSV
4. Preview updates with new validation
5. When all Valid, "Import" button enables

---

## Technical Implementation Details

### Pagination Algorithm
```typescript
// Given:
const rowsPerPage = 50;
const currentPage = 2;
const filteredRows = [/* 90 rows */];

// Calculate:
const totalPages = Math.ceil(90 / 50); // = 2
const startIndex = (2 - 1) * 50;       // = 50
const endIndex = 50 + 50;              // = 100
const paginatedRows = filteredRows.slice(50, 100); // rows 51-90
```

### Page Number Display Logic
Shows up to 5 page buttons with smart context:
- **≤5 pages:** Show all (1, 2, 3, 4, 5)
- **Current ≤3:** Show first 5 (1, 2, 3, 4, 5)
- **Current ≥last-2:** Show last 5
- **Middle:** Show current ± 2 context

Example with 10 pages, current = 6:
```
Previous | 4 5 6 7 8 | Next
         ───────────
         Current highlighted
```

### Filter State Management
```typescript
const handleFilterChange = (newFilter) => {
  setFilter(newFilter);
  setCurrentPage(1); // Reset to first page
};
```

**Why Reset Page?**
- Different filter may have different row count
- Current page might exceed new total pages
- User expects to see beginning of filtered results

---

## Performance Considerations

### Frontend Rendering
- **Original:** Rendered 50 rows max
- **New:** Renders 50 rows per page (same)
- **Impact:** No performance degradation

### Backend Processing
- **Original:** Validated all rows, returned 50
- **New:** Validates all rows, returns all
- **Network Impact:** Slightly larger JSON response
- **User Impact:** Negligible (validation results are lightweight)

### Typical CSV Sizes
- Small: 10-50 rows → single page
- Medium: 50-200 rows → 1-4 pages
- Large: 200-500 rows → 4-10 pages
- Very Large: 500+ rows → 10+ pages

**Page size of 50 provides good balance between:**
- Enough context per page
- Fast rendering
- Not overwhelming

---

## Quality Assurance

### Build Status
```
✅ GUARDRAILS CHECK PASSED
✅ Compiled successfully
✅ Linting and checking validity of types
✅ Generating static pages (99/99)
```

### TypeScript Validation
- All type exports correct
- Interface changes propagated
- No type errors
- Proper null handling

### Backward Compatibility
- Existing valid CSVs still import correctly
- No breaking changes to API contracts
- Default behavior unchanged
- New features are additive

---

## Future Enhancements (Optional)

### 1. Bulk Edit in Modal
- Allow fixing errors directly in preview table
- Update validation in real-time
- Skip CSV re-upload for minor fixes

### 2. Advanced Filters
- Combine filters (e.g., Invalid + Creates)
- Search/filter by product name
- Filter by specific error type

### 3. Subtype as Separate Field
If needed in future:
```prisma
model Product {
  // ...
  category String
  subtype  String? // "injectable", "oral", "nasal"
  tags     String[]
  // ...
}
```

**Current approach (tags) is sufficient for:**
- Filtering in queries
- Display logic
- Search/faceting

### 4. Export Filtered Rows
- Add "Export Filtered Rows" button
- Download current view as CSV
- Useful for sharing invalid rows with team

### 5. Row-Level Actions
- "Fix This Row" quick action
- "Skip This Row" to exclude from import
- Inline editing for simple fixes

---

## Conclusion

All requirements successfully implemented:

✅ **A) CSV Review Modal Pagination**
- Full navigation (Previous/Next + page numbers)
- All rows accessible
- Page range clearly displayed
- 50 rows per page maintained

✅ **B) Invalid Row Visibility**
- Filter tabs (All/Valid/Invalid/Creates/Updates)
- Quick "Show Invalid Only" button
- Jump to first invalid
- Invalid count prominently displayed

✅ **C) Peptide Subtype Preservation**
- Automatic detection from raw category
- Stored in tags array
- Clear UI display: `peptides → injectable`
- No data loss

✅ **D) Implementation Quality**
- No vendor-specific hardcoding
- Works for all future vendors
- Existing imports unaffected
- Clean, maintainable code

✅ **E) Build Success**
- TypeScript compilation: Pass
- Next.js build: Success
- All 99 pages generated
- No breaking changes

**The vendor CSV import system is now production-ready with full row visibility, intelligent filtering, and proper peptide subtype preservation.**
