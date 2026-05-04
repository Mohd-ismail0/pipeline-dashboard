#!/usr/bin/env node

// Sample HTML 1: Original website structure
const htmlSample1 = `<!DOCTYPE html>
<html>
<head>
    <title>E-commerce Site</title>
    <meta charset="UTF-8">
</head>
<body>
    <header>
        <nav>
            <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/products">Products</a></li>
                <li><a href="/about">About</a></li>
            </ul>
        </nav>
    </header>
    
    <main>
        <section class="hero">
            <h1>Welcome to Our Store</h1>
            <p>Discover amazing products</p>
        </section>
        
        <section class="products">
            <h2>Featured Products</h2>
            <div class="product-grid">
                <article class="product">
                    <img src="product1.jpg" alt="Product 1">
                    <h3>Product One</h3>
                    <p>$29.99</p>
                    <button>Add to Cart</button>
                </article>
                <article class="product">
                    <img src="product2.jpg" alt="Product 2">
                    <h3>Product Two</h3>
                    <p>$39.99</p>
                    <button>Add to Cart</button>
                </article>
                <article class="product">
                    <img src="product3.jpg" alt="Product 3">
                    <h3>Product Three</h3>
                    <p>$49.99</p>
                    <button>Add to Cart</button>
                </article>
            </div>
        </section>
    </main>
    
    <footer>
        <p>&copy; 2024 Our Store. All rights reserved.</p>
    </footer>
</body>
</html>`;

// Sample HTML 2: Updated website structure
const htmlSample2 = `<!DOCTYPE html>
<html>
<head>
    <title>E-commerce Site - Updated</title>
    <meta charset="UTF-8">
    <meta name="description" content="Our amazing online store">
</head>
<body>
    <header>
        <nav>
            <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/products">Products</a></li>
                <li><a href="/deals">Deals</a></li>
                <li><a href="/about">About</a></li>
                <li><a href="/contact">Contact</a></li>
            </ul>
        </nav>
        <div class="search-bar">
            <input type="search" placeholder="Search products...">
        </div>
    </header>
    
    <main>
        <section class="promo-banner">
            <p>🎉 Summer Sale: 30% off everything!</p>
        </section>
        
        <section class="hero">
            <h1>Welcome to Our Store</h1>
            <p>Discover amazing products at unbeatable prices</p>
            <button class="cta">Shop Now</button>
        </section>
        
        <section class="featured-deals">
            <h2>Hot Deals</h2>
            <div class="deals-grid">
                <div class="deal">
                    <span class="discount">-50%</span>
                    <img src="deal1.jpg" alt="Deal 1">
                    <p>Limited Time Offer</p>
                </div>
            </div>
        </section>
        
        <section class="products">
            <h2>Featured Products</h2>
            <div class="product-grid">
                <article class="product">
                    <img src="product1.jpg" alt="Product 1">
                    <h3>Product One</h3>
                    <p class="original-price"><strike>$39.99</strike></p>
                    <p class="sale-price">$29.99</p>
                    <div class="rating">★★★★★ (124 reviews)</div>
                    <button>Add to Cart</button>
                </article>
                <article class="product">
                    <img src="product2.jpg" alt="Product 2">
                    <h3>Product Two</h3>
                    <p class="original-price"><strike>$49.99</strike></p>
                    <p class="sale-price">$39.99</p>
                    <div class="rating">★★★★☆ (89 reviews)</div>
                    <button>Add to Cart</button>
                </article>
                <article class="product featured">
                    <span class="badge">New</span>
                    <img src="product4.jpg" alt="Product Four">
                    <h3>Product Four</h3>
                    <p class="original-price"><strike>$59.99</strike></p>
                    <p class="sale-price">$49.99</p>
                    <div class="rating">★★★★★ (2 reviews)</div>
                    <button>Add to Cart</button>
                </article>
            </div>
        </section>
        
        <section class="newsletter">
            <h2>Subscribe to Our Newsletter</h2>
            <form>
                <input type="email" placeholder="Enter your email">
                <button type="submit">Subscribe</button>
            </form>
        </section>
    </main>
    
    <footer>
        <div class="footer-content">
            <div class="footer-section">
                <h4>Customer Service</h4>
                <ul>
                    <li><a href="/contact">Contact Us</a></li>
                    <li><a href="/faq">FAQ</a></li>
                    <li><a href="/returns">Returns</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h4>Company</h4>
                <ul>
                    <li><a href="/about">About Us</a></li>
                    <li><a href="/careers">Careers</a></li>
                    <li><a href="/press">Press</a></li>
                </ul>
            </div>
        </div>
        <p>&copy; 2024 Our Store. All rights reserved.</p>
    </footer>
</body>
</html>`;

