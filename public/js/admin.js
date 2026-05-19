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
  if (ADMIN_TOKEN) sessionStorage.setItem("admin_key", ADMIN_TOKEN);
}

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "x-admin-secret": ADMIN_TOKEN,
});

const clearElementNode = (element) => {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
};

const createTableCell = (text) => {
  const td = document.createElement("td");
  td.textContent = text;
  return td;
};

const fetchAndRenderCategories = async () => {
  try {
    const res = await fetch("/api/menu");
    if (!res.ok) throw new Error("Unauthorized or server error");
    const items = await res.json();

    const distinctCategories = [...new Set(items.map((item) => item.category))];

    clearElementNode(categoryList);
    clearElementNode(itemCategorySelect);

    distinctCategories.forEach((catName) => {
      const option = document.createElement("option");
      option.value = catName;
      option.textContent = catName;
      itemCategorySelect.appendChild(option);

      const chip = document.createElement("div");
      chip.className = "category-chip";

      const textSpan = document.createElement("span");
      textSpan.textContent = catName;

      const delBtn = document.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.textContent = "×";
      delBtn.type = "button";
      delBtn.addEventListener("click", async () => {
        if (!confirm(`To delete category "${catName}", all underlying items will be deleted. Proceed?`)) return;
        isMutating = true;
        
        const matchingItems = items.filter(i => i.category === catName);
        for (const item of matchingItems) {
          await fetch(`/api/menu/${item._id}`, { method: "DELETE", headers: getAuthHeaders() });
        }
        
        await fetchAndRenderCategories();
        await fetchAndRenderMenu();
        isMutating = false;
      });

      chip.appendChild(textSpan);
      chip.appendChild(delBtn);
      categoryList.appendChild(chip);
    });
  } catch (err) {
    console.error("Failed fetching structural category snapshots:", err);
  }
};

const fetchAndRenderMenu = async () => {
  try {
    const res = await fetch("/api/menu");
    if (!res.ok) return;
    const items = await res.json();

    clearElementNode(menuList);

    if (!items || items.length === 0) {
      menuTable.classList.add("hidden-element");
      menuEmptyMsg.classList.remove("hidden-element");
      return;
    }

    menuEmptyMsg.classList.add("hidden-element");
    menuTable.classList.remove("hidden-element");

    items.forEach((item) => {
      const tr = document.createElement("tr");
      const actionTd = document.createElement("td");

      const editBtn = document.createElement("button");
      editBtn.className = "edit-btn";
      editBtn.textContent = "Edit";
      editBtn.type = "button";
      editBtn.addEventListener("click", () => {
        document.getElementById("item-name").value = item.name;
        document.getElementById("item-description").value = item.description || "";
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
        if (deleteRes.ok) {
          await fetchAndRenderMenu();
          await fetchAndRenderCategories();
        }
        isMutating = false;
      });

      actionTd.appendChild(editBtn);
      actionTd.appendChild(deleteBtn);

      tr.appendChild(createTableCell(item.name));
      tr.appendChild(createTableCell(item.description || ""));
      tr.appendChild(createTableCell(`₦${item.price}`));
      tr.appendChild(createTableCell(item.category));
      tr.appendChild(actionTd);
      menuList.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed fetching menu items:", err);
  }
};

const fetchAndRenderOrders = async () => {
  if (isMutating) return;
  try {
    const res = await fetch("/api/orders", { headers: getAuthHeaders() });
    if (!res.ok) return;
    const orders = await res.json();

    clearElementNode(ordersList);

    if (!orders || orders.length === 0) {
      ordersTable.classList.add("hidden-element");
      ordersEmptyMsg.classList.remove("hidden-element");
      return;
    }

    ordersEmptyMsg.classList.add("hidden-element");
    ordersTable.classList.remove("hidden-element");

    orders.forEach((order) => {
      const tr = document.createElement("tr");
      const statusTd = document.createElement("td");
      
      statusTd.textContent = order.status;
      statusTd.className = `status-${order.status.toLowerCase().replace(/\s+/g, "-")}`;

      const itemDetailsString = order.items
        .map((i) => `${i.name} (x${i.quantity})`)
        .join(", ");

      tr.appendChild(createTableCell(`...${order._id.slice(-6)}`));
      tr.appendChild(createTableCell(itemDetailsString));
      tr.appendChild(createTableCell(`₦${order.totalAmount}`));
      tr.appendChild(statusTd);
      ordersList.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed pulling order streams:", err);
  }
};

categoryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("category-name");
  const catValue = nameInput.value.trim();
  if (!catValue) return;

  const placeholderOption = document.createElement("option");
  placeholderOption.value = catValue;
  placeholderOption.textContent = catValue;
  itemCategorySelect.appendChild(placeholderOption);
  itemCategorySelect.value = catValue;

  nameInput.value = "";
  alert(`Category dynamic wrapper context created. Assign items to finalize structural mapping.`);
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
    await fetchAndRenderCategories();
  }
  isMutating = false;
});

document.addEventListener("DOMContentLoaded", () => {
  fetchAndRenderMenu().then(() => fetchAndRenderCategories());
  fetchAndRenderOrders();
  setInterval(fetchAndRenderOrders, 10000);
});