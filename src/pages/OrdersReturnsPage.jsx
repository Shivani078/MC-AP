import React, { useState, useMemo, useEffect } from 'react';
import { Client, Databases, ID, Query } from 'appwrite';
import { getAuth } from 'firebase/auth'; // Import Firebase Auth
import { Search, Filter, TrendingDown, Package, Calendar, AlertCircle, CheckCircle, XCircle, Clock, BarChart3, PieChart, Lightbulb } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';


const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const databases = new Databases(client);
const DB_ID = import.meta.env.VITE_APPWRITE_DB_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_ORDERSUM_COLLECTION_ID; // Use env variable

function getCurrentWeek() {
    const curr = new Date();
    const first = curr.getDate() - curr.getDay();
    const last = first + 6;
    const firstday = new Date(curr.setDate(first)).toLocaleDateString();
    const lastday = new Date(curr.setDate(last)).toLocaleDateString();
    return `${firstday} - ${lastday}`;
}

const OrdersReturnsPage = () => {
    // --- Firebase Auth User ID ---
    const [firebaseUserId, setFirebaseUserId] = useState('');
    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = auth.onAuthStateChanged(user => {
            setFirebaseUserId(user ? user.uid : '');
        });
        return () => unsubscribe();
    }, []);

    // --- Form State ---
    const [form, setForm] = useState({
        sellerId: '',
        orders: '',
        returnRate: '',
        userId: '',
        week: getCurrentWeek(),
    });

    // --- Order Input Mode State ---
    const [orderInputMode, setOrderInputMode] = useState('manual');
    const [orderRows, setOrderRows] = useState([
        { product: '', sold: '', returned: '', amount: '' }
    ]);

    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);

    // --- Fetch Entries from Appwrite ---
    const fetchEntries = async () => {
        setLoading(true);
        try {
            if (!firebaseUserId) {
                setEntries([]); // No user, no entries
            } else {
                const res = await databases.listDocuments(DB_ID, COLLECTION_ID, [
                    Query.equal('userId', [firebaseUserId]),
                    Query.orderDesc('$createdAt') // <-- Show newest first
                ]);
                setEntries(res.documents);
            }
        } catch (err) {

        }
        setLoading(false);
    };

    useEffect(() => {
        fetchEntries();
    }, [firebaseUserId]);

    // --- Handle Form ---
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // --- Handle Order Row Change ---
    const handleOrderRowChange = (idx, e) => {
        const updatedRows = orderRows.map((row, i) =>
            i === idx ? { ...row, [e.target.name]: e.target.value } : row
        );
        setOrderRows(updatedRows);
    };

    const addOrderRow = () => {
        setOrderRows([...orderRows, { product: '', sold: '', returned: '', amount: '' }]);
    };

    // --- Handle Order Input Mode Change ---
    const handleOrderInputModeChange = (e) => {
        setOrderInputMode(e.target.value);
    };

    // --- Handle Form Submit ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        let orders = '';
        let returnRate = '';
        // Use orderRows for both manual and CSV modes
        if (orderInputMode === 'manual' || orderInputMode === 'csv') {
            const totalSold = orderRows.reduce((sum, row) => sum + Number(row.sold || 0), 0);
            const totalReturned = orderRows.reduce((sum, row) => sum + Number(row.returned || 0), 0);
            orders = String(totalSold);
            returnRate = totalSold ? ((totalReturned / totalSold) * 100).toFixed(2) : 0;
        }
        try {
            await databases.createDocument(DB_ID, COLLECTION_ID, ID.unique(), {
                ...form,
                orders: orders || String(form.orders),
                returnRate: returnRate !== '' ? parseFloat(returnRate) : Number(form.returnRate),
                userId: firebaseUserId || form.userId,
                week: getCurrentWeek(),
                // orderRows, // REMOVE this line
            });
            await fetchEntries();
            setForm({ ...form, sellerId: '', orders: '', returnRate: '', userId: '', week: getCurrentWeek() });
            setOrderRows([{ product: '', sold: '', returned: '', amount: '' }]);
        } catch (err) {
            console.error('Appwrite error:', err);
            alert('Error saving data');
        }
    };

    // --- Totals ---
    const totalOrders = entries.reduce((sum, entry) => {
        const val = Number(entry.orders);
        return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const avgReturnRate = entries.length
        ? (
            entries.reduce((sum, entry) => {
                const val = Number(entry.returnRate);
                return sum + (isNaN(val) ? 0 : val);
            }, 0) / entries.length
        ).toFixed(2)
        : 0;

    // --- Existing Demo Data and Filters ---
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedReason, setSelectedReason] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    const ordersData = [
        { id: 'ORD-001', product: 'Wireless Bluetooth Headphones', category: 'Electronics', returnReason: 'Poor  Quality', status: 'returned', date: '2024-07-01', customerName: 'John Doe', amount: 89.99 },
        { id: 'ORD-002', product: 'Cotton Summer Dress', category: 'Clothing', returnReason: 'Wrong Size', status: 'returned', date: '2024-07-02', customerName: 'Jane Smith', amount: 59.99 },
        { id: 'ORD-003', product: 'Smartphone Case', category: 'Electronics', returnReason: 'Damaged in Transit', status: 'processing', date: '2024-07-03', customerName: 'Mike Johnson', amount: 24.99 },
        { id: 'ORD-004', product: 'Kitchen Knife Set', category: 'Home & Kitchen', returnReason: 'Not as Described', status: 'returned', date: '2024-07-04', customerName: 'Sarah Wilson', amount: 149.99 },
        { id: 'ORD-005', product: 'Running Shoes', category: 'Sports', returnReason: 'Defective Product', status: 'refunded', date: '2024-07-05', customerName: 'Tom Brown', amount: 129.99 },
        { id: 'ORD-006', product: 'Laptop Backpack', category: 'Electronics', returnReason: 'Poor Quality', status: 'returned', date: '2024-06-28', customerName: 'Lisa Davis', amount: 79.99 },
        { id: 'ORD-007', product: 'Yoga Mat', category: 'Sports', returnReason: 'Wrong Color', status: 'processing', date: '2024-06-30', customerName: 'Alex Chen', amount: 39.99 },
        { id: 'ORD-008', product: 'Coffee Maker', category: 'Home & Kitchen', returnReason: 'Damaged in Transit', status: 'refunded', date: '2024-06-29', customerName: 'Emma White', amount: 199.99 },
    ];

    const returnTrendsData = [
        { month: 'Jan', returns: 45, orders: 320 },
        { month: 'Feb', returns: 52, orders: 280 },
        { month: 'Mar', returns: 38, orders: 340 },
        { month: 'Apr', returns: 61, orders: 390 },
        { month: 'May', returns: 49, orders: 420 },
        { month: 'Jun', returns: 72, orders: 480 },
        { month: 'Jul', returns: 58, orders: 510 },
    ];

    const returnReasonsData = [
        { name: 'Poor  Quality', value: 25, color: '#ef4444' },
        { name: 'Wrong Size', value: 30, color: '#f97316' },
        { name: 'Damaged in Transit', value: 20, color: '#eab308' },
        { name: 'Not as Described', value: 15, color: '#22c55e' },
        { name: 'Defective Product', value: 10, color: '#3b82f6' },
    ];

    const categories = ['Electronics', 'Clothing', 'Home & Kitchen', 'Sports'];
    const returnReasons = ['Poor  Quality', 'Wrong Size', 'Damaged in Transit', 'Not as Described', 'Defective Product', 'Poor Quality', 'Wrong Color'];
    const statuses = ['returned', 'processing', 'refunded'];

    const filteredOrders = useMemo(() => {
        return ordersData.filter(order => {
            const matchesSearch = order.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || order.category === selectedCategory;
            const matchesReason = selectedReason === 'all' || order.returnReason === selectedReason;
            const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;

            return matchesSearch && matchesCategory && matchesReason && matchesStatus;
        });
    }, [searchTerm, selectedCategory, selectedReason, selectedStatus, ordersData]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'returned': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'processing': return <Clock className="w-4 h-4 text-yellow-500" />;
            case 'refunded': return <XCircle className="w-4 h-4 text-blue-500" />;
            default: return null;
        }
    };

    const getStatusBadge = (status) => {
        const baseClass = "px-2 py-1 rounded-full text-xs font-medium";
        switch (status) {
            case 'returned': return `${baseClass} bg-green-100 text-green-800`;
            case 'processing': return `${baseClass} bg-yellow-100 text-yellow-800`;
            case 'refunded': return `${baseClass} bg-blue-100 text-blue-800`;
            default: return baseClass;
        }
    };

    const returnRate = ((filteredOrders.length / (filteredOrders.length + 100)) * 100).toFixed(1);


    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Orders & Returns</h1>

                </div>

                {/* Stats Overview - moved to top */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-sm border flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Returns</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {entries.reduce((sum, entry) => {

                                    return sum + 1;
                                }, 0)}
                            </p>
                        </div>
                        <Package className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Return Rate</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {entries.length
                                    ? (
                                        entries.reduce((sum, entry) => {
                                            const val = Number(entry.returnRate);
                                            return sum + (isNaN(val) ? 0 : val);
                                        }, 0) / entries.length
                                    ).toFixed(1)
                                    : 0
                                }%
                            </p>
                        </div>
                        <TrendingDown className="w-8 h-8 text-red-500" />
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Processing</p>
                            <p className="text-2xl font-bold text-gray-900">{filteredOrders.filter(o => o.status === 'processing').length}</p>
                        </div>
                        <Clock className="w-8 h-8 text-yellow-500" />
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Refunded</p>
                            <p className="text-2xl font-bold text-gray-900">Rs.{filteredOrders.filter(o => o.status === 'refunded').reduce((sum, o) => sum + o.amount, 0).toFixed(2)}</p>
                        </div>
                        <XCircle className="w-8 h-8 text-blue-500" />
                    </div>
                </div>

                {/* --- Orders/Returns Form Section --- */}
                <div className="bg-white p-6 rounded-lg shadow mb-8">
                    <h2 className="text-xl font-bold mb-4">Add Seller Order/Return Details</h2>
                    <form onSubmit={handleSubmit} className="mb-4">
                        <div className="mb-2">
                            <label className="block font-medium mb-1">Seller ID</label>
                            <input
                                type="text"
                                name="sellerId"
                                placeholder="Write anything for now..."
                                value={form.sellerId}
                                onChange={handleChange}
                                required
                                className="border p-2 rounded w-full"
                            />
                        </div>
                        <div className="mb-2">
                            <label className="block font-medium mb-1">How to add orders?</label>
                            <div className="flex gap-4">
                                <label>
                                    <input
                                        type="radio"
                                        name="orderInputMode"
                                        value="manual"
                                        checked={orderInputMode === 'manual'}
                                        onChange={handleOrderInputModeChange}
                                    /> Manual
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="orderInputMode"
                                        value="csv"
                                        checked={orderInputMode === 'csv'}
                                        onChange={handleOrderInputModeChange}
                                    /> Upload CSV
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="orderInputMode"
                                        value="screenshot"
                                        checked={orderInputMode === 'screenshot'}
                                        onChange={handleOrderInputModeChange}
                                    /> Upload Screenshot
                                </label>
                            </div>
                        </div>
                        {orderInputMode === 'manual' && (
                            <div className="mb-2">
                                <label className="block font-medium mb-1">Orders</label>
                                <div className="flex gap-2 mb-1">

                                </div>
                                {orderRows.map((row, idx) => (
                                    <div key={idx} className="flex gap-2 mb-1">
                                        <input
                                            type="text"
                                            name="product"
                                            placeholder="Product"
                                            value={row.product}
                                            onChange={e => handleOrderRowChange(idx, e)}
                                            className="border p-1 rounded"
                                        />
                                        <input
                                            type="number"
                                            name="sold"
                                            placeholder="Sold"
                                            value={row.sold}
                                            onChange={e => handleOrderRowChange(idx, e)}
                                            className="border p-1 rounded"
                                        />
                                        <input
                                            type="number"
                                            name="returned"
                                            placeholder="Returned"
                                            value={row.returned}
                                            onChange={e => handleOrderRowChange(idx, e)}
                                            className="border p-1 rounded"
                                        />
                                        <input
                                            type="number"
                                            name="amount"
                                            placeholder="Amount"
                                            value={row.amount}
                                            onChange={e => handleOrderRowChange(idx, e)}
                                            className="border p-1 rounded"
                                        />
                                    </div>
                                ))}
                                <button type="button" className="bg-blue-600 text-white rounded px-2 py-1 mt-1" onClick={addOrderRow}>
                                    Add Order Row
                                </button>
                            </div>
                        )}
                        {orderInputMode === 'csv' && (
                            <div className="mb-2">
                                <label className="block font-medium mb-1">Upload CSV</label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        const text = await file.text();
                                        // Parse CSV: product,sold,returned,amount
                                        const rows = text.trim().split('\n').slice(1);
                                        const parsedRows = rows.map(row => {
                                            const [product, sold, returned, amount] = row.split(',').map(cell => cell.trim());
                                            return {
                                                product,
                                                sold: sold ? Number(sold) : '',
                                                returned: returned ? Number(returned) : '',
                                                amount: amount ? Number(amount) : ''
                                            };
                                        });
                                        setOrderRows(parsedRows);
                                    }}
                                    className="border p-2 rounded w-full"
                                />
                                <div className="mt-2 text-xs text-gray-500">
                                    CSV columns: <b>product,sold,returned,amount</b>
                                </div>
                            </div>
                        )}
                        {orderInputMode === 'screenshot' && (
                            <div className="mb-2">
                                <label className="block font-medium mb-1">Upload Screenshot (image)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;

                                        setOrderRows([{ product: file.name, sold: '', returned: '', amount: '' }]);

                                    }}
                                    className="border p-2 rounded w-full"
                                />
                                <div className="mt-2 text-xs text-gray-500">
                                    Upload an order screenshot (image).<br />
                                    <span className="text-yellow-700"></span>
                                </div>
                            </div>
                        )}
                        <button type="submit" className="bg-yellow-700 text-white rounded p-2 w-full mt-2">Submit</button>
                    </form>
                    {/* Quick Stats Card at Top */}
                    <div className="flex justify-center mb-6">
                        <div className="bg-white rounded-2xl shadow border flex flex-col items-center justify-center w-64 h-32 mx-2">
                            <div className="flex items-center gap-3 mb-1">
                                <Package className="w-7 h-7 text-blue-500" />
                                <span className="text-lg font-semibold text-gray-700">Total Orders</span>
                            </div>
                            <span className="text-3xl font-extrabold text-gray-900">{totalOrders}</span>
                            <span className="text-sm text-gray-500 mt-1">Avg Return: <span className="text-yellow-700 font-bold">{avgReturnRate}%</span></span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white rounded-xl shadow-sm border border-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order No.</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Seller ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Week</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Orders</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Return Rate</th>
                                    {/* Removed Amount column */}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-gray-400">Loading...</td>
                                    </tr>
                                ) : entries.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-gray-400">No data</td>
                                    </tr>
                                ) : (
                                    entries
                                        .slice()
                                        .sort((a, b) => (b.orderNumber || 0) - (a.orderNumber || 0))
                                        .map((entry, idx) => (
                                            <tr key={entry.$id} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <Package className="w-5 h-5 text-gray-400 mr-2" />
                                                        <span className="text-sm font-bold text-gray-900 font-mono">
                                                            ORD-{entry.orderNumber ? String(entry.orderNumber).padStart(3, '0') : String(idx + 1).padStart(3, '0')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-gray-900">{entry.sellerId}</td>
                                                <td className="px-6 py-4 text-gray-700">
                                                    <span className="inline-flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-gray-400" />
                                                        <span className="font-mono bg-gray-100 rounded px-2 py-1 text-xs">
                                                            {formatWeek(entry.week)}
                                                        </span>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-blue-700 font-bold">{Number(entry.orders) || 0}</td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-block px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 font-semibold text-xs">
                                                        {entry.returnRate}%
                                                    </span>
                                                </td>
                                                {/* Removed Amount cell */}
                                            </tr>
                                        ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* --- End Orders/Returns Form Section --- */}



                {/* AI Suggestion Banner */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-lg mb-8 shadow-lg">
                    <div className="flex items-center gap-4">
                        <Lightbulb className="w-8 h-8 text-yellow-300" />
                        <div>
                            <h3 className="text-lg font-semibold mb-2">🧠 AI Suggestion</h3>
                            <p className="text-purple-100">Too many returns? Here's how to improve listings: Add more detailed product descriptions, include size charts, and use higher quality images to reduce return rates by up to 40%.</p>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Return Trends */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            Return Trends
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={returnTrendsData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="returns" stroke="#ef4444" strokeWidth={2} />
                                <Line type="monotone" dataKey="orders" stroke="#22c55e" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Return Reasons */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <PieChart className="w-5 h-5" />
                            Return Reasons
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <RechartsPieChart>
                                <Pie
                                    data={returnReasonsData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}%`}
                                >
                                    {returnReasonsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </RechartsPieChart>
                        </ResponsiveContainer>
                    </div>
                </div>






            </div>
        </div>
    );
};

function formatWeek(weekStr) {
    // Try to format "YYYY-MM-DD - YYYY-MM-DD" as "Jul 14 - Jul 20, 2025"
    if (!weekStr) return '';
    const [start, end] = weekStr.split(' - ');
    try {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const options = { month: 'short', day: 'numeric' };
        const year = endDate.getFullYear();
        return `${startDate.toLocaleDateString(undefined, options)} - ${endDate.toLocaleDateString(undefined, options)}, ${year}`;
    } catch {
        return weekStr;
    }
}

export default OrdersReturnsPage;