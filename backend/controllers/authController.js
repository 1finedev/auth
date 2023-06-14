const test = (req, res, next) => {
  res.status(200).json({
    status: "success",
    message: "Hello from the server!",
  });
};

export default { test };
