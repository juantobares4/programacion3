const loader = document.getElementById("loaderPage");

window.addEventListener("DOMContentLoaded", () => {
  showLoader();

});

window.addEventListener("load", () => {
  setTimeout(() => {
    hideLoader();
  
  }, 3000);

});

const getLocalStorage = () => {
  let data = localStorage.getItem('data');

  return data ? JSON.parse(data) : [];

};

const saveInLocalStorage = (data) => {
  localStorage.setItem('data', JSON.stringify(data));

};

const showToast = (message, title) => {
  toastr.options = {
      "closeButton": true,
      "debug": false,
      "newestOnTop": false,
      "progressBar": true,
      "positionClass": "toast-top-center",
      "preventDuplicates": false,
      "onclick": null,
      "showDuration": "300",
      "hideDuration": "1000",
      "timeOut": "5000",
      "extendedTimeOut": "1000",
      "showEasing": "swing",
      "hideEasing": "linear",
      "showMethod": "fadeIn",
      "hideMethod": "fadeOut"
  
  };

  toastr.success(message, title);

};

const showLoader = () => {
 loader.classList.add("show_loader");

};

const hideLoader = () => {
  loader.classList.remove("show_loader");

};

const scrollSection = (section) => {
  let sectionToScroll = document.getElementById(section);

  sectionToScroll.scrollIntoView({
    behavior: 'smooth'
  
  });

};

const deleteDuplicate = (array) => {
  let uniqueProducts = {};
  array.forEach(element => {
    uniqueProducts[element.title] = element; // Esto nos garantiza que no se puedan agregar objetos con el mismo título.
  
  });

  return Object.values(uniqueProducts);

};

const countDuplicate = (array) => {
  let countMap = {};

  array.forEach(element => {
    if(countMap[element.title]){
      countMap[element.title]++;
    
    }else{
      countMap[element.title] = 1;
    
    }
  
  });

  return countMap;

};

const renderRatingStars = (rating) => {
  let maxStars = 5;
  let starFill = '<img class="mb-1" src="public/icons/star-fill.svg" alt="star-fill">';
  let star = '<img class="mb-1" src="public/icons/star.svg" alt="star">';
  let message = '';
  let roundedRating = Math.round(rating);

  for(let x = 1; x <= maxStars; x++){
    if(x <= roundedRating){
      message += starFill;

    }else{
      message += star;

    }

  }

  return message;

};

const removeAll = async(productId, asyncFunction, isFavourite, itsInTheCart) => {
  try{
    let productsInLocalStorage = getLocalStorage();
    let productsFilter;

    if(isFavourite){
      productsFilter = productsInLocalStorage.filter(product => !(product.id === productId && product.isFavourite));
    
    }else if(itsInTheCart){
      productsFilter = productsInLocalStorage.filter(product => !(product.id === productId && product.itsInTheCart));
    
    };
   
    saveInLocalStorage(productsFilter);
    showToast('Producto eliminado con éxito');
 
    await asyncFunction();
    await counterProductsInMyCart();


  }catch(error){
    console.error(error);

  }

};

const removeForQuantity = async(productId, asyncFunction, isFavourite, itsInTheCart) => {
  try{
    let productsInLocalStorage = getLocalStorage();
    
    if(isFavourite){  
      let productIndex = productsInLocalStorage.findIndex(product => product.id === productId);
      productsInLocalStorage.splice(productIndex, 1); // A partir del índice del producto encontrado, borramos un elemento.
    
    }else if(itsInTheCart){
      let productIndex = productsInLocalStorage.findIndex(product => product.id === productId);
      productsInLocalStorage.splice(productIndex, 1);
    
    }

    saveInLocalStorage(productsInLocalStorage);
    showToast('Producto eliminado con éxito');

    await asyncFunction();
    await counterProductsInMyCart();
    
  }catch(error){
    console.error(error);

  }

};

const fetchCompleteProductsApi = (filter) => { // En esta promesa traigo el producto con las características generales, y aparte, traigo su respectivo detalle, para poder utilizar las fotos en el inicio.
  return new Promise((resolve, reject) => {
    setTimeout(() => {
        fetch(`https://api.mercadolibre.com/sites/MLA/search?q=${filter}`)
          .then(res => res.json())
          .then(json => {
            const selectData = json.results.map(item => ({
              id: item.id,
              title: item.title,
              price: item.price,
              seller: item.seller.nickname, // Nombre del vendedor
              currency: item.currency_id, // Tipo de moneda
              condition: item.condition, // Usado o nuevo
              isFreeShipping: item.shipping.free_shipping, // Envío gratis
              stock: item.available_quantity,
              categoryId: item.category_id,
              attributes: item.attributes // Atributos del producto

            }))

            const detailPromises = selectData.map(product => // Detalle del producto. Contiene más información (fotos por ej.).
              fetch(`https://api.mercadolibre.com/items/${product.id}`)
                .then(res => res.json())
                .then(detail => ({
                  ...product, // Esto copia los anteriores atributos del producto.
                  images: detail.pictures,
                  warranty: detail.warranty
                  
                }))
            
            );

            Promise.all(detailPromises)
            .then(detailedProducts => resolve(detailedProducts))
            .catch(error => reject(error));

          })

          .catch(error => reject(error));
  
    }, 100);

  });

};

const fetchProductDetail = (productId) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      fetch(`https://api.mercadolibre.com/items/${productId}`)
        .then(res => res.json())
        .then(json => {
          const selectedData = {
            id: json.id,
            title: json.title,
            price: json.price,
            currency: json.currency_id,
            condition: json.condition,
            attributes: json.attributes,
            images: json.pictures,
            warranty: json.warranty,
            randomRating: (Math.random() * 2 + 3).toFixed(1) // Inventé una valoración aleatoria, entre 3 y 5 puntos, para los productos.

          };
          
          resolve([selectedData]);
        
        })

        .catch(error => reject(error));
    
      }, 100);
  
  });

};

const fetchProductDescription = (idProduct) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      fetch(`https://api.mercadolibre.com/items/${idProduct}/description`)
        .then(res => res.json())
        .then(json => {
          const descript = {
            description: json.plain_text

          };

          resolve([descript]);

        })

        .catch(error => reject(error));

    }, 100);

  });

};

const productByCategory = async(container, filter) => {
  function capitalizeFirstLetter(string){
    return string.substring(0, 1).toUpperCase() + string.substring(1);
  
  }

  let products = await fetchCompleteProductsApi(filter);
  let containerProducts = document.getElementById(container);
  containerProducts.innerHTML = '';

  let carousel = document.createElement('div');
  carousel.className = 'carousel slide';
  carousel.setAttribute('data-ride', 'carousel');

  let carouselId = `product-carousel-${container}`;
  carousel.id = carouselId;

  let indicators = document.createElement('ol');
  indicators.className = 'carousel-indicators';

  let inner = document.createElement('div');
  inner.className = 'carousel-inner';

  let prev = document.createElement('a');
  prev.className = 'carousel-control-prev';
  prev.href = `#${carouselId}`;
  prev.role = 'button';
  prev.setAttribute('data-slide', 'prev');
  prev.innerHTML = '<img src="/public/icons/caret-left-fill.svg" alt="prev">';

  let next = document.createElement('a');
  next.className = 'carousel-control-next';
  next.href = `#${carouselId}`;
  next.role = 'button';
  next.setAttribute('data-slide', 'next');
  next.innerHTML = '<img src="/public/icons/caret-right-fill.svg" alt="next">';

  products.forEach((product, index) => {
    let indicator = document.createElement('li');
    indicator.setAttribute('data-target', `#${carouselId}`);
    indicator.setAttribute('data-slide-to', index);

    if(index === 0){
      indicator.className = 'active';
    
    }

    indicators.appendChild(indicator);

    let carouselItem = document.createElement('div');
    carouselItem.className = `carousel-item${index === 0 ? ' active' : ''}`;

    let img = document.createElement('img');
    img.src = product.images[0].url;
    img.className = 'product-image d-block mx-auto';
    img.alt = product.title;
    img.style.height = '300px';
    img.style.width = '300px';
    img.style.objectFit = 'contain';
    img.style.borderRadius = '30px';
    img.style.padding = '10px';

    let title = document.createElement('h5');
    title.innerHTML = `${product.title}`;
    title.className = 'product-title';

    let description = document.createElement('p');
    description.textContent = product.description;
    description.className = 'product-description';

    let price = document.createElement('p');
    price.innerHTML = `<b>${product.currency}</b> ${product.price}`;
    price.className = 'product-price';

    let shipping = document.createElement('p');
    shipping.innerHTML = `${product.isFreeShipping ? 'Envío Gratis' : ''}`;
    shipping.className = 'product-shipping text-success';

    let seller = document.createElement('p');
    seller.innerHTML = `<i>${product.seller}</i>`;
    seller.className = 'product-seller';

    let containerIcons = document.createElement('div');
    containerIcons.className = 'd-flex justify-content-center align-items-center container-icons';
    
    let horizontalLine = document.createElement('hr');

    let elementIconFav = document.createElement('img');
    let elementIconAddToCart = document.createElement('img');
    let elementProductDetail = document.createElement('a');

    elementIconAddToCart.style.cursor = 'pointer';
    elementIconFav.style.cursor = 'pointer';
    
    elementIconFav.className = 'svg-add-product-to-fav mr-3';
    elementIconAddToCart.className = 'svg-add-product-to-cart mr-3';

    let routeIconFav = '/public/icons/heart.svg';
    let routeIconAddToCart = '/public/icons/bag-plus.svg';

    elementIconFav.src = routeIconFav;
    elementIconFav.style.marginRight = '10px';

    elementIconAddToCart.src = routeIconAddToCart;
    elementIconAddToCart.style.marginBottom = '2px';

    elementProductDetail.text = 'Más detalles...';
    elementProductDetail.style.cursor = 'pointer';
    elementProductDetail.style.textDecoration = 'none';
    elementProductDetail.className = 'link-product-detail ml-2 mt-1 text-info';
    
    containerIcons.appendChild(elementIconFav);
    containerIcons.appendChild(elementIconAddToCart);
    containerIcons.appendChild(elementProductDetail);
    
    elementProductDetail.addEventListener('click', () => {
      productDetail(product.id);

    });
    
    elementIconFav.addEventListener('click', () => {
      addProductToFav(product.id);

    });

    elementIconAddToCart.addEventListener('click', () => {
      addProductToCart(product.id);

    })

    carouselItem.appendChild(img);
    carouselItem.appendChild(title);
    carouselItem.appendChild(description);
    carouselItem.appendChild(price);
    carouselItem.appendChild(seller);
    carouselItem.appendChild(shipping);
    carouselItem.appendChild(horizontalLine);
    carouselItem.appendChild(containerIcons);
    inner.appendChild(carouselItem);
  
  });

  carousel.appendChild(indicators);
  carousel.appendChild(inner);
  carousel.appendChild(prev);
  carousel.appendChild(next);

  containerProducts.appendChild(carousel);

  let titleOfSection = document.createElement('h5');
  titleOfSection.className = 'carousel-title';
  titleOfSection.innerHTML = `Descubrí nuestros productos de ${capitalizeFirstLetter(filter)}`;

  containerProducts.parentNode.insertBefore(titleOfSection, containerProducts);
  
};

