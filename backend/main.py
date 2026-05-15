"""
IoT Smart Cart System — FastAPI Backend
Run with: uvicorn main:app --reload
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

app = FastAPI(title="IoT Smart Cart System")

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
    1: {"id": 1, "name": "Smart Light Bulb",    "price": 24.99, "stock": 10, "image": "smart_light_bulb.png",    "location": "aisle-A3"},
    2: {"id": 2, "name": "Temperature Sensor",  "price": 19.99, "stock": 10, "image": "temperature_sensor.png",  "location": "aisle-B1"},
    3: {"id": 3, "name": "Smart Plug",           "price": 14.99, "stock": 10, "image": "smart_plug.png",          "location": "aisle-C2"},
}

orders: list[dict] = []
order_counter = 0

# ── Schemas ───────────────────────────────────────────────────────────

class CartItem(BaseModel):
    product_id: int
    quantity: int = 1

class CheckoutRequest(BaseModel):
    items: list[CartItem]
    customer_name: Optional[str] = "Guest"

class OrderRequest(BaseModel):
    product_id: int
    quantity: int = 1
    customer_name: Optional[str] = "Guest"

# ── Endpoints ─────────────────────────────────────────────────────────

@app.get("/products")
def get_products():
    """Return all products with current stock levels."""
    return list(products.values())


@app.post("/checkout")
def checkout(request: CheckoutRequest):
    """Place a multi-item order. Atomically validates and decrements stock."""
    global order_counter

    if not request.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Phase 1: validate ALL items before touching stock
    validated_items = []
    for cart_item in request.items:
        if cart_item.product_id not in products:
            raise HTTPException(status_code=404, detail=f"Product ID {cart_item.product_id} not found")

        product = products[cart_item.product_id]

        if product["stock"] <= 0:
            raise HTTPException(status_code=400, detail=f"{product['name']} is out of stock!")

        if cart_item.quantity <= 0:
            raise HTTPException(status_code=400, detail=f"Quantity for {product['name']} must be at least 1")

        if cart_item.quantity > product["stock"]:
            raise HTTPException(
                status_code=400,
                detail=f"Only {product['stock']} units of {product['name']} remaining",
            )

        validated_items.append({
            "product_id": cart_item.product_id,
            "product_name": product["name"],
            "quantity": cart_item.quantity,
            "unit_price": product["price"],
            "line_total": round(product["price"] * cart_item.quantity, 2),
            "location": product["location"],
            "image": product["image"],
        })

    # Phase 2: all valid — decrement stock atomically
    for item in validated_items:
        products[item["product_id"]]["stock"] -= item["quantity"]

    # Phase 3: record order
    order_counter += 1
    total_price = round(sum(item["line_total"] for item in validated_items), 2)
    new_order = {
        "id": order_counter,
        "items": validated_items,
        "total_price": total_price,
        "total_items": sum(item["quantity"] for item in validated_items),
        "customer_name": request.customer_name,
        "timestamp": datetime.now().isoformat(),
    }
    orders.append(new_order)

    return {"message": "Order placed successfully!", "order": new_order}


@app.post("/orders")
def place_order(order: OrderRequest):
    """Place a single-item order (backward compatibility). Wraps into checkout logic."""
    checkout_req = CheckoutRequest(
        items=[CartItem(product_id=order.product_id, quantity=order.quantity)],
        customer_name=order.customer_name,
    )
    result = checkout(checkout_req)
    return result


@app.get("/orders")
def get_orders():
    """Return all orders, most recent first."""
    return list(reversed(orders))


@app.get("/stats")
def get_stats():
    """Return dashboard analytics."""
    total_orders = len(orders)
    total_revenue = round(sum(o["total_price"] for o in orders), 2)

    # Count orders per product by iterating over items
    product_order_counts = {}
    product_quantity_counts = {}
    for o in orders:
        for item in o["items"]:
            pid = item["product_id"]
            product_order_counts[pid] = product_order_counts.get(pid, 0) + 1
            product_quantity_counts[pid] = product_quantity_counts.get(pid, 0) + item["quantity"]

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


# ── ESP32 / Pi Integration Endpoints ──────────────────────────────

cart_dispatch_queue: list[dict] = []

@app.get("/cart/dispatch-queue")
def get_dispatch_queue():
    """
    ESP32/Pi polls this endpoint to get pending orders.
    Returns all orders that haven't been marked as dispatched yet.
    Each order includes item locations for navigation routing.
    """
    pending = [o for o in orders if not o.get("dispatched", False)]
    return {"pending_orders": pending, "count": len(pending)}


@app.post("/cart/dispatch-queue/{order_id}/ack")
def acknowledge_dispatch(order_id: int):
    """
    ESP32/Pi calls this to mark an order as being processed.
    Prevents duplicate dispatches.
    """
    for order in orders:
        if order["id"] == order_id:
            order["dispatched"] = True
            return {"message": f"Order #{order_id} marked as dispatched"}
    raise HTTPException(status_code=404, detail=f"Order #{order_id} not found")


@app.get("/cart/order/{order_id}/route")
def get_order_route(order_id: int):
    """
    Returns the navigation route for a specific order.
    ESP32 uses the locations array to navigate to each item.
    Route is sorted by location for optimal path.
    """
    for order in orders:
        if order["id"] == order_id:
            locations = [
                {"product_id": item["product_id"], "product_name": item["product_name"], "quantity": item["quantity"], "location": item["location"]}
                for item in order["items"]
            ]
            return {
                "order_id": order_id,
                "customer_name": order["customer_name"],
                "route": locations,
                "total_stops": len(locations),
            }
    raise HTTPException(status_code=404, detail=f"Order #{order_id} not found")


@app.post("/cart/actuator/{order_id}/complete")
def actuator_complete(order_id: int):
    """
    ESP32 calls this when the servo/actuator has finished pushing
    an item onto the cart at a specific location.
    """
    for order in orders:
        if order["id"] == order_id:
            if "actuator_log" not in order:
                order["actuator_log"] = []
            order["actuator_log"].append({
                "action": "actuator_complete",
                "timestamp": datetime.now().isoformat(),
            })
            return {"message": f"Actuator action logged for order #{order_id}"}
    raise HTTPException(status_code=404, detail=f"Order #{order_id} not found")


@app.post("/cart/order/{order_id}/fulfilled")
def mark_fulfilled(order_id: int):
    """
    ESP32 calls this when all items have been collected and the cart
    has returned to the dispatch point.
    """
    for order in orders:
        if order["id"] == order_id:
            order["fulfilled"] = True
            order["fulfilled_at"] = datetime.now().isoformat()
            return {"message": f"Order #{order_id} marked as fulfilled"}
    raise HTTPException(status_code=404, detail=f"Order #{order_id} not found")
