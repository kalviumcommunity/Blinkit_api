function ProductCard({ product }) {
  return (
    <div>
      <h2>{product.name}</h2>
      <p>Stock: {product.stock}</p>
      <button>Update Stock</button>
    </div>
  );
}

export default ProductCard;