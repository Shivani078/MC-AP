import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, MapPin, Search } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, BarChart, Bar
} from "recharts";
import { databases } from '../appwrite/client';
import { auth } from '../auth/firebase';  // <-- FIXED: Correct import path

const APPWRITE_DB_ID = import.meta.env.VITE_APPWRITE_DB_ID;
const APPWRITE_PROFILES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_PROFILES_COLLECTION_ID;

const TrendsInsightsPage = () => {
    const [storeAddresses, setStoreAddresses] = useState([]);
    const [additionalCities, setAdditionalCities] = useState("");
    const [category, setCategory] = useState("");
    const [trends, setTrends] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showAddCities, setShowAddCities] = useState(false);

    // Fetch store addresses from profile
    useEffect(() => {
        const fetchProfile = async () => {
            const user = auth.currentUser;
            if (!user?.uid) {
                setError("Please login to view trends");
                return;
            }

            try {
                const doc = await databases.getDocument(
                    APPWRITE_DB_ID,
                    APPWRITE_PROFILES_COLLECTION_ID,
                    user.uid
                );
                setStoreAddresses(doc.storeAddresses || []);
                // If we have store addresses, automatically fetch trends
                if (doc.storeAddresses?.length > 0 && doc.categories?.length > 0) {
                    setCategory(doc.categories[0]); // Use first category as default
                    fetchTrendsForStores(doc.storeAddresses, doc.categories[0]);
                }
            } catch (err) {
                setError("Could not load your store locations");
                console.error("Profile fetch error:", err);
            }
        };

        fetchProfile();
    }, []);

    const fetchTrendsForStores = async (locations, selectedCategory) => {
        if (!locations.length || !selectedCategory) return;

        setLoading(true);
        setError("");
        try {
            // Extract city names from addresses (assuming format: "City, State, PIN")
            const cities = locations.map(addr => addr.split(',')[0].trim());

            const response = await axios.post("http://localhost:8000/api/trends", {
                cities: cities,
                category: selectedCategory,
            });
            setTrends(response.data.trends);
        } catch (err) {
            setError(err.message || "Could not fetch trends");
        } finally {
            setLoading(false);
        }
    };

    const handleSearchAdditional = async () => {
        if (!additionalCities || !category) {
            alert("Please enter both cities and category");
            return;
        }

        setLoading(true);
        setError("");
        try {
            const allCities = [
                ...storeAddresses.map(addr => addr.split(',')[0].trim()),
                ...additionalCities.split(',').map(c => c.trim())
            ];

            const response = await axios.post("http://localhost:8000/api/trends", {
                cities: allCities,
                category: category,
            });
            setTrends(response.data.trends);
        } catch (err) {
            setError(err.message || "Could not fetch trends");
        } finally {
            setLoading(false);
        }
    };

    // --- Prepare data for charts ---
    const citiesSet = new Set(trends.map((t) => t.city));
    const multipleCities = citiesSet.size > 1;

    // ✅ Group data by trend name for line chart
    const groupedByTrend = (() => {
        const trendMap = {};
        const allCities = Array.from(new Set(trends.map((t) => t.city)));

        for (const t of trends) {
            const name = t.trend || "Unknown";
            if (!trendMap[name]) trendMap[name] = { name };
            trendMap[name][t.city] =
                typeof t.pct_change === "number"
                    ? t.pct_change
                    : Number(t.pct_change) || 0;
        }

        // Fill missing cities for consistency
        for (const trendName in trendMap) {
            for (const city of allCities) {
                if (!(city in trendMap[trendName])) {
                    trendMap[trendName][city] = 0;
                }
            }
        }

        return Object.values(trendMap);
    })();

    // Single city data
    const singleCityData =
        trends.length > 0
            ? trends.map((t) => ({
                name: t.trend,
                pct_change:
                    typeof t.pct_change === "number"
                        ? t.pct_change
                        : Number(t.pct_change) || 0,
                popularity_score: t.popularity_score || 0,
            }))
            : [];

    // Average change per trend for bar chart
    const avgChangeByTrend = Object.values(
        trends.reduce((acc, t) => {
            const name = t.trend || "Unknown";
            if (!acc[name]) acc[name] = { name, total: 0, count: 0 };
            acc[name].total += Number(t.pct_change) || 0;
            acc[name].count += 1;
            return acc;
        }, {})
    ).map((item) => ({ name: item.name, avg_change: +(item.total / item.count).toFixed(1) }));

    const topTrends = [...avgChangeByTrend].sort((a, b) => b.avg_change - a.avg_change).slice(0, 8);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-2 text-gray-800">📈 Your Store Trends</h1>

                {/* Store Locations Summary */}
                <div className="mb-6">
                    <h2 className="text-lg font-medium text-gray-700 mb-3">Your Store Locations:</h2>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {storeAddresses.map((addr, idx) => (
                            <div key={idx} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {addr.split(',')[0].trim()}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Controls */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
                    <div className="flex flex-wrap gap-4 items-start">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <input
                                type="text"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                                placeholder="Enter product category"
                            />
                        </div>

                        {/* Toggle for additional cities */}
                        <div className="flex-1">
                            <button
                                onClick={() => setShowAddCities(!showAddCities)}
                                className="mb-2 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" />
                                {showAddCities ? 'Hide Additional Cities' : 'Add More Cities'}
                            </button>

                            {showAddCities && (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={additionalCities}
                                        onChange={(e) => setAdditionalCities(e.target.value)}
                                        className="flex-1 p-2 border border-gray-300 rounded-lg"
                                        placeholder="Enter additional cities, comma-separated"
                                    />
                                    <button
                                        onClick={handleSearchAdditional}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                    >
                                        <Search className="w-4 h-4" />
                                        Search
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {loading && <p className="text-center text-blue-600">Loading...</p>}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-4">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {/* --- Visualization --- */}
                {trends.length > 0 && (
                    <div className="rounded-2xl p-6 shadow-md mb-10 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 border border-gray-200">
                        <h2 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
                            📊 {multipleCities ? "City-Wise Trend Comparison" : "Trend Movement"}
                        </h2>

                        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                            <ResponsiveContainer width="100%" height={380}>
                                {multipleCities ? (
                                    // Multi-city Line Chart
                                    <LineChart data={groupedByTrend}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        {Array.from(new Set(trends.map((t) => t.city))).map(
                                            (city, index) => (
                                                <Line
                                                    key={city}
                                                    type="monotone"
                                                    dataKey={city}
                                                    stroke={`hsl(${index * 80}, 70%, 50%)`}
                                                    strokeWidth={2}
                                                    activeDot={{ r: 6 }}
                                                />
                                            )
                                        )}
                                    </LineChart>
                                ) : (
                                    // ✅ Single-city Line with Dots
                                    <LineChart data={singleCityData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="pct_change"
                                            name="Change (%)"
                                            stroke="#6B8E23"
                                            strokeWidth={3}
                                            activeDot={{ r: 8 }}
                                        />
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}


                {/* --- Top Trends Bar Chart (Aesthetic Version) --- */}
                {topTrends.length > 0 && (
                    <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-sm border border-gray-200 mb-10 p-6">
                        {/* Subtle background accent */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-40"></div>
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-100 rounded-full blur-3xl opacity-40"></div>

                        <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center gap-2">
                            🔥 Top Trends by Average Change
                        </h2>

                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={topTrends}
                                layout="vertical"
                                margin={{ top: 10, right: 40, left: 0, bottom: 10 }}
                            >
                                {/* Gradient Definition */}
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.95} />
                                        <stop offset="100%" stopColor="#34d399" stopOpacity={0.95} />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis type="number" tick={{ fill: "#6b7280" }} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={160}
                                    tick={{ fill: "#4b5563", fontWeight: 500 }}
                                />
                                <Tooltip
                                    cursor={{ fill: "rgba(243,244,246,0.3)" }}
                                    contentStyle={{
                                        backgroundColor: "white",
                                        borderRadius: "10px",
                                        border: "1px solid #e5e7eb",
                                        boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                                    }}
                                    labelStyle={{ fontWeight: 600, color: "#111827" }}
                                />
                                <Bar
                                    dataKey="avg_change"
                                    fill="url(#barGradient)"
                                    radius={[10, 10, 10, 10]}
                                    animationDuration={1200}
                                    className="transition-all"
                                    onMouseOver={(e) => (e.target.style.filter = "brightness(1.2)")}
                                    onMouseOut={(e) => (e.target.style.filter = "brightness(1)")}
                                />
                            </BarChart>
                        </ResponsiveContainer>

                        {/* Subtle footer text */}
                        <p className="text-sm text-gray-500 mt-4 text-center">
                            Trends ranked by their average % change across selected cities
                        </p>
                    </div>
                )}



                {/* --- Trend Cards (Enhanced Aesthetic) --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trends.map((trend, index) => (
                        <div
                            key={index}
                            className="relative bg-gradient-to-b from-gray-100 to-gray-200 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group border border-gray-300"
                        >


                            {/* Top gradient bar */}
                            <div className="h-2 bg-gradient-to-r from-pink-400 via-rose-400 to-pink-600"></div>

                            {trend.error ? (
                                <div className="p-6">
                                    <p className="text-red-500 font-medium flex items-center gap-2">
                                        <span className="text-xl">⚠️</span>
                                        Error for {trend.city}: {trend.error}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Main content with better padding and organization */}
                                    <div className="p-6">
                                        {/* City Header with icon */}
                                        <div className="flex items-center justify-between mb-6">
                                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                                <span className="text-2xl">🏙️</span>
                                                {trend.city}
                                            </h2>
                                            <div
                                                className={`px-3 py-1 rounded-full text-sm font-medium 
                                                ${trend.popularity.includes("High")
                                                        ? "bg-green-100 text-green-700 ring-1 ring-green-200"
                                                        : trend.popularity.includes("Medium")
                                                            ? "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200"
                                                            : "bg-gray-50 text-gray-600 ring-1 ring-gray-200"
                                                    }`}
                                            >
                                                {trend.popularity}
                                            </div>
                                        </div>

                                        {/* Trend Name and Change % */}
                                        <div className="mb-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {trend.trend}
                                                </h3>
                                                <div
                                                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium
                                                    ${trend.pct_change > 0
                                                            ? "text-green-700 bg-green-50 ring-1 ring-green-200"
                                                            : "text-red-700 bg-red-50 ring-1 ring-red-200"
                                                        }`}
                                                >
                                                    <span className="text-lg">
                                                        {trend.pct_change > 0 ? "↗" : "↘"}
                                                    </span>
                                                    {Math.abs(trend.pct_change)}%
                                                </div>
                                            </div>
                                        </div>

                                        {/* Info Grid */}
                                        <div className="grid grid-cols-1 gap-4 text-sm">
                                            {/* Features Section */}
                                            <div className="bg-gray-50 rounded-xl p-3">
                                                <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                    <span>✨</span> Key Features
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {trend.features.map((feature, idx) => (
                                                        <span key={idx} className="bg-white px-2 py-1 rounded-md text-gray-600 text-xs ring-1 ring-gray-200">
                                                            {feature}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Competitors Section */}
                                            <div className="bg-gray-50 rounded-xl p-3">
                                                <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                    <span>🏢</span> Market Players
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {trend.competitors.map((competitor, idx) => (
                                                        <span key={idx} className="bg-white px-2 py-1 rounded-md text-gray-600 text-xs ring-1 ring-gray-200">
                                                            {competitor}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Hotspots & Tips */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-gray-50 rounded-xl p-3">
                                                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                        <span>📍</span> Hotspots
                                                    </h4>
                                                    <div className="space-y-1">
                                                        {trend.local_hotspots.map((spot, idx) => (
                                                            <p key={idx} className="text-gray-600 text-xs">• {spot}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 rounded-xl p-3">
                                                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                        <span>💡</span> Tips
                                                    </h4>
                                                    <div className="space-y-1">
                                                        {trend.tips.map((tip, idx) => (
                                                            <p key={idx} className="text-gray-600 text-xs">• {tip}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="bg-gray-50 px-6 py-3 text-xs text-gray-500 flex items-center justify-between border-t border-gray-100">
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                            Updated {new Date().toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1">

                                            <span className="text-blue-400"></span>
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default TrendsInsightsPage;