const filterBy = async(filter, event = null) => {
  try{
    if(event){
      event.preventDefault();

    };
    
    document.querySelectorAll('.section-products-by-categories, .horizontal-line, .title').forEach(element => {
      element.style.display = 'none';
      
    });
    
    let mainContent = document.getElementById('products-container');
    let searchContainer = document.getElementById('section-list-products');
    let sectionSearchProducts = document.querySelector('.section-search-products');
    
    sectionSearchProducts.style.marginBottom = '20px';

    let containerTitle = document.getElementById('container-title');
    
    let elementTitle = document.createElement('h4');
    let elementResults = document.createElement('p');

    let inputContent = filter || document.getElementById('inputUser').value; // El parámetro filter lo recibiría desde el apartado "Categorías" de la Nav, si no existe, nos trae lo que el usuario introdujo en la barra de búsqueda.
    let productsApi = await fetchCompleteProductsApi(inputContent);
    let exist = document.getElementById('inputUser').value;
    
    let messageTitle = `Resultados de la búsqueda: ${inputContent}`;
    let messageResults = `${productsApi.length} resultados`;

    if(!containerTitle){
      let containerTitle = document.createElement('div');
      containerTitle.id = 'container-title';
      
      elementTitle.innerHTML = messageTitle;

      elementTitle.className = 'main-font mb-1';
      elementTitle.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 1)';
      elementTitle.style.color = 'white';

      elementResults.innerHTML = messageResults;

      elementResults.className = 'main-font mb-5 mt-2';
      elementResults.style.color = 'white';
      
      containerTitle.className = 'd-flex flex-column align-items-center pt-5 border';
      containerTitle.style.backgroundColor = '#3b3535';
      containerTitle.style.boxShadow = '15px 15px 15px 10px rgba(0, 0, 0, 0.3)';

      containerTitle.appendChild(elementTitle);
      containerTitle.appendChild(elementResults);
      searchContainer.parentNode.insertBefore(containerTitle, searchContainer);
      
    }else{
      let elementTitle = containerTitle.querySelector('h4');
      let elementResults = containerTitle.querySelector('p');

      elementTitle.innerHTML = messageTitle;
      elementResults.innerHTML = messageResults;

    };

    mainContent.innerHTML = '';
    
    productsApi.forEach(product => {
      let colDiv = document.createElement('div');
      colDiv.className = 'col-lg-4 mb-4 w-50 mt-0';

      let cardDiv = document.createElement('div');
      cardDiv.className = 'card ml-5 h-100 mr-5 tv headshot';
      cardDiv.style.boxShadow = '15px 15px 15px 10px rgba(0, 0, 0, 0.3)';

      let imageByProduct = document.createElement('img');
      imageByProduct.src = product.images[0].url;
      imageByProduct.className = 'card-img-top';
      imageByProduct.className = 'card-img-top mx-auto d-block headshot';
      imageByProduct.style.width = '200px';
      imageByProduct.style.height = '200px';
      imageByProduct.style.marginTop = '20px';
      imageByProduct.style.marginBottom = '20px';
        
      let cardBody = document.createElement('div');
      cardBody.className = 'card-body text-center d-flex flex-column justify-content-between';

      let cardTitle = document.createElement('h5'); 
      cardTitle.className = 'card-title';
      cardTitle.style.fontSize = '17px';

      let productTitle = `${product.title}`;
      cardTitle.innerHTML = productTitle;

      let cardPrice = document.createElement('p');
      let price = `${product.price} <b>${product.currency}</b>`;
      cardPrice.innerHTML = price;
      cardPrice.style.fontSize = '15px';
      cardPrice.className = 'card-text';

      let cardSeller = document.createElement('p');
      let seller = `<i>${product.seller}</i>`;
      cardSeller.innerHTML = seller;
      cardSeller.style.fontSize = '13px';

      let cardShipping = document.createElement('p');
      let shipping = `${product.isFreeShipping ? 'Envío Gratis' : ''}`;
      cardShipping.className = 'product-shipping text-success';
      cardShipping.style.fontSize = '14px';
      cardShipping.innerHTML = shipping;

      let containerIcons = document.createElement('div');
      containerIcons.className = 'd-flex justify-content-center align-items-center';
      containerIcons.style.borderTop = '1px solid rgba(0, 0, 0, 0.2)';
      containerIcons.style.paddingTop = '20px';

      let elementIconFav = document.createElement('img');
      let elementIconAddToCart = document.createElement('img');
      let elementProductDetail = document.createElement('a'); 

      elementIconAddToCart.style.width = '20px';
      elementIconAddToCart.style.height = '20px';

      elementIconFav.style.width = '21px';
      elementIconFav.style.height = '21px';

      elementIconAddToCart.style.cursor = 'pointer';
      elementIconFav.style.cursor = 'pointer';
      
      elementIconFav.className = 'icon-cards-products mr-3';
      elementIconAddToCart.className = 'icon-cards-products mr-3';

      let routeIconFav = '/public/icons/heart.svg';
      let routeIconAddToCart = '/public/icons/bag-plus.svg';

      elementIconFav.src = routeIconFav;
      elementIconFav.style.marginRight = '10px';

      elementIconAddToCart.src = routeIconAddToCart;
      elementIconAddToCart.style.marginBottom = '2px';

      elementProductDetail.text = 'Más detalles...';
      elementProductDetail.style.cursor = 'pointer';
      elementProductDetail.style.textDecoration = 'none';
      elementProductDetail.className = 'link-product-detail ml-2 text-info';

      cardBody.appendChild(cardTitle);
      cardBody.appendChild(cardPrice);
      cardBody.appendChild(cardSeller);
      cardBody.appendChild(cardShipping);
      
      cardBody.appendChild(containerIcons);
      
      containerIcons.appendChild(elementIconAddToCart);
      containerIcons.appendChild(elementIconFav);
      containerIcons.appendChild(elementProductDetail);
      
      cardDiv.appendChild(imageByProduct);
      cardDiv.appendChild(cardBody);
      colDiv.appendChild(cardDiv);

      mainContent.appendChild(colDiv);

      elementIconAddToCart.addEventListener('click', () => {
        addProductToCart(product.id);

      });

      elementIconFav.addEventListener('click', () => {
        addProductToFav(product.id);

      });

      elementProductDetail.addEventListener('click', () => {
        productDetail(product.id);        

      });

    });
    
    scrollSection('products-container');

  }catch(error){
    console.error(error);

  };

};

