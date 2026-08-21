import products from '../../data/products.js';
import ProductCard from '../../components/productCard.js'
export default function Dashboard(){
    return (
        <main>
            <h1>Inventory Dashboard</h1>
            <p>Welcome to the Inventory Dashboard!</p>

            {products.map((product) => (
                <ProductCard key={product.id} product={product} />
            ))}
        </main>
    )
}