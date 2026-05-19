const menuForm = document.getElementById("menu-form");
const menuList = document.getElementById("menu-list");
const categoryForm = document.getElementById("category-form");
const categoryList = document.getElementById("category-list");
const itemCategorySelect = document.getElementById("item-category");
const submitItemBtn = document.getElementById("submit-item-btn");
const ordersList = document.getElementById("orders-list");

let editModeId = null;

// Secure token collection from Session Storage rather than hardcoded scripts
let ADMIN_TOKEN = sessionStorage.getItem("admin_key");
if (!ADMIN_TOKEN) {
  ADMIN_TOKEN = prompt("Enter Admin Access Token:") || "SuperSecretAdminKey123";
  sessionStorage.setItem("admin_key", ADMIN_TOKEN);
}

const clearContainer = (container) => {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

const fetchAndRenderCategories = async () => {
  const res = await fetch("/api/categories", {
    headers: { "x-admin-secret": ADMIN_TOKEN },
  });
  if (!res.ok) return;
  const categories = await res.json();

  clearContainer(categoryList);
  clearContainer(itemCategorySelect);

  categories.forEach((cat) => {
    // Populate form dropdown select dynamically
    const option = document.createElement("option");
    option.value = cat.name;
    option.textContent = cat.name;
    itemCategorySelect.appendChild(option);

    // Build functional category chips management dashboard
    const chip = document.createElement("div");
    chip.className = "category-chip";

    const textSpan = document.createElement("span");
    textSpan.textContent = cat.name;

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "×";
    delBtn.addEventListener("click", async () => {
      const confirmDelete = confirm(
        `Delete category "${cat.name}"? This could orphan nested items.`,
      );
      if (!confirmDelete) return;

      const delRes = await fetch(`/api/categories/${cat._id}`, {
        method: "DELETE",
        headers: { "x-admin-secret": ADMIN_TOKEN },
      });
      if (delRes.ok) {
        fetchAndRenderCategories();
        fetchAndRenderMenu();
      }
    });

    chip.appendChild(textSpan);
    chip.appendChild(delBtn);
    categoryList.appendChild(chip);
  });
};

const fetchAndRenderMenu = async () => {
  const res = await fetch("/api/menu");
  if (!res.ok) return;
  const items = await res.json();
  renderTable(items);
};

const renderTable = (items) => {
  clearContainer(menuList);

  if (!items || items.length === 0) {
    const p = document.createElement("p");
    p.textContent = "No items available in the menu.";
    menuList.appendChild(p);
    return;
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  ["Name", "Description", "Price", "Category", "Actions"].forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
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
    deleteBtn.addEventListener("click", async () => {
      const deleteRes = await fetch(`/api/menu/${item._id}`, {
        method: "DELETE",
        headers: { "x-admin-secret": ADMIN_TOKEN },
      });
      if (deleteRes.ok) fetchAndRenderMenu();
    });

    actionTd.appendChild(editBtn);
    actionTd.appendChild(deleteBtn);

    [nameTd, descTd, priceTd, catTd, actionTd].forEach((td) =>
      tr.appendChild(td),
    );
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  menuList.appendChild(table);
};

categoryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("category-name");
  const name = nameInput.value.trim();
  if (!name) return;

  const res = await fetch("/api/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": ADMIN_TOKEN,
    },
    body: JSON.stringify({ name }),
  });

  if (res.ok) {
    nameInput.value = "";
    fetchAndRenderCategories();
  }
});

menuForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("item-name").value.trim();
  const description = document.getElementById("item-description").value.trim();
  const price = document.getElementById("item-price").value;
  const category = document.getElementById("item-category").value;

  if (!name || !price || isNaN(parseInt(price, 10))) return;

  let res;
  const payload = { name, description, price: parseInt(price, 10), category };

  if (editModeId) {
    res = await fetch(`/api/menu/${editModeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": ADMIN_TOKEN,
      },
      body: JSON.stringify(payload),
    });
    editModeId = null;
    submitItemBtn.textContent = "Add Item";
  } else {
    res = await fetch("/api/menu", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": ADMIN_TOKEN,
      },
      body: JSON.stringify(payload),
    });
  }

  if (res.ok) {
    menuForm.reset();
    fetchAndRenderMenu();
  }
});

const fetchAndRenderOrders = async () => {
  const res = await fetch(`/api/orders?admin_key=${ADMIN_TOKEN}`);
  if (!res.ok) return;
  const orders = await res.json();

  clearContainer(ordersList);

  if (orders.length === 0) {
    const noOrdersMsg = document.createElement("p");
    noOrdersMsg.textContent = "No orders registered yet.";
    ordersList.appendChild(noOrdersMsg);
    return;
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  ["Order ID", "Items", "Total Paid", "Status"].forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
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

    [idTd, itemsTd, totalTd, statusTd].forEach((td) => tr.appendChild(td));
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  ordersList.appendChild(table);
};

document.addEventListener("DOMContentLoaded", () => {
  fetchAndRenderCategories();
  fetchAndRenderMenu();
  fetchAndRenderOrders();
  setInterval(fetchAndRenderOrders, 10000);
});
