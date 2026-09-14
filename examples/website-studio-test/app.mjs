import { addItem, removeItem, total, localePacks } from "./core.mjs";
const element = id => document.getElementById(id);
let items = [], locale = "en", invalid = false;
function render() {
  const pack = localePacks[locale]; document.documentElement.lang = locale;
  for (const [id, key] of [["title", "title"], ["quantity-label", "quantity"], ["price-label", "price"], ["add", "add"], ["reset", "reset"], ["total-label", "total"]]) element(id).textContent = pack[key];
  element("error").textContent = invalid ? pack.invalid : "";
  element("items").replaceChildren(...items.map((item, index) => {
    const li = document.createElement("li"), button = document.createElement("button");
    li.textContent = `${item.quantity} × ${item.price} = ${item.quantity * item.price} `;
    button.textContent = pack.remove; button.onclick = () => { items = removeItem(items, index); render(); };
    li.append(button); return li;
  }));
  element("total").textContent = String(total(items));
}
element("form").onsubmit = event => {
  event.preventDefault();
  try { items = addItem(items, element("quantity").value, element("price").value); invalid = false; }
  catch { invalid = true; }
  render();
};
element("locale").onchange = event => { locale = event.target.value; render(); };
element("reset").onclick = () => { items = []; invalid = false; element("form").reset(); render(); };
render();