const counterProductsInMyCart = () => {
  let products = getLocalStorage();
  let myCart = document.getElementById('my-cart');
  let counterElement = document.getElementById('cart-counter'); // Busca el ID del contador de productos.
  
  let productsInMyCart = products.filter(product => product.itsInTheCart);
  let countProducts = productsInMyCart.length;

  if(!counterElement){ // Si counterElement no existe (si es false), lo crea.
    counterElement = document.createElement('p');  
    counterElement.style.fontSize = '11px'
    counterElement.style.color = 'white';
    counterElement.className = 'counter-products mr-3 mt-3';
    counterElement.id = 'cart-counter';
    myCart.appendChild(counterElement);

  }

  counterElement.innerHTML = `<b>${countProducts}</b>`;

};

const addProductToFav = async(productId) => {
  try{
    let productDetailApi = await fetchProductDetail(productId);
    let productsInLocalStorage = getLocalStorage();
    let filterProduct = productDetailApi.find(product => product.id === productId);
    
    filterProduct.isFavourite = true;

    productsInLocalStorage.push(filterProduct);
    saveInLocalStorage(productsInLocalStorage);

    setTimeout(() => {
      showToast('Producto agregado con éxito', '¡Producto agregado a Tus Favoritos!');
   
    }, 100);
    
  }catch(error){
    console.error(error.message);
  
  }  

};

const addProductToCart = async(productId) => {
  try{
    let productsDetailApi = await fetchProductDetail(productId);
    let productsInLocalStorage = getLocalStorage();
    let filterProduct = productsDetailApi.find(product => product.id === productId);

    filterProduct.itsInTheCart = true;

    productsInLocalStorage.push(filterProduct);
    saveInLocalStorage(productsInLocalStorage);

    showToast('Producto agregado con éxito', '¡Producto agregado al carrito!');

    await counterProductsInMyCart();

  }catch(error){
    console.error(error);

  }

};

