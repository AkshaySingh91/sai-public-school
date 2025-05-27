import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import {
  Clock,
  Percent,
  DollarSign,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Skeleton from "react-loading-skeleton";

const MetricCard = ({
  icon: Icon,
  label,
  value,
  isCurrency = false,
  loading,
}) => {
  return (
    <motion.div
      className="min-w-0 bg-gradient-to-r from-indigo-50 to-purple-50 backdrop-blur-sm p-6 rounded-xl border border-gray-100 hover:border-purple-100 hover:shadow-lg transition-all"
      whileHover={{ y: -4 }}
    >
      <div className=" gap-5">
        <div className="w-full flex justify-between ">
          <div className="p-2 text-center h-fit rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 text-white">
            <Icon size={24} />
          </div>
          <h3 className="flex-auto text-sm font-medium text-gray-500 mb-2">
            {loading ? <Skeleton width={120} /> : label}
          </h3>
        </div>
        <div className="flex-1">
          <div className="text-xl font-bold text-gray-800">
            {loading ? (
              <Skeleton width={80} />
            ) : (
              <>
                {isCurrency && "₹"}
                {value?.toLocaleString()}
                {label === "Pending Amount" && value < 0 && (
                  <span className="text-sm ml-2 text-red-600">(Overdue)</span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function SchoolMetricsCards() {
  const { userData } = useAuth();
  const [metrics, setMetrics] = useState({
    todaysCollection: 0,
    discountedAmount: 0,
    expectedCollection: 0,
    collectedFees: 0,
    pendingAmount: 0,
    lastYearBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      if (!userData?.schoolCode) return;
      setLoading(true);

      const schoolSnap = await getDocs(
        query(
          collection(db, "schools"),
          where("Code", "==", userData.schoolCode)
        )
      );

      if (schoolSnap.empty) {
        setLoading(false);
        return;
      }
      const studSnap = await getDocs(
        query(
          collection(db, "students"),
          where("schoolCode", "==", userData.schoolCode)
        )
      );

      let metricsData = {
        todaysCollection: 0,
        discountedAmount: 0,
        expectedCollection: 0,
        collectedFees: 0,
        pendingAmount: 0,
        lastYearBalance: 0,
      };

      studSnap.forEach((docSnap) => {
        const s = docSnap.data();
        const all = s.allFee || {};

        const isActive = s.status?.toLowerCase() === "new" || s.status.toLowerCase() === "current";
        if (isActive) {
          // cal discounted amnt for each student except left
          metricsData.discountedAmount +=
            (all.busFeeDiscount || 0) + (all.tuitionFeesDiscount || 0);
          // for all student also for left one
          metricsData.expectedCollection +=
            (all.tuitionFees?.total || 0) +
            (all.busFee || 0) +
            (all.messFee || 0) +
            (all.hostelFee || 0);

          metricsData.lastYearBalance +=
            (all.lastYearBalanceFee || 0) + (all.lastYearBusFee || 0);

          // we sum of all those that are collected from external system only "completed" one
          (s.transactions || []).forEach((t) => {
            console.log(t.status)
            if (t?.status?.toLowerCase() === "completed")
              metricsData.collectedFees += Number(t.amount) || 0;
          });
        }
      });

      // we calc only collected fees for today of all type also for cheque pending
      const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const toDate = new Date();
      studSnap.forEach((docSnap) => {
        const student = docSnap.data();

        const filteredTxs = (student.transactions || []).filter((t) => {
          const txDate = new Date(t.timestamp);
          if (isNaN(txDate.getTime())) return false; // Skip invalid dates
          // Check if transaction is within the date range
          const isWithinDateRange = txDate >= fromDate && txDate <= toDate;
          // not imported from external system , but status can be pending
          const hasValidReceipt = !isNaN(Number(t.receiptId)) || t.status !== "completed";

          return isWithinDateRange && hasValidReceipt;
        });

        // Sum amounts of filtered transactions
        metricsData.todaysCollection += filteredTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      });
      metricsData.pendingAmount = metricsData.expectedCollection - metricsData.collectedFees;
      metricsData.pendingAmount = Math.max(metricsData.pendingAmount, 0);

      setMetrics(metricsData);
      setLoading(false);
    }

    fetchMetrics();
  }, [userData]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start px-2 sm:px-4 ">
      <MetricCard
        icon={Clock}
        label="Today's Collection"
        value={metrics.todaysCollection}
        isCurrency
        loading={loading}
      />
      <MetricCard
        icon={Percent}
        label="Discounted Amount"
        value={metrics.discountedAmount}
        isCurrency
        loading={loading}
      />
      <MetricCard
        icon={DollarSign}
        label="Expected Collection"
        value={metrics.expectedCollection}
        isCurrency
        loading={loading}
      />
      <MetricCard
        icon={CheckCircle}
        label="Collected Fees"
        value={metrics.collectedFees}
        isCurrency
        loading={loading}
      />
      <MetricCard
        icon={AlertCircle}
        label="Pending Amount"
        value={metrics.pendingAmount}
        isCurrency
        loading={loading}
      />
      <MetricCard
        icon={RefreshCw}
        label="Last Year Balance"
        value={metrics.lastYearBalance}
        isCurrency
        loading={loading}
      />
    </div>
  );
}
