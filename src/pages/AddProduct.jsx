import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { databases, storage } from "../appwrite/client";
import { getAuth } from "firebase/auth";
import {
    PackagePlus,
    Tag,
    CircleDollarSign,
    Warehouse,
    FileText,
    ImageUp,
    Loader2,
    CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const APPWRITE_DB_ID = import.meta.env.VITE_APPWRITE_DB_ID;
const APPWRITE_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;
const APPWRITE_BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID;
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;

const AddProduct = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        description: "",
        price: "",
        stock: "",
        image: null,
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === "image") {
            setFormData({ ...formData, image: files[0] });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) {
                alert("You must be logged in to add a product.");
                setLoading(false);
                return;
            }

            let imageUrl = "";
            if (formData.image) {
                const uploadedFile = await storage.createFile(
                    APPWRITE_BUCKET_ID,
                    "unique()",
                    formData.image
                );
                imageUrl = `https://cloud.appwrite.io/v1/storage/buckets/${APPWRITE_BUCKET_ID}/files/${uploadedFile.$id}/view?project=${APPWRITE_PROJECT_ID}`;
            }

            // Create document without permissions array
            await databases.createDocument(
                APPWRITE_DB_ID,
                APPWRITE_COLLECTION_ID,
                "unique()",
                {
                    name: formData.name,
                    category: formData.category,
                    desciption: formData.description, // use same spelling as in Appwrite collection
                    price: Number(formData.price),
                    stock: Number(formData.stock),
                    image_url: imageUrl,
                    user_id: user.uid, // store Firebase UID for filtering later
                }
            );

            setSuccess(true);
            setFormData({
                name: "",
                category: "",
                description: "",
                price: "",
                stock: "",
                image: null,
            });
        } catch (error) {
            console.error("Error adding product:", error);
            alert("❌ Failed to add product: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-xl">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
                <PackagePlus className="w-7 h-7 text-blue-600" /> Add New Product
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 2 fields per row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Product Name */}
                    <div>
                        <label className="flex items-center gap-2 font-medium mb-1">
                            <Tag className="w-5 h-5 text-gray-600" /> Product Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter product name"
                            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="flex items-center gap-2 font-medium mb-1">
                            <Tag className="w-5 h-5 text-gray-600" /> Category
                        </label>
                        <input
                            type="text"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            placeholder="e.g. Electronics, Fashion"
                            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {/* Price */}
                    <div>
                        <label className="flex items-center gap-2 font-medium mb-1">
                            <CircleDollarSign className="w-5 h-5 text-gray-600" /> Price
                        </label>
                        <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            placeholder="Enter price"
                            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {/* Stock */}
                    <div>
                        <label className="flex items-center gap-2 font-medium mb-1">
                            <Warehouse className="w-5 h-5 text-gray-600" /> Stock
                        </label>
                        <input
                            type="number"
                            name="stock"
                            value={formData.stock}
                            onChange={handleChange}
                            placeholder="Enter available stock"
                            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="flex items-center gap-2 font-medium mb-1">
                        <FileText className="w-5 h-5 text-gray-600" /> Description
                    </label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Write a short description..."
                        className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                        rows="3"
                    />
                </div>

                {/* Image */}
                <div>
                    <label className="flex items-center gap-2 font-medium mb-1">
                        <ImageUp className="w-5 h-5 text-gray-600" /> Upload Image
                    </label>
                    <input
                        type="file"
                        name="image"
                        accept="image/*"
                        onChange={handleChange}
                        className="w-full border rounded-lg p-2"
                    />
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin w-5 h-5" /> Saving...
                        </>
                    ) : (
                        "Add Product"
                    )}
                </button>
            </form>

            {/* Success Popup */}
            <AnimatePresence>
                {success && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 flex items-center justify-center bg-black/40 z-50"
                        onClick={() => setSuccess(false)}
                    >
                        <div
                            className="bg-white p-6 rounded-2xl shadow-2xl text-center max-w-sm mx-auto cursor-pointer"
                            onClick={() => setSuccess(false)}
                        >
                            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                            <h3 className="text-xl font-bold mb-2">Product Added Successfully!</h3>
                            <p className="text-gray-600 mb-4">Your product has been added to the database.</p>
                            <Link
                                to="/products"
                                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                            >
                                View Products
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AddProduct;
