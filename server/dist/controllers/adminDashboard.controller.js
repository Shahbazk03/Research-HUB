import ServiceRequest from "../models/ServiceRequest.js";
import User from "../models/User.js";
import Service from "../models/Service.js";
import Domain from "../models/Domain.js";
import Category from "../models/Category.js";
export const getAdminDashboardOverview = async (_req, res, next) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const last7DaysStart = new Date(now);
        last7DaysStart.setDate(now.getDate() - 6);
        last7DaysStart.setHours(0, 0, 0, 0);
        const [totalRequests, newRequests, inProgressRequests, waitingRequests, completedRequests, cancelledRequests, totalUsers, totalServices, totalDomains, totalCategories, recentRequests, usersToday, requestsToday, signupsTrend, requestTrend,] = await Promise.all([
            ServiceRequest.countDocuments(),
            ServiceRequest.countDocuments({ status: "NEW" }),
            ServiceRequest.countDocuments({ status: "IN_PROGRESS" }),
            ServiceRequest.countDocuments({ status: "WAITING_FOR_CUSTOMER" }),
            ServiceRequest.countDocuments({ status: "COMPLETED" }),
            ServiceRequest.countDocuments({ status: "CANCELLED" }),
            User.countDocuments(),
            Service.countDocuments({ isActive: true }),
            Domain.countDocuments({ isActive: true }),
            Category.countDocuments({ isActive: true }),
            ServiceRequest.find()
                .populate("serviceId", "name slug")
                .sort({ createdAt: -1 })
                .limit(8)
                .lean(),
            User.countDocuments({ createdAt: { $gte: startOfToday } }),
            ServiceRequest.countDocuments({ createdAt: { $gte: startOfToday } }),
            User.aggregate([
                {
                    $match: {
                        createdAt: { $gte: last7DaysStart, $lte: now },
                    },
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            ServiceRequest.aggregate([
                {
                    $match: {
                        createdAt: { $gte: last7DaysStart, $lte: now },
                    },
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
        ]);
        const buildTrendSeries = (series) => {
            const map = new Map(series.map((item) => [item._id, item.count]));
            const output = [];
            for (let i = 6; i >= 0; i -= 1) {
                const date = new Date(now);
                date.setDate(now.getDate() - i);
                date.setHours(0, 0, 0, 0);
                const key = date.toISOString().slice(0, 10);
                output.push({
                    label: date.toLocaleDateString("en-US", { weekday: "short" }),
                    value: map.get(key) || 0,
                });
            }
            return output;
        };
        const signupsTrendSeries = buildTrendSeries(signupsTrend);
        const requestsTrendSeries = buildTrendSeries(requestTrend);
        const totalSignupsLast7Days = signupsTrendSeries.reduce((sum, item) => sum + item.value, 0);
        const totalRequestsLast7Days = requestsTrendSeries.reduce((sum, item) => sum + item.value, 0);
        res.status(200).json({
            success: true,
            data: {
                metrics: {
                    totalRequests,
                    newRequests,
                    inProgressRequests,
                    waitingRequests,
                    completedRequests,
                    cancelledRequests,
                    totalUsers,
                    totalServices,
                    totalDomains,
                    totalCategories,
                },
                activity: {
                    todayUsers: usersToday,
                    todayRequests: requestsToday,
                    signupsLast7Days: totalSignupsLast7Days,
                    requestsLast7Days: totalRequestsLast7Days,
                    signupTrend: signupsTrendSeries,
                    requestTrend: requestsTrendSeries,
                },
                recentRequests,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=adminDashboard.controller.js.map