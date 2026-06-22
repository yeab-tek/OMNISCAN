# OmniScan - Document Digitization & Purchase Order Management System

A modern, professional, enterprise-grade web application for document digitization, OCR processing, purchase order management, trade compliance, and payment tracking.

![OmniScan](https://img.shields.io/badge/React-18.3.1-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-Latest-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-4.0-06B6D4)

---

## 🌟 Features

### Core Functionality
- **Document Upload & OCR Processing** - Drag-and-drop interface with real-time OCR status tracking
- **Purchase Order Management** - Comprehensive PO tracking with search, filter, and sort capabilities
- **EUDR Compliance Tracking** - Monitor and manage EU Deforestation Regulation compliance
- **Payment Monitoring** - Track payment status, overdue amounts, and payment history
- **Audit Logs** - Complete audit trail with timeline view of all system activities
- **User Management** - Role-based access control for Admin, Trade Manager, Finance Officer, and Data Entry Operator
- **Real-time Notifications** - Shipment reminders, payment alerts, and compliance notifications
- **Interactive Dashboard** - Visual analytics with charts for PO trends, compliance, and payments

### User Roles
1. **Admin** - Full system access and configuration
2. **Trade Manager** - PO management and compliance oversight
3. **Finance Officer** - Payment tracking and financial operations
4. **Data Entry Operator** - Document upload and data entry

---

## 🎨 Design System

### Color Palette
- **Primary**: `#2563EB` - Blue for CTAs and primary actions
- **Secondary**: `#0F172A` - Dark slate for headers and emphasis
- **Success**: `#10B981` - Green for completed/paid/compliant states
- **Warning**: `#F59E0B` - Amber for pending/review states
- **Danger**: `#EF4444` - Red for errors/overdue/critical items
- **Background**: `#F8FAFC` - Light slate page background
- **Card**: `#FFFFFF` - White card surfaces

### Typography
- **Font Family**: Inter (300-700 weights)
- **Hierarchy**: Consistent heading scales with professional spacing
- **Line Height**: 1.5 for optimal readability

### Components
See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for complete component documentation.

---

## 📱 Screens & Pages

### 1. Login Page
- Professional authentication interface
- Email/password fields with validation
- Remember me functionality
- Branded illustration and company logo

### 2. Dashboard
- 6 key metric widgets (Total POs, Pending Payments, Overdue, Compliance, OCR Accuracy, Upcoming Shipments)
- Interactive charts (Monthly Upload Trend, Compliance Distribution, Payment Overview)
- Upcoming shipments list
- Responsive grid layout

### 3. Purchase Orders List
- Searchable, filterable data table
- Columns: PO Number, Buyer, Seller, Commodity, Quantity, Shipment Date, Payment Status, EUDR Status
- Pagination with 10 items per page
- Quick actions: View, Edit, Delete

### 4. Purchase Order Details
- Full PO information display
- Buyer and seller contact information
- Commodity details with HS codes
- Shipment information and tracking
- Payment status and history
- EUDR compliance details
- Document history with download capability
- Audit trail of all changes

### 5. Upload Document Page
- Drag-and-drop upload interface
- Support for JPG, PNG, PDF (up to 10MB)
- Real-time upload progress
- OCR processing status indicators
- Recent uploads list with confidence scores

### 6. OCR Results Page
- Side-by-side document preview and extracted fields
- Confidence score for each field
- Overall OCR accuracy indicator
- Editable fields for corrections
- Visual indicators for low-confidence fields
- Save as draft or create PO options

### 7. Notifications Page
- Categorized notification list
- Read/unread status indicators
- Filter by type (Shipments, Payments, Compliance)
- Dismissible notifications
- Real-time updates

### 8. Audit Logs Page
- Timeline view of system activities
- Advanced filtering (Date, User, Action Type, Target)
- Displays: User, Action, Timestamp, Old/New Values
- Role-based activity tracking

### 9. User Management Page
- User table with search and filters
- Role assignment (Admin, Trade Manager, Finance Officer, Data Entry Operator)
- User status management (Active/Inactive)
- Last login tracking
- Role permissions overview

### 10. Settings Page
- Profile settings (Name, Email, Phone, Avatar)
- Security settings (Password change, 2FA)
- Notification preferences
- System preferences

### 11. Component Showcase
- Complete design system demonstration
- All UI components with variants
- Color palette reference
- Typography scale
- Spacing and layout examples

---

## 🛠️ Technical Stack

### Frontend Framework
- **React 18.3.1** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tooling

### Styling
- **Tailwind CSS 4.0** - Utility-first CSS framework
- **Custom Design Tokens** - CSS custom properties for theming
- **Responsive Design** - Mobile-first approach

### UI Components
- **Lucide React** - Beautiful, consistent icons
- **Recharts** - Responsive charts and data visualization
- **Radix UI** - Accessible component primitives
- **Custom Components** - Badge, Button, Modal, Toast, Alert

### State Management
- React Hooks (useState, useEffect)
- Component-level state management

---

## 📁 Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── Layout.tsx              # Main app layout with sidebar
│   │   ├── StatCard.tsx            # Dashboard statistics card
│   │   ├── Badge.tsx               # Status badges
│   │   ├── Button.tsx              # Button component
│   │   ├── Modal.tsx               # Modal dialog
│   │   ├── Toast.tsx               # Toast notifications
│   │   └── Alert.tsx               # Alert component
│   ├── pages/
│   │   ├── LoginPage.tsx           # Authentication
│   │   ├── DashboardPage.tsx       # Analytics dashboard
│   │   ├── PurchaseOrdersPage.tsx  # PO list table
│   │   ├── PODetailsPage.tsx       # PO details view
│   │   ├── UploadPage.tsx          # Document upload
│   │   ├── OCRResultsPage.tsx      # OCR results review
│   │   ├── NotificationsPage.tsx   # Notification center
│   │   ├── AuditLogsPage.tsx       # Audit trail
│   │   ├── UsersPage.tsx           # User management
│   │   ├── SettingsPage.tsx        # User settings
│   │   └── ComponentShowcasePage.tsx # Design system showcase
│   └── App.tsx                     # Root component
├── styles/
│   ├── theme.css                   # Design tokens & variables
│   └── fonts.css                   # Font imports
└── ...

```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone [repository-url]

# Navigate to project directory
cd omniscan

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Build for Production

```bash
# Create production build
pnpm build

# Preview production build
pnpm preview
```

---

## 🎯 Key Features by User Role

### Admin
- Full system access and configuration
- User management and role assignment
- System settings and preferences
- All module permissions

### Trade Manager
- View and edit PO records
- Manage EUDR compliance status
- Approve shipments
- View audit logs

### Finance Officer
- Manage payment status
- View financial reports
- Update payment terms
- Export financial data

### Data Entry Operator
- Upload documents
- Enter PO data
- Verify OCR results
- Create new records

---

## 📊 Dashboard Metrics

### Key Performance Indicators
1. **Total PO Records** - Complete count with monthly trend
2. **Pending Payments** - Outstanding payment tracking
3. **Overdue Payments** - Critical payment alerts
4. **EUDR Compliance Rate** - Compliance percentage
5. **OCR Accuracy** - Average processing accuracy
6. **Upcoming Shipments** - Next 7 days overview

### Charts & Visualizations
- **Monthly Upload Trend** - Line chart showing PO upload patterns
- **Compliance Distribution** - Bar chart of EUDR status
- **Payment Status** - Pie chart of payment breakdown

---

## 🔐 Security Features

- Role-based access control (RBAC)
- Secure authentication
- Activity audit logging
- Two-factor authentication support
- Session management
- Data encryption ready

---

## ♿ Accessibility

- WCAG 2.1 Level AA compliant
- Keyboard navigation support
- Screen reader friendly
- High contrast ratios (4.5:1 minimum)
- Focus indicators on all interactive elements
- Semantic HTML structure

---

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: 1024px+
- **Large Desktop**: 1280px+

### Mobile Features
- Hamburger menu navigation
- Stacked layouts
- Touch-optimized controls
- Responsive tables (horizontal scroll or card view)
- Mobile-friendly forms

---

## 🎨 Design Inspiration

OmniScan's design is inspired by industry-leading SaaS products:
- **Stripe Dashboard** - Clean data visualization and professional aesthetic
- **Notion** - Minimalist design and intuitive navigation
- **Jira** - Enterprise-grade functionality and robust table views
- **Linear** - Modern UI patterns and smooth interactions

---

## 📈 Future Enhancements

- [ ] Real-time WebSocket notifications
- [ ] Advanced search with full-text indexing
- [ ] Bulk operations for PO management
- [ ] Export to Excel/PDF
- [ ] Email integration
- [ ] Mobile native apps (iOS/Android)
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Advanced analytics dashboard
- [ ] API integration capabilities

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is proprietary software. All rights reserved.

---

## 👥 Team

**Product Owner**: Enterprise Solutions Team
**Design**: UX/UI Design Team
**Development**: Frontend Engineering Team

---

## 📞 Support

For support inquiries:
- Email: support@omniscan.com
- Documentation: [docs.omniscan.com](https://docs.omniscan.com)
- Issues: GitHub Issues

---

## 🙏 Acknowledgments

- Inter font family by Rasmus Andersson
- Lucide icons by Lucide Community
- Recharts by Recharts Team
- Radix UI by Modulz
- Tailwind CSS by Tailwind Labs

---

**OmniScan** - Streamlining Document Digitization and Trade Management

*Last Updated: June 9, 2026*
*Version: 1.0.0*