function analyzeHtmlDiff(oldHtml, newHtml) {
  const oldLines = oldHtml.split("\n");
  const newLines = newHtml.split("\n");
  
  console.log("=".repeat(80));
  console.log("HTML DIFF ANALYSIS - Sample Website Structures");
  console.log("=".repeat(80));
  console.log();
  
  console.log("📊 Statistics:");
  console.log(`   Original HTML: ${oldLines.length} lines`);
  console.log(`   Updated HTML:  ${newLines.length} lines`);
  console.log(`   Difference: ${Math.abs(newLines.length - oldLines.length)} lines`);
  console.log();
  
  console.log("🔍 Key Changes Detected:");
  console.log();
  
  if (newHtml.includes('<meta name="description"') && !oldHtml.includes('<meta name="description"')) {
    console.log("   ✨ Added new meta description tag");
  }
  
  const oldNavItems = oldHtml.match(/<li><a href="\/[^"]*">/g) || [];
  const newNavItems = newHtml.match(/<li><a href="\/[^"]*">/g) || [];
  if (oldNavItems.length !== newNavItems.length) {
    console.log(`   ✏️  Navigation menu updated: ${oldNavItems.length} → ${newNavItems.length} items`);
    console.log(`       Added: /deals, /contact`);
  }
  
  if (!oldHtml.includes("search-bar") && newHtml.includes("search-bar")) {
    console.log("   ✨ Added search bar component in header");
  }
  
  if (!oldHtml.includes("promo-banner") && newHtml.includes("promo-banner")) {
    console.log("   ✨ Added promotional banner section");
  }
  
  if (!oldHtml.includes("featured-deals") && newHtml.includes("featured-deals")) {
    console.log("   ✨ Added featured deals section");
  }
  
  if (!oldHtml.includes("<strike>") && newHtml.includes("<strike>")) {
    console.log("   💰 Updated pricing structure with original/sale prices");
  }
  
  if (!oldHtml.includes("rating") && newHtml.includes("rating")) {
    console.log("   ⭐ Added product rating system with review counts");
  }
  
  const oldProducts = oldHtml.match(/<article class="product">/g) || [];
  const newProducts = newHtml.match(/<article class="product">/g) || [];
  if (oldProducts.length !== newProducts.length) {
    console.log(`   📦 Product count: ${oldProducts.length} → ${newProducts.length} products`);
    console.log("       Added 'Product Four' with 'New' badge");
  }
  
  if (!oldHtml.includes("newsletter") && newHtml.includes("newsletter")) {
    console.log("   📧 Added newsletter subscription section");
  }
  
  if (!oldHtml.includes("footer-section") && newHtml.includes("footer-section")) {
    console.log("   📝 Footer restructured with organized sections");
    console.log("       - Customer Service section");
    console.log("       - Company section");
  }
  
  console.log();
  console.log("="   .repeat(80));
  console.log("DETAILED DIFF OUTPUT (react-diff-viewer format)");
  console.log("="   .repeat(80));
  console.log();
  
  let changedCount = 0;
  const changes = [];
  
  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    const oldLine = oldLines[i] || "";
    const newLine = newLines[i] || "";
    
    if (oldLine !== newLine) {
      changedCount++;
      changes.push({line: i + 1, old: oldLine, new: newLine});
    }
  }
  
  console.log(`First 15 changed lines (out of ${changedCount} total):\n`);
  
  for (let i = 0; i < Math.min(15, changes.length); i++) {
    const change = changes[i];
    console.log(`   Line ${change.line}:`);
    if (change.old) {
      console.log(`   - ${change.old.substring(0, 75)}${change.old.length > 75 ? "..." : ""}`);
    }
    if (change.new) {
      console.log(`   + ${change.new.substring(0, 75)}${change.new.length > 75 ? "..." : ""}`);
    }
    console.log();
  }
  
  if (changedCount > 15) {
    console.log(`   ... and ${changedCount - 15} more changes`);
  }
  
  console.log();
  console.log("="   .repeat(80));
  console.log(`✅ SUMMARY`);
  console.log("="   .repeat(80));
  console.log(`Total changes: ${changedCount} lines out of ${Math.max(oldLines.length, newLines.length)}`);
  console.log(`Change percentage: ${(changedCount / Math.max(oldLines.length, newLines.length) * 100).toFixed(1)}%`);
  console.log();
  console.log("The react-diff-viewer library would display these changes side-by-side,");
  console.log("with removed lines highlighted in red and added lines in green.");
  console.log("="   .repeat(80));
}

analyzeHtmlDiff(htmlSample1, htmlSample2);
