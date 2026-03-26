import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { DailyReport, Order, Expense, CashRegisterSession } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { 
  Calendar, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Banknote, 
  ShoppingBag, 
  FileText, 
  Printer,
  ArrowLeft,
  Clock,
  User,
  Package,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminReports() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [reportDetails, setReportDetails] = useState<{
    orders: Order[];
    expenses: Expense[];
    sessions: CashRegisterSession[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const q = query(collection(db, 'dailyReports'), orderBy('date', 'desc'), limit(60));
        const snap = await getDocs(q);
        setReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyReport)));
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const fetchReportDetails = async (report: DailyReport) => {
    setDetailsLoading(true);
    setSelectedReport(report);
    try {
      // Create date range for the selected day
      const startDate = new Date(report.date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(report.date);
      endDate.setHours(23, 59, 59, 999);

      const startTimestamp = Timestamp.fromDate(startDate);
      const endTimestamp = Timestamp.fromDate(endDate);

      // Fetch Orders
      const ordersQ = query(
        collection(db, 'orders'),
        where('createdAt', '>=', startTimestamp),
        where('createdAt', '<=', endTimestamp)
      );
      const ordersSnap = await getDocs(ordersQ);
      const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));

      // Fetch Expenses
      const expensesQ = query(
        collection(db, 'expenses'),
        where('timestamp', '>=', startTimestamp),
        where('timestamp', '<=', endTimestamp)
      );
      const expensesSnap = await getDocs(expensesQ);
      const expenses = expensesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));

      // Fetch Sessions
      const sessionsQ = query(
        collection(db, 'cashRegisterSessions'),
        where('startTime', '>=', startTimestamp),
        where('startTime', '<=', endTimestamp)
      );
      const sessionsSnap = await getDocs(sessionsQ);
      const sessions = sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashRegisterSession));

      setReportDetails({ orders, expenses, sessions });
    } catch (error) {
      console.error('Error fetching report details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const printDetailedReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !selectedReport || !reportDetails) return;

    const content = `
      <html>
        <head>
          <title>Detailed Report - ${selectedReport.date}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            h1 { font-size: 24px; margin-bottom: 20px; text-align: center; }
            .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 40px; }
            .summary-item { padding: 15px; border: 1px solid #eee; border-radius: 8px; }
            .summary-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
            .summary-value { font-size: 18px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; padding: 10px; border-bottom: 2px solid #333; font-size: 12px; text-transform: uppercase; }
            td { padding: 10px; border-bottom: 1px solid #eee; font-size: 12px; }
            .section-title { font-size: 16px; font-weight: bold; margin-bottom: 15px; border-left: 4px solid #ea580c; padding-left: 10px; }
            .text-red { color: #dc2626; }
            .text-green { color: #16a34a; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h1>SNAXY 26 - DAILY ACCOUNTING BOOK</h1>
          <p style="text-align: center; color: #666;">Date: ${selectedReport.date}</p>
          
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Total Sales</div>
              <div class="summary-value">${formatCurrency(selectedReport.walkinSales + selectedReport.onlineSales)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Expenses</div>
              <div class="summary-value text-red">-${formatCurrency(selectedReport.totalExpenses)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Cash Expected</div>
              <div class="summary-value">${formatCurrency(selectedReport.cashExpected)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Cash Counted</div>
              <div class="summary-value">${formatCurrency(selectedReport.cashCounted)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Difference</div>
              <div class="summary-value ${selectedReport.difference >= 0 ? 'text-green' : 'text-red'}">
                ${selectedReport.difference > 0 ? '+' : ''}${formatCurrency(selectedReport.difference)}
              </div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Orders</div>
              <div class="summary-value">${selectedReport.totalOrders}</div>
            </div>
          </div>

          <div class="section-title">DETAILED SALES LOG</div>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Order ID</th>
                <th>Items</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${reportDetails.orders.map(o => `
                <tr>
                  <td>${new Date(o.createdAt?.toDate?.() || o.createdAt).toLocaleTimeString()}</td>
                  <td>#${o.id.slice(-6).toUpperCase()}</td>
                  <td>${o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</td>
                  <td>${formatCurrency(o.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="section-title">EXPENSE LOG</div>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Note</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${reportDetails.expenses.map(e => `
                <tr>
                  <td>${new Date(e.timestamp?.toDate?.() || e.timestamp).toLocaleTimeString()}</td>
                  <td>${e.type.toUpperCase()}</td>
                  <td>${e.note}</td>
                  <td class="text-red">${formatCurrency(e.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="section-title">REGISTER SESSIONS</div>
          <table>
            <thead>
              <tr>
                <th>Cashier</th>
                <th>Start</th>
                <th>End</th>
                <th>Sales</th>
                <th>Expenses</th>
                <th>Diff</th>
              </tr>
            </thead>
            <tbody>
              ${reportDetails.sessions.map(s => `
                <tr>
                  <td>${s.cashierName}</td>
                  <td>${new Date(s.startTime?.toDate?.() || s.startTime).toLocaleTimeString()}</td>
                  <td>${s.endTime ? new Date(s.endTime?.toDate?.() || s.endTime).toLocaleTimeString() : 'Active'}</td>
                  <td>${formatCurrency(s.cashSales + s.onlineSales)}</td>
                  <td>${formatCurrency(s.expenses)}</td>
                  <td>${formatCurrency(s.difference || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #999;">
            Generated on ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  if (loading) return <div className="p-8">Loading reports...</div>;

  return (
    <div className="p-8 space-y-8">
      <AnimatePresence mode="wait">
        {!selectedReport ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            <div>
              <h1 className="text-4xl font-black tracking-tighter">ACCOUNTING BOOKS</h1>
              <p className="text-neutral-500">View and manage historical daily reports and session details.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => fetchReportDetails(report)}
                  className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm hover:shadow-xl hover:border-orange-500 transition-all text-left group"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                      <Calendar className="w-6 h-6 text-neutral-400 group-hover:text-orange-600" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-neutral-300" />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-2xl font-black tracking-tight">{report.date}</h3>
                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{report.sessions} Sessions</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-50">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Sales</p>
                        <p className="font-black text-orange-600">{formatCurrency(report.walkinSales + report.onlineSales)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Expenses</p>
                        <p className="font-black text-red-500">-{formatCurrency(report.totalExpenses)}</p>
                      </div>
                    </div>

                    <div className={cn(
                      "p-3 rounded-xl flex justify-between items-center",
                      report.difference >= 0 ? "bg-green-50" : "bg-red-50"
                    )}>
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Difference</span>
                      <span className={cn(
                        "font-black text-sm",
                        report.difference >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {report.difference > 0 && '+'}
                        {formatCurrency(report.difference)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-end">
              <div className="space-y-4">
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="flex items-center gap-2 text-neutral-400 hover:text-orange-600 font-bold transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Books
                </button>
                <div>
                  <h1 className="text-4xl font-black tracking-tighter uppercase">REPORT: {selectedReport.date}</h1>
                  <p className="text-neutral-500">Detailed breakdown of sales, expenses, and register sessions.</p>
                </div>
              </div>
              <button 
                onClick={printDetailedReport}
                className="px-6 py-3 bg-neutral-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-neutral-200"
              >
                <Printer className="w-5 h-5" />
                Print Detailed Book
              </button>
            </div>

            {detailsLoading ? (
              <div className="h-96 flex flex-col items-center justify-center gap-4 bg-white rounded-[3rem] border border-neutral-100 shadow-sm">
                <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-neutral-500 font-bold">Compiling detailed records...</p>
              </div>
            ) : reportDetails && (
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Sales', value: formatCurrency(selectedReport.walkinSales + selectedReport.onlineSales), icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { label: 'Total Expenses', value: formatCurrency(selectedReport.totalExpenses), icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'Net Cash', value: formatCurrency(selectedReport.cashExpected), icon: Banknote, color: 'text-neutral-900', bg: 'bg-neutral-50' },
                    { label: 'Total Orders', value: selectedReport.totalOrders.toString(), icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
                  ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm space-y-4">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg)}>
                        <stat.icon className={cn("w-5 h-5", stat.color)} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{stat.label}</p>
                        <h3 className="text-2xl font-black tracking-tight">{stat.value}</h3>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Detailed Sales Log */}
                  <div className="lg:col-span-2 bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-neutral-100 flex justify-between items-center">
                      <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                        <FileText className="w-6 h-6 text-orange-600" />
                        SALES LOG
                      </h3>
                      <span className="px-3 py-1 bg-neutral-100 rounded-full text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        {reportDetails.orders.length} Orders
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100">
                            <th className="px-8 py-4">Time</th>
                            <th className="px-8 py-4">Order</th>
                            <th className="px-8 py-4">Items</th>
                            <th className="px-8 py-4">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                          {reportDetails.orders.sort((a,b) => b.createdAt - a.createdAt).map(order => (
                            <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                              <td className="px-8 py-4 text-xs font-bold text-neutral-400">
                                {new Date(order.createdAt?.toDate?.() || order.createdAt).toLocaleTimeString()}
                              </td>
                              <td className="px-8 py-4">
                                <span className="font-bold text-sm">#{order.id.slice(-6).toUpperCase()}</span>
                              </td>
                              <td className="px-8 py-4">
                                <div className="flex flex-wrap gap-1">
                                  {order.items.map((item, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-neutral-100 rounded text-[10px] font-medium text-neutral-600">
                                      {item.quantity}x {item.name}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-8 py-4 font-black text-sm">{formatCurrency(order.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Register Sessions */}
                  <div className="bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-neutral-100">
                      <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                        <Clock className="w-6 h-6 text-blue-600" />
                        SESSIONS
                      </h3>
                    </div>
                    <div className="p-6 space-y-4 overflow-y-auto max-h-[600px]">
                      {reportDetails.sessions.map(session => (
                        <div key={session.id} className="p-4 rounded-2xl border border-neutral-100 space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center">
                                <User className="w-5 h-5 text-neutral-400" />
                              </div>
                              <div>
                                <h4 className="font-bold text-sm">{session.cashierName}</h4>
                                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                                  {new Date(session.startTime?.toDate?.() || session.startTime).toLocaleTimeString()} - 
                                  {session.endTime ? new Date(session.endTime?.toDate?.() || session.endTime).toLocaleTimeString() : 'Active'}
                                </p>
                              </div>
                            </div>
                            <div className={cn(
                              "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                              session.status === 'open' ? "bg-green-100 text-green-600" : "bg-neutral-100 text-neutral-500"
                            )}>
                              {session.status}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-50">
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Sales</p>
                              <p className="font-black text-sm">{formatCurrency(session.cashSales + session.onlineSales)}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Diff</p>
                              <p className={cn(
                                "font-black text-sm",
                                (session.difference || 0) >= 0 ? "text-green-600" : "text-red-600"
                              )}>
                                {formatCurrency(session.difference || 0)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Expense Log */}
                <div className="bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-neutral-100">
                    <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                      <TrendingDown className="w-6 h-6 text-red-600" />
                      EXPENSE LOG
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100">
                          <th className="px-8 py-4">Time</th>
                          <th className="px-8 py-4">Type</th>
                          <th className="px-8 py-4">Note</th>
                          <th className="px-8 py-4">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-50">
                        {reportDetails.expenses.map(expense => (
                          <tr key={expense.id} className="hover:bg-neutral-50 transition-colors">
                            <td className="px-8 py-4 text-xs font-bold text-neutral-400">
                              {new Date(expense.timestamp?.toDate?.() || expense.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="px-8 py-4">
                              <span className="px-2 py-1 bg-neutral-100 rounded text-[10px] font-black uppercase tracking-widest text-neutral-600">
                                {expense.type}
                              </span>
                            </td>
                            <td className="px-8 py-4 text-sm text-neutral-500 font-medium">{expense.note}</td>
                            <td className="px-8 py-4 font-black text-red-600">{formatCurrency(expense.amount)}</td>
                          </tr>
                        ))}
                        {reportDetails.expenses.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-8 py-12 text-center text-neutral-400 font-bold">
                              No expenses recorded for this day
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
