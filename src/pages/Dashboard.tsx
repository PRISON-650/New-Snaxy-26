import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Order, MenuItem, DailyReport } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ShoppingBag, Banknote, Clock, ArrowUpRight, ArrowDownRight, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Real-time orders
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeOrders = onSnapshot(ordersQuery, (snap) => {
      setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    });

    // Real-time reports for chart
    const reportsQuery = query(collection(db, 'dailyReports'), orderBy('date', 'desc'), limit(7));
    const unsubscribeReports = onSnapshot(reportsQuery, (snap) => {
      setReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyReport)).reverse());
    });

    return () => {
      unsubscribeOrders();
      unsubscribeReports();
    };
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayReport = reports.find(r => r.date === today);
  
  const totalRevenue = reports.reduce((sum, r) => sum + (r.walkinSales || 0) + (r.onlineSales || 0), 0);
  const totalOrders = reports.reduce((sum, r) => sum + (r.totalOrders || 0), 0);
  const totalExpenses = reports.reduce((sum, r) => sum + (r.totalExpenses || 0), 0);
  const activeOrders = orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length;

  const chartData = reports.map(r => ({
    name: r.date.split('-').slice(1).join('/'),
    revenue: (r.walkinSales || 0) + (r.onlineSales || 0)
  }));

  const stats = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: Banknote, trend: '+12.5%', color: 'bg-green-500' },
    { label: 'Total Orders', value: totalOrders.toString(), icon: ShoppingBag, trend: '+8.2%', color: 'bg-blue-500' },
    { label: 'Total Expenses', value: formatCurrency(totalExpenses), icon: TrendingUp, trend: '-2.4%', color: 'bg-red-500' },
    { label: 'Active Orders', value: activeOrders.toString(), icon: Clock, trend: '+4.1%', color: 'bg-orange-500' },
  ];

  const handleExport = () => {
    if (orders.length === 0) {
      toast.error('No orders to export');
      return;
    }

    const headers = ['Order ID', 'Customer', 'Email', 'Total', 'Status', 'Date'];
    const csvData = orders.map(order => [
      order.id,
      order.customerName,
      order.customerEmail,
      order.total.toFixed(2),
      order.status,
      order.createdAt?.toDate?.() ? order.createdAt.toDate().toLocaleString() : new Date(order.createdAt).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `snaxy26_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully');
  };

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">DASHBOARD</h1>
          <p className="text-neutral-500">Welcome back, Admin. Here's what's happening today.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-bold hover:bg-neutral-50 transition-colors"
          >
            Export Report
          </button>
          <button 
            onClick={() => navigate('/admin/orders')}
            className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700 transition-colors"
          >
            View Live Queue
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className={cn("p-3 rounded-2xl text-white", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-sm font-bold",
                stat.trend.startsWith('+') ? "text-green-600" : "text-red-600"
              )}>
                {stat.trend}
                {stat.trend.startsWith('+') ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              </div>
            </div>
            <div>
              <span className="text-neutral-500 text-sm font-bold uppercase tracking-wider">{stat.label}</span>
              <h3 className="text-3xl font-black tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-neutral-100 shadow-sm space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Revenue Overview</h2>
            <select className="bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-1 text-sm font-bold">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#888' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#888' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#f9fafb' }}
                />
                <Bar dataKey="revenue" fill="#ea580c" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white p-8 rounded-[3rem] border border-neutral-100 shadow-sm space-y-8">
          <h2 className="text-xl font-bold">Recent Orders</h2>
          <div className="space-y-6">
            {orders.slice(0, 5).map(order => (
              <div key={order.id} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-neutral-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm">#{order.id.slice(-6).toUpperCase()}</h4>
                  <span className="text-xs text-neutral-400">{order.customerName}</span>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-sm">{formatCurrency(order.total)}</span>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                    order.status === 'pending' ? "bg-orange-100 text-orange-600" :
                    order.status === 'delivered' ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                  )}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => navigate('/admin/orders')}
            className="w-full py-4 border border-neutral-100 rounded-2xl text-sm font-bold text-neutral-500 hover:bg-neutral-50 transition-colors"
          >
            View All Orders
          </button>
        </div>
      </div>
    </div>
  );
}
