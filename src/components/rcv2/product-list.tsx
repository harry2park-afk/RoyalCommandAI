"use client";

import React, { useState } from "react";
import Image from "next/image";

type StockStatus = "In Stock" | "Out of Stock";

interface RCProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  stockStatus: StockStatus;
}

const DEMO_PRODUCTS: RCProduct[] = [
  {
    id: "trx4-defender",
    name: "TRX-4 Defender 1/10 Trail Crawler",
    category: "Electric / Crawler",
    price: 499.99,
    imageUrl: "https://images.unsplash.com/photo-1594787318284-9d6c9900bf4b?w=800&h=600&fit=crop",
    stockStatus: "In Stock",
  },
  {
    id: "slash-4x4",
    name: "Slash 4X4 VXL Brushless Short Course",
    category: "Electric / Short Course",
    price: 449.95,
    imageUrl: "https://images.unsplash.com/photo-1558618047-f4b511a6e0f5?w=800&h=600&fit=crop",
    stockStatus: "In Stock",
  },
  {
    id: "xmaxx",
    name: "X-Maxx 8S 4WD Brushless Monster Truck",
    category: "Electric / Monster Truck",
    price: 1099.99,
    imageUrl: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800&h=600&fit=crop",
    stockStatus: "Out of Stock",
  },
  {
    id: "rustler-4x4",
    name: "Rustler 4X4 VXL Stadium Truck",
    category: "Electric / Stadium Truck",
    price: 399.95,
    imageUrl: "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=800&h=600&fit=crop",
    stockStatus: "In Stock",
  },
];

interface ProductCardProps {
  product: RCProduct;
  onAddToCart: (product: RCProduct) => void;
}

function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.stockStatus === "Out of Stock";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          className="object-cover transition duration-500 group-hover:scale-105"
          unoptimized
        />
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
            isOutOfStock
              ? "bg-rose-500/95 text-white"
              : "bg-emerald-500/95 text-white"
          }`}
        >
          {product.stockStatus}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-sky-600 dark:text-sky-400">
            {product.category}
          </p>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 dark:text-slate-50">
            {product.name}
          </h3>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            ${product.price.toFixed(2)}
          </p>
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={() => onAddToCart(product)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              isOutOfStock
                ? "cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
                : "bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500 active:scale-[0.98]"
            }`}
          >
            {isOutOfStock ? "품절" : "장바구니 담기"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function RCProductCardList() {
  const [cartCount, setCartCount] = useState(0);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const handleAddToCart = (product: RCProduct) => {
    if (product.stockStatus === "Out of Stock") return;
    setCartCount((prev) => prev + 1);
    setLastAdded(product.name);
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            RC 제품 목록
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Radio Control vehicles — Next.js · TypeScript · Tailwind CSS
          </p>
        </div>
        <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900">
          장바구니 {cartCount}
          {lastAdded ? ` · 최근: ${lastAdded}` : ""}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {DEMO_PRODUCTS.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>
    </section>
  );
}
