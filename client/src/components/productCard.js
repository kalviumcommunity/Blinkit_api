"use client"
import { useState } from "react"
export default function ProductCard({product}){
const [stock , setstock] = useState(product.stock)
const [quantity , setquantity] = useState("")

function UpdateStock(){
    const change = Number(quantity)

    if (quantity === "" || Number.isNaN(change)){
        return
    }

    const newStock = stock + change

    if (newStock < 0){
        return
    }

    setstock(newStock)
    setquantity("") 
}


    return (
        <div>
            <h2>{product.name}</h2>
    
            <p>Category: {product.category}</p>
    
            <p>Stock : {stock}</p>

            <input 
                type="Number"
                placeholder="Enter the quantity here"
                value={quantity}
                onChange={(event)=> setquantity(event.target.value)}
            />
            <button onClick={UpdateStock}>Update</button>
            
        </div>
    )
}