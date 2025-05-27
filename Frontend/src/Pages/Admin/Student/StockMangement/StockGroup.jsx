import React, { useEffect, useState } from "react";
import { db } from "../../../../config/firebase";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "../../../../contexts/AuthContext";
import { useSchool } from "../../../../contexts/SchoolContext";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Archive, Package, IndianRupee, AlertTriangle, Users, CheckCircle } from "lucide-react";



function StockGroup() {
  const { userData } = useAuth();
  const { school } = useSchool();
  const [expandedRow, setExpandedRow] = useState(null);
  const [loading, setLoading] = useState(false);
  const classOrder = school?.class?.length ? school.class : [
    "Nursery",
    "JRKG",
    "SRKG",
    "1st",
    "2nd",
    "3rd",
    "4th",
    "5th",
    "6th",
    "7th",
    "8th",
    "9th",
  ];
  const [aggregatedData, setAggregatedData] = useState([]);

  useEffect(() => {
    setLoading(true)
    const fetchStockData = async () => {
      try {
        const snapshot = await getDocs(collection(db, "allStocks"));
        const data = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => item.schoolCode === userData.schoolCode);

        processAggregatedData(data);
      } catch (error) {
        console.error("Error fetching stock:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStockData();
  }, []);
  // Process data into class-gender groups
  const processAggregatedData = (data) => {
    const aggregation = classOrder.reduce((acc, className) => {
      ['Boys', 'Girls'].forEach(gender => {
        const classItems = data.filter(item => {
          const fromIdx = classOrder.indexOf(item.fromClass);
          const toIdx = classOrder.indexOf(item.toClass);
          const classIdx = classOrder.indexOf(className);
          return fromIdx <= classIdx && toIdx >= classIdx &&
            (item.category?.toLowerCase()?.trim() === gender?.toLowerCase()?.trim() || item.category?.toLowerCase()?.trim() === 'all');
        });

        const totalItems = classItems.length;
        const totalInventoryValue = classItems.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
        const totalItemOutOfStock = classItems.filter(item => item.quantity === 0).length;

        acc.push({
          className,
          gender,
          totalItems,
          totalInventoryValue,
          totalItemOutOfStock,
          items: classItems
        });
      });
      return acc;
    }, []);
    console.log(aggregation)
    setAggregatedData(aggregation);
  };
  const handleRowClick = (index) => {
    setExpandedRow(expandedRow === index ? null : index);
  };
  const StockStatusBadge = ({ quantity }) => {
    const statusConfig = {
      0: { text: 'Out of Stock', color: 'bg-red-100 text-red-700' },
      10: { text: 'Low Stock', color: 'bg-amber-100 text-amber-700' },
      default: { text: 'In Stock', color: 'bg-green-100 text-green-700' }
    };

    const config = quantity === 0 ? statusConfig[0] :
      quantity <= 10 ? statusConfig[10] : statusConfig.default;

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };
  if (loading) {
    return (
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">Loading inventory data...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="p-4 md:p-6  bg-gradient-to-br from-purple-50 to-violet-50  min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Enhanced Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-lg shadow-xs border border-gray-200">
            <Package className="w-6 h-6 text-purple-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Inventory Management
              <span className="block mt-1 w-12 h-1 bg-purple-600 rounded-full" />
            </h1>
            <p className="text-gray-600 text-sm md:text-base">
              Track and manage inventory across classes and categories
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            {
              title: 'Categories',
              value: aggregatedData.length,
              icon: Archive,
              color: 'bg-blue-100 text-blue-800'
            },
            {
              title: 'Total Items',
              value: aggregatedData.reduce((sum, d) => sum + d.totalItems, 0),
              icon: Package,
              color: 'bg-green-100 text-green-800'
            },
            {
              title: 'Total Value',
              value: `₹${aggregatedData.reduce((sum, d) => sum + d.totalInventoryValue, 0).toLocaleString('en-IN')}`,
              icon: IndianRupee,
              color: 'bg-purple-100 text-purple-800'
            },
            {
              title: 'Out of Stock',
              value: aggregatedData.reduce((sum, d) => sum + d.totalItemOutOfStock, 0),
              icon: AlertTriangle,
              color: 'bg-red-100 text-red-800'
            }
          ].map((card, i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${card.color} bg-opacity-50`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">{card.title}</p>
                  <p className="text-xl font-semibold text-gray-800">{card.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Table */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gradient-to-r from-purple-600 to-violet-700 text-white">
                <tr>
                  {['Class', 'Gender', 'Items', 'Value', 'Out of Stock', 'Action'].map((header, i) => (
                    <th
                      key={i}
                      className="py-4 text-center mx-auto text-sm font-medium whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {aggregatedData.map((row, index) => (
                  <React.Fragment key={index}>
                    {/* Parent Row */}
                    <motion.tr
                      className={`cursor-pointer text-center bg-purple-50/50 even:bg-purple-100/50 hover:bg-purple-200/50 transition-colors ${expandedRow === index ? '!bg-gray-100' : ''}`}
                      onClick={() => handleRowClick(index)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-800">
                          {row.className}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${row.gender === 'Boys'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-pink-100 text-pink-800'
                          }`}>
                          <Users className="w-3.5 h-3.5" />
                          {row.gender}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-medium">{row.totalItems}</span>
                          <span className="text-gray-400 text-xs">items</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-purple-700 font-medium">
                          <span className="font-bold">₹</span>
                          {row.totalInventoryValue.toLocaleString('en-IN')}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${row.totalItemOutOfStock > 0
                            ? 'bg-red-500'
                            : 'bg-green-500'
                            }`} />
                          <span className="text-xs font-medium">
                            {row.totalItemOutOfStock} {row.totalItemOutOfStock === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedRow === index ? 'rotate-180' : ''
                            }`} />
                        </div>
                      </td>
                    </motion.tr>

                    {/* Child Row */}
                    <AnimatePresence>
                      {expandedRow === index && (
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <td colSpan={6} className="p-2 bg-gray-50">
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                  {row.className} {row.gender} Inventory Details
                                </h4>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead className="bg-purple-600">
                                    <tr>
                                      {['Item', 'Purchase', 'Sell', 'Qty', 'Status', 'Value'].map((h, i) => (
                                        <th
                                          key={i}
                                          className="px-3 py-2 text-xs font-medium text-white whitespace-nowrap text-center first:pl-4 last:pr-4"
                                        >
                                          {h}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200 text-center w-auto">
                                    {row?.items?.length ? row.items.map((item) => {
                                      const isOutOfStock = item.quantity === 0;
                                      const isLowStock = item.quantity <= 10 && item.quantity > 0;
                                      return (
                                        <tr
                                          key={item.id}
                                          className={`hover:bg-gray-50 ${isOutOfStock ? 'bg-red-50/30' : ''
                                            }`}
                                        >
                                          <td className="px-3 py-2 text-xs font-medium text-gray-900 text-left">
                                            <div className="flex flex-col">
                                              <span className="uppercase">{item.itemName}</span>
                                              {isOutOfStock && (
                                                <span className="text-[10px] text-red-500 mt-0.5">
                                                  Currently unavailable
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2 text-xs text-gray-600">
                                            <div className="flex items-center justify-center gap-1">
                                              <IndianRupee className="w-3 h-3" />
                                              {item.purchasePrice}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2 text-xs font-medium text-purple-700">
                                            <div className="flex items-center justify-center gap-1">
                                              <IndianRupee className="w-3 h-3" />
                                              {item.sellingPrice}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2">
                                            <span className={`inline-flex items-center justify-center w-12 py-1 rounded-full text-xs ${isOutOfStock ? 'bg-red-100 text-red-700' :
                                              item.quantity <= 10 ? 'bg-amber-100 text-amber-700' :
                                                'bg-green-100 text-green-700'
                                              }`}>
                                              {item.quantity}
                                            </span>
                                          </td>
                                          <td className="px-2 py-1 text-xs">
                                            <div className="flex items-center gap-2">
                                              {isOutOfStock && (
                                                <div className="relative group">
                                                  <div className="flex items-center mx-auto  gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium border border-red-200 whitespace-nowrap">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    <span>Out of Stock</span>
                                                  </div>

                                                  {/* Tooltip */}
                                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                                                    Item is currently unavailable for ordering
                                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                                  </div>
                                                </div>
                                              )}

                                              {isLowStock && (
                                                <div className="relative group mx-auto  ">
                                                  <div className="flex items-center  w-fit gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium border border-orange-200 whitespace-nowrap">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    <span>Low Stock</span>
                                                  </div>

                                                  {/* Tooltip */}
                                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                                                    Only {item.quantity} items remaining
                                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                                  </div>
                                                </div>
                                              )}

                                              {!isOutOfStock && !isLowStock && (
                                                <div className="flex items-center mx-auto gap-2 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium border border-green-200">
                                                  <CheckCircle className="w-4 h-4" />
                                                  <span>In Stock</span>
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2 text-xs font-medium text-purple-700">
                                            <div className="flex items-center justify-center gap-1">
                                              <IndianRupee className="w-3 h-3" />
                                              {(item.quantity * item.sellingPrice).toLocaleString('en-IN')}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    }) :
                                      <div className="w-full mx-auto py-4 text-lg text-gray-600 font-bold">No item in this Group</div>}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {aggregatedData.length === 0 && !loading && (
            <div className="p-8 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <Package className="w-12 h-12 text-gray-400 mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-800">
                    No Inventory Found
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Start by adding inventory items to manage your stock
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StockGroup;
