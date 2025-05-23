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

      const school = schoolSnap.docs[0].data();
      const currentYear = school.academicYear;

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
          metricsData.discountedAmount +=
            (all.transportFeeDiscount || 0) + (all.tutionFeesDiscount || 0);
          metricsData.expectedCollection +=
            (all.schoolFees?.total || 0) +
            (all.transportFee || 0) +
            (all.messFee || 0) +
            (all.hostelFee || 0);
          metricsData.lastYearBalance +=
            (all.lastYearBalanceFee || 0) + (all.lastYearTransportFee || 0);

          (s.transactions || []).forEach((tx) => {
            const amt = Number(tx.amount) || 0;
            const ts = new Date(tx.timestamp);

            // Today's collection (still filtered by today and completed)
            const today = new Date();
            const isToday =
              ts.getFullYear() === today.getFullYear() &&
              ts.getMonth() === today.getMonth() &&
              ts.getDate() === today.getDate();

            if (isToday && tx.status === "completed") {
              metricsData.todaysCollection += amt;
            }
            // if transaction is completed & it is of this year
            if (
              tx.status === "completed" &&
              tx.academicYear === s.academicYear
            ) {
              metricsData.collectedFees += amt;
            }
          });
        }
      });

      metricsData.pendingAmount =
        metricsData.expectedCollection - metricsData.collectedFees;
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
