import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar({ cartCount, onCartToggle }) {
  const location = useLocation();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <div className="navbar-logo">⚡</div>
        <span className="navbar-title">
          {location.pathname === '/dashboard' ? 'IOT SMARTORDER' : 'IOT SMARTCART'}
        </span>
      </Link>
      <ul className="navbar-links">
        <li>
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Shop
          </Link>
        </li>
        <li>
          <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>
            Dashboard
          </Link>
        </li>
      </ul>
      {onCartToggle && (
        <button className="cart-toggle" onClick={onCartToggle}>
          <svg className="cart-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          {cartCount > 0 && (
            <span className="cart-badge">{cartCount}</span>
          )}
        </button>
      )}
    </nav>
  );
}

export default Navbar;
