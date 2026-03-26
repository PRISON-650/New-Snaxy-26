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
  getDoc,
  onSnapshot,
  updateDoc
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
  AlertCircle,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState<'daily' | 'sessions'>('daily');
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [sessions, setSessions] = useState<CashRegisterSession[]>([]);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [reportDetails, setReportDetails] = useState<{
    orders: Order[];
    expenses: Expense[];
    sessions: CashRegisterSession[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<DailyReport>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast.success('Refreshing data...');
  };

  // Real-time Daily Reports
  useEffect(() => {
    console.log('AdminReports: Initializing dailyReports listener');
    const q = query(collection(db, 'dailyReports'), orderBy('date', 'desc'), limit(60));
    const unsubscribe = onSnapshot(q, (snap) => {
      console.log('AdminReports: Received dailyReports update, count:', snap.size);
      setReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyReport)));
      setLoading(false);
    }, (error) => {
      console.error('AdminReports: Error fetching reports:', error);
      toast.error('Permission denied or error fetching reports. Check console.');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [refreshKey]);

  // Real-time All Sessions (for the "Sessions" tab)
  useEffect(() => {
    console.log('AdminReports: Initializing sessions listener');
    const q = query(collection(db, 'cashRegisterSessions'), orderBy('startTime', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      console.log('AdminReports: Received sessions update, count:', snap.size);
      setSessions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashRegisterSession)));
    }, (error) => {
      console.error('AdminReports: Error fetching sessions:', error);
    });
    return () => unsubscribe();
  }, [refreshKey]);

  // Real-time Details for Selected Report
  useEffect(() => {
    if (!selectedReport) {
      setReportDetails(null);
      return;
    }

    setDetailsLoading(true);
    const startDate = new Date(selectedReport.date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(selectedReport.date);
    endDate.setHours(23, 59, 59, 999);

    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    const ordersQ = query(
      collection(db, 'orders'),
      where('createdAt', '>=', startTimestamp),
      where('createdAt', '<=', endTimestamp)
    );

    const expensesQ = query(
      collection(db, 'expenses'),
      where('timestamp', '>=', startTimestamp),
      where('timestamp', '<=', endTimestamp)
    );

    const sessionsQ = query(
      collection(db, 'cashRegisterSessions'),
      where('startTime', '>=', startTimestamp),
      where('startTime', '<=', endTimestamp)
    );

    const unsubOrders = onSnapshot(ordersQ, (snap) => {
      const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setReportDetails(prev => ({ 
        orders, 
        expenses: prev?.expenses || [], 
        sessions: prev?.sessions || [] 
      }));
      setDetailsLoading(false);
    });

    const unsubExpenses = onSnapshot(expensesQ, (snap) => {
      const expenses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setReportDetails(prev => ({ 
        orders: prev?.orders || [], 
        expenses, 
        sessions: prev?.sessions || [] 
      }));
    });

    const unsubSessions = onSnapshot(sessionsQ, (snap) => {
      const sessions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashRegisterSession));
      setReportDetails(prev => ({ 
        orders: prev?.orders || [], 
        expenses: prev?.expenses || [], 
        sessions 
      }));
    });

    return () => {
      unsubOrders();
      unsubExpenses();
      unsubSessions();
    };
  }, [selectedReport]);

  const handleUpdateReport = async () => {
    if (!selectedReport) return;
    try {
      await updateDoc(doc(db, 'dailyReports', selectedReport.id), editData);
      toast.success('Report updated successfully');
      setIsEditing(false);
      // Update selected report locally to reflect changes
      setSelectedReport({ ...selectedReport, ...editData });
    } catch (error) {
      console.error('Error updating report:', error);
      toast.error('Failed to update report');
    }
  };

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
              <div class="summary-value">${formatCurrency((selectedReport.walkinSales || 0) + (selectedReport.onlineSales || 0))}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Expenses</div>
              <div class="summary-value text-red">-${formatCurrency(selectedReport.totalExpenses || 0)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Cash Expected</div>
              <div class="summary-value">${formatCurrency(selectedReport.cashExpected || 0)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Cash Counted</div>
              <div class="summary-value">${formatCurrency(selectedReport.cashCounted || 0)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Difference</div>
              <div class="summary-value ${(selectedReport.difference || 0) >= 0 ? 'text-green' : 'text-red'}">
                ${(selectedReport.difference || 0) > 0 ? '+' : ''}${formatCurrency(selectedReport.difference || 0)}
              </div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Orders</div>
              <div class="summary-value">${selectedReport.totalOrders || 0}</div>
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
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tighter">ACCOUNTING BOOKS</h1>
                <p className="text-neutral-500">View and manage historical daily reports and session details.</p>
              </div>
              
              <div className="flex gap-4 items-center">
                <button 
                  onClick={handleRefresh}
                  className="p-2 bg-white border border-neutral-100 rounded-xl text-neutral-400 hover:text-orange-600 transition-colors shadow-sm"
                  title="Refresh Data"
                >
                  <TrendingUp className="w-5 h-5" />
                </button>
                <div className="flex bg-white p-1 rounded-2xl border border-neutral-100 shadow-sm">
                  <button 
                    onClick={() => setActiveTab('daily')}
                    className={cn(
                      "px-6 py-2 rounded-xl text-sm font-bold transition-all",
                      activeTab === 'daily' ? "bg-orange-600 text-white shadow-lg shadow-orange-200" : "text-neutral-400 hover:text-neutral-600"
                    )}
                  >
                    Daily Reports
                  </button>
                  <button 
                    onClick={() => setActiveTab('sessions')}
                    className={cn(
                      "px-6 py-2 rounded-xl text-sm font-bold transition-all",
                      activeTab === 'sessions' ? "bg-orange-600 text-white shadow-lg shadow-orange-200" : "text-neutral-400 hover:text-neutral-600"
                    )}
                  >
                    Session Blocks
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'daily' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {reports.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-neutral-200">
                    <Calendar className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                    <p className="text-neutral-400 font-bold">No daily reports found yet.</p>
                  </div>
                ) : reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className="bg-white p-8 rounded-[3rem] border border-neutral-100 shadow-sm hover:shadow-2xl hover:border-orange-500 transition-all text-left group relative overflow-hidden"
                  >
                    {report.date === new Date().toISOString().split('T')[0] && (
                      <div className="absolute top-0 right-0 px-4 py-1 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-2xl animate-pulse">
                        Today's Live Book
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                        <Calendar className="w-6 h-6 text-neutral-400 group-hover:text-orange-600" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-300" />
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-2xl font-black tracking-tight">{report.date}</h3>
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{report.sessions} Sessions Recorded</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-50">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total Sales</p>
                          <p className="font-black text-orange-600 text-lg">{formatCurrency((report.walkinSales || 0) + (report.onlineSales || 0))}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Expenses</p>
                          <p className="font-black text-red-500 text-lg">-{formatCurrency(report.totalExpenses || 0)}</p>
                        </div>
                      </div>

                      <div className={cn(
                        "p-4 rounded-2xl flex justify-between items-center",
                        (report.difference || 0) >= 0 ? "bg-green-50" : "bg-red-50"
                      )}>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Net Difference</span>
                          <span className="text-[10px] text-neutral-400 font-bold">Expected vs Counted</span>
                        </div>
                        <span className={cn(
                          "font-black text-lg",
                          (report.difference || 0) >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {(report.difference || 0) > 0 && '+'}
                          {formatCurrency(report.difference || 0)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {sessions.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-neutral-200">
                    <Clock className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                    <p className="text-neutral-400 font-bold">No session history found yet.</p>
                  </div>
                ) : sessions.map((session) => (
                  <div 
                    key={session.id}
                    className={cn(
                      "bg-white p-8 rounded-[3rem] border transition-all space-y-6 relative overflow-hidden group hover:shadow-2xl",
                      session.status === 'open' ? "border-green-500 shadow-xl shadow-green-100/50" : "border-neutral-100 shadow-sm"
                    )}
                  >
                    {session.status === 'open' && (
                      <div className="absolute top-0 right-0 px-4 py-1 bg-green-500 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-2xl flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        Live Session
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-neutral-100 rounded-[1.5rem] flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                        <User className="w-8 h-8 text-neutral-400 group-hover:text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black tracking-tight">{session.cashierName}</h3>
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {new Date(session.startTime?.toDate?.() || session.startTime).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-neutral-50 rounded-[2rem] border border-neutral-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Total Sales</p>
                        <p className="text-xl font-black text-neutral-900">{formatCurrency(session.cashSales + session.onlineSales)}</p>
                      </div>
                      <div className="p-5 bg-red-50 rounded-[2rem] border border-red-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Expenses</p>
                        <p className="text-xl font-black text-red-600">-{formatCurrency(session.expenses)}</p>
                      </div>
                    </div>

                    <div className="space-y-4 p-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-neutral-400">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-widest">Timeline</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-black">{new Date(session.startTime?.toDate?.() || session.startTime).toLocaleTimeString()}</span>
                          <span className="text-[10px] font-bold text-neutral-300">to</span>
                          <span className="text-xs font-black">
                            {session.endTime ? new Date(session.endTime?.toDate?.() || session.endTime).toLocaleTimeString() : 'ACTIVE'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-neutral-100 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Session Difference</p>
                          <p className="text-[10px] text-neutral-300 font-bold">Expected vs Actual</p>
                        </div>
                        <span className={cn(
                          "text-xl font-black",
                          (session.difference || 0) >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {formatCurrency(session.difference || 0)}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Create a dummy report object to use the existing print function
                          const dummyReport: DailyReport = {
                            id: session.id,
                            date: new Date(session.startTime?.toDate?.() || session.startTime).toISOString().split('T')[0],
                            totalOrders: 0,
                            walkinSales: session.walkinSales || 0,
                            onlineSales: session.onlineSales || 0,
                            cashSales: session.cashSales || 0,
                            totalExpenses: session.expenses || 0,
                            sessions: 1,
                            difference: session.difference || 0
                          };
                          // We need orders and expenses for this session specifically
                          // For now, just print the summary
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            printWindow.document.write(`
                              <html>
                                <head>
                                  <title>Session Report - ${session.cashierName}</title>
                                  <style>
                                    body { font-family: sans-serif; padding: 20px; }
                                    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
                                    .stat { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
                                    .total { font-weight: bold; font-size: 1.2em; margin-top: 10px; }
                                  </style>
                                </head>
                                <body>
                                  <div class="header">
                                    <h1>SESSION REPORT</h1>
                                    <p>Cashier: ${session.cashierName}</p>
                                    <p>Date: ${new Date(session.startTime?.toDate?.() || session.startTime).toLocaleDateString()}</p>
                                  </div>
                                  <div class="stat"><span>Start Time:</span> <span>${new Date(session.startTime?.toDate?.() || session.startTime).toLocaleTimeString()}</span></div>
                                  <div class="stat"><span>End Time:</span> <span>${session.endTime ? new Date(session.endTime?.toDate?.() || session.endTime).toLocaleTimeString() : 'ACTIVE'}</span></div>
                                  <div class="stat"><span>Cash Sales:</span> <span>${formatCurrency(session.cashSales)}</span></div>
                                  <div class="stat"><span>Online Sales:</span> <span>${formatCurrency(session.onlineSales)}</span></div>
                                  <div class="stat"><span>Expenses:</span> <span>${formatCurrency(session.expenses)}</span></div>
                                  <div class="stat total"><span>Expected Cash:</span> <span>${formatCurrency(session.expectedCash)}</span></div>
                                  <div class="stat total"><span>Actual Cash:</span> <span>${formatCurrency(session.actualCash)}</span></div>
                                  <div class="stat total"><span>Difference:</span> <span style="color: ${(session.difference || 0) >= 0 ? 'green' : 'red'}">${formatCurrency(session.difference || 0)}</span></div>
                                  <div style="margin-top: 50px; text-align: center; font-size: 0.8em; color: #888;">
                                    Printed on ${new Date().toLocaleString()}
                                  </div>
                                  <script>window.print();</script>
                                </body>
                              </html>
                            `);
                            printWindow.document.close();
                          }
                        }}
                        className="w-full py-3 bg-neutral-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Print Session Block
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                    { key: 'walkinSales', label: 'Walk-in Sales', value: selectedReport.walkinSales || 0, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { key: 'onlineSales', label: 'Online Sales', value: selectedReport.onlineSales || 0, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { key: 'totalExpenses', label: 'Total Expenses', value: selectedReport.totalExpenses || 0, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
                    { key: 'cashCounted', label: 'Cash Counted', value: selectedReport.cashCounted || 0, icon: Banknote, color: 'text-neutral-900', bg: 'bg-neutral-50' },
                  ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg)}>
                          <stat.icon className={cn("w-5 h-5", stat.color)} />
                        </div>
                        {!isEditing ? (
                          <button 
                            onClick={() => {
                              setIsEditing(true);
                              setEditData({
                                walkinSales: selectedReport.walkinSales || 0,
                                onlineSales: selectedReport.onlineSales || 0,
                                totalExpenses: selectedReport.totalExpenses || 0,
                                cashCounted: selectedReport.cashCounted || 0
                              });
                            }}
                            className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="flex gap-1">
                            <button 
                              onClick={handleUpdateReport}
                              className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setIsEditing(false)}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{stat.label}</p>
                        {isEditing ? (
                          <input 
                            type="number"
                            value={editData[stat.key as keyof DailyReport] as number}
                            onChange={(e) => setEditData({ ...editData, [stat.key]: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-neutral-50 border border-neutral-100 rounded-lg px-2 py-1 text-xl font-black focus:outline-none focus:ring-2 focus:ring-orange-600/20"
                          />
                        ) : (
                          <h3 className="text-2xl font-black tracking-tight">{formatCurrency(stat.value)}</h3>
                        )}
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
