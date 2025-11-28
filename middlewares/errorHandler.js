


export default function errorHandler(err, req, res, next) {
  console.error("Global Error:", err.stack);

  if (res.headersSent) {
    return next(err);
  }

    res.status(500).send(`
    <h1 style="font-family: sans-serif; color: #b91c1c;">
      Something went wrong: ${err.message}
    </h1>
  `);
}
