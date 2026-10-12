export const errorHandler = (error, _req, res, _next) => {
    console.error(error);
    const statusCode = error.statusCode ?? 500;
    res.status(statusCode).json({
        success: false,
        message: statusCode === 500
            ? "Internal server error"
            : error.message,
    });
};
//# sourceMappingURL=errorHandler.js.map