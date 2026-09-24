import products from "../data/products";
import ProductCard from "../components/ProductCard";

function Dashboard() {
  return (
    <main>
      <h1>Inventory</h1>

      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
        />
      ))}
    </main>
  );
}

export default Dashboard;