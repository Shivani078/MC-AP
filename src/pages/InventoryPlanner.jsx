import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Target,
    Globe,
    AlertTriangle,
    Bot,
    Zap,
    ArrowUp,
    Eye,
    Package,
    TrendingUp,
    Clock,
    MapPin,
    Loader,
    ServerCrash,
    CheckCircle
} from 'lucide-react';

const InventoryPlanner = () => {
    const [plannerData, setPlannerData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFestival, setSelectedFestival] = useState(null);
    const backendURL = import.meta.env.VITE_BACKEND_URL;

    useEffect(() => {
        const fetchPlannerData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // The URL points to your new backend endpoint
                const response = await fetch(`${backendURL}/api/planner/full-report?location=Delhi`);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Failed to fetch planner data');
                }

                const data = await response.json();
                setPlannerData(data);
            } catch (err) {
                setError(err.message);
                console.error("Failed to fetch planner data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPlannerData();
    }, []);

    const {
        upcomingFestivals,
        topProductsToStock,
        nearbyDemand,
        avoidProducts,
        aiRecommendations
    } = plannerData || {};

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="w-12 h-12 text-purple-600 animate-spin mx-auto" />
                    <h2 className="mt-4 text-xl font-semibold text-gray-700">Generating Your Inventory Plan...</h2>
                    <p className="text-gray-500">Our AI is analyzing the latest trends for you.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center bg-red-50 p-8 rounded-lg border border-red-200">
                    <ServerCrash className="w-12 h-12 text-red-500 mx-auto" />
                    <h2 className="mt-4 text-xl font-semibold text-red-700">Oops! Something went wrong.</h2>
                    <p className="text-red-600">Could not load planner data: {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">📦 Inventory Planner</h1>
                        <p className="text-gray-600">AI-powered insights to optimize your stock and maximize profits</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-sm text-gray-600">Total Inventory Value</div>
                            <div className="text-2xl font-bold text-green-600">₹2,45,000</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-600">AI Confidence</div>
                            <div className="text-2xl font-bold text-blue-600">89%</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex">
                {/* Main Content */}
                <div className="flex-1 p-6 space-y-6">
                    {/* Upcoming Festival Timeline */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <Calendar className="w-6 h-6 text-purple-600" />
                            <h2 className="text-xl font-semibold text-gray-800">🎉 Upcoming Festival Timeline</h2>
                        </div>

                        <div className="space-y-4">
                            {plannerData &&
                                plannerData.upcomingFestivals
                                    .slice() // Create a shallow copy to avoid mutating state
                                    .sort((a, b) => a.daysLeft - b.daysLeft) // Sort by daysLeft ascending
                                    .map((festival) => (
                                        <div key={festival.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                            {/* Color Dot */}
                                            <div style={{ backgroundColor: festival.color }} className="w-4 h-4 rounded-full flex-shrink-0"></div>

                                            {/* Main Info */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="font-semibold text-gray-800 text-lg">{festival.name}</h3>
                                                    <span className="text-sm text-gray-500">• {festival.date}</span>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${festival.urgency === 'high' ? 'bg-red-100 text-red-700' :
                                                        festival.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-green-100 text-green-700'
                                                        }`}>
                                                        {festival.daysLeft} days left
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                                    <span>Expected Sales: <strong className="text-green-600">{festival.expectedSales}</strong></span>
                                                    <span>Status: <strong className="text-gray-800">{festival.preparation}</strong></span>
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <div className="text-right">
                                                <button className="text-blue-600 hover:text-blue-800 font-medium">
                                                    Plan Stock →
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                        </div>
                    </div>

                    {/* Top Products to Stock */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <Target className="w-6 h-6 text-green-600" />
                            <h2 className="text-xl font-semibold text-gray-800">🔮 Top Products to Stock This Week</h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-gray-200">
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Product</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Demand</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Profit/Unit</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Stock Level</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Recommended</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Trend</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plannerData && plannerData.topProductsToStock.map((product) => (
                                        <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-3 h-3 rounded-full ${product.urgency === 'high' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                                    <div>
                                                        <div className="font-medium text-gray-800">{product.name}</div>
                                                        <div className="text-sm text-gray-600">Your Price: {product.yourPrice}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${product.demand === 'Very High' ? 'bg-red-100 text-red-700' :
                                                    product.demand === 'High' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {product.demand}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="font-semibold text-green-600">{product.profit}</div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`px-2 py-1 rounded-full text-sm ${product.stockLevel === 'Critical' ? 'bg-red-100 text-red-700' :
                                                    product.stockLevel === 'Low' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}>
                                                    {product.stockLevel}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="font-medium text-gray-800">{product.units} units</div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-1 text-green-600">
                                                    <ArrowUp className="w-4 h-4" />
                                                    <span className="font-medium">{product.trend}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* In Demand Near You */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <MapPin className="w-6 h-6 text-blue-600" />
                            <h2 className="text-xl font-semibold text-gray-800">📍 In Demand Near You</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {plannerData && plannerData.nearbyDemand.map((location) => (
                                <div key={location.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-gray-800 text-lg">{location.area}</h3>
                                        <span className="text-sm text-gray-600 flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {location.distance}
                                        </span>
                                    </div>

                                    <div className="mb-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-blue-700">{location.product}</span>
                                            <span className={`px-2 py-1 rounded-full text-xs ${location.demand === 'Very High' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                {location.demand}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600">Avg. Spend: <strong>{location.avgSpend}</strong></div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Eye className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">{location.shoppers} shoppers</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">{location.peakHours}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Avoid These Products */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                            <h2 className="text-xl font-semibold text-gray-800">🔻 Avoid These Products</h2>
                        </div>

                        <div className="space-y-4">
                            {plannerData && plannerData.avoidProducts.map((product) => (
                                <div key={product.id} className="flex items-center gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4 mb-2">
                                            <h3 className="font-semibold text-gray-800">{product.name}</h3>
                                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                                {product.returnRate} returns
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600 mb-1">{product.reason}</div>
                                        <div className="text-sm text-green-700 font-medium">💡 {product.suggestion}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-medium text-red-700">{product.impact}</div>
                                        <div className="text-sm text-gray-600">Potential Loss: {product.lossAmount}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* AI Recommendations Side Panel */}
                <div className="w-96 bg-white border-l border-gray-200 p-6 overflow-y-auto">
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Bot className="w-6 h-6 text-purple-600" />
                            <h2 className="text-xl font-semibold text-gray-800">💡 AI Recommendations</h2>
                        </div>
                        <p className="text-sm text-gray-600">Personalized insights for your products</p>
                    </div>

                    <div className="space-y-4">
                        {aiRecommendations && aiRecommendations.map((rec) => (
                            <div key={rec.id} className={`p-4 rounded-lg border ${rec.priority === 'High' ? 'bg-red-50 border-red-200' :
                                rec.priority === 'Medium' ? 'bg-yellow-50 border-yellow-200' :
                                    'bg-green-50 border-green-200'
                                }`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className={`w-3 h-3 rounded-full ${rec.priority === 'High' ? 'bg-red-500' :
                                        rec.priority === 'Medium' ? 'bg-yellow-500' :
                                            'bg-green-500'
                                        }`}></div>
                                    <h3 className="font-semibold text-gray-800">{rec.product}</h3>
                                </div>

                                <div className="mb-3">
                                    <p className="text-sm font-medium text-gray-700 mb-1">{rec.action}</p>
                                    <p className="text-xs text-gray-600">{rec.reason}</p>
                                </div>

                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-xs text-gray-600">
                                        Confidence: <span className="font-medium text-blue-600">{rec.confidence}</span>
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        Revenue: <span className="font-medium text-green-600">{rec.potentialRevenue}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${rec.priority === 'High' ? 'bg-red-100 text-red-700' :
                                        rec.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                        {rec.priority} Priority
                                    </span>
                                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                        Apply →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-3">
                            <Zap className="w-5 h-5 text-purple-600" />
                            <h3 className="font-semibold text-purple-800">Quick AI Analysis</h3>
                        </div>
                        <p className="text-sm text-purple-700 mb-4">
                            Get instant inventory recommendations based on your current stock and upcoming trends.
                        </p>
                        <button className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium">
                            Generate New Insights
                        </button>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-gray-800 mb-2">📊 Quick Stats</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Products Analyzed:</span>
                                <span className="font-medium">247</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">High Priority Items:</span>
                                <span className="font-medium text-red-600">12</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Potential Revenue:</span>
                                <span className="font-medium text-green-600">₹18,700</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Last Updated:</span>
                                <span className="font-medium">2 min ago</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryPlanner;