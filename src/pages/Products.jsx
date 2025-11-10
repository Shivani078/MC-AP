import React, { useEffect, useState } from "react";
import { databases, storage } from "../appwrite/client";
import { Query } from "appwrite";
import { Search, ListFilter, ArrowDownUp, Plus, Minus, Edit, Trash2, Package, AlertTriangle, Info, ArrowLeft } from 'lucide-react';
import { useNavigate } from "react-router-dom";

const APPWRITE_DB_ID = import.meta.env.VITE_APPWRITE_DB_ID;
const APPWRITE_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;
const APPWRITE_BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID;

const Products = ({ user }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [sort, setSort] = useState("date");
    const [updating, setUpdating] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProducts = async () => {
            if (!user) {
                setLoading(false);
                return;
            };
            try {
                const res = await databases.listDocuments(
                    APPWRITE_DB_ID,
                    APPWRITE_COLLECTION_ID,
                    [Query.equal("user_id", user.uid)]
                );
                setProducts(res.documents);
            } catch (err) {
                console.error("Failed to fetch products:", err);
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [user, updating]);

    // Stock update handler
    const updateStock = async (product, delta) => {
        setUpdating(product.$id);
        try {
            await databases.updateDocument(
                APPWRITE_DB_ID,
                APPWRITE_COLLECTION_ID,
                product.$id,
                { stock: product.stock + delta }
            );
        } catch (err) {
            alert("Failed to update stock");
        } finally {
            setUpdating(null);
        }
    };

    const handleEdit = (product) => {
        // alert(`Edit functionality for "${product.name}" is not yet implemented.`);
        // In the future, you would navigate to an edit page or open a modal:
        navigate(`/products/edit/${product.$id}`);
    };

    const handleDelete = async (product) => {
        if (window.confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
            try {
                // First, delete the associated image from storage if it exists
                if (product.image_url) {
                    try {
                        const fileId = product.image_url.split('/files/')[1].split('/view')[0];
                        await storage.deleteFile(APPWRITE_BUCKET_ID, fileId);
                    } catch (imageError) {
                        // Log the error but proceed with deleting the document
                        console.error("Could not delete image, but proceeding with document deletion:", imageError);
                    }
                }

                // Then, delete the product document from the database
                await databases.deleteDocument(APPWRITE_DB_ID, APPWRITE_COLLECTION_ID, product.$id);

                // Update the UI by removing the product from the state
                setProducts(prevProducts => prevProducts.filter(p => p.$id !== product.$id));

            } catch (error) {
                alert("Failed to delete product. Please try again.");
                console.error("Delete error:", error);
            }
        }
    };

    // Search, filter, sort logic
    let filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
    );
    if (filter === "low") filtered = filtered.filter(p => p.stock < 5 && p.stock > 0);
    if (filter === "out") filtered = filtered.filter(p => p.stock === 0);

    if (sort === "price") filtered = [...filtered].sort((a, b) => a.price - b.price);
    if (sort === "stock") filtered = [...filtered].sort((a, b) => a.stock - b.stock);
    if (sort === "date") filtered = [...filtered].sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));

    if (loading) return (
        <div className="min-h-screen bg-gray-50 text-gray-800 flex items-center justify-center">
            <div className="text-center">
                <p>Loading products...</p>
            </div>
        </div>
    );

    if (!user) return (
        <div className="min-h-screen bg-gray-50 text-gray-800 flex items-center justify-center p-4">
            <div className="text-center bg-white p-8 rounded-lg shadow-xl">
                <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
                <h3 className="mt-4 text-lg font-medium">Authentication Required</h3>
                <p className="mt-2 text-sm text-gray-500">Please login to view your products.</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 bg-gray-200 rounded-full text-gray-700 hover:bg-gray-300 transition"
                            title="Go Back to Dashboard"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h2 className="text-3xl font-bold text-gray-800">Your Products</h2>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                        <button
                            onClick={() => navigate('/?view=addProduct')}
                            className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition w-full md:w-auto justify-center"
                        >
                            <Plus className="w-5 h-5" />
                            Add Product
                        </button>
                        <div className="relative w-full md:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
                                className="bg-white border border-gray-300 text-gray-800 p-2 pl-10 rounded-lg w-full md:w-64 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                            />
                        </div>
                        <div className="relative w-full md:w-auto">
                            <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-white border border-gray-300 text-gray-800 p-2 pl-10 rounded-lg appearance-none w-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition">
                                <option value="all">All Stocks</option>
                                <option value="low">Low Stock</option>
                                <option value="out">Out of Stock</option>
                            </select>
                        </div>
                        <div className="relative w-full md:w-auto">
                            <ArrowDownUp className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <select value={sort} onChange={e => setSort(e.target.value)} className="bg-white border border-gray-300 text-gray-800 p-2 pl-10 rounded-lg appearance-none w-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition">
                                <option value="date">Newest</option>
                                <option value="price">Price</option>
                                <option value="stock">Stock</option>
                            </select>
                        </div>
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-lg">
                        <Info className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-4 text-lg font-medium text-gray-800">No Products Found</h3>
                        <p className="mt-2 text-sm text-gray-500">
                            Your inventory is empty or no products match your filters.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filtered.map(product => (
                            <div key={product.$id} className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col transition-transform hover:scale-[1.02]">
                                <div className="flex-shrink-0 h-56 bg-gray-100 flex items-center justify-center">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Package className="w-16 h-16 text-gray-300" />
                                    )}
                                </div>
                                <div className="p-6 flex flex-col flex-grow">
                                    <p className="text-sm text-gray-500 mb-2">{product.category || 'Uncategorized'}</p>
                                    <h3 className="text-xl font-bold text-gray-800 mb-4">{product.name}</h3>

                                    <div className="flex justify-between items-center mb-4">
                                        <div className="text-2xl font-bold text-indigo-600">
                                            ₹{product.price}
                                        </div>
                                        <div>
                                            {product.stock === 0 ? (
                                                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">
                                                    Out of Stock
                                                </span>
                                            ) : product.stock < 5 ? (
                                                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">
                                                    Low Stock
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>

                                    <p className="text-gray-600 text-sm mb-4 flex-grow">{product.description || "No description provided."}</p>

                                    <div className="mt-auto pt-4 border-t border-gray-200 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-gray-600">Stock:</span>
                                            <button
                                                disabled={updating === product.$id || product.stock === 0}
                                                onClick={() => updateStock(product, -1)}
                                                className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition disabled:opacity-50"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="font-bold text-lg text-gray-700">{product.stock}</span>
                                            <button
                                                disabled={updating === product.$id}
                                                onClick={() => updateStock(product, 1)}
                                                className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition disabled:opacity-50"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEdit(product)} className="p-2 text-gray-400 hover:text-indigo-600 transition" title="Edit Product">
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDelete(product)} className="p-2 text-gray-400 hover:text-red-600 transition" title="Delete Product">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Products;