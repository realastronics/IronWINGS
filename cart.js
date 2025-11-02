// =============================================================
// Assets/js/cart.js
// Full OOP Shopping Cart with JSON persistence & external data support
// =============================================================

/**
 * Base Cart Item (encapsulated, reusable)
 */
class CartItem {
  #id;
  #name;
  #price;
  #quantity;
  #image;
  #category;

  constructor({ id, name, price, image, category = 'general' }) {
    this.#id = id;
    this.#name = name;
    this.#price = Number(price);
    this.#quantity = 1;
    this.#image = image;
    this.#category = category;
  }

  // Gettersa
  get id() { return this.#id; }
  get name() { return this.#name; }
  get price() { return this.#price; }
  get quantity() { return this.#quantity; }
  get image() { return this.#image; }
  get category() { return this.#category; }
  get subtotal() { return this.#price * this.#quantity; }

  // Setters
  set quantity(value) {
    this.#quantity = Math.max(1, Math.floor(value));
  }

  increase() { this.quantity += 1; }
  decrease() { this.quantity > 1 && (this.quantity -= 1); }

  // JSON representation (for localStorage)
  toJSON() {
    return {
      id: this.#id,
      name: this.#name,
      price: this.#price,
      quantity: this.#quantity,
      image: this.#image,
      category: this.#category
    };
  }

  // Render method (polymorphism ready)
  render() {
    return `
      <div class="cart-item" data-id="${this.#id}">
        <img src="${this.#image}" alt="${this.#name}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;">
        <div class="item-details">
          <h3>${this.#name}</h3>
          <small>${this.#category}</small>
        </div>
        <div class="item-price">$${(this.#price).toLocaleString()}</div>
        <div class="quantity-controls">
          <button onclick="window.cart.decrease('${this.#id}')">-</button>
          <input type="number" value="${this.#quantity}" 
                 onchange="window.cart.setQuantity('${this.#id}', this.value)">
          <button onclick="window.cart.increase('${this.#id}')">+</button>
        </div>
        <div class="subtotal">$${(this.subtotal).toLocaleString()}</div>
        <button class="remove-btn" onclick="window.cart.remove('${this.#id}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>`;
  }
}

/**
 * Military Aircraft Item – inherits from CartItem
 * Adds clearance level (parody feature)
 */
class MilitaryCartItem extends CartItem {
  #clearance;

  constructor(data) {
    super(data);
    this.#clearance = data.clearance || 'CLASSIFIED';
  }

  // Override render to show badge
  render() {
    return super.render().replace(
      '</h3>',
      ` <span class="badge military">${this.#clearance}</span></h3>`
    );
  }

  toJSON() {
    return { ...super.toJSON(), clearance: this.#clearance };
  }
}

/**
 * ShoppingCart – Singleton, manages all items
 */
class ShoppingCart {
  static #instance = null;
  #items = [];
  #toastElement = null;

  constructor() {
    if (ShoppingCart.#instance) return ShoppingCart.#instance;
    this.#toastElement = document.getElementById('toast');
    this.loadFromStorage();
    ShoppingCart.#instance = this;
  }

  // === Persistence ===
  loadFromStorage() {
    const data = localStorage.getItem('ironwings_cart');
    if (!data) return;

    try {
      const parsed = JSON.parse(data);
      this.#items = parsed.map(raw => {
        if (raw.clearance) {
          return new MilitaryCartItem(raw);
        }
        return new CartItem(raw);
      });
    } catch (e) {
      console.error('Failed to load cart:', e);
    }
  }

  saveToStorage() {
    const plain = this.#items.map(item => item.toJSON());
    localStorage.setItem('ironwings_cart', JSON.stringify(plain));
    this.updateCartCount();
  }

  // === Core Operations ===
  add(productData) {
    const existing = this.#items.find(i => i.id === productData.id);
    if (existing) {
      existing.increase();
    } else {
      const ItemClass = productData.clearance ? MilitaryCartItem : CartItem;
      this.#items.push(new ItemClass(productData));
    }
    this.saveToStorage();
    this.showToast(`${productData.name} added to cart!`);
  }

  remove(id) {
    this.#items = this.#items.filter(i => i.id !== id);
    this.saveToStorage();
    this.render(); // Re-render cart page if open
  }

  increase(id) {
    const item = this.#items.find(i => i.id === id);
    if (item) {
      item.increase();
      this.saveToStorage();
      this.render();
    }
  }

  decrease(id) {
    const item = this.#items.find(i => i.id === id);
    if (item) {
      item.decrease();
      this.saveToStorage();
      this.render();
    }
  }

  setQuantity(id, qty) {
    const item = this.#items.find(i => i.id === id);
    if (item) {
      item.quantity = qty;
      this.saveToStorage();
      this.render();
    }
  }

  // === UI Helpers ===
  updateCartCount() {
    const countEl = document.getElementById('cartCount');
    if (countEl) {
      const total = this.#items.reduce((sum, i) => sum + i.quantity, 0);
      countEl.textContent = total;
      countEl.style.display = total > 0 ? 'inline' : 'none';
    }
  }

  showToast(message) {
    if (!this.#toastElement) return;
    this.#toastElement.textContent = message;
    this.#toastElement.style.display = 'block';
    clearTimeout(this.#toastElement.timeout);
    this.#toastElement.timeout = setTimeout(() => {
      this.#toastElement.style.display = 'none';
    }, 3000);
  }

  // === Rendering (for Cart.html) ===
  render() {
    const container = document.getElementById('cartContainer');
    const totalEl = document.getElementById('cartTotal');
    if (!container) return;

    if (this.#items.length === 0) {
      container.innerHTML = '<div class="empty-cart">Your cart is empty. <a href="index.html">Shop now!</a></div>';
      if (totalEl) totalEl.textContent = 'Total: $0.00';
      return;
    }

    container.innerHTML = `
      <div class="cart-items">
        ${this.#items.map(item => item.render()).join('')}
      </div>`;

    const total = this.#items.reduce((sum, i) => sum + i.subtotal, 0);
    if (totalEl) totalEl.textContent = `Total: $${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }

  // === Public API ===
  get items() { return [...this.#items]; }
  get total() { return this.#items.reduce((s, i) => s + i.subtotal, 0); }
}

// =============================================================
// Initialize Global Cart Instance
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
  window.cart = new ShoppingCart();

  // Auto-render cart if on Cart.html
  if (document.getElementById('cartContainer')) {
    window.cart.render();
  }
});

// Export for add-to-cart buttons on product pages
window.addToCart = (product) => window.cart.add(product);
