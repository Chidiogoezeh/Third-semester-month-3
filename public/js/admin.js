const menuForm = document.getElementById("menu-form");
const menuList = document.getElementById("menu-list");
const menuTable = document.getElementById("menu-table");
const menuEmptyMsg = document.getElementById("menu-empty-msg");

const categoryForm = document.getElementById("category-form");
const categoryList = document.getElementById("category-list");
const itemCategorySelect = document.getElementById("item-category");
const submitItemBtn = document.getElementById("submit-item-btn");

const ordersList = document.getElementById("orders-list");
const ordersTable = document.getElementById("orders-table");
const ordersEmptyMsg = document.getElementById("orders-empty-msg");

let editModeId = null;
let isMutating = false;

let ADMIN_TOKEN = sessionStorage.getItem("admin_key");
if (!ADMIN_TOKEN) {
  ADMIN_TOKEN = prompt("Enter Admin Access Token:");
  if (ADMIN_TOKEN) {
    sessionStorage.setItem("admin_key", ADMIN_TOKEN);
  }
}

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${ADMIN_TOKEN}`,
});

const fetchAndRenderCategories = async () => {
  try {
    const res = await fetch("/api/categories", { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Unauthorized or server error");
    const categories = await res.json();

    categoryList.innerHTML = "";
    itemCategorySelect.innerHTML = "";

    categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat.name;
      option.textContent = cat.name;
      itemCategorySelect.appendChild(option);

      const chip = document.createElement("div");
      chip.className = "category-chip";

      const textSpan = document.createElement("span");
      textSpan.textContent = cat.name;

      const delBtn = document.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.textContent = "×";
      delBtn.type = "button";
      delBtn.addEventListener("click", async () => {
        if (!confirm(`Delete category "${cat.name}"?`)) return;
        isMutating = true;
        const delRes = await fetch(`/api/categories/${cat._id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        if (delRes.ok) {
          await fetchAndRenderCategories();
          await fetchAndRenderMenu();
        }
        isMutating = false;
      });

      chip.appendChild(textSpan);
      chip.appendChild(delBtn);
      categoryList.appendChild(chip);
    });
  } catch (err) {
    console.error("Failed fetching categories:", err);
  }
};

const fetchAndRenderMenu = async () => {
  try {
    const res = await fetch("/api/menu");
    if (!res.ok) return;
    const items = await res.json();

    menuList.innerHTML = "";

    if (!items || items.length === 0) {
      menuTable.style.display = "none";
      menuEmptyMsg.style.display = "block";
      return;
    }

    menuEmptyMsg.style.display = "none";
    menuTable.style.display = "table";

    items.forEach((item) => {
      const tr = document.createElement("tr");

      const nameTd = document.createElement("td");
      nameTd.textContent = item.name;

      const descTd = document.createElement("td");
      descTd.textContent = item.description || "";

      const priceTd = document.createElement("td");
      priceTd.textContent = `₦${item.price}`;

      const catTd = document.createElement("td");
      catTd.textContent = item.category;

      const actionTd = document.createElement("td");

      const editBtn = document.createElement("button");
      editBtn.className = "edit-btn";
      editBtn.textContent = "Edit";
      editBtn.type = "button";
      editBtn.addEventListener("click", () => {
        document.getElementById("item-name").value = item.name;
        document.getElementById("item-description").value =
          item.description || "";
        document.getElementById("item-price").value = item.price;
        document.getElementById("item-category").value = item.category;
        editModeId = item._id;
        submitItemBtn.textContent = "Update Item";
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.type = "button";
      deleteBtn.addEventListener("click", async () => {
        if (!confirm("Delete item?")) return;
        isMutating = true;
        const deleteRes = await fetch(`/api/menu/${item._id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        if (deleteRes.ok) await fetchAndRenderMenu();
        isMutating = false;
      });

      actionTd.appendChild(editBtn);
      actionTd.appendChild(deleteBtn);

      tr.appendChild(nameTd);
      tr.appendChild(descTd);
      tr.appendChild(priceTd);
      tr.appendChild(catTd);
      tr.appendChild(actionTd);
      menuList.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed fetching menu:", err);
  }
};

const fetchAndRenderOrders = async () => {
  if (isMutating) return; // Halt interval rendering during layout modification calls
  try {
    const res = await fetch(`/api/orders`, { headers: getAuthHeaders() });
    if (!res.ok) return;
    const orders = await res.json();

    ordersList.innerHTML = "";

    if (!orders || orders.length === 0) {
      ordersTable.style.display = "none";
      ordersEmptyMsg.style.display = "block";
      return;
    }

    ordersEmptyMsg.style.display = "none";
    ordersTable.style.display = "table";

    orders.forEach((order) => {
      const tr = document.createElement("tr");

      const idTd = document.createElement("td");
      idTd.textContent = `...${order._id.slice(-6)}`;

      const itemsTd = document.createElement("td");
      itemsTd.textContent = order.items
        .map((i) => `${i.name} (x${i.quantity})`)
        .join(", ");

      const totalTd = document.createElement("td");
      totalTd.textContent = `₦${order.totalAmount}`;

      const statusTd = document.createElement("td");
      statusTd.textContent = order.status;
      statusTd.className = `status-${order.status.toLowerCase().replace(/\s+/g, "-")}`;

      tr.appendChild(idTd);
      tr.appendChild(itemsTd);
      tr.appendChild(totalTd);
      tr.appendChild(statusTd);
      ordersList.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed pulling orders update stream:", err);
  }
};

categoryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("category-name");
  const name = nameInput.value.trim();
  if (!name) return;

  isMutating = true;
  const res = await fetch("/api/categories", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  });

  if (res.ok) {
    nameInput.value = "";
    await fetchAndRenderCategories();
  }
  isMutating = false;
});

menuForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("item-name").value.trim();
  const description = document.getElementById("item-description").value.trim();
  const price = document.getElementById("item-price").value;
  const category = document.getElementById("item-category").value;

  if (!name || !price || isNaN(parseInt(price, 10))) return;

  isMutating = true;
  let res;
  const payload = { name, description, price: parseInt(price, 10), category };

  if (editModeId) {
    res = await fetch(`/api/menu/${editModeId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    editModeId = null;
    submitItemBtn.textContent = "Add Item";
  } else {
    res = await fetch("/api/menu", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
  }

  if (res.ok) {
    menuForm.reset();
    await fetchAndRenderMenu();
  }
  isMutating = false;
});

document.addEventListener("DOMContentLoaded", () => {
  fetchAndRenderCategories();
  fetchAndRenderMenu();
  fetchAndRenderOrders();
  setInterval(fetchAndRenderOrders, 10000);
});
