import React, { useState, useEffect } from 'react';
import {
    Store, Edit3, Check, X, Target, Bell, Lock, HelpCircle, ShieldCheck, Calendar, Star, Trophy, TrendingUp, Plus, Trash2
} from 'lucide-react';
import { databases, ID } from '../appwrite/client'; // Import Appwrite database

const APPWRITE_DB_ID = import.meta.env.VITE_APPWRITE_DB_ID;
const APPWRITE_PROFILES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_PROFILES_COLLECTION_ID;

const ProfileSmartScorePage = ({ user }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [originalProfileData, setOriginalProfileData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user || !APPWRITE_PROFILES_COLLECTION_ID) {
                setError("Configuration error. Cannot fetch profile.");
                setIsLoading(false);
                return;
            }

            try {
                const doc = await databases.getDocument(APPWRITE_DB_ID, APPWRITE_PROFILES_COLLECTION_ID, user.uid);
                setProfileData(doc);
                setOriginalProfileData(doc);
            } catch (err) {
                setError("Could not load your profile. Please try again later.");
                console.error("Fetch error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };

    const handleCategoryToggle = (category) => {
        setProfileData(prev => {
            const currentCategories = prev.categories || [];
            const newCategories = currentCategories.includes(category)
                ? currentCategories.filter(c => c !== category)
                : [...currentCategories, category];
            return { ...prev, categories: newCategories };
        });
    };

    // Store Addresses handlers
    const handleAddAddress = () => {
        setProfileData(prev => ({
            ...prev,
            storeAddresses: [...(prev.storeAddresses || []), ""]
        }));
    };

    const handleAddressChange = (index, value) => {
        setProfileData(prev => {
            const updated = [...(prev.storeAddresses || [])];
            updated[index] = value;
            return { ...prev, storeAddresses: updated };
        });
    };

    const handleRemoveAddress = (index) => {
        setProfileData(prev => {
            const updated = [...(prev.storeAddresses || [])];
            updated.splice(index, 1);
            return { ...prev, storeAddresses: updated };
        });
    };

    const handleEdit = () => setIsEditing(true);
    const handleCancel = () => {
        setProfileData(originalProfileData);
        setIsEditing(false);
    };

    const handleSave = async () => {
        try {
            // Exclude Appwrite metadata before sending update
            const { $id, $collectionId, $databaseId, $createdAt, $updatedAt, $permissions, ...updateData } = profileData;

            await databases.updateDocument(
                APPWRITE_DB_ID,
                APPWRITE_PROFILES_COLLECTION_ID,
                user.uid,
                updateData
            );
            setOriginalProfileData(profileData);
            setIsEditing(false);
        } catch (err) {
            setError("Failed to save changes. Please try again.");
            console.error("Save error:", err);
        }
    };

    const categoryOptions = [
        "Sarees", "Kidswear", "Ethnic Wear", "Accessories", "Jewelry", "Footwear",
        "Bags", "Home Decor", "Electronics", "Beauty", "Sports", "Books"
    ];

    if (isLoading) return <div className="p-6 text-center">Loading profile...</div>;
    if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
    if (!profileData) return <div className="p-6 text-center">Your profile data could not be loaded.</div>;

    const badges = [
        { id: 2, name: "Festival Ready", description: "Optimized inventory for festival seasons", icon: <Calendar className="w-6 h-6" />, earned: true },
        { id: 3, name: "Return Reducer", description: "Reduced return rate by 40%", icon: <ShieldCheck className="w-6 h-6" />, earned: true },
        { id: 4, name: "Quality Master", description: "Maintained 4.8+ star rating", icon: <Star className="w-6 h-6" />, earned: false },
        { id: 5, name: "Sales Champion", description: "Achieved ₹1L+ monthly sales", icon: <Trophy className="w-6 h-6" />, earned: false },
        { id: 6, name: "Growth Guru", description: "Increased sales by 100%", icon: <TrendingUp className="w-6 h-6" />, earned: false },
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile & Smart Score</h1>
                    <p className="text-gray-600">Manage your business profile and track your optimization progress</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Business Profile Card */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                    <Store className="w-5 h-5 text-blue-500" />
                                    Business Profile
                                </h2>
                                {!isEditing ? (
                                    <button onClick={handleEdit} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                                        <Edit3 className="w-4 h-4" /> Edit
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                                            <Check className="w-4 h-4" /> Save
                                        </button>
                                        <button onClick={handleCancel} className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                                            <X className="w-4 h-4" /> Cancel
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                                    {isEditing ? (
                                        <input type="text" name="businessName" value={profileData.businessName} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg" />
                                    ) : (
                                        <p className="p-3 bg-gray-50 rounded-lg font-medium">{profileData.businessName}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Owner Name</label>
                                    {isEditing ? (
                                        <input type="text" name="ownerName" value={profileData.ownerName} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg" />
                                    ) : (
                                        <p className="p-3 bg-gray-50 rounded-lg font-medium">{profileData.ownerName}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">PIN Code</label>
                                    {isEditing ? (
                                        <input type="text" name="pinCode" value={profileData.pinCode} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg" />
                                    ) : (
                                        <p className="p-3 bg-gray-50 rounded-lg font-medium">{profileData.pinCode}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                                    {isEditing ? (
                                        <input type="tel" name="phone" value={profileData.phone || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg" />
                                    ) : (
                                        <p className="p-3 bg-gray-50 rounded-lg font-medium">{profileData.phone || 'N/A'}</p>
                                    )}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                    <p className="p-3 bg-gray-100 rounded-lg font-medium text-gray-500 cursor-not-allowed">{profileData.email}</p>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                                    {isEditing ? (
                                        <input type="text" name="gstNumber" value={profileData.gstNumber || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg" />
                                    ) : (
                                        <p className="p-3 bg-gray-50 rounded-lg font-medium">{profileData.gstNumber || 'N/A'}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Store Addresses */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Store className="w-5 h-5 text-green-500" />
                                Store Addresses
                            </h3>
                            <div className="space-y-4">
                                {(profileData.storeAddresses || []).map((addr, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                        {isEditing ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={addr}
                                                    onChange={(e) => handleAddressChange(index, e.target.value)}
                                                    className="w-full p-3 border border-gray-300 rounded-lg"
                                                    placeholder="Enter store address"
                                                />
                                                <button
                                                    onClick={() => handleRemoveAddress(index)}
                                                    className="p-2 text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </>
                                        ) : (
                                            <p className="p-3 bg-gray-50 rounded-lg font-medium w-full">{addr}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {isEditing && (
                                <button
                                    onClick={handleAddAddress}
                                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                                >
                                    <Plus className="w-4 h-4" /> Add Address
                                </button>
                            )}
                        </div>

                        {/* Category Preferences */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Target className="w-5 h-5 text-purple-500" />
                                Your Categories
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {categoryOptions.map((category) => (
                                    <button
                                        key={category}
                                        onClick={() => isEditing && handleCategoryToggle(category)}
                                        className={`px-4 py-2 rounded-full font-medium transition-colors text-sm ${(profileData.categories || []).includes(category)
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-200 text-gray-700'
                                            } ${isEditing ? 'hover:bg-gray-300 cursor-pointer' : 'cursor-default'}`}
                                        disabled={!isEditing}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                            {isEditing && <p className="text-xs text-gray-500 mt-3">Click on categories to add or remove them.</p>}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-yellow-500" />
                                Badges Earned
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                {badges.map(badge => (
                                    <div key={badge.id} className={`p-3 rounded-lg flex flex-col items-center justify-center text-center ${badge.earned ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                                        {badge.icon}
                                        <span className="text-xs font-semibold mt-1">{badge.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h3>
                            <ul className="space-y-3">
                                <li className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                                    <span className="flex items-center gap-3"><Bell className="w-5 h-5 text-gray-500" /> Notifications</span>
                                    <button className="text-sm font-semibold text-blue-600">Manage</button>
                                </li>
                                <li className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                                    <span className="flex items-center gap-3"><Lock className="w-5 h-5 text-gray-500" /> Password & Security</span>
                                    <button className="text-sm font-semibold text-blue-600">Change</button>
                                </li>
                                <li className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                                    <span className="flex items-center gap-3"><HelpCircle className="w-5 h-5 text-gray-500" /> Help Center</span>
                                    <button className="text-sm font-semibold text-blue-600">Visit</button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSmartScorePage;
