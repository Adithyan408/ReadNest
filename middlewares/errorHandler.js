


export default function errorHandler(err, req, res, next) {
  console.error("Global Error:", err.stack);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).render("error", {
    message: err.message || "Something went wrong",
    statusCode: 500
  });
}
