# GrasitaMex - E-Commerce Platform for Sneakers

> A full-stack e-commerce web application for buying and selling new and used sneakers, built with modern web technologies and integrated payment processing.

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Database-green?logo=supabase)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8?logo=tailwind-css)

## 📋 Overview

GrasitaMex is a comprehensive e-commerce solution designed for the sneaker resale market. The platform enables users to browse, filter, and purchase sneakers (both new and used) with a seamless shopping experience, secure payment processing through Mercado Pago, and a full-featured admin dashboard for inventory and order management.

## 🎯 Key Features

### Customer-Facing Features
- **Product Catalog**: Browse extensive sneaker collection with high-quality images
- **Advanced Filtering**: Filter by category, size (in CM), condition (new/used), and search by text
- **Responsive Design**: Mobile-first approach with optimized layouts for all screen sizes
- **Shopping Cart**: Dynamic cart with size selection, quantity management, and real-time stock validation
- **Secure Checkout**: Integrated Mercado Pago payment gateway supporting multiple payment methods
- **User Authentication**: Secure user accounts with Supabase Auth
- **Customer Dashboard**: Order tracking, address management, and purchase history
- **Product Details**: Individual product pages with image carousels and detailed specifications

### Admin Panel
- **Dashboard Analytics**: Real-time metrics including sales, revenue, orders, and customer statistics
- **Product Management**: Full CRUD operations for products with multi-image upload
- **Inventory Control**: Variant management with size/stock tracking
- **Order Management**: Process orders, update statuses, and manage fulfillment
- **Category Management**: Organize products with hierarchical categories (general/model)
- **Coupon System**: Create and manage promotional codes with various discount types
- **Customer Management**: View and manage customer accounts and data

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router with React Server Components)
- **UI Library**: React 19.2 with TypeScript
- **Styling**: TailwindCSS 4.0 with custom design system
- **UI Components**: Radix UI primitives (Dialog, Select, Dropdown, etc.)
- **Animations**: Framer Motion for smooth transitions and interactions
- **Form Handling**: React Hook Form with Zod validation
- **Charts**: Recharts for analytics visualization
- **State Management**: React Context API for cart and auth state

### Backend & Database
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with SSR support
- **File Storage**: Supabase Storage for product images
- **API Routes**: Next.js API routes for server-side logic
- **Payment Processing**: Mercado Pago SDK integration

### Development Tools
- **TypeScript**: Full type safety across the application
- **ESLint**: Code quality and consistency enforcement
- **pnpm**: Fast, efficient package management
- **Turbopack**: Next-generation bundler for faster builds