const productDetail = async(productId) => {
  try{
    let productDetailApi = await fetchProductDetail(productId);
    let productFilter = productDetailApi.find(product => product.id === productId);
    let arrayProduct = [productFilter];
    
    let modalProductDetail = document.createElement('div');

    if(modalProductDetail){
      modalProductDetail.remove();
    
    }

    modalProductDetail.className = 'modal fade';
    modalProductDetail.id = `modal-product-detail-${productId}`; // Se le pasa un ID al modal, basado en el ID del producto que se clickeó, para que dicho modal muestre el producto clickeado y se mantenga actualizado.
    modalProductDetail.tabIndex = -1;

    let modalBodyContent = '<div class="modal-body border">';
    
    for(const attr of arrayProduct){ // En el recorrido de un array, para usar un async/await, es mejor usar un for que un forEach. 
      let imagesByProduct = attr.images.slice(0, 3).map(image => `<img class="image-product-detail" src="${image.url}" alt="${attr.title}">`).join('');
      let arrayDescription = await fetchProductDescription(attr.id);
      let description = arrayDescription[0].description || 'No hay descripción de este producto.';

      modalBodyContent += `
        <div>
          <div class="text-center ml-3">
            <h5 class="main-font"><b>${attr.title}</b></h5>
          </div>
          <br>
          <div class="d-flex justify-content-center border-bottom">
            ${imagesByProduct}
          </div>
          <br>
          <br>
          <div class="m-4">
            <div>
              <h5 class="text-start mt-1 mb-5 main-font modal-underline">Descripción del producto</h5>
            </div>
            <div class="text-justify">
              <p class="main-font">${description}</p>
            </div>
          </div>
          <div class="font-nav m-4">
            <div>
              <h5 class="text-start mt-5 mb-5 main-font modal-underline">Características</h5>
            </div>
            <div class="ml-1 d-flex align-items-center">
              <img class="icons-detail mr-2" src="/public/icons/coin.svg">
              <p class="mb-0"><b>Precio:</b> ${attr.price} <b>${attr.currency}</b></p>
            </div>  
              <br>
            <div class="ml-1 d-flex align-items-center">
              <img class="icons-detail mr-2" src="/public/icons/truck.svg">
              <p class="mb-0"><b>Envío Gratis:</b> ${attr.isFreeShipping ? 'Sí' : 'No'}</p>
              <br>
            </div>
              <br>
            <div class="ml-1 d-flex align-items-center"> 
              <img class="icons-detail mr-2" src="/public/icons/offer_664457.png">
              <p class="mb-0"><b>Valoración:</b> ${renderRatingStars(attr.randomRating)} (${attr.randomRating})</p>
            </div> 
          </div>
        </div>
          
      `

    };

    modalBodyContent += '</div>';

    modalProductDetail.innerHTML = `
      <div class="modal-dialog custom-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="main-font">
              <img class="image-descript-detail m-3" src="/public/icons/search_1265775.png" alt="ticket-detail">Detalle del Producto
            </h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          ${modalBodyContent}
          <div class="modal-footer">
            <button type="button" class="btn button-53" data-dismiss="modal">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalProductDetail);

    $(`#modal-product-detail-${productId}`).modal('show'); // Se llama al modal con ID asigando anteriormente.

  }catch(error){
    console.error(error);

  }

};

