"""
IoT Smart Ordering System — FastAPI Backend
Run with: uvicorn main:app --reload
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

app = FastAPI(title="IoT Smart Order System")

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory data store ─────────────────────────────────────────────

products = {
    1: {"id": 1, "name": "Smart Light Bulb",    "price": 24.99, "stock": 10, "image": "smart_light_bulb.png"},
    2: {"id": 2, "name": "Temperature Sensor",  "price": 19.99, "stock": 10, "image": "temperature_sensor.png"},
    3: {"id": 3, "name": "Smart Plug",           "price": 14.99, "stock": 10, "image": "smart_plug.png"},
}

orders: list[dict] = []
order_counter = 0

# ── Schemas ───────────────────────────────────────────────────────────

class OrderRequest(BaseModel):
    product_id: int
    quantity: int = 1
    customer_name: Optional[str] = "Guest"

# ── Endpoints ─────────────────────────────────────────────────────────

@app.get("/products")
def get_products():
    """Return all products with current stock levels."""
    return list(products.values())


@app.post("/orders")
def place_order(order: OrderRequest):
    """Place a new order. Decrements stock."""
    global order_counter

    if order.product_id not in products:
        raise HTTPException(status_code=404, detail="Product not found")

    product = products[order.product_id]

    if product["stock"] <= 0:
        raise HTTPException(status_code=400, detail=f"{product['name']} is out of stock!")

    if order.quantity > product["stock"]:
        raise HTTPException(
            status_code=400,
            detail=f"Only {product['stock']} units of {product['name']} remaining",
        )

    # Decrement stock
    product["stock"] -= order.quantity

    # Record order
    order_counter += 1
    new_order = {
        "id": order_counter,
        "product_id": order.product_id,
        "product_name": product["name"],
        "quantity": order.quantity,
        "total_price": round(product["price"] * order.quantity, 2),
        "customer_name": order.customer_name,
        "timestamp": datetime.now().isoformat(),
    }
    orders.append(new_order)

    return {"message": "Order placed successfully!", "order": new_order}


@app.get("/orders")
def get_orders():
    """Return all orders, most recent first."""
    return list(reversed(orders))


@app.get("/stats")
def get_stats():
    """Return dashboard analytics."""
    total_orders = len(orders)
    total_revenue = round(sum(o["total_price"] for o in orders), 2)

    # Count orders per product
    product_order_counts = {}
    product_quantity_counts = {}
    for o in orders:
        pid = o["product_id"]
        product_order_counts[pid] = product_order_counts.get(pid, 0) + 1
        product_quantity_counts[pid] = product_quantity_counts.get(pid, 0) + o["quantity"]

    # Most popular product
    most_popular = None
    if product_quantity_counts:
        best_pid = max(product_quantity_counts, key=product_quantity_counts.get)
        most_popular = {
            "product_id": best_pid,
            "product_name": products[best_pid]["name"],
            "total_quantity_ordered": product_quantity_counts[best_pid],
        }

    # Out-of-stock alerts
    out_of_stock = [
        {"product_id": p["id"], "product_name": p["name"]}
        for p in products.values()
        if p["stock"] <= 0
    ]

    # Low stock warnings (3 or fewer)
    low_stock = [
        {"product_id": p["id"], "product_name": p["name"], "remaining": p["stock"]}
        for p in products.values()
        if 0 < p["stock"] <= 3
    ]

    # Per-product breakdown
    per_product = []
    for p in products.values():
        per_product.append({
            "product_id": p["id"],
            "product_name": p["name"],
            "total_ordered": product_quantity_counts.get(p["id"], 0),
            "stock_remaining": p["stock"],
            "revenue": round(p["price"] * product_quantity_counts.get(p["id"], 0), 2),
        })

    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "most_popular": most_popular,
        "out_of_stock": out_of_stock,
        "low_stock": low_stock,
        "per_product": per_product,
    }
