## UI Pro Max Stack Guidelines
**Stack:** nextjs | **Query:** images metadata loading navigation accessibility
**Source:** stacks/nextjs.csv | **Found:** 5 results

### Result 1
- **Category:** Metadata
- **Guideline:** Include OpenGraph images
- **Description:** Add OG images for social sharing
- **Do:** opengraph-image.tsx or og property
- **Don't:** Missing social preview images
- **Code Good:** opengraph: { images: ['/og.png'] }
- **Code Bad:** No OG configuration
- **Severity:** Medium
- **Docs URL:**

### Result 2
- **Category:** Routing
- **Guideline:** Handle loading states
- **Description:** Use loading.tsx for route loading UI
- **Do:** loading.tsx alongside page.tsx
- **Don't:** Manual loading state management
- **Code Good:** app/dashboard/loading.tsx
- **Code Bad:** useState for loading in page
- **Severity:** Medium
- **Docs URL:** https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming

### Result 3
- **Category:** Images
- **Guideline:** Use next/image for optimization
- **Description:** Automatic image optimization and lazy loading
- **Do:** <Image> component for all images
- **Don't:** <img> tags directly
- **Code Good:** <Image src={} alt={} width={} height={}>
- **Code Bad:** <img src={}/>
- **Severity:** High
- **Docs URL:** https://nextjs.org/docs/app/building-your-application/optimizing/images

### Result 4
- **Category:** Metadata
- **Guideline:** Use metadata API
- **Description:** Export metadata object for static metadata
- **Do:** export const metadata = {}
- **Don't:** Manual head tags
- **Code Good:** export const metadata = { title: 'Page' }
- **Code Bad:** <head><title>Page</title></head>
- **Severity:** Medium
- **Docs URL:**

### Result 5
- **Category:** Link
- **Guideline:** Use next/link for navigation
- **Description:** Client-side navigation with prefetching
- **Do:** <Link href=""> for internal links
- **Don't:** <a> for internal navigation
- **Code Good:** <Link href="/about">About</Link>
- **Code Bad:** <a href="/about">About</a>
- **Severity:** High
- **Docs URL:** https://nextjs.org/docs/app/api-reference/components/link
