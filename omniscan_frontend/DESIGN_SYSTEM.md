# OmniScan Design System

## Overview
OmniScan is a modern, professional, enterprise-grade document digitization and purchase order management system. The design system is inspired by leading SaaS products like Stripe Dashboard, Notion, Jira, and Linear.

## Design Principles
- **Clean & Minimal**: Focused on content with no unnecessary visual elements
- **Professional**: Enterprise-ready with consistent, trustworthy aesthetics
- **Accessible**: High contrast ratios and clear hierarchy
- **Responsive**: Works seamlessly across desktop, tablet, and mobile devices

---

## Color Palette

### Primary Colors
```css
--primary: #2563EB           /* Primary Blue - CTAs, Links, Active States */
--primary-foreground: #FFFFFF /* Text on Primary */

--secondary: #0F172A          /* Secondary Dark - Headers, Important Text */
--secondary-foreground: #FFFFFF /* Text on Secondary */
```

### Semantic Colors
```css
--success: #10B981            /* Success Green - Completed, Paid, Compliant */
--success-foreground: #FFFFFF

--warning: #F59E0B            /* Warning Amber - Pending, Review Needed */
--warning-foreground: #FFFFFF

--destructive: #EF4444        /* Danger Red - Errors, Overdue, Critical */
--destructive-foreground: #FFFFFF
```

### Background Colors
```css
--background: #F8FAFC         /* Page Background */
--card: #FFFFFF               /* Card/Panel Background */
--muted: #F1F5F9             /* Muted Backgrounds */
--accent: #EFF6FF            /* Hover States, Subtle Highlights */
```

### Text Colors
```css
--foreground: #0F172A         /* Primary Text */
--muted-foreground: #64748B   /* Secondary Text, Descriptions */
```

### Border Colors
```css
--border: #E2E8F0             /* Default Borders */
--ring: #2563EB               /* Focus Ring */
```

---

## Typography

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### Font Weights
- **Normal**: 400 - Body text, descriptions
- **Medium**: 500 - Labels, buttons, emphasized text
- **Semibold**: 600 - Headings, important information
- **Bold**: 700 - Extra emphasis (rarely used)

### Type Scale
```css
h1: 30px / font-weight: 600   /* Page Titles */
h2: 24px / font-weight: 600   /* Section Headers */
h3: 20px / font-weight: 600   /* Card Headers */
h4: 16px / font-weight: 500   /* Subsection Headers */

body: 16px / font-weight: 400  /* Default Text */
label: 16px / font-weight: 500 /* Form Labels */
small: 14px / font-weight: 400 /* Helper Text */
xs: 12px / font-weight: 400    /* Captions */
```

### Line Heights
- Headings: 1.5
- Body: 1.5
- Tight: 1.25 (for UI elements)

---

## Spacing System

Based on 4px base unit:

```
0.5 = 2px
1   = 4px
2   = 8px
3   = 12px
4   = 16px
5   = 20px
6   = 24px
8   = 32px
10  = 40px
12  = 48px
16  = 64px
20  = 80px
```

### Common Patterns
- Card Padding: 24px (p-6)
- Section Spacing: 24px (space-y-6)
- Element Spacing: 16px (gap-4)
- Compact Spacing: 12px (gap-3)

---

## Border Radius

```css
--radius: 8px                 /* Default Border Radius */
--radius-sm: 4px              /* Small Elements */
--radius-md: 6px              /* Medium Elements */
--radius-lg: 8px              /* Large Elements */
--radius-xl: 12px             /* Extra Large */
--radius-full: 9999px         /* Pills, Circles */
```

---

## Components

### Buttons

