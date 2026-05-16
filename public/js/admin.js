const menuForm = document.getElementById("menu-form");
const menuList = document.getElementById("menu-list");

const fetchAndRenderMenu = async () => {
  const res = await fetch("/api/menu");
  const items = await res.json();
  renderTable(items);
};

const renderTable = (items) => {
  menuList.textContent = "";
  if (items.length === 0) {
    const p = document.createElement("p");
    p.textContent = "No items available in the menu.";
    menuList.appendChild(p);
    return;
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  ["Name", "Price", "Category", "Action"].forEach((text) => {
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

    const priceTd = document.createElement("td");
    priceTd.textContent = `#${item.price}`;

    const catTd = document.createElement("td");
    catTd.textContent = item.category;

    const actionTd = document.createElement("td");
    const btn = document.createElement("button");
    btn.className = "delete-btn";
    btn.dataset.id = item._id;
    btn.textContent = "Delete";

    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      const deleteRes = await fetch(`/api/menu/${id}`, { method: "DELETE" });
      if (deleteRes.ok) {
        fetchAndRenderMenu();
      }
    });

    actionTd.appendChild(btn);
    [nameTd, priceTd, catTd, actionTd].forEach((td) => tr.appendChild(td));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  menuList.appendChild(table);
};

menuForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("item-name").value;
  const price = document.getElementById("item-price").value;
  const category = document.getElementById("item-category").value;

  const res = await fetch("/api/menu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, price: Number(price), category }),
  });

  if (res.ok) {
    menuForm.reset();
    fetchAndRenderMenu();
  }
});

document.addEventListener("DOMContentLoaded", fetchAndRenderMenu);
