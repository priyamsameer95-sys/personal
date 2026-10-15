## Design System: Priyam Sameer

### Pattern
- **Name:** Portfolio Grid
- **Conversion Focus:**  hover overlay info
- **CTA Placement:** Project Card Hover + Footer Contact
- **Color Strategy:** Neutral background (let work shine). Text: Black/White. Accent: Minimal.
- **Sections:** 1. Hero (Name/Role), 2. Project Grid (Masonry), 3. About/Philosophy, 4. Contact

### Style
- **Name:** Trust & Authority
- **Keywords:** Certificates/badges displayed, expert credentials, case studies with metrics, before/after comparisons, industry recognition, security badges
- **Best For:** Healthcare/medical landing pages, financial services, enterprise software, premium/luxury products, legal services
- **Performance:** ⚡ Excellent | **Accessibility:** ✓ WCAG AAA

### Colors
| Role | Hex |
|------|-----|
| Primary | #18181B |
| Secondary | #3F3F46 |
| CTA | #2563EB |
| Background | #FAFAFA |
| Text | #09090B |

*Notes: Brand primary + artistic interpretation*

### Typography
- **Heading:** Caveat
- **Body:** Quicksand
- **Mood:** handwritten, personal, friendly, casual, warm, charming
- **Best For:** Personal blogs, invitations, creative portfolios, lifestyle brands
- **Google Fonts:** https://fonts.google.com/share?selection.family=Caveat:wght@400;500;600;700|Quicksand:wght@300;400;500;600;700
- **CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Quicksand:wght@300;400;500;600;700&display=swap');
```

### Key Effects
Badge hover effects, metric pulse animations, certificate carousel, smooth stat reveal

### Avoid (Anti-patterns)
- Generic content
- No credentials
- AI purple/pink gradients

### Pre-Delivery Checklist
- [ ] No emojis as icons (use SVG: Heroicons/Lucide)
- [ ] cursor-pointer on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard nav
- [ ] prefers-reduced-motion respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
