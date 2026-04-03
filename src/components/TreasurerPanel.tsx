import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, deleteDoc, doc, getDocs, where, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Transaction, Program, Club, MonthlyReport } from '../types';
import { Card } from './Card';
import { Button } from './Button';
import { Plus, TrendingUp, TrendingDown, Wallet, Trash2, Calendar, FileText, ChevronRight, BarChart3, Download, AlertCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { ConfirmModal } from './ConfirmModal';

export default function TreasurerPanel() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'transactions' | 'reports'>('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [newTransaction, setNewTransaction] = useState({
    type: 'income' as 'income' | 'expense',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribers: (() => void)[] = [];

    const setupListeners = () => {
      // Transactions
      unsubscribers.push(onSnapshot(query(collection(db, 'transactions'), orderBy('date', 'desc')), (snap) => {
        setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'transactions')));

      // Programs
      unsubscribers.push(onSnapshot(collection(db, 'programs'), (snap) => {
        setPrograms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Program)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'programs')));

      // Clubs
      unsubscribers.push(onSnapshot(collection(db, 'clubs'), (snap) => {
        setClubs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'clubs')));

      // Reports
      unsubscribers.push(onSnapshot(query(collection(db, 'monthlyReports'), orderBy('month', 'desc')), (snap) => {
        setReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MonthlyReport)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'monthlyReports')));

      setLoading(false);
    };

    setupListeners();
    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  const generateMonthlyReport = async (targetMonth?: string | React.MouseEvent) => {
    const currentMonth = typeof targetMonth === 'string' ? targetMonth : new Date().toISOString().slice(0, 7); // YYYY-MM
    const existingReport = reports.find(r => r.month === currentMonth);
    
    if (existingReport && typeof targetMonth !== 'string') return;

    setGeneratingReport(true);
    try {
      // Analyze month data
      const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
      const monthPrograms = programs.filter(p => p.date?.startsWith(currentMonth));
      
      const income = monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      
      // Club performance
      const topClub = [...clubs].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))[0];

      const performanceReportText = `Monthly Performance Report - ${currentMonth}

PROGRAM ANALYSIS:
- Programs Conducted: ${monthPrograms.length}
${monthPrograms.length > 0 
  ? monthPrograms.map(p => `  • ${p.title} (${p.date})`).join('\n')
  : '  • No programs recorded this month.'}

CLUB PERFORMANCE:
- Leading Club: ${topClub?.name || 'N/A'} (${topClub?.totalPoints || 0} points)
- Active Clubs: ${clubs.length}

This report was automatically generated based on real-time data analysis of program schedules and club performance metrics.`;

      const financialReportText = `Monthly Financial Report - ${currentMonth}

FINANCIAL SUMMARY:
- Total Income: ₹${income.toLocaleString()}
- Total Expenses: ₹${expense.toLocaleString()}
- Net Balance: ₹${(income - expense).toLocaleString()}
- Total Transactions: ${monthTransactions.length}

RECENT ACTIVITY:
${monthTransactions.length > 0
  ? monthTransactions.slice(0, 5).map(t => `- ${t.type === 'income' ? '[+]' : '[-]'} ₹${t.amount}: ${t.description}`).join('\n')
  : 'No transactions recorded this month.'}

This report was automatically generated based on real-time data analysis of treasury transactions.`;

      if (existingReport) {
        // Update existing report if manually triggered
        await deleteDoc(doc(db, 'monthlyReports', existingReport.id!));
      }

      await addDoc(collection(db, 'monthlyReports'), {
        month: currentMonth,
        performanceReportText,
        financialReportText,
        submittedBy: profile?.uid,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGeneratingReport(false);
    }
  };

  const downloadPDF = (report: MonthlyReport) => {
    const doc = new jsPDF();
    
    // Add Header
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // Emerald-600
    doc.text('SAFA UNION - MONTHLY REPORT', 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // Stone-500
    doc.text(`Month: ${report.month}`, 20, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 37);
    
    doc.setDrawColor(226, 232, 240); // Stone-200
    doc.line(20, 45, 190, 45);
    
    // Add Content
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59); // Stone-800
    
    doc.setFontSize(14);
    doc.text('PERFORMANCE REPORT', 20, 55);
    doc.setFontSize(10);
    const splitPerformanceText = doc.splitTextToSize(report.performanceReportText, 170);
    doc.text(splitPerformanceText, 20, 65);
    
    doc.setFontSize(14);
    doc.text('FINANCIAL REPORT', 20, 150);
    doc.setFontSize(10);
    const splitFinancialText = doc.splitTextToSize(report.financialReportText, 170);
    doc.text(splitFinancialText, 20, 160);
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Stone-400
    doc.text('This is an automatically generated report from the Safa Union Portal.', 20, 280);
    
    doc.save(`Safa_Report_${report.month}.pdf`);
  };

  // Auto-generate report if missing for current month
  useEffect(() => {
    if (!loading && reports.length >= 0) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const hasReport = reports.some(r => r.month === currentMonth);
      if (!hasReport && !generatingReport) {
        generateMonthlyReport();
      }
    }
  }, [loading, reports]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTransaction.amount <= 0) return;
    try {
      const docRef = await addDoc(collection(db, 'transactions'), {
        ...newTransaction,
        addedBy: profile?.uid,
        timestamp: serverTimestamp()
      });
      
      // Update local state
      const addedTransaction: Transaction = {
        id: docRef.id,
        ...newTransaction,
        addedBy: profile?.uid || '',
        timestamp: new Date() // Approximate for local UI
      };
      setTransactions(prev => [addedTransaction, ...prev]);

      setNewTransaction({
        type: 'income',
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      setStatus({ type: 'success', msg: 'Transaction added successfully!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error('Error adding transaction:', error);
      setStatus({ type: 'error', msg: 'Failed to add transaction.' });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
      setTransactions(prev => prev.filter(t => t.id !== id));
      setStatus({ type: 'success', msg: 'Transaction deleted.' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setStatus({ type: 'error', msg: 'Failed to delete transaction.' });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleClearTreasury = async () => {
    setClearing(true);
    try {
      const snapshot = await getDocs(collection(db, 'transactions'));
      const batch = writeBatch(db);
      snapshot.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      setTransactions([]);
      setStatus({ type: 'success', msg: 'Treasury cleared successfully.' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error('Error clearing treasury:', error);
      setStatus({ type: 'error', msg: 'Failed to clear treasury.' });
      setTimeout(() => setStatus(null), 3000);
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpense;

  return (
    <div className="space-y-8">
      {/* Status Messages */}
      {status && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
          status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          <AlertCircle size={20} />
          <p className="font-medium">{status.msg}</p>
        </div>
      )}

      {/* Navigation Bar */}
      <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-stone-100 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
            activeTab === 'transactions' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-stone-400 hover:bg-stone-50'
          }`}
        >
          <Wallet size={16} /> Transactions
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
            activeTab === 'reports' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-stone-400 hover:bg-stone-50'
          }`}
        >
          <FileText size={16} /> Monthly Reports
        </button>
      </div>

      {activeTab === 'transactions' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-emerald-50 border-emerald-100">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600">
                  <Wallet size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Total Balance</p>
                  <p className="text-2xl font-black text-emerald-900">₹{balance.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 bg-blue-50 border-blue-100">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-800 uppercase tracking-widest">Total Income</p>
                  <p className="text-2xl font-black text-blue-900">₹{totalIncome.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 bg-red-50 border-red-100">
              <div className="flex items-center gap-4">
                <div className="bg-red-100 p-3 rounded-2xl text-red-600">
                  <TrendingDown size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-red-800 uppercase tracking-widest">Total Outgoing</p>
                  <p className="text-2xl font-black text-red-900">₹{totalExpense.toLocaleString()}</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button 
              variant="ghost" 
              onClick={() => setConfirmClear(true)}
              disabled={clearing}
              className="text-red-600 hover:bg-red-50 text-xs font-black uppercase tracking-widest flex items-center gap-2"
            >
              <Trash2 size={16} /> {clearing ? 'Clearing...' : 'Clear All Transactions'}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="p-8 lg:col-span-1">
              <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
                <Plus className="text-emerald-600" /> Add Transaction
              </h3>
              <form onSubmit={handleAddTransaction} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Type</label>
                  <select
                    value={newTransaction.type}
                    onChange={e => setNewTransaction({ ...newTransaction, type: e.target.value as 'income' | 'expense' })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newTransaction.amount || ''}
                    onChange={e => setNewTransaction({ ...newTransaction, amount: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Description</label>
                  <input
                    type="text"
                    required
                    value={newTransaction.description}
                    onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newTransaction.date}
                    onChange={e => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <Button type="submit" className="w-full">Add Transaction</Button>
              </form>
            </Card>

            <Card className="p-8 lg:col-span-2">
              <h3 className="text-xl font-bold text-stone-900 mb-6">Recent Transactions</h3>
              <div className="space-y-4">
                {transactions.length > 0 ? (
                  transactions.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl border border-stone-100 hover:bg-stone-50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${t.type === 'income' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                          {t.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                        </div>
                        <div>
                          <p className="font-bold text-stone-900">{t.description}</p>
                          <p className="text-xs text-stone-500 flex items-center gap-1">
                            <Calendar size={12} /> {t.date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className={`font-black ${t.type === 'income' ? 'text-blue-600' : 'text-red-600'}`}>
                          {t.type === 'income' ? '+' : '-'} ₹{t.amount.toLocaleString()}
                        </p>
                        <button
                          onClick={() => t.id && setConfirmDelete(t.id)}
                          className="p-2 text-stone-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-stone-400">No transactions recorded yet.</div>
                )}
              </div>
            </Card>
          </div>
        </>
      ) : activeTab === 'reports' ? (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black text-stone-900 uppercase tracking-tighter">Monthly Reports</h3>
              <p className="text-stone-500">Automated performance and financial analysis.</p>
            </div>
            <Button 
              onClick={generateMonthlyReport} 
              disabled={generatingReport}
              className="flex items-center gap-2"
            >
              <BarChart3 size={18} /> {generatingReport ? 'Generating...' : 'Generate New Report'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {reports.length > 0 ? (
              reports.map(report => (
                <Card key={report.id} className="p-8 border-stone-100 hover:border-emerald-200 transition-all group">
                  <div className="flex items-center justify-between mb-6">
                    <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl">
                      <FileText size={24} />
                    </div>
                    <span className="text-xs font-black text-stone-400 uppercase tracking-widest">{report.month}</span>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 uppercase tracking-widest mb-2">Performance Report</h4>
                      <pre className="text-sm text-stone-700 font-medium whitespace-pre-wrap leading-relaxed bg-stone-50 p-6 rounded-2xl border border-stone-100">
                        {report.performanceReportText}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 uppercase tracking-widest mb-2">Financial Report</h4>
                      <pre className="text-sm text-stone-700 font-medium whitespace-pre-wrap leading-relaxed bg-stone-50 p-6 rounded-2xl border border-stone-100">
                        {report.financialReportText}
                      </pre>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Generated Automatically</span>
                    <Button 
                      variant="ghost" 
                      onClick={() => downloadPDF(report)}
                      className="text-emerald-600 text-[10px] font-black uppercase tracking-widest p-0 h-auto hover:bg-transparent flex items-center gap-1"
                    >
                      <Download size={14} /> Download PDF <ChevronRight size={14} />
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-2 text-center py-20 bg-stone-50 rounded-[40px] border border-dashed border-stone-200">
                <FileText size={48} className="mx-auto text-stone-300 mb-4" />
                <p className="text-stone-500 font-bold">No reports generated yet.</p>
                <p className="text-stone-400 text-sm">Reports are generated automatically at the end of each month.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Modals */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) handleDeleteTransaction(confirmDelete);
          setConfirmDelete(null);
        }}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmModal
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={handleClearTreasury}
        title="Clear Treasury"
        message="CRITICAL: This will delete ALL transactions and reset the balance to zero. This action is permanent and cannot be undone. Are you absolutely sure?"
        confirmText="Clear All"
        variant="danger"
      />
    </div>
  );
}
