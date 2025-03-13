fetch('/products') // сервер на том же домене, порт 8080
  .then(res => res.json())
  .then(products => {
    const list = document.getElementById('product-list');
    products.forEach(p => {
      const card = document.createElement('div');
      card.innerHTML = `
        <h2>${p.name}</h2>
        <p>Цена: ${p.price}</p>
        <p>${p.description}</p>
        <p>Категории: ${p.categories.join(', ')}</p>
      `;
      list.appendChild(card);
    });
  })
  .catch(err => console.error('Ошибка:', err));