## 🏗️ Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin dashboard and management
│   ├── api/               # API routes (checkout, webhooks)
│   ├── auth/              # Authentication flows
│   ├── checkout/          # Checkout and payment flows
│   ├── customer/          # Customer dashboard
│   ├── login/             # Login page
│   ├── modelos/           # Product listing and details
│   └── page.tsx           # Homepage
├── components/            # Reusable React components
│   ├── cart/             # Cart-related components
│   ├── checkout/         # Checkout flow components
│   ├── landing/          # Landing page components
│   └── ui/               # Design system components
├── context/              # React Context providers
├── hooks/                # Custom React hooks
└── lib/                  # Utility functions and configs
```

## 🔑 Core Functionalities

### E-Commerce Flow
1. **Product Discovery**: Users browse products with real-time filtering and search
2. **Product Selection**: Select size variants with live stock availability
3. **Cart Management**: Add items with automatic stock validation
4. **Guest/User Checkout**: Support for both guest and authenticated users
5. **Payment Processing**: Secure payment via Mercado Pago with webhook confirmations
6. **Order Fulfillment**: Admin processes orders and updates shipping status

### Admin Operations
1. **Product Management**: Create products with variants, images, and categories
2. **Inventory Tracking**: Real-time stock updates and low-stock alerts
3. **Order Processing**: View, filter, and update order statuses
4. **Analytics Dashboard**: Track sales, revenue, and customer metrics
5. **Coupon Management**: Create promotional campaigns with conditions

## 🚀 Technical Highlights

### Performance Optimizations
- **React Server Components**: Leverage RSC for improved performance and SEO
- **Image Optimization**: Next.js Image component with lazy loading
- **Code Splitting**: Automatic route-based code splitting
- **Dynamic Imports**: Reduce initial bundle size with React.lazy

### User Experience
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Loading States**: Skeleton loaders and optimistic UI updates
- **Error Handling**: Comprehensive error boundaries and user-friendly messages
- **Accessibility**: Semantic HTML and ARIA attributes via Radix UI

### Data Management
- **Type-Safe Queries**: TypeScript interfaces for all database operations
- **Real-time Updates**: Supabase real-time subscriptions for live data
- **Form Validation**: Zod schemas for robust client and server validation
- **Optimistic Updates**: Immediate UI feedback for better UX

### Security
- **Row-Level Security**: Supabase RLS policies for data protection
- **Server-Side Auth**: SSR-compatible authentication with middleware
- **CSRF Protection**: Secure API routes with proper validation
- **Payment Security**: PCI-compliant Mercado Pago integration

## 📦 Database Schema

### Key Tables
- `products`: Product catalog with pricing and descriptions
- `product_variants`: Size/stock variants for each product
- `product_images`: Multi-image support with positioning
- `product_categories`: Many-to-many product categorization
- `categories`: Hierarchical category structure
- `orders`: Order management with status tracking
- `order_items`: Individual items per order
- `coupons`: Promotional code system
- `customers`: Customer accounts and profiles
- `addresses`: Customer shipping addresses

## � Mercado Pago Payment Integration

One of the core technical achievements of this project is the **complete integration with Mercado Pago's payment API**, Latin America's leading payment platform. This implementation demonstrates advanced API integration skills and understanding of secure payment processing workflows.

### Implementation Features

**Payment Preference Creation**
- Dynamic payment preference generation via Mercado Pago SDK
- Custom back URLs for success, failure, and pending states
- Real-time order creation with unique reference IDs
- Automatic price calculation with coupon discount application
- Multi-item cart support with product metadata

**Webhook Integration**
- Secure webhook endpoint for payment notifications (`/api/mercadopago/webhook`)
- Signature verification for webhook authenticity
- Real-time order status updates based on payment events
- Automatic stock deduction on successful payments
- Failed payment handling and order cancellation

**Payment Flow**
1. Customer completes checkout form with shipping details
2. Backend creates order in database with 'pending' status
3. Mercado Pago preference is generated with order details
4. Customer redirected to Mercado Pago payment gateway
5. Webhook receives payment notification upon completion
6. Order status updated to 'paid', 'cancelled', or 'failed'
7. Stock automatically adjusted for purchased items

### Technical Implementation

```typescript
// Key integration points:
- SDK: @mercadopago/sdk-react (frontend) + mercadopago (backend)
- Authentication: Access token with environment variables
- API Endpoints: 
  - POST /api/checkout/preference - Create payment
  - POST /api/mercadopago/webhook - Handle notifications
- Security: Webhook signature validation, HTTPS enforcement
- Error Handling: Comprehensive try-catch with fallback flows
```

### Supported Payment Methods
- Credit/Debit Cards (Visa, Mastercard, American Express)
- Bank transfers (SPEI)
- Cash payments (OXXO, 7-Eleven)
- Installment plans (3, 6, 9, 12 MSI)

This integration showcases proficiency in:
- **Third-party API integration** with proper authentication
- **Webhook handling** and asynchronous processing
- **Payment security** best practices
- **Transaction state management** across distributed systems
- **Error handling** in financial operations

## �🔧 Setup & Installation

```bash
# Clone the repository
git clone https://github.com/AaronLs15/GrasitaMex.git

# Install dependencies
pnpm install

# Set up environment variables (Supabase, Mercado Pago)
cp .env.example .env

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## 🌐 Environment Variables

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `MERCADOPAGO_ACCESS_TOKEN`: Mercado Pago API access token
- `MERCADOPAGO_PUBLIC_KEY`: Mercado Pago public key

## 📊 Features Implemented

- ✅ User authentication and authorization
- ✅ Product catalog with filtering and search
- ✅ Shopping cart with real-time stock validation
- ✅ Mercado Pago payment integration
- ✅ Order management system
- ✅ Admin dashboard with analytics
- ✅ Customer account management
- ✅ Multi-image product galleries
- ✅ Coupon and discount system
- ✅ Responsive mobile design
- ✅ Dark/Light theme support

## 🎓 Learning Outcomes

This project demonstrates proficiency in:
- **Full-Stack Development**: End-to-end application architecture
- **Modern React Patterns**: Server Components, Suspense, Error Boundaries
- **TypeScript**: Advanced type systems and type safety
- **Database Design**: Relational schema design with PostgreSQL
- **Payment Integration**: Third-party API integration (Mercado Pago)
- **Authentication**: Secure user management with Supabase Auth
- **Responsive Design**: Mobile-first CSS with Tailwind
- **State Management**: Context API and form state handling
- **DevOps**: Environment configuration and deployment readiness

## 👨‍💻 Developer

**Aaron Lujano** - Full Stack Developer

## 📄 License

This project is private and proprietary.

---

**Note**: This is a production-ready e-commerce platform built with enterprise-grade technologies and best practices. The codebase demonstrates advanced React patterns, full-stack TypeScript development, and integration with modern third-party services.