const viewMyCart = (event) => {
  try{
    if(event){
      event.preventDefault();
    
    }

    let productsInLocalStorage = getLocalStorage();

    productsInLocalStorage = productsInLocalStorage.filter(product => product.itsInTheCart);

    let modalBodyContent = '<div class="modal-body">';
    let noneDuplicate = deleteDuplicate(productsInLocalStorage);
    let count = countDuplicate(productsInLocalStorage);

    if(productsInLocalStorage.length > 0){
      noneDuplicate.forEach(attr => {
        let productCount = count[attr.title];
        let totalPrice = attr.price * productCount;
        let productImage = attr.images[0].url;

        modalBodyContent += `
          <div class="d-flex align-items-start mb-4 border p-3">
            <img class="image-product-to-cart mr-5" src="${productImage}">
            <div>
              <h5 class="main-font"><b>${attr.title}</b></h5>
              <p class="font-nav"><b class="ml-1 mr-1">Precio Unitario:</b> ${attr.currency} ${attr.price} | <b class="ml-1 mr-1 mr-1">Cantidad:</b> ${productCount} | <b class="ml-1 mr-1">Total:</b> ${attr.currency} ${totalPrice.toFixed(2)} | <button class="btn btn-outline text-danger remove-quantity-link" data-id="${attr.id}"><img class="mb-2 mr-1 remove-quantity-img" src="/public/icons/cart-dash.svg">Remover por unidad</button> | <button class="btn btn-outline text-danger remove-all-link" data-id="${attr.id}"><img class="mb-2 mr-1 remove-all-img" src="/public/icons/trash3.svg">Remover Todo</button></p>
            </div>
          </div>
        
        `;

        
      });
      
      modalBodyContent += `
      <div class="d-flex justify-content-center">
        <button id="finalize-purchase" class="btn button-53-to-purchase mt-3">Finalizar Compra</button>
      </div>
    
      `;

    }else if(productsInLocalStorage.length === 0){
      let message = `
        <div class="d-flex align-items-center justify-content-center">
          <img class="empty-cart" src="src/assets/images/pngwing.com.png">
        </div>
        <h4 class="justify-content-center text-center main-font title-empty-cart">¡Tu carrito de compras está vacío!</h4>
      
      `;

      modalBodyContent += message;
      
    }

    modalBodyContent += '</div>';

    let modalCart = document.getElementById('modal-cart');

    if(!modalCart){
      modalCart = document.createElement('div');
      let bagCheckImg = '/public/icons/cart.svg';
      modalCart.className = 'modal fade';
      modalCart.id = 'modal-cart';
      modalCart.tabIndex = -1;

      modalCart.innerHTML = `
        <div class="modal-dialog custom-modal">
          <div class="modal-content">
            <div class="modal-header align-items-center text-center">
                <img class="image-descript-cart m-1" src="${bagCheckImg}"><h5 class="main-font mt-2 ml-2">Mi carrito</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            ${modalBodyContent}
            <div class="modal-footer">
              <button type="button" id='close-mycart' class="btn button-53 mt-3" data-dismiss="modal">Cerrar Mi Carrito</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modalCart);

    }else{
      modalCart.querySelector('.modal-body').innerHTML = modalBodyContent;
      
    };

    document.querySelectorAll('.remove-quantity-link').forEach(button => {
      button.addEventListener('click', async(event) => {
        event.preventDefault();
        
        let productId = event.target.closest('.remove-quantity-link').getAttribute('data-id');
        let itsInTheCart = true;
        let isFavouriteProduct = false;

        await removeForQuantity(productId, viewMyCart, isFavouriteProduct, itsInTheCart);
      
      });
    
    });

    document.querySelectorAll('.remove-all-link').forEach(button => {
      button.addEventListener('click', async(event) => {
        event.preventDefault();

        let productId = event.target.closest('.remove-all-link').getAttribute('data-id');
        let itsInTheCart = true;
        let isFavouriteProduct = false;

        await removeAll(productId, viewMyCart, isFavouriteProduct, itsInTheCart);

      });

    });

    let idButtonFinalizePurchase = document.getElementById('finalize-purchase');

    if(idButtonFinalizePurchase){
      idButtonFinalizePurchase.addEventListener('click', () => {
        showPurchaseDetailsModal();
        
      });

    };

    $(`#modal-cart`).modal('show');
  
  }catch(error){
    console.error(error);
  
  }

};

const viewMyFavorites = (event) => {
  try{
    if(event){
      event.preventDefault();
    
    }

    let productsInLocalStorage = getLocalStorage();

    productsInLocalStorage = productsInLocalStorage.filter(product => product.isFavourite);

    if(productsInLocalStorage){
      let modalBodyContent = '<div class="modal-body">';
      let noneDuplicate = deleteDuplicate(productsInLocalStorage);
      let count = countDuplicate(productsInLocalStorage);

      if(productsInLocalStorage.length > 0){
        noneDuplicate.forEach(attr => {
          let productCount = count[attr.title];
          let totalPrice = attr.price * productCount;
          let productImage = attr.images[0].url;

          modalBodyContent += `
            <div class="d-flex align-items-start mb-4 border p-3">
              <img class="image-product-to-cart mr-5" src="${productImage}">
              <div>
                <h5 class="main-font"><b>${attr.title}</b></h5>
                <p class="font-nav"><b class="ml-1 mr-1">Precio Unitario:</b> ${attr.currency} ${attr.price} | <b class="ml-1 mr-1 mr-1">Cantidad:</b> ${productCount} | <b class="ml-1 mr-1">Total:</b> ${attr.currency} ${totalPrice.toFixed(2)} | <button class="btn btn-outline text-danger remove-quantity-link" data-id="${attr.id}"><img class="mb-2 mr-1 remove-quantity-img" src="/public/icons/cart-dash.svg">Remover por unidad</button> | <button class="btn btn-outline text-danger remove-all-link" data-id="${attr.id}"><img class="mb-2 mr-1 remove-all-img" src="/public/icons/trash3.svg">Remover Todo</button></p>
              </div>
            </div>
            <hr>
          
          `;
        
        });

      }else if(productsInLocalStorage.length === 0){
        let message = `
          <div class="d-flex align-items-center justify-content-center">
            <img class="empty-favourites" src="src/assets/images/undraw_favourite_item_pcyo.svg">
          </div>
          <h4 class="justify-content-center text-center main-font mt-5 title-empty-favourites">¡Todavía no agregaste nada a tus Favoritos!</h4>
        
        `;

        modalBodyContent += message;
      
      }

      modalBodyContent += '</div>';

      let modalFavourites = document.getElementById('modal-favourites');

      if(!modalFavourites){
        modalFavourites = document.createElement('div');
        let bagCheckImg = '/public/icons/favorite-heart_109761.png';
        modalFavourites.className = 'modal fade';
        modalFavourites.id = 'modal-favourites';
        modalFavourites.tabIndex = -1;

        modalFavourites.innerHTML = `
          <div class="modal-dialog custom-modal">
            <div class="modal-content">
              <div class="modal-header align-items-center text-center">
                  <img class="image-descript-favourites m-1" src="${bagCheckImg}"><h5 class="main-font mt-1 ml-2">Mis favoritos</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              ${modalBodyContent}
              <div class="modal-footer">
                <button type="button" id='close-myfavourites' class="btn button-53 mt-3" data-dismiss="modal">Cerrar Mis Favoritos</button>
              </div>
            </div>
          </div>
        
        `;

        document.body.appendChild(modalFavourites);

      }else{
        modalFavourites.querySelector('.modal-body').innerHTML = modalBodyContent;
      
      }

      document.querySelectorAll('.remove-quantity-link').forEach(button => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          
          let productId = event.target.closest('.remove-quantity-link').getAttribute('data-id');
          let itsInTheCart = false;
          let isFavouriteProduct = true;

          removeForQuantity(productId, viewMyFavorites, isFavouriteProduct, itsInTheCart);
        
        });
      
      });

      document.querySelectorAll('.remove-all-link').forEach(button => {
        button.addEventListener('click', async(event) => {
          event.preventDefault();
          
          let productId = event.target.closest('.remove-all-link').getAttribute('data-id');
          let itsInTheCart = false;
          let isFavouriteProduct = true;

          await removeAll(productId, viewMyFavorites, isFavouriteProduct, itsInTheCart);


        });
      
      });

      $(`#modal-favourites`).modal('show');

    };
  
  }catch(error){
    console.error(error);
  
  }

};

