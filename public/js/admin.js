const menuForm = document.getElementById("menu-form");
const menuList = document.getElementById("menu-list");
let editModeId = null;

const fetchAndRenderMenu = async () => {
  const res = await fetch("/api/menu");
  const items = await res.json();
  renderTable(items);
};

const renderTable = (items) => {
  while (menuList.firstChild) {
    menuList.removeChild(menuList.firstChild);
  }

  if (items.length === 0) {
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
    priceTd.textContent = `#${item.price}`;

    const catTd = document.createElement("td");
    catTd.textContent = item.category;

    const actionTd = document.createElement("td");

    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "Replace/Edit";
    editBtn.addEventListener("click", () => {
      document.getElementById("item-name").value = item.name;
      document.getElementById("item-description").value =
        item.description || "";
      document.getElementById("item-price").value = item.price;
      document.getElementById("item-category").value = item.category;
      editModeId = item._id;
      document.querySelector("#menu-form button").textContent = "Update Item";
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      const deleteRes = await fetch(`/api/menu/${item._id}`, {
        method: "DELETE",
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

menuForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("item-name").value;
  const description = document.getElementById("item-description").value;
  const price = document.getElementById("item-price").value;
  const category = document.getElementById("item-category").value;

  let res;
  if (editModeId) {
    res = await fetch(`/api/menu/${editModeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        price: Number(price),
        category,
      }),
    });
    editModeId = null;
    document.querySelector("#menu-form button").textContent = "Add Item";
  } else {
    res = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        price: Number(price),
        category,
      }),
    });
  }

  if (res.ok) {
    menuForm.reset();
    fetchAndRenderMenu();
  }
});

document.addEventListener("DOMContentLoaded", fetchAndRenderMenu);
