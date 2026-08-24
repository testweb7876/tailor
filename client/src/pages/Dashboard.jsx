import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import api, { msg } from '../services/api';
import { useToast } from '../components/Toast';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const COLORS = ['#26336B', '#B98A3C', '#4B69B5', '#8AA0D6', '#C9A96A', '#2E7D5B', '#B4553C'];

function Card({ label, value, tone = 'ink' }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${tone === 'brass' ? 'text-brass' : 'text-ink'}`}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const toast = useToast();
  const [cards, setCards] = useState(null);
  const [charts, setCharts] = useState(null);
  const [recent, setRecent] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [a, b, c] = await Promise.all([
          api.get('/dashboard'), api.get('/dashboard/charts'), api.get('/dashboard/recent'),
        ]);
        setCards(a.data.cards); setCharts(b.data); setRecent(c.data);
      } catch (e) { toast.error(msg(e, 'Failed to load dashboard')); }
    })();
  }, []); // eslint-disable-line

  if (!cards) return <div className="text-gray-400">Loading dashboard…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Card label="Today's Orders" value={cards.todayOrders} />
        <Card label="Today's Revenue" value={inr(cards.todayRevenue)} />
        <Card label="Today's Collection" value={inr(cards.todayCollection)} tone="brass" />
        <Card label="Total Customers" value={cards.totalCustomers} />
        <Card label="Pending Orders" value={cards.pendingOrders} />
        <Card label="Ready for Delivery" value={cards.readyForDelivery} />
        <Card label="Upcoming Deliveries" value={cards.upcomingDeliveries} />
        <Card label="Pending Payment" value={inr(cards.totalPendingPayment)} tone="brass" />
        <Card label="Total Revenue" value={inr(cards.totalRevenue)} />
        <Card label="Total Orders" value={cards.totalOrders} />
      </div>

      {charts && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-600">Monthly Revenue</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={charts.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} />
                <Tooltip formatter={(v) => inr(v)} />
                <Line type="monotone" dataKey="total" stroke="#26336B" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-600">Monthly Orders</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts.ordersByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} />
                <Tooltip /><Bar dataKey="count" fill="#B98A3C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-600">Payment Methods</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={charts.paymentMethods} dataKey="total" nameKey="method" outerRadius={90} label>
                  {charts.paymentMethods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => inr(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-600">Order Status</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts.orderStatus} layout="vertical">
                <XAxis type="number" fontSize={12} /><YAxis type="category" dataKey="status" fontSize={12} width={80} />
                <Tooltip /><Bar dataKey="count" fill="#26336B" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {recent && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-600">Recent Orders</h3>
            <div className="divide-y divide-gray-50 text-sm">
              {recent.recentOrders?.map((o) => (
                <div key={o._id} className="flex justify-between py-2">
                  <span>{o.orderNumber} · {o.customer?.fullName}</span>
                  <span className="text-gray-500">{inr(o.grandTotal)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-600">Recent Payments</h3>
            <div className="divide-y divide-gray-50 text-sm">
              {recent.recentPayments?.map((p) => (
                <div key={p._id} className="flex justify-between py-2">
                  <span>{p.customer?.fullName} · {p.method}</span>
                  <span className="text-green-700">{inr(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
