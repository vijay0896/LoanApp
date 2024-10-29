const validate = (schema) => async (req, res, next) => {
  try {
    const parsedBody = await schema.parseAsync(req.body);
    req.body = parsedBody; // If validation succeeds, proceed
    next();
  } catch (err) {
    const status = 422;
    const message = "Fill the inputs properly";
    const extraDetails = err.errors.map(error => error.message).join(", "); // Join multiple errors if present

    // Send error to the next error handler or middleware
    const errorResponse = {
      status,
      message,
      extraDetails,
    };

    // Pass the error to the next handler
    next(errorResponse);
  }
};

module.exports = validate;
