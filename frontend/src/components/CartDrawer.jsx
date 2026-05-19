import React from 'react';

function CartDrawer({
  isOpen,
  cart,
  onClose,
  onRemove,
  onUpdateQty,
  onCheckout,
  totalItems,
  totalPrice,
}) {
  const [customerName, setCustomerName] = React.useState('');

  const handleCheckout = () => {
    onCheckout(customerName);
    setCustomerName('');
  };

  return (
    <>
      <div className={`cart-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}></div>
      <aside className={`cart-drawer ${isOpen ? 'open' : ''}`}>
        <div className="cart-drawer-header">
          <h2>YOUR CART</h2>
          <button className="cart-close" onClick={onClose}>✕</button>
        </div>

        <div className="cart-drawer-body">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon">🛒</div>
              <p>Your cart is empty</p>
              <span>Add some items to get started</span>
            </div>
          ) : (
            <div className="cart-items">
              {cart.map((item) => (
                <div key={item.product_id} className="cart-item">
                  <img src={`/src/assets/images/${item.image}`} alt={item.product_name} className="cart-item-image" />
                  <div className="cart-item-details">
                    <h4 className="cart-item-name">{item.product_name}</h4>
                    <div className="cart-item-price">
                      ${item.price.toFixed(2)} <span>/ unit</span>
                    </div>
                    <div className="cart-item-controls">
                      <div className="cart-qty-selector">
                        <button className="cart-qty-btn" onClick={() => onUpdateQty(item.product_id, -1)}>−</button>
                        <span className="cart-qty-value">{item.quantity}</span>
                        <button className="cart-qty-btn" onClick={() => onUpdateQty(item.product_id, 1)}>+</button>
                      </div>
                      <button className="cart-remove-btn" onClick={() => onRemove(item.product_id)}>Remove</button>
                    </div>
                  </div>
                  <div className="cart-item-line-total">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-summary">
              <div className="cart-summary-row">
                <span>Items</span>
                <span>{totalItems}</span>
              </div>
              <div className="cart-summary-row cart-summary-total">
                <span>Total</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="checkout-section">
              <input
                type="text"
                className="checkout-name-input"
                placeholder="Your name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <button className="checkout-btn" onClick={handleCheckout}>
                CHECKOUT
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

export default CartDrawer;
