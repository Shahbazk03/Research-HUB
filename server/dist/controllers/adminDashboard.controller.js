import ServiceRequest from "../models/ServiceRequest.js";
import User from "../models/User.js";
import Service from "../models/Service.js";
import Domain from "../models/Domain.js";
import Category from "../models/Category.js";
export const getAdminDashboardOverview = async (_req, res, next) => {
    try {
        const [totalRequests, newRequests, inProgressRequests, waitingRequests, completedRequests, cancelledRequests, totalUsers, totalServices, totalDomains, totalCategories, recentRequests,] = await Promise.all([
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
        ]);
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
                recentRequests,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=adminDashboard.controller.js.map