const filterByNewness = async(filter) => {
  try{
    let products = await fetchCompleteProductsApi(filter);
    let limitProducts = products.slice(6, 10); 
    let containerCards = document.getElementById('cards-by-newness-products');

    limitProducts.forEach(product => {
      let colDiv = document.createElement('div');
      colDiv.className = 'col-lg-4 mb-4 w-25 mt-0';

      let cardDiv = document.createElement('div');
      cardDiv.className = 'card h-100';
      cardDiv.id = 'card-by-newness';

      let imageByProduct = document.createElement('img');
      imageByProduct.src = product.images[0].url;
      imageByProduct.className = 'card-img-top mx-auto d-block';
      imageByProduct.style.width = '100%';
      imageByProduct.style.height = '370px';
      imageByProduct.style.maxHeight = '390px'
      imageByProduct.style.marginTop = '20px'; 
      imageByProduct.style.marginBottom = '20px';
      imageByProduct.style.padding = '10px';
        
      let cardBody = document.createElement('div');
      cardBody.className = 'card-body text-center d-flex flex-column justify-content-between';

      let cardTitle = document.createElement('h5'); 
      cardTitle.className = 'card-title';
      cardTitle.style.fontSize = '17px';

      let productTitle = `${product.title}`;
      cardTitle.innerHTML = productTitle;

      let cardPrice = document.createElement('p');
      let price = `${product.price} <b>${product.currency}</b>`;
      cardPrice.innerHTML = price;
      cardPrice.style.fontSize = '15px';
      cardPrice.className = 'card-text';

      let cardSeller = document.createElement('p');
      let seller = `<i>${product.seller}</i>`;
      cardSeller.innerHTML = seller;
      cardSeller.style.fontSize = '13px';

      let cardShipping = document.createElement('p');
      let shipping = `${product.isFreeShipping ? 'Envío Gratis' : ''}`;
      cardShipping.className = 'product-shipping text-success';
      cardShipping.style.fontSize = '14px';
      cardShipping.innerHTML = shipping;

      let containerIcons = document.createElement('div');
      containerIcons.className = 'd-flex justify-content-center align-items-center';
      containerIcons.style.borderTop = '1px solid rgba(0, 0, 0, 0.2)';
      containerIcons.style.paddingTop = '20px';
  
      let elementIconFav = document.createElement('img');
      let elementIconAddToCart = document.createElement('img');
      let elementProductDetail = document.createElement('a'); 

      elementIconAddToCart.style.width = '20px';
      elementIconAddToCart.style.height = '20px';

      elementIconFav.style.width = '21px';
      elementIconFav.style.height = '21px';

      elementIconAddToCart.style.cursor = 'pointer';
      elementIconFav.style.cursor = 'pointer';
      
      elementIconFav.className = 'icon-cards-products mr-3';
      elementIconAddToCart.className = 'icon-cards-products mr-3';

      let routeIconFav = '/public/icons/heart.svg';
      let routeIconAddToCart = '/public/icons/bag-plus.svg';

      elementIconFav.src = routeIconFav;
      elementIconFav.style.marginRight = '10px';

      elementIconAddToCart.src = routeIconAddToCart;
      elementIconAddToCart.style.marginBottom = '2px';

      elementProductDetail.text = 'Más detalles...';
      elementProductDetail.style.cursor = 'pointer';
      elementProductDetail.style.textDecoration = 'none';
      elementProductDetail.className = 'link-product-detail ml-2 text-info';

      cardBody.appendChild(cardTitle);
      cardBody.appendChild(cardPrice);
      cardBody.appendChild(cardSeller);
      cardBody.appendChild(cardShipping);
      
      cardBody.appendChild(containerIcons);
      
      containerIcons.appendChild(elementIconAddToCart);
      containerIcons.appendChild(elementIconFav);
      containerIcons.appendChild(elementProductDetail);
      
      cardDiv.appendChild(imageByProduct);
      cardDiv.appendChild(cardBody);
      colDiv.appendChild(cardDiv);

      containerCards.appendChild(colDiv);

      elementIconAddToCart.addEventListener('click', () => {
        addProductToCart(product.id);

      });

      elementIconFav.addEventListener('click', () => {
        addProductToFav(product.id);

      });

      elementProductDetail.addEventListener('click', () => {
        productDetail(product.id);

      });
  
  });

  }catch(error){
    console.error(error);

  };

};

const showPurchaseDetailsModal = async () => {
  const getCurrentDate = () => {
    let date = new Date();
    let currentDay = date.getDate();
    let currentMonth = date.getMonth() + 1;
    let currentYear = date.getFullYear();

    return `${currentDay}/${currentMonth}/${currentYear}`;
  
  };

  const getRandomNumber = () => {
    let min = 10000000; 
    let max = 99999999;
    let randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;

    return randomNumber;
  
  };

  const clearCartLocalStorage = () => {
    let products = getLocalStorage();
    let updatedProducts = products.filter(product => !product.itsInTheCart);
    
    saveInLocalStorage(updatedProducts);
  
  };

  let products = getLocalStorage();
  let productsInMyCart = products.filter(product => product.itsInTheCart);
  let counter = countDuplicate(productsInMyCart);
  let finalPrice = 0;
  
  productsInMyCart.forEach(product => {
    let productCount = counter[product.title];
    finalPrice += product.price * productCount;

  });

  console.log(finalPrice);

  let modalContent = `
    <div class="modal-dialog custom-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="main-font">Detalles de la Compra</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body font-nav">
          <p><b>Precio final de la compra:</b> ${finalPrice} <b>ARS</b></p>
          <p><b>Cantidad de productos:</b> ${productsInMyCart.length}</p>
          <p><b>Fecha de realización de la compra:</b> ${getCurrentDate()}</p>
          <hr>
          <p><b>Número de seguimiento del envío:</b> ${getRandomNumber()}BT</p>
          <p><b>Tiempo de devolución:</b> 30 días</p>
          <p><b>Identificador de la compra:</b> ID${getRandomNumber()}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn button-53 mt-3 bg-success d-flex align-items-center" id="button-buy">
            <img src="public/icons/currency-dollar.svg">¡Comprar ahora!
          </button>
        </div>
      </div>
    </div>
  
  `;

  let existingModal = document.getElementById('purchase-details-modal');
  
  if(existingModal){
    existingModal.remove();
  
  }

  let purchaseDetailsModal = document.createElement('div');
  purchaseDetailsModal.className = 'modal fade';
  purchaseDetailsModal.id = 'purchase-details-modal';
  purchaseDetailsModal.tabIndex = -1;
  purchaseDetailsModal.innerHTML = modalContent;
  document.body.appendChild(purchaseDetailsModal);

  $('#purchase-details-modal').modal('show');
  $('#modal-cart').modal('hide');

  let buttonBuy = document.getElementById('button-buy');
  
  buttonBuy.addEventListener('click', () => {
    clearCartLocalStorage();

    let imgElement = document.createElement('img');
    let imgRoute = '/src/assets/images/undraw_order_confirmed_re_g0if.svg';
    imgElement.src = imgRoute;
    imgElement.className = 'img-fluid';

    let textElement = document.createElement('h1');
    textElement.textContent = '¡Tu compra está en camino!';
    textElement.className = 'text-confirm-purchase';
    textElement.style.fontSize = '22px';

    let modalContent = `
    <div class="modal-dialog custom-modal">
      <div class="modal-content">
        <div class="modal-header">
          <img class="img-confirm-purchase" src="/public/icons/bag-check.svg"><h5 class="main-font mt-1 ml-2">Felicitaciones</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <div id="container-body-confirm" class="d-flex justify-content-center align-items-center font-nav"></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn button-53 mt-3 bg-success d-flex align-items-center" data-dismiss="modal">
            Finalizar
          </button>
        </div>
      </div>
    </div>
  
  `;

  let containerModal = document.createElement('div');
  
  containerModal.id = 'confirm-purchase';
  containerModal.tabIndex = -1;
  containerModal.className = 'modal fade';
  containerModal.innerHTML = modalContent;
  
  document.body.appendChild(containerModal);
  
  let modalBody = document.querySelector('#container-body-confirm');

  modalBody.innerHTML = '';
  modalBody.appendChild(imgElement);
  modalBody.appendChild(textElement);
  
  $('#confirm-purchase').modal('show');
  $('#purchase-details-modal').modal('hide');

  counterProductsInMyCart();

  });

  await counterProductsInMyCart();

};

const main = async() => {
  let formSearchProduct = document.getElementById('searchForProductsOrCateogories');
  formSearchProduct.addEventListener('submit', (event) => {
    let inputContent = document.getElementById('inputUser').value;
    filterBy(inputContent, event);

  });

  filterByNewness('ropa invierno');

  productByCategory('carousel-by-sports-products', 'deportes');
  productByCategory('carousel-by-tecnology-products', 'electrónica');
  productByCategory('carousel-by-home-products', 'hogar');
  counterProductsInMyCart();

};

main();
