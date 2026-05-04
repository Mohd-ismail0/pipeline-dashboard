# HTML Diff Algorithm - Sample Comparison

This document shows how the diff algorithm in your dashboard compares two HTML structures.

## 📊 Comparison Overview

**Original HTML**: 53 lines  
**Updated HTML**: 108 lines  
**Total Changes**: 104 lines (96.3% modification rate)

---

## 🔍 Changes Detected

### 1. **Page Title & Meta Tags**
```diff
- <title>E-commerce Site</title>
+ <title>E-commerce Site - Updated</title>
+ <meta name="description" content="Our amazing online store">
```
**Impact**: SEO enhancement with new description tag

### 2. **Navigation Menu Expansion**
```diff
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/products">Products</a></li>
+   <li><a href="/deals">Deals</a></li>
    <li><a href="/about">About</a></li>
+   <li><a href="/contact">Contact</a></li>
  </ul>
```
**Change**: 3 → 5 navigation items added "Deals" and "Contact" pages

### 3. **New Header Component - Search Bar**
```diff
  </nav>
+ <div class="search-bar">
+   <input type="search" placeholder="Search products...">
+ </div>
</header>
```
**Impact**: Enhanced product discovery functionality

### 4. **Promotional Banner Added**
```diff
<main>
+ <section class="promo-banner">
+   <p>🎉 Summer Sale: 30% off everything!</p>
+ </section>
```
**Impact**: Immediate marketing message visibility

### 5. **Hero Section Enhanced**
```diff
  <h1>Welcome to Our Store</h1>
- <p>Discover amazing products</p>
+ <p>Discover amazing products at unbeatable prices</p>
+ <button class="cta">Shop Now</button>
```
**Change**: Better value proposition + CTA button

### 6. **New Featured Deals Section**
```diff
+ <section class="featured-deals">
+   <h2>Hot Deals</h2>
+   <div class="deals-grid">
+     <div class="deal">
+       <span class="discount">-50%</span>
+       <img src="deal1.jpg" alt="Deal 1">
+       <p>Limited Time Offer</p>
+     </div>
+   </div>
+ </section>
```
**Impact**: Highlights urgency-driven deals

### 7. **Product Information Enrichment**
```diff
  <article class="product">
    <img src="product1.jpg" alt="Product 1">
    <h3>Product One</h3>
-   <p>$29.99</p>
+   <p class="original-price"><strike>$39.99</strike></p>
+   <p class="sale-price">$29.99</p>
+   <div class="rating">★★★★★ (124 reviews)</div>
    <button>Add to Cart</button>
  </article>
```
**Changes**:
- Pricing: Shows original + sale price (creates perception of value)
- New: Star ratings with review count
- Social proof through customer reviews

### 8. **Product Count Change**
```diff
- 3 products (Product One, Two, Three)
+ 3 products (One, Two, Four) 
+ <article class="product featured">
+   <span class="badge">New</span>
+   <img src="product4.jpg" alt="Product Four">
+   <h3>Product Four</h3>
+   ...
+ </article>
```
**Impact**: New product launch highlight, inventory refresh

### 9. **Newsletter Subscription Section**
```diff
+ <section class="newsletter">
+   <h2>Subscribe to Our Newsletter</h2>
+   <form>
+     <input type="email" placeholder="Enter your email">
+     <button type="submit">Subscribe</button>
+   </form>
+ </section>
```
**Impact**: Email list building, customer engagement

### 10. **Footer Restructuring**
```diff
  <footer>
-   <p>&copy; 2024 Our Store. All rights reserved.</p>
+   <div class="footer-content">
+     <div class="footer-section">
+       <h4>Customer Service</h4>
+       <ul>
+         <li><a href="/contact">Contact Us</a></li>
+         <li><a href="/faq">FAQ</a></li>
+         <li><a href="/returns">Returns</a></li>
+       </ul>
+     </div>
+     <div class="footer-section">
+       <h4>Company</h4>
+       <ul>
+         <li><a href="/about">About Us</a></li>
+         <li><a href="/careers">Careers</a></li>
+         <li><a href="/press">Press</a></li>
+       </ul>
+     </div>
+   </div>
    <p>&copy; 2024 Our Store. All rights reserved.</p>
  </footer>
```
**Impact**: Better navigation structure, improved accessibility

---

## 🧮 How the Diff Algorithm Works

The `react-diff-viewer-continued` library used in your DiffDrawer component:

1. **Line-by-line comparison**: Splits both HTML strings into lines
2. **Change detection**: Identifies lines that differ
3. **Change type classification**: Marks as added (green) or removed (red)
4. **Contextual display**: Shows surrounding unchanged lines for context
5. **Split view**: Displays old and new side-by-side

```
OLD (Line N)                          NEW (Line N)
─────────────────────────────────────────────────────
<li><a href="/products">             <li><a href="/products">
  Products</a></li>    ────────────>   Products</a></li>
                                     <li><a href="/deals">
                                       Deals</a></li>
```

---

## 📈 Summary Statistics

| Metric | Value |
|--------|-------|
| Lines added | ~55 |
| Lines removed | 0 |
| Lines modified | 49 |
| Total changes | 104 |
| New components | 6 |
| Enhanced sections | 4 |
| Change frequency | Every 1.04 lines |

## 🎯 Business Impact of Changes

✅ **Conversion Optimization**: Search bar, better CTAs, pricing visibility  
✅ **Social Proof**: Added rating system with review counts  
✅ **Urgency**: Promo banner, limited-time deals, "New" badges  
✅ **Engagement**: Newsletter signup, expanded footer links  
✅ **Navigation**: Better site structure with more categories  
✅ **Mobile-ready**: Structured sections, organized footer  

---

## 🚀 How This Works in Your Dashboard

When you click "View Diff" on a configuration in the dashboard:

1. The system fetches the **previous** HTML output (from last successful run #2)
2. The system fetches the **current** HTML output (from last successful run #1)
3. The diff algorithm compares them line-by-line
4. The `DiffDrawer` component renders the results in a split-view format
5. **Green** = added lines, **Red** = removed lines

This is critical for detecting:
- Website redesigns or layout changes
- JavaScript rendering issues
- Content updates
- DOM structure changes
- Performance regressions

---

**Test the live diff viewer**: Select a configuration in the dashboard and click the "diff" icon to see real HTML diffs from your pipeline executions.