#### Primary Button
- Background: Primary Blue (#2563EB)
- Text: White
- Padding: 8px 16px
- Border Radius: 8px
- Hover: Opacity 90%

#### Secondary Button
- Background: Transparent
- Border: 1px solid #E2E8F0
- Text: Foreground
- Hover: Background Accent

#### Danger Button
- Background: Destructive (#EF4444)
- Text: White
- Used for delete, destructive actions

### Inputs

#### Text Input
- Background: White
- Border: 1px solid #E2E8F0
- Border Radius: 8px
- Padding: 8px 12px
- Focus: 2px ring Primary

#### Search Input
- Icon: Left aligned, muted foreground
- Padding left: 40px (to accommodate icon)

### Badges

#### Status Badges
- **Success**: Green background (10% opacity), Green text
- **Warning**: Amber background (10% opacity), Amber text
- **Danger**: Red background (10% opacity), Red text
- **Info**: Blue background (10% opacity), Blue text
- **Default**: Muted background, Muted foreground text

Sizing: px-2.5 py-0.5, text-xs, rounded-full

### Cards

#### Standard Card
- Background: White
- Border: 1px solid #E2E8F0
- Border Radius: 8px
- Padding: 24px
- Shadow on hover: Optional subtle shadow

#### Stat Card
- Icon container: Accent background, rounded
- Value: Large (30px), Semibold
- Label: Muted foreground
- Trend indicator: Arrow + percentage

### Tables

#### Data Table
- Header: Muted background
- Row hover: Accent background (50% opacity)
- Cell padding: 24px 24px
- Border: 1px solid between rows
- Font size: 14px for data

### Modals

#### Structure
- Backdrop: Black with 50% opacity + blur
- Container: White card with border
- Header: 24px padding, border bottom
- Content: 24px padding, scrollable
- Footer: 16px padding, border top, right-aligned actions

### Toast Notifications

#### Types
- **Success**: Green background, white text, check icon
- **Error**: Red background, white text, alert icon
- **Warning**: Amber background, dark text, warning icon
- **Info**: Blue background, white text, info icon

Position: Top right, fixed
Animation: Slide in from right
Duration: 5 seconds (default)

### Alerts

Similar to badges but larger, with icon and dismissible option:
- Padding: 12px 16px
- Icon: Left aligned
- Dismissible: X button on right

---

## Icons

Using **Lucide React** icon library

### Common Icons
- Dashboard: LayoutDashboard
- Documents: FileText
- Upload: Upload
- Users: Users
- Settings: Settings
- Notifications: Bell
- Search: Search
- Edit: Edit
- Delete: Trash2
- View: Eye
- Download: Download
- Success: CheckCircle
- Warning: AlertTriangle
- Error: AlertCircle
- Info: Info

### Icon Sizing
- Small: 16px (w-4 h-4)
- Default: 20px (w-5 h-5)
- Large: 24px (w-6 h-6)
- Extra Large: 32px (w-8 h-8)

---

## Layout

### Sidebar Navigation
- Width: 256px (w-64)
- Background: White
- Border right: 1px solid border
- Logo section: 24px padding
- Navigation items: 16px padding, rounded
- Active state: Primary background, white text
- Hover: Accent background

### Top Navbar
- Height: Auto (content based)
- Padding: 16px 32px
- Background: White
- Border bottom: 1px solid border
- Search bar: Max width 600px
- Actions: Right aligned

### Page Container
- Padding: 32px (p-8)
- Max width: None (full width)
- Background: Page background (#F8FAFC)

---

## Responsive Breakpoints

```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet portrait */
lg: 1024px  /* Tablet landscape / Small desktop */
xl: 1280px  /* Desktop */
2xl: 1536px /* Large desktop */
```

### Mobile Adaptations
- Sidebar: Convert to drawer/hamburger menu
- Tables: Horizontal scroll or card view
- Grid layouts: Stack to single column
- Reduced padding on mobile (16px instead of 32px)

---

## Animation & Transitions

### Standard Transitions
```css
transition: all 0.2s ease    /* General hover states */
transition: opacity 0.3s      /* Fade effects */
transition: colors 0.2s       /* Color changes */
```

### Hover States
- Buttons: Opacity change or background color
- Cards: Border color change or subtle shadow
- Icons: Color change
- Table rows: Background color

---

## Accessibility

### Contrast Ratios
- Normal text: Minimum 4.5:1
- Large text: Minimum 3:1
- UI components: Minimum 3:1

### Focus States
- Visible focus ring on all interactive elements
- Ring color: Primary (#2563EB)
- Ring width: 2px
- Ring offset: 2px

### Keyboard Navigation
- All interactive elements keyboard accessible
- Logical tab order
- Skip links for navigation

---

## Dark Mode Support

While the primary design is light mode, dark mode tokens are prepared:

```css
.dark {
  --background: #0F172A
  --foreground: #F8FAFC
  --card: #1E293B
  --border: #334155
  /* ... additional dark mode tokens */
}
```

---

## Usage Examples

### Creating a New Page
```tsx
<div className="space-y-6">
  <div>
    <h1>Page Title</h1>
    <p className="text-muted-foreground">Description</p>
  </div>
  
  <div className="bg-card border border-border rounded-lg p-6">
    {/* Card content */}
  </div>
</div>
```

### Status Badge
```tsx
<Badge variant="success">Paid</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Overdue</Badge>
```

### Button Group
```tsx
<div className="flex gap-3">
  <Button variant="primary">Save</Button>
  <Button variant="outline">Cancel</Button>
</div>
```

---

## File Structure

```
src/
├── app/
│   ├── components/
│   │   ├── Layout.tsx           # Main layout with sidebar & navbar
│   │   ├── StatCard.tsx         # Dashboard stat widgets
│   │   ├── Badge.tsx            # Status badges
│   │   ├── Button.tsx           # Button component
│   │   ├── Modal.tsx            # Modal dialog
│   │   ├── Toast.tsx            # Toast notifications
│   │   └── Alert.tsx            # Alert component
│   ├── pages/
│   │   ├── LoginPage.tsx        # Authentication
│   │   ├── DashboardPage.tsx    # Dashboard with charts
│   │   ├── PurchaseOrdersPage.tsx  # PO list with table
│   │   ├── UploadPage.tsx       # Document upload
│   │   ├── OCRResultsPage.tsx   # OCR processing results
│   │   ├── PODetailsPage.tsx    # Purchase order details
│   │   ├── NotificationsPage.tsx   # Notifications center
│   │   ├── AuditLogsPage.tsx    # Audit trail
│   │   ├── UsersPage.tsx        # User management
│   │   └── SettingsPage.tsx     # Settings
│   └── App.tsx                  # Main app component
└── styles/
    ├── theme.css                # Design tokens
    └── fonts.css                # Font imports
```

---

## Best Practices

1. **Consistency**: Always use design tokens from theme.css
2. **Spacing**: Use the 4px spacing system
3. **Typography**: Use default heading styles, override with Tailwind only when needed
4. **Colors**: Use semantic color names (success, warning, danger) over raw hex values
5. **Icons**: Maintain consistent sizing (w-5 h-5 for standard UI icons)
6. **Accessibility**: Always provide alt text, labels, and keyboard support
7. **Responsive**: Test on mobile, tablet, and desktop breakpoints
8. **Performance**: Optimize images, lazy load when appropriate

---

## Development Handoff

### Design Tokens
All colors, spacing, and typography values are defined in `/src/styles/theme.css` as CSS custom properties. Use Tailwind utility classes which automatically reference these tokens.

### Component Library
Reusable components are in `/src/app/components/`. Import and use these rather than creating duplicates.

### Adding New Features
1. Check existing components first
2. Follow established patterns
3. Use design system tokens
4. Maintain responsive behavior
5. Test accessibility

---

*Last Updated: June 9, 2026*
*Version: 1.0.0*
