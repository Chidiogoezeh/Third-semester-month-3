const renderTable = (items) => {
  menuList.textContent = "";
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

    actionTd.appendChild(btn);
    [nameTd, priceTd, catTd, actionTd].forEach((td) => tr.appendChild(td));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  menuList.appendChild(table);
};
