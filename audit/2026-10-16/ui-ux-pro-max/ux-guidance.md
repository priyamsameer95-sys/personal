## UI Pro Max Search Results
**Domain:** ux | **Query:** keyboard focus touch target image dialog contrast
**Source:** ux-guidelines.csv | **Found:** 6 results

### Result 1
- **Category:** Interaction
- **Issue:** Focus States
- **Platform:** All
- **Description:** Keyboard users need visible focus indicators
- **Do:** Use visible focus rings on interactive elements
- **Don't:** Remove focus outline without replacement
- **Code Example Good:** focus:ring-2 focus:ring-blue-500
- **Code Example Bad:** outline-none without alternative
- **Severity:** High

### Result 2
- **Category:** Touch
- **Issue:** Touch Target Size
- **Platform:** Mobile
- **Description:** Small buttons are hard to tap accurately
- **Do:** Minimum 44x44px touch targets
- **Don't:** Tiny clickable areas
- **Code Example Good:** min-h-[44px] min-w-[44px]
- **Code Example Bad:** w-6 h-6 buttons
- **Severity:** High

### Result 3
- **Category:** Typography
- **Issue:** Contrast Readability
- **Platform:** All
- **Description:** Body text needs good contrast
- **Do:** Use darker text on light backgrounds
- **Don't:** Gray text on gray background
- **Code Example Good:** text-gray-900 on white
- **Code Example Bad:** text-gray-400 on gray-100
- **Severity:** High

### Result 4
- **Category:** Accessibility
- **Issue:** Keyboard Navigation
- **Platform:** Web
- **Description:** All functionality accessible via keyboard
- **Do:** Tab order matches visual order
- **Don't:** Keyboard traps or illogical tab order
- **Code Example Good:** tabIndex for custom order
- **Code Example Bad:** Unreachable elements
- **Severity:** High

### Result 5
- **Category:** Touch
- **Issue:** Touch Spacing
- **Platform:** Mobile
- **Description:** Adjacent touch targets need adequate spacing
- **Do:** Minimum 8px gap between touch targets
- **Don't:** Tightly packed clickable elements
- **Code Example Good:** gap-2 between buttons
- **Code Example Bad:** gap-0 or gap-1
- **Severity:** Medium

### Result 6
- **Category:** Accessibility
- **Issue:** Color Contrast
- **Platform:** All
- **Description:** Text must be readable against background
- **Do:** Minimum 4.5:1 ratio for normal text
- **Don't:** Low contrast text
- **Code Example Good:** #333 on white (7:1)
- **Code Example Bad:** #999 on white (2.8:1)
- **Severity:** High